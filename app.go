package main

import (
	"context"
	"fmt"
	"sync"
	"time"
	metrics "Performa/internal/app"
)

type App struct {
	ctx         context.Context
	latestStats SystemStats
	mu          sync.Mutex
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	if err := metrics.InitSocMetrics(); err != nil {
		fmt.Println("Error initializing metrics:", err)
	}
	go a.collectMetricsLoop()
}

func (a *App) shutdown(ctx context.Context) {
	metrics.CleanupSocMetrics()
}

// UIに渡すデータ構造
type SystemStats struct {
	SystemName  string    `json:"systemName"`
	CpuUsage    float64   `json:"cpuUsage"`
	CpuPower    float64   `json:"cpuPower"`
	CpuCores    []float64 `json:"cpuCores"`
	ECoreCount  int       `json:"eCoreCount"`
	PCoreCount  int       `json:"pCoreCount"`
	GpuUsage    float64   `json:"gpuUsage"`
	GpuPower    float64   `json:"gpuPower"`
	GpuFreq     float64   `json:"gpuFreq"`   // 追加: GPU周波数
	AneUsage    float64   `json:"aneUsage"`
	AnePower    float64   `json:"anePower"`
	MemUsedGB   float64   `json:"memUsedGB"`
	MemTotalGB  float64   `json:"memTotalGB"`
	SwapUsedGB  float64   `json:"swapUsedGB"`
	SwapTotalGB float64   `json:"swapTotalGB"`
	DramPower   float64   `json:"dramPower"` // 追加: メモリ電力
	SocTemp     float64   `json:"socTemp"`
}

func (a *App) collectMetricsLoop() {
	info := metrics.GetSOCInfo()
	systemName := info.Name

	for {
		m := metrics.SampleSocMetrics(500)
		cpuPercents, _ := metrics.GetCPUPercentages()
		memStats := metrics.GetMemoryMetrics()
		eCores, pCores := metrics.GetCoreCounts()

		var avgCpu float64
		if len(cpuPercents) > 0 {
			total := 0.0
			for _, p := range cpuPercents {
				total += p
			}
			avgCpu = total / float64(len(cpuPercents))
		}

		aneMaxPower := 8.0
		anePercent := (m.ANEPower / aneMaxPower) * 100.0
		if anePercent > 100 {
			anePercent = 100
		}

		newStats := SystemStats{
			SystemName:  systemName,
			CpuUsage:    avgCpu,
			CpuPower:    m.CPUPower,
			CpuCores:    cpuPercents,
			ECoreCount:  eCores,
			PCoreCount:  pCores,
			GpuUsage:    m.GPUActive,
			GpuPower:    m.GPUPower,
			GpuFreq:     float64(m.GPUFreqMHz), // 追加
			AneUsage:    anePercent,
			AnePower:    m.ANEPower,
			MemUsedGB:   float64(memStats.Used) / 1024 / 1024 / 1024,
			MemTotalGB:  float64(memStats.Total) / 1024 / 1024 / 1024,
			SwapUsedGB:  float64(memStats.SwapUsed) / 1024 / 1024 / 1024,
			SwapTotalGB: float64(memStats.SwapTotal) / 1024 / 1024 / 1024,
			DramPower:   m.DRAMPower,           // 追加
			SocTemp:     float64(m.SocTemp),
		}

		a.mu.Lock()
		a.latestStats = newStats
		a.mu.Unlock()

		time.Sleep(100 * time.Millisecond)
	}
}

func (a *App) GetStats() SystemStats {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.latestStats
}