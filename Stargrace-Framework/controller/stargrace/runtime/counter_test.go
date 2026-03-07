package runtime

import (
	"testing"

	"github.com/yuki/stargrace-framework/controller/stargrace/schema"
)

func TestCounterAppApplyEvent(t *testing.T) {
	app := NewCounterApp("counter")
	if app.Count() != 0 {
		t.Fatalf("初期カウントが不正です: %d", app.Count())
	}

	if !app.ApplyEvent(schema.Event{Type: schema.MessageTypeEvent, Action: ActionIncrement}) {
		t.Fatal("increment が適用されませんでした")
	}
	if app.Count() != 1 {
		t.Fatalf("increment 後のカウントが不正です: %d", app.Count())
	}

	if !app.ApplyEvent(schema.Event{Type: schema.MessageTypeEvent, Action: ActionDecrement}) {
		t.Fatal("decrement が適用されませんでした")
	}
	if app.Count() != 0 {
		t.Fatalf("decrement 後のカウントが不正です: %d", app.Count())
	}

	if !app.ApplyEvent(schema.Event{Type: schema.MessageTypeEvent, Action: ActionReset}) {
		t.Fatal("reset が適用されませんでした")
	}
	if app.Count() != 0 {
		t.Fatalf("reset 後のカウントが不正です: %d", app.Count())
	}
}

func TestCounterAppAddNote(t *testing.T) {
	app := NewCounterApp("counter")
	ok := app.ApplyEvent(schema.Event{Type: schema.MessageTypeEvent, Action: ActionAddNote, Value: "first note"})
	if !ok {
		t.Fatal("add_note が適用されませんでした")
	}

	document := app.RenderDocument()
	if document.Root == nil {
		t.Fatal("root が nil です")
	}

	var noteList *schema.Node
	for _, child := range document.Root.Children {
		if child.ID == "notes_list" {
			noteList = child
			break
		}
	}

	if noteList == nil {
		t.Fatal("notes_list が存在しません")
	}

	found := false
	for _, child := range noteList.Children {
		if child.Text == "first note" {
			found = true
			break
		}
	}

	if !found {
		t.Fatal("追加メモが描画に反映されていません")
	}
}

func TestCounterAppRejectsUnknownAction(t *testing.T) {
	app := NewCounterApp("counter")
	if app.ApplyEvent(schema.Event{Type: schema.MessageTypeEvent, Action: "unknown"}) {
		t.Fatal("不明アクションを拒否できていません")
	}
}
