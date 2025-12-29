package app

import (
	"os/exec"
	"regexp"
	"strconv"
	"strings"
)

// getSOCInfo: CPUのコア構成情報を取得する関数
func getSOCInfo() SystemInfo {
	name, _ := getSysctl("machdep.cpu.brand_string")
	cores := getSysctlInt("hw.physicalcpu")

	// Level 0: Performance Cores (Pコア)
	// Level 1: Efficiency Cores (Eコア)
	pCores := getSysctlInt("hw.perflevel0.physicalcpu")
	eCores := getSysctlInt("hw.perflevel1.physicalcpu")

	// Intel Macや取得失敗時のフォールバック
	if eCores == 0 && pCores == 0 {
		pCores = cores
	}

	// GPUコア数の取得 (ioregを使用)
	gpuCores := getGPUCoreCount()

	return SystemInfo{
		Name:         name,
		CoreCount:    cores,
		ECoreCount:   eCores,
		PCoreCount:   pCores,
		GPUCoreCount: gpuCores,
	}
}

// getGPUCoreCount: ioregコマンドを使用してGPUコア数を取得
func getGPUCoreCount() int {
	// sysctlで取れる場合 (稀だが念のため)
	if val := getSysctlInt("hw.gpu.count"); val > 0 {
		// 注意: hw.gpu.countはGPUユニット数を返すことがあり、コア数ではない場合があるが
		// Apple Siliconでは通常統合メモリなので1つ。コア数はioregで見るのが確実。
	}

	// ioregコマンドを実行: ioreg -l -w 0
	// 出力から "gpu-core-count" = <数字> を探す
	out, err := exec.Command("ioreg", "-l", "-w", "0").Output()
	if err != nil {
		return 0
	}
	output := string(out)

	// 正規表現で検索
	re := regexp.MustCompile(`"gpu-core-count"\s*=\s*(\d+)`)
	matches := re.FindStringSubmatch(output)
	if len(matches) > 1 {
		val, err := strconv.Atoi(matches[1])
		if err == nil {
			return val
		}
	}

	return 0
}

// ヘルパー関数: sysctlコマンドを実行して値を取得
func getSysctl(key string) (string, error) {
	cmd := exec.Command("sysctl", "-n", key)
	out, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(out)), nil
}

// ヘルパー関数: sysctlの結果をintで取得
func getSysctlInt(key string) int {
	valStr, err := getSysctl(key)
	if err != nil {
		return 0
	}
	val, err := strconv.Atoi(valStr)
	if err != nil {
		return 0
	}
	return val
}