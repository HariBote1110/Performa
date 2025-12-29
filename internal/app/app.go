package app

import (
	"fmt"
	"time"

	"github.com/shirou/gopsutil/v4/disk"
	"github.com/shirou/gopsutil/v4/host"
	"github.com/shirou/gopsutil/v4/mem"
	"github.com/shirou/gopsutil/v4/net"
)

// データ取得に必要な変数をここに定義します
var (
	firstRun     = true
	lastCPUTimes []CPUUsage

	// Network metrics state
	lastNetStats []net.IOCountersStat
	lastNetTime  time.Time

	// Disk metrics state
	lastDiskStats map[string]disk.IOCountersStat
	lastDiskTime  time.Time
)

// InitSocMetrics: ハードウェアレポートシステム（ioreport）の初期化
func InitSocMetrics() error {
	// ネットワーク統計の初期値をセット
	lastNetStats, _ = net.IOCounters(false)
	lastNetTime = time.Now()

	// ディスク統計の初期値をセット
	lastDiskStats, _ = disk.IOCounters()
	lastDiskTime = time.Now()

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

// GetNetworkRates: ネットワークの送受信速度 (bytes/sec) を返します
func GetNetworkRates() (float64, float64, error) {
	currentStats, err := net.IOCounters(false)
	if err != nil {
		return 0, 0, err
	}
	currentTime := time.Now()

	if len(lastNetStats) == 0 || len(currentStats) == 0 {
		lastNetStats = currentStats
		lastNetTime = currentTime
		return 0, 0, nil
	}

	duration := currentTime.Sub(lastNetTime).Seconds()
	if duration <= 0 {
		return 0, 0, nil
	}

	sentDiff := float64(currentStats[0].BytesSent - lastNetStats[0].BytesSent)
	recvDiff := float64(currentStats[0].BytesRecv - lastNetStats[0].BytesRecv)

	sentRate := sentDiff / duration
	recvRate := recvDiff / duration

	lastNetStats = currentStats
	lastNetTime = currentTime

	return sentRate, recvRate, nil
}

// GetDiskRates: ディスクの読み書き速度 (bytes/sec) を返します
// 戻り値: (readBytesPerSec, writeBytesPerSec, error)
func GetDiskRates() (float64, float64, error) {
	currentStats, err := disk.IOCounters() // 全ディスクのMapが返る
	if err != nil {
		return 0, 0, err
	}
	currentTime := time.Now()

	if len(lastDiskStats) == 0 {
		lastDiskStats = currentStats
		lastDiskTime = currentTime
		return 0, 0, nil
	}

	duration := currentTime.Sub(lastDiskTime).Seconds()
	if duration <= 0 {
		return 0, 0, nil
	}

	var totalReadDiff, totalWriteDiff float64

	// 各ディスクの差分を合算
	for name, stat := range currentStats {
		if lastStat, ok := lastDiskStats[name]; ok {
			// オーバーフロー対策はgopsutilがuint64で返すのである程度大丈夫だが
			// 再起動などでリセットされた場合は無視するなどのロジックを入れるのがベター
			// ここでは単純な差分を取る
			if stat.ReadBytes >= lastStat.ReadBytes {
				totalReadDiff += float64(stat.ReadBytes - lastStat.ReadBytes)
			}
			if stat.WriteBytes >= lastStat.WriteBytes {
				totalWriteDiff += float64(stat.WriteBytes - lastStat.WriteBytes)
			}
		}
	}

	readRate := totalReadDiff / duration
	writeRate := totalWriteDiff / duration

	lastDiskStats = currentStats
	lastDiskTime = currentTime

	return readRate, writeRate, nil
}

// GetUptime: システムの稼働時間（秒）を取得
func GetUptime() (uint64, error) {
	return host.Uptime()
}

// formatTime: 秒数を文字列形式(例: 1h02:03)に変換するヘルパー関数
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

// GetCoreCounts: EコアとPコアの数を返します
func GetCoreCounts() (int, int) {
	info := getSOCInfo()
	return info.ECoreCount, info.PCoreCount
}

// GetSOCInfo: システム情報を外部公開するためのラッパー
func GetSOCInfo() SystemInfo {
	return getSOCInfo()
}