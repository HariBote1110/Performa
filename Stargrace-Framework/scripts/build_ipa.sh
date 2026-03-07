#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RENDERER_DIR="${ROOT_DIR}/renderer"
OUTPUT_DIR="${ROOT_DIR}/dist-ios"
APP_NAME="StargraceRenderer"
DISPLAY_NAME="Stargrace Renderer"
BUNDLE_ID="com.yuki.stargrace.ios"
VERSION="0.1.0-Beta-1c"
BUILD_NUMBER="1"
MIN_IOS="16.0"
DERIVED_DATA="${ROOT_DIR}/.build/ios-derived"
DEVELOPER_DIR_PATH="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"

usage() {
  cat <<'USAGE'
Stargrace unsigned IPA 生成スクリプト（AltStore 向け）

使い方:
  ./scripts/build_ipa.sh [--output-dir DIR] [--app-name NAME] [--display-name NAME] [--bundle-id ID]
                         [--version VER] [--build-number NUM] [--min-ios VER] [--developer-dir DIR]

オプション:
  --output-dir DIR     IPA 出力先ディレクトリ (既定: ./dist-ios)
  --app-name NAME      .app 内の実行ファイル名 / バンドル名 (既定: StargraceRenderer)
  --display-name NAME  アプリ表示名 (既定: Stargrace Renderer)
  --bundle-id ID       CFBundleIdentifier (既定: com.yuki.stargrace.ios)
  --version VER        CFBundleShortVersionString (既定: 0.1.0-Beta-1c)
  --build-number NUM   CFBundleVersion (既定: 1)
  --min-ios VER        MinimumOSVersion (既定: 16.0)
  --developer-dir DIR  DEVELOPER_DIR (既定: /Applications/Xcode.app/Contents/Developer)
  -h, --help           このヘルプを表示
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --output-dir)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --app-name)
      APP_NAME="$2"
      shift 2
      ;;
    --display-name)
      DISPLAY_NAME="$2"
      shift 2
      ;;
    --bundle-id)
      BUNDLE_ID="$2"
      shift 2
      ;;
    --version)
      VERSION="$2"
      shift 2
      ;;
    --build-number)
      BUILD_NUMBER="$2"
      shift 2
      ;;
    --min-ios)
      MIN_IOS="$2"
      shift 2
      ;;
    --developer-dir)
      DEVELOPER_DIR_PATH="$2"
      shift 2
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

if [[ ! -d "${DEVELOPER_DIR_PATH}" ]]; then
  echo "DEVELOPER_DIR が見つかりません: ${DEVELOPER_DIR_PATH}" >&2
  exit 1
fi

if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "xcodebuild が見つかりません" >&2
  exit 1
fi

if ! command -v zip >/dev/null 2>&1; then
  echo "zip コマンドが見つかりません" >&2
  exit 1
fi

IPA_NAME="${APP_NAME}.ipa"
APP_BUNDLE_NAME="${APP_NAME}.app"
STAGE_DIR="${OUTPUT_DIR}/.ipa-stage"
APP_BUNDLE_DIR="${STAGE_DIR}/Payload/${APP_BUNDLE_NAME}"
PRODUCT_BIN="${DERIVED_DATA}/Build/Products/Release-iphoneos/StargraceRenderer"
IPA_PATH="${OUTPUT_DIR}/${IPA_NAME}"

cleanup() {
  rm -rf "${STAGE_DIR}"
}
trap cleanup EXIT

mkdir -p "${OUTPUT_DIR}"
rm -rf "${DERIVED_DATA}" "${STAGE_DIR}" "${IPA_PATH}"

printf '[stargrace ipa] iOS build を開始します\n'
(
  cd "${RENDERER_DIR}"
  DEVELOPER_DIR="${DEVELOPER_DIR_PATH}" \
  xcodebuild \
    -scheme StargraceRenderer \
    -configuration Release \
    -destination "generic/platform=iOS" \
    -derivedDataPath "${DERIVED_DATA}" \
    CODE_SIGNING_ALLOWED=NO \
    CODE_SIGNING_REQUIRED=NO \
    build
)

if [[ ! -x "${PRODUCT_BIN}" ]]; then
  echo "ビルド生成物が見つかりません: ${PRODUCT_BIN}" >&2
  exit 1
fi

mkdir -p "${APP_BUNDLE_DIR}"
cp "${PRODUCT_BIN}" "${APP_BUNDLE_DIR}/${APP_NAME}"
chmod +x "${APP_BUNDLE_DIR}/${APP_NAME}"

cat > "${APP_BUNDLE_DIR}/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key>
  <string>${DISPLAY_NAME}</string>
  <key>CFBundleDisplayName</key>
  <string>${DISPLAY_NAME}</string>
  <key>CFBundleIdentifier</key>
  <string>${BUNDLE_ID}</string>
  <key>CFBundleExecutable</key>
  <string>${APP_NAME}</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>${VERSION}</string>
  <key>CFBundleVersion</key>
  <string>${BUILD_NUMBER}</string>
  <key>LSRequiresIPhoneOS</key>
  <true/>
  <key>MinimumOSVersion</key>
  <string>${MIN_IOS}</string>
  <key>UIDeviceFamily</key>
  <array>
    <integer>1</integer>
    <integer>2</integer>
  </array>
  <key>UIApplicationSceneManifest</key>
  <dict>
    <key>UIApplicationSupportsMultipleScenes</key>
    <false/>
  </dict>
</dict>
</plist>
PLIST

(
  cd "${STAGE_DIR}"
  zip -qry "${IPA_PATH}" Payload
)

printf '[stargrace ipa] 完了: %s\n' "${IPA_PATH}"
printf '[stargrace ipa] 署名なし IPA です。AltStore 側で再署名して利用してください。\n'
