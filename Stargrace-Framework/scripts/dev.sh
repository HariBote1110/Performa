#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOCKET_PATH="${SOCKET_PATH:-/tmp/stargrace.sock}"
EVENT_SOCKET_PATH="${EVENT_SOCKET_PATH:-/tmp/stargrace-events.sock}"
MODE="${MODE:-counter}"
MESSAGE="${MESSAGE:-Stargrace Counter}"
CONTROLLER_BIN="${CONTROLLER_BIN:-${ROOT_DIR}/bin/stargrace-controller}"
SKIP_BUILD=0

usage() {
  cat <<'USAGE'
Stargrace 開発起動スクリプト

使い方:
  ./scripts/dev.sh [--socket PATH] [--event-socket PATH] [--mode counter|linechart|render|text] [--message TEXT] [--skip-build]

オプション:
  --socket PATH     UDS のパスを指定します。
  --event-socket PATH Event Hub 用 UDS のパスを指定します。
  --mode MODE       Controller の送信モードを指定します (counter|linechart|render|text)。
  --message TEXT    初回レンダリングで送るメッセージ本文を指定します。
  --skip-build      Controller のビルドを省略します。
  -h, --help        このヘルプを表示します。
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --socket)
      SOCKET_PATH="$2"
      shift 2
      ;;
    --mode)
      MODE="$2"
      shift 2
      ;;
    --event-socket)
      EVENT_SOCKET_PATH="$2"
      shift 2
      ;;
    --message)
      MESSAGE="$2"
      shift 2
      ;;
    --skip-build)
      SKIP_BUILD=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "不明な引数です: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ "$SKIP_BUILD" -eq 0 ]]; then
  mkdir -p "$(dirname "${CONTROLLER_BIN}")"
  (
    cd "${ROOT_DIR}"
    go build -o "${CONTROLLER_BIN}" ./controller/cmd/stargrace-controller
  )
fi

echo "[stargrace dev] socket=${SOCKET_PATH} event_socket=${EVENT_SOCKET_PATH} mode=${MODE}"

STARGRACE_SOCKET_PATH="${SOCKET_PATH}" \
STARGRACE_EVENT_SOCKET_PATH="${EVENT_SOCKET_PATH}" \
STARGRACE_CONTROLLER_PATH="${CONTROLLER_BIN}" \
STARGRACE_BOOTSTRAP_MODE="${MODE}" \
STARGRACE_BOOTSTRAP_MESSAGE="${MESSAGE}" \
swift run --package-path "${ROOT_DIR}/renderer" StargraceRenderer
