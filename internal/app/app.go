package app

import (
	"fmt"
	"github.com/shirou/gopsutil/v4/mem"
)

// データ取得に必要な変数をここに定義します
var (
	firstRun     = true
	// 修正: 型を cpu.TimesStat から、types.goで定義した CPUUsage に変更
	lastCPUTimes []CPUUsage
)

// InitSocMetrics: ハードウェアレポートシステム（ioreport）の初期化
func InitSocMetrics() error {
	return initSocMetrics()
}

// CleanupSocMetrics: 終了時のクリーンアップ
func CleanupSocMetrics() {
	cleanupSocMetrics()
}

// SampleSocMetrics: 現在のSoCメトリクス（電力、GPUなど）を取得
func SampleSocMetrics(duration int) SocMetrics {
	return sampleSocMetrics(duration)
}

// GetCPUPercentages: CPU使用率の計算
func GetCPUPercentages() ([]float64, error) {
	// 修正: GetCPUUsage() は []CPUUsage を返す前提
	currentTimes, err := GetCPUUsage()
	if err != nil {
		return nil, err
	}
	
	if firstRun {
		lastCPUTimes = currentTimes
		firstRun = false
		return make([]float64, len(currentTimes)), nil
	}

	percentages := make([]float64, len(currentTimes))
	for i := range currentTimes {
		// CPU時間の差分計算
		totalDelta := (currentTimes[i].User - lastCPUTimes[i].User) +
			(currentTimes[i].System - lastCPUTimes[i].System) +
			(currentTimes[i].Idle - lastCPUTimes[i].Idle) +
			(currentTimes[i].Nice - lastCPUTimes[i].Nice)

		activeDelta := (currentTimes[i].User - lastCPUTimes[i].User) +
			(currentTimes[i].System - lastCPUTimes[i].System) +
			(currentTimes[i].Nice - lastCPUTimes[i].Nice)

		if totalDelta > 0 {
			percentages[i] = (activeDelta / totalDelta) * 100.0
		}
		
		if percentages[i] < 0 {
			percentages[i] = 0
		} else if percentages[i] > 100 {
			percentages[i] = 100
		}
	}
	
	lastCPUTimes = currentTimes
	return percentages, nil
}

// GetMemoryMetrics: メモリ情報の取得
func GetMemoryMetrics() MemoryMetrics {
	v, _ := mem.VirtualMemory()
	s, _ := mem.SwapMemory()

	return MemoryMetrics{
		Total:     v.Total,
		Used:      v.Used,
		Available: v.Available,
		SwapTotal: s.Total,
		SwapUsed:  s.Used,
	}
}

// formatTime: 秒数を文字列形式(例: 1h02:03)に変換するヘルパー関数
// processes.go で使用されています
func formatTime(seconds float64) string {
	hours := int(seconds) / 3600
	minutes := (int(seconds) / 60) % 60
	secs := int(seconds) % 60
	centisecs := int((seconds - float64(int(seconds))) * 100)

	if hours > 0 {
		return fmt.Sprintf("%dh%02d:%02d", hours, minutes, secs)
	}
	return fmt.Sprintf("%02d:%02d.%02d", minutes, secs, centisecs)
}
// --- 以下をファイルの末尾に追記してください ---

// GetCoreCounts: EコアとPコアの数を返します
func GetCoreCounts() (int, int) {
	// detection.go にある情報を利用
	info := getSOCInfo()
	return info.ECoreCount, info.PCoreCount
}
// GetSOCInfo: システム情報を外部公開するためのラッパー
func GetSOCInfo() SystemInfo {
	return getSOCInfo() // detection.go 内の関数を呼ぶ
}