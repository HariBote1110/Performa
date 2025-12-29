package app

import (
	"os/exec"
	"strconv"
	"strings"
)

// getSOCInfo: CPUのコア構成情報を取得する関数
func getSOCInfo() SystemInfo {
	name, _ := getSysctl("machdep.cpu.brand_string")
	cores := getSysctlInt("hw.physicalcpu")
	
	// 修正: Apple Siliconのperflevelマッピングを変更
	// 多くのMシリーズチップ（Pro/Maxなど）では以下が一般的です
	// Level 0: Performance Cores (Pコア)
	// Level 1: Efficiency Cores (Eコア)
	pCores := getSysctlInt("hw.perflevel0.physicalcpu")
	eCores := getSysctlInt("hw.perflevel1.physicalcpu")
	
	// Intel Macや取得失敗時のフォールバック
	if eCores == 0 && pCores == 0 {
		pCores = cores
	}

	return SystemInfo{
		Name:         name,
		CoreCount:    cores,
		ECoreCount:   eCores,
		PCoreCount:   pCores,
		GPUCoreCount: 0, 
	}
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