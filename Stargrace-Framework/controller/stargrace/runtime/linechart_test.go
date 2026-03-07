package runtime

import (
	"testing"

	"github.com/yuki/stargrace-framework/controller/stargrace/schema"
)

func TestLineChartAppPushSampleKeepsLatestWindow(t *testing.T) {
	app := NewLineChartApp("chart", 3)
	app.PushSample(-5)
	app.PushSample(20)
	app.PushSample(130)
	app.PushSample(60)

	got := app.Samples()
	if len(got) != 3 {
		t.Fatalf("unexpected sample length: %d", len(got))
	}

	if got[0] != 20 || got[1] != 100 || got[2] != 60 {
		t.Fatalf("unexpected sample window: %+v", got)
	}
}

func TestLineChartAppRendersLineChartNode(t *testing.T) {
	app := NewLineChartApp("chart", 10)
	app.PushSample(12)
	app.PushSample(88)

	document := app.RenderDocument()
	if document.Root == nil {
		t.Fatal("root should not be nil")
	}

	var chartNodeFound bool
	for _, child := range document.Root.Children {
		if child.ID != "line_chart" {
			continue
		}

		chartNodeFound = true
		if child.Kind != schema.ComponentLine {
			t.Fatalf("unexpected chart kind: %s", child.Kind)
		}

		if len(child.Values) != 2 {
			t.Fatalf("unexpected chart values length: %d", len(child.Values))
		}
	}

	if !chartNodeFound {
		t.Fatal("line_chart node not found")
	}
}
