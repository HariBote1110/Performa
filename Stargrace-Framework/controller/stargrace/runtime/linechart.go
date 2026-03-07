package runtime

import (
	"fmt"

	"github.com/yuki/stargrace-framework/controller/stargrace/schema"
	"github.com/yuki/stargrace-framework/controller/stargrace/ui"
)

const (
	defaultLineChartCapacity = 60
	lineChartMinValue        = 0.0
	lineChartMaxValue        = 100.0
)

type LineChartApp struct {
	title        string
	maxSamples   int
	samples      []float64
	totalSamples int
}

func NewLineChartApp(title string, maxSamples int) *LineChartApp {
	if title == "" {
		title = "Stargrace Line Chart"
	}
	if maxSamples <= 1 {
		maxSamples = defaultLineChartCapacity
	}

	return &LineChartApp{
		title:      title,
		maxSamples: maxSamples,
		samples:    make([]float64, 0, maxSamples),
	}
}

func (a *LineChartApp) PushSample(value float64) {
	clamped := clampLineValue(value)
	a.samples = append(a.samples, clamped)
	if len(a.samples) > a.maxSamples {
		a.samples = a.samples[len(a.samples)-a.maxSamples:]
	}
	a.totalSamples++
}

func (a *LineChartApp) Samples() []float64 {
	return append([]float64(nil), a.samples...)
}

func (a *LineChartApp) RenderDocument() schema.Document {
	latest := 0.0
	if len(a.samples) > 0 {
		latest = a.samples[len(a.samples)-1]
	}

	return ui.Document(
		ui.VStack(
			ui.Text(a.title).ID("title"),
			ui.Text("毎秒ランダム値を更新中").ID("chart_subtitle"),
			ui.LineChart(a.samples).ID("line_chart"),
			ui.Text(fmt.Sprintf("最新値: %.0f%% / サンプル数: %d", latest, a.totalSamples)).ID("chart_latest"),
		).ID("root").Spacing(12),
	)
}

func clampLineValue(value float64) float64 {
	if value < lineChartMinValue {
		return lineChartMinValue
	}
	if value > lineChartMaxValue {
		return lineChartMaxValue
	}
	return value
}
