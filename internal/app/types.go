package app

type CPUUsage struct {
	User   float64
	System float64
	Idle   float64
	Nice   float64
}

type CPUMetrics struct {
	EClusterActive, EClusterFreqMHz, PClusterActive, PClusterFreqMHz int
	ECores, PCores                                                   []int
	CoreMetrics                                                      map[string]int
	ANEW, CPUW, GPUW, DRAMW, GPUSRAMW, PackageW, SystemW             float64
	CoreUsages                                                       []float64
	Throttled                                                        bool
	CPUTemp                                                          float64
	GPUTemp                                                          float64
}

type SystemInfo struct {
	Name         string `json:"name"`
	CoreCount    int    `json:"core_count"`
	ECoreCount   int    `json:"e_core_count"`
	PCoreCount   int    `json:"p_core_count"`
	GPUCoreCount int    `json:"gpu_core_count"`
}

type NetDiskMetrics struct {
	OutPacketsPerSec  float64 `json:"out_packets_per_sec"`
	OutBytesPerSec    float64 `json:"out_bytes_per_sec"`
	InPacketsPerSec   float64 `json:"in_packets_per_sec"`
	InBytesPerSec     float64 `json:"in_bytes_per_sec"`
	ReadOpsPerSec     float64 `json:"read_ops_per_sec"`
	WriteOpsPerSec    float64 `json:"write_ops_per_sec"`
	ReadKBytesPerSec  float64 `json:"read_kbytes_per_sec"`
	WriteKBytesPerSec float64 `json:"write_kbytes_per_sec"`
}

type GPUMetrics struct {
	FreqMHz       int
	ActivePercent float64
	Power         float64
	Temp          float32
}

// 修正: LastUpdated (time.Time) を削除してWailsの警告を回避
type ProcessMetrics struct {
	PID                                      int
	CPU, LastTime, Memory                    float64
	VSZ, RSS                                 int64
	User, TTY, State, Started, Time, Command string
}

type MemoryMetrics struct {
	Total     uint64 `json:"total"`
	Used      uint64 `json:"used"`
	Available uint64 `json:"available"`
	SwapTotal uint64 `json:"swap_total"`
	SwapUsed  uint64 `json:"swap_used"`
}
