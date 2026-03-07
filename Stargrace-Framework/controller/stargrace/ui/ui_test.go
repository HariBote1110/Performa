package ui

import (
	"testing"

	"github.com/yuki/stargrace-framework/controller/stargrace/schema"
)

func TestDocumentBuildsTree(t *testing.T) {
	root := VStack(
		Text("title").ID("title"),
		HStack(
			Button("primary").Action("primary_tap"),
			Button("secondary").Action("secondary_tap"),
		).Spacing(12),
	).ID("root").Spacing(16)

	document := Document(root)
	if document.Type != schema.MessageTypeRender {
		t.Fatalf("unexpected message type: %s", document.Type)
	}

	if document.Root == nil {
		t.Fatal("root should not be nil")
	}

	if document.Root.Kind != schema.ComponentVStack {
		t.Fatalf("unexpected root kind: %s", document.Root.Kind)
	}

	if len(document.Root.Children) != 2 {
		t.Fatalf("unexpected child length: %d", len(document.Root.Children))
	}

	actionRow := document.Root.Children[1]
	if actionRow.Kind != schema.ComponentHStack {
		t.Fatalf("unexpected second child kind: %s", actionRow.Kind)
	}

	if actionRow.Spacing == nil || *actionRow.Spacing != 12 {
		t.Fatalf("unexpected hstack spacing: %+v", actionRow.Spacing)
	}
}

func TestChildIgnoresNilEntries(t *testing.T) {
	root := VStack(nil, Text("safe"))
	if root == nil || root.node == nil {
		t.Fatal("root should not be nil")
	}

	if len(root.node.Children) != 1 {
		t.Fatalf("unexpected child length: %d", len(root.node.Children))
	}
}

func TestTextFieldCarriesPlaceholderAndValue(t *testing.T) {
	field := TextField("hello").Placeholder("input").Action("submit_note")
	if field == nil || field.node == nil {
		t.Fatal("field should not be nil")
	}

	if field.node.Kind != schema.ComponentInput {
		t.Fatalf("unexpected kind: %s", field.node.Kind)
	}

	if field.node.Placeholder != "input" {
		t.Fatalf("unexpected placeholder: %s", field.node.Placeholder)
	}

	if field.node.Value != "hello" {
		t.Fatalf("unexpected value: %s", field.node.Value)
	}

	if field.node.Action != "submit_note" {
		t.Fatalf("unexpected action: %s", field.node.Action)
	}
}

func TestLineChartCarriesValues(t *testing.T) {
	chart := LineChart([]float64{10, 30, 20, 60})
	if chart == nil || chart.node == nil {
		t.Fatal("chart should not be nil")
	}

	if chart.node.Kind != schema.ComponentLine {
		t.Fatalf("unexpected kind: %s", chart.node.Kind)
	}

	if len(chart.node.Values) != 4 {
		t.Fatalf("unexpected values length: %d", len(chart.node.Values))
	}

	if chart.node.Values[3] != 60 {
		t.Fatalf("unexpected last value: %v", chart.node.Values[3])
	}
}
