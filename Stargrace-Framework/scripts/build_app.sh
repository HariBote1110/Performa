#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_NAME="Stargrace.app"
BUNDLE_ID="com.yuki.stargrace"
OUTPUT_DIR="${ROOT_DIR}/dist"
SIGN_BUNDLE=1

usage() {
  cat <<'USAGE'
Stargrace .app バンドル作成スクリプト

使い方:
  ./scripts/build_app.sh [--app-name NAME] [--bundle-id ID] [--output-dir DIR] [--no-sign]

オプション:
  --app-name NAME   生成する .app 名称を指定します (既定: Stargrace.app)。
  --bundle-id ID    CFBundleIdentifier を指定します。
  --output-dir DIR  出力先ディレクトリを指定します。
  --no-sign         ad-hoc 署名を行わずに出力します。
  -h, --help        このヘルプを表示します。
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --app-name)
      APP_NAME="$2"
      shift 2
      ;;
    --bundle-id)
      BUNDLE_ID="$2"
      shift 2
      ;;
    --output-dir)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --no-sign)
      SIGN_BUNDLE=0
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

APP_PATH="${OUTPUT_DIR}/${APP_NAME}"
CONTENTS_DIR="${APP_PATH}/Contents"
MACOS_DIR="${CONTENTS_DIR}/MacOS"
RESOURCES_DIR="${CONTENTS_DIR}/Resources"
INFO_PLIST="${CONTENTS_DIR}/Info.plist"

mkdir -p "${OUTPUT_DIR}"
rm -rf "${APP_PATH}"
mkdir -p "${MACOS_DIR}" "${RESOURCES_DIR}"

echo "[stargrace bundle] release build を開始します"

(
  cd "${ROOT_DIR}"
  go build -o "${MACOS_DIR}/stargrace-controller" ./controller/cmd/stargrace-controller
)

swift build --package-path "${ROOT_DIR}/renderer" -c release >/dev/null
RENDERER_BIN_DIR="$(
  swift build --package-path "${ROOT_DIR}/renderer" -c release --show-bin-path
)"
cp "${RENDERER_BIN_DIR}/StargraceRenderer" "${MACOS_DIR}/StargraceRenderer"

chmod +x "${MACOS_DIR}/StargraceRenderer" "${MACOS_DIR}/stargrace-controller"

cat > "${INFO_PLIST}" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>ja</string>
  <key>CFBundleExecutable</key>
  <string>StargraceRenderer</string>
  <key>CFBundleIdentifier</key>
  <string>${BUNDLE_ID}</string>
  <key>CFBundleName</key>
  <string>${APP_NAME%.app}</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>LSMinimumSystemVersion</key>
  <string>13.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
EOF

if [[ "${SIGN_BUNDLE}" -eq 1 ]]; then
  echo "[stargrace bundle] ad-hoc 署名を実施します"
  codesign --force --sign - --timestamp=none "${MACOS_DIR}/stargrace-controller"
  codesign --force --sign - --timestamp=none "${MACOS_DIR}/StargraceRenderer"
  codesign --force --sign - --timestamp=none "${APP_PATH}"
fi

echo "[stargrace bundle] 完了: ${APP_PATH}"
