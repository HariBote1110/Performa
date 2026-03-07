package runtime

import (
	"fmt"
	"strings"

	"github.com/yuki/stargrace-framework/controller/stargrace/schema"
	"github.com/yuki/stargrace-framework/controller/stargrace/ui"
)

const (
	ActionIncrement = "increment"
	ActionDecrement = "decrement"
	ActionReset     = "reset"
	ActionAddNote   = "add_note"
)

const maxEventLogSize = 30

type CounterApp struct {
	title    string
	counter  int
	notes    []string
	eventLog []string
}

func NewCounterApp(title string) *CounterApp {
	if title == "" {
		title = "Stargrace Counter"
	}

	return &CounterApp{
		title: title,
		notes: []string{"Stargrace Framework", "Phase 4"},
	}
}

func (a *CounterApp) ApplyEvent(event schema.Event) bool {
	action := strings.TrimSpace(event.Action)
	switch action {
	case ActionIncrement:
		a.counter++
		a.appendEventLog(fmt.Sprintf("+1 -> %d", a.counter))
		return true
	case ActionDecrement:
		a.counter--
		a.appendEventLog(fmt.Sprintf("-1 -> %d", a.counter))
		return true
	case ActionReset:
		a.counter = 0
		a.appendEventLog("reset -> 0")
		return true
	case ActionAddNote:
		value := strings.TrimSpace(event.Value)
		if value == "" {
			return false
		}

		a.notes = append(a.notes, value)
		a.appendEventLog(fmt.Sprintf("note: %s", value))
		return true
	default:
		return false
	}
}

func (a *CounterApp) Count() int {
	return a.counter
}

func (a *CounterApp) RenderDocument() schema.Document {
	return ui.Document(
		ui.VStack(
			ui.Text(a.title).ID("title"),
			ui.HStack(
				ui.Text(fmt.Sprintf("Count: %d", a.counter)).ID("count"),
				ui.Button("+1").Action(ActionIncrement),
				ui.Button("-1").Action(ActionDecrement),
				ui.Button("Reset").Action(ActionReset),
			).ID("counter_actions").Spacing(12),
			ui.TextField("").ID("note_input").Placeholder("メモを入力して Enter").Action(ActionAddNote),
			ui.Text("Notes").ID("notes_title"),
			a.renderNoteList(),
			ui.Text("Event Log").ID("event_title"),
			a.renderEventLog(),
		).ID("root").Spacing(14),
	)
}

func (a *CounterApp) renderNoteList() *ui.Element {
	children := make([]*ui.Element, 0, len(a.notes))
	for _, note := range a.notes {
		children = append(children, ui.Text(note))
	}

	if len(children) == 0 {
		children = append(children, ui.Text("まだメモはありません"))
	}

	return ui.List(children...).ID("notes_list")
}

func (a *CounterApp) renderEventLog() *ui.Element {
	children := make([]*ui.Element, 0, len(a.eventLog))
	for i := len(a.eventLog) - 1; i >= 0; i-- {
		children = append(children, ui.Text(a.eventLog[i]))
	}

	if len(children) == 0 {
		children = append(children, ui.Text("イベント待機中"))
	}

	return ui.ScrollView(
		ui.VStack(children...).Spacing(6),
	).ID("event_log")
}

func (a *CounterApp) appendEventLog(entry string) {
	a.eventLog = append(a.eventLog, entry)
	if len(a.eventLog) > maxEventLogSize {
		a.eventLog = a.eventLog[len(a.eventLog)-maxEventLogSize:]
	}
}
