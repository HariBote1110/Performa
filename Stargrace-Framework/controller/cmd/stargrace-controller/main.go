package main

import (
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net"
	"os"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/yuki/stargrace-framework/controller/stargrace/runtime"
	"github.com/yuki/stargrace-framework/controller/stargrace/schema"
	"github.com/yuki/stargrace-framework/controller/stargrace/ui"
	"howett.net/plist"
)

const (
	defaultSocketPath      = "/tmp/stargrace.sock"
	defaultEventSocketPath = "/tmp/stargrace-events.sock"
	defaultMessage         = "Stargrace Counter"
	defaultMode            = "counter"
)

func main() {
	socketPath := flag.String("socket", defaultSocketPath, "接続先の Unix Domain Socket パス")
	eventSocketPath := flag.String("event-socket", defaultEventSocketPath, "イベント受信用 Unix Domain Socket パス")
	message := flag.String("message", defaultMessage, "表示する本文またはタイトル")
	mode := flag.String("mode", defaultMode, "送信モード: counter, linechart, render, text")
	retries := flag.Int("retries", 40, "接続リトライ回数")
	retryInterval := flag.Duration("retry-interval", 250*time.Millisecond, "接続リトライ間隔")
	flag.Parse()

	if err := run(*mode, *socketPath, *eventSocketPath, *message, *retries, *retryInterval); err != nil {
		log.Fatalf("実行に失敗しました: %v", err)
	}
}

func run(mode, socketPath, eventSocketPath, message string, retries int, retryInterval time.Duration) error {
	switch strings.ToLower(mode) {
	case "text":
		if err := sendPayloadWithRetry(socketPath, []byte(message), retries, retryInterval); err != nil {
			return err
		}
		log.Printf("送信完了 mode=%s", mode)
		return nil
	case "render", "sdui":
		payload, err := buildRenderPayload(message)
		if err != nil {
			return fmt.Errorf("render payload 構築に失敗: %w", err)
		}
		if err := sendPayloadWithRetry(socketPath, payload, retries, retryInterval); err != nil {
			return err
		}
		log.Printf("送信完了 mode=%s size=%d", mode, len(payload))
		return nil
	case "counter", "interactive":
		return runCounterMode(socketPath, eventSocketPath, message, retries, retryInterval)
	case "linechart", "chart":
		return runLineChartMode(socketPath, message, retries, retryInterval)
	default:
		return fmt.Errorf("不明なモードです: %s", mode)
	}
}

func runCounterMode(socketPath, eventSocketPath, title string, retries int, retryInterval time.Duration) error {
	app := runtime.NewCounterApp(title)
	if err := sendRenderDocument(socketPath, app.RenderDocument(), retries, retryInterval); err != nil {
		return fmt.Errorf("初回レンダリング送信に失敗: %w", err)
	}

	log.Printf("counter mode 起動: event_socket=%s", eventSocketPath)
	return serveEvents(eventSocketPath, func(event schema.Event) error {
		if !app.ApplyEvent(event) {
			log.Printf("未対応アクションを受信しました: %s", event.Action)
			return nil
		}

		log.Printf("イベント受信: action=%s count=%d", event.Action, app.Count())
		if err := sendRenderDocument(socketPath, app.RenderDocument(), retries, retryInterval); err != nil {
			return fmt.Errorf("再レンダリング送信に失敗: %w", err)
		}
		return nil
	})
}

func runLineChartMode(socketPath, title string, retries int, retryInterval time.Duration) error {
	app := runtime.NewLineChartApp(title, 60)
	random := rand.New(rand.NewSource(time.Now().UnixNano()))

	app.PushSample(float64(random.Intn(101)))
	if err := sendRenderDocument(socketPath, app.RenderDocument(), retries, retryInterval); err != nil {
		return fmt.Errorf("linechart 初回レンダリング送信に失敗: %w", err)
	}

	log.Printf("linechart mode 起動: interval=1s")
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()

	for range ticker.C {
		app.PushSample(float64(random.Intn(101)))
		if err := sendRenderDocument(socketPath, app.RenderDocument(), retries, retryInterval); err != nil {
			return fmt.Errorf("linechart 再レンダリング送信に失敗: %w", err)
		}
	}

	return nil
}

func sendRenderDocument(socketPath string, document schema.Document, retries int, retryInterval time.Duration) error {
	payload, err := plist.Marshal(document, plist.BinaryFormat)
	if err != nil {
		return fmt.Errorf("ドキュメント plist 化に失敗: %w", err)
	}

	return sendPayloadWithRetry(socketPath, payload, retries, retryInterval)
}

func sendPayloadWithRetry(socketPath string, payload []byte, retries int, retryInterval time.Duration) error {
	conn, err := dialWithRetry(socketPath, retries, retryInterval)
	if err != nil {
		return fmt.Errorf("ソケット接続に失敗しました: %w", err)
	}
	defer conn.Close()

	if err := writeAll(conn, payload); err != nil {
		return fmt.Errorf("送信に失敗しました: %w", err)
	}

	return nil
}

func writeAll(writer io.Writer, payload []byte) error {
	written := 0
	for written < len(payload) {
		n, err := writer.Write(payload[written:])
		if err != nil {
			return err
		}
		written += n
	}
	return nil
}

func serveEvents(eventSocketPath string, handler func(event schema.Event) error) error {
	if eventSocketPath == "" {
		return errors.New("event socket path が空です")
	}

	if err := os.Remove(eventSocketPath); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("既存イベントソケット削除に失敗: %w", err)
	}

	listener, err := net.Listen("unix", eventSocketPath)
	if err != nil {
		return fmt.Errorf("イベントソケット待受に失敗: %w", err)
	}
	defer listener.Close()
	defer func() {
		_ = os.Remove(eventSocketPath)
	}()

	for {
		conn, err := listener.Accept()
		if err != nil {
			return fmt.Errorf("イベント接続受理に失敗: %w", err)
		}

		payload, err := io.ReadAll(conn)
		_ = conn.Close()
		if err != nil {
			log.Printf("イベント受信に失敗しました: %v", err)
			continue
		}

		if len(payload) == 0 {
			continue
		}

		event, err := parseEventPayload(payload)
		if err != nil {
			log.Printf("イベント解析に失敗しました: %v", err)
			continue
		}

		if err := handler(event); err != nil {
			log.Printf("イベント処理に失敗しました: %v", err)
		}
	}
}

func parseEventPayload(payload []byte) (schema.Event, error) {
	var event schema.Event
	if _, err := plist.Unmarshal(payload, &event); err == nil {
		if event.Type != "" && event.Type != schema.MessageTypeEvent {
			return schema.Event{}, fmt.Errorf("不正なイベント type: %s", event.Type)
		}
		event.Action = strings.TrimSpace(event.Action)
		if event.Action == "" {
			return schema.Event{}, errors.New("action が空です")
		}
		event.Type = schema.MessageTypeEvent
		return event, nil
	}

	if !utf8.Valid(payload) {
		return schema.Event{}, errors.New("未対応のイベント形式です")
	}

	action := strings.TrimSpace(string(payload))
	if action == "" {
		return schema.Event{}, errors.New("action が空です")
	}

	return schema.Event{
		Type:   schema.MessageTypeEvent,
		Action: action,
	}, nil
}

func dialWithRetry(socketPath string, retries int, retryInterval time.Duration) (net.Conn, error) {
	if retries < 0 {
		retries = 0
	}

	var lastErr error
	for attempt := 0; attempt <= retries; attempt++ {
		conn, err := net.Dial("unix", socketPath)
		if err == nil {
			return conn, nil
		}

		lastErr = err
		if attempt == retries {
			break
		}

		time.Sleep(retryInterval)
	}

	return nil, fmt.Errorf("リトライ上限に達しました: %w", lastErr)
}

func buildRenderPayload(message string) ([]byte, error) {
	document := ui.Document(
		ui.VStack(
			ui.Text("Stargrace Render Mode").ID("title"),
			ui.Text(message).ID("body"),
			ui.HStack(
				ui.Button("Primary").Action("primary_tap"),
				ui.Button("Secondary").Action("secondary_tap"),
			).ID("actions").Spacing(12),
		).ID("root").Spacing(16),
	)

	return plist.Marshal(document, plist.BinaryFormat)
}
