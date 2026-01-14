package main

import (
	metrics "Performa/internal/app"
	"context"
	"fmt"
	"sync"
	"time"
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
	SystemName     string    `json:"systemName"`
	CpuUsage       float64   `json:"cpuUsage"`
	CpuUser        float64   `json:"cpuUser"`
	CpuSystem      float64   `json:"cpuSystem"`
	CpuPower       float64   `json:"cpuPower"`
	CpuCores       []float64 `json:"cpuCores"`       // コア合計
	CpuCoresUser   []float64 `json:"cpuCoresUser"`   // コアUser内訳
	CpuCoresSystem []float64 `json:"cpuCoresSystem"` // コアSystem内訳
	ECoreCount     int       `json:"eCoreCount"`
	PCoreCount     int       `json:"pCoreCount"`
	GpuUsage       float64   `json:"gpuUsage"`
	GpuPower       float64   `json:"gpuPower"`
	GpuFreq        float64   `json:"gpuFreq"`
	GpuCoreCount   int       `json:"gpuCoreCount"`
	AneUsage       float64   `json:"aneUsage"`
	AnePower       float64   `json:"anePower"`
	MemUsedGB      float64   `json:"memUsedGB"`
	MemTotalGB     float64   `json:"memTotalGB"`
	SwapUsedGB     float64   `json:"swapUsedGB"`
	SwapTotalGB    float64   `json:"swapTotalGB"`
	DramPower      float64   `json:"dramPower"`
	SocTemp        float64   `json:"socTemp"`
	NetSent        float64   `json:"netSent"`
	NetRecv        float64   `json:"netRecv"`
	DiskRead       float64   `json:"diskRead"`
	DiskWrite      float64   `json:"diskWrite"`
	Uptime         uint64    `json:"uptime"`
}

func (a *App) collectMetricsLoop() {
	info := metrics.GetSOCInfo()
	systemName := info.Name

	for {
		m := metrics.SampleSocMetrics(500)
		// 修正: 拡張された戻り値を受け取る
		cpuPercents, cpuCoresUser, cpuCoresSys, avgUser, avgSys, _ := metrics.GetCPUPercentages()

		memStats := metrics.GetMemoryMetrics()
		infoRealtime := metrics.GetSOCInfo()

		netSent, netRecv, _ := metrics.GetNetworkRates()
		diskRead, diskWrite, _ := metrics.GetDiskRates()
		uptime, _ := metrics.GetUptime()

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
			SystemName:     systemName,
			CpuUsage:       avgCpu,
			CpuUser:        avgUser,
			CpuSystem:      avgSys,
			CpuPower:       m.CPUPower,
			CpuCores:       cpuPercents,
			CpuCoresUser:   cpuCoresUser, // 追加
			CpuCoresSystem: cpuCoresSys,  // 追加
			ECoreCount:     infoRealtime.ECoreCount,
			PCoreCount:     infoRealtime.PCoreCount,
			GpuUsage:       m.GPUActive,
			GpuPower:       m.GPUPower,
			GpuFreq:        float64(m.GPUFreqMHz),
			GpuCoreCount:   infoRealtime.GPUCoreCount,
			AneUsage:       anePercent,
			AnePower:       m.ANEPower,
			MemUsedGB:      float64(memStats.Used) / 1024 / 1024 / 1024,
			MemTotalGB:     float64(memStats.Total) / 1024 / 1024 / 1024,
			SwapUsedGB:     float64(memStats.SwapUsed) / 1024 / 1024 / 1024,
			SwapTotalGB:    float64(memStats.SwapTotal) / 1024 / 1024 / 1024,
			DramPower:      m.DRAMPower,
			SocTemp:        float64(m.SocTemp),
			NetSent:        netSent,
			NetRecv:        netRecv,
			DiskRead:       diskRead,
			DiskWrite:      diskWrite,
			Uptime:         uptime,
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

func (a *App) GetProcesses() []metrics.ProcessMetrics {
	procs, err := metrics.GetProcessList()
	if err != nil {
		fmt.Println("Error fetching processes:", err)
		return []metrics.ProcessMetrics{}
	}
	return procs
}
