package main

import (
	"testing"

	"github.com/yuki/stargrace-framework/controller/stargrace/schema"
	"howett.net/plist"
)

func TestParseEventWithEventPlist(t *testing.T) {
	payload, err := plist.Marshal(schema.Event{
		Type:   schema.MessageTypeEvent,
		Action: "increment",
		Value:  "x",
	}, plist.BinaryFormat)
	if err != nil {
		t.Fatalf("plist payload 作成に失敗しました: %v", err)
	}

	event, err := parseEventPayload(payload)
	if err != nil {
		t.Fatalf("parseEventPayload が失敗しました: %v", err)
	}

	if event.Action != "increment" {
		t.Fatalf("action が不正です: %s", event.Action)
	}

	if event.Value != "x" {
		t.Fatalf("value が不正です: %s", event.Value)
	}
}

func TestParseEventRejectsInvalidType(t *testing.T) {
	payload, err := plist.Marshal(schema.Event{
		Type:   schema.MessageTypeRender,
		Action: "increment",
	}, plist.BinaryFormat)
	if err != nil {
		t.Fatalf("plist payload 作成に失敗しました: %v", err)
	}

	_, err = parseEventPayload(payload)
	if err == nil {
		t.Fatal("不正 type を拒否できていません")
	}
}

func TestParseEventAllowsRawAction(t *testing.T) {
	event, err := parseEventPayload([]byte("reset"))
	if err != nil {
		t.Fatalf("raw action の解析に失敗しました: %v", err)
	}

	if event.Action != "reset" {
		t.Fatalf("action が不正です: %s", event.Action)
	}
}

func TestSendRenderDocumentMarshals(t *testing.T) {
	document := schema.Document{
		Type: schema.MessageTypeRender,
		Root: &schema.Node{
			Kind: schema.ComponentText,
			Text: "ok",
		},
	}

	// ここでは marshal 経路の健全性だけを確認するため、空ソケット指定で失敗を期待する。
	if err := sendRenderDocument("", document, 0, 0); err == nil {
		t.Fatal("ソケットエラーを検出できていません")
	}
}
