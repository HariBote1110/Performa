ROOT_DIR := $(shell pwd)
BIN_DIR := $(ROOT_DIR)/bin
DIST_DIR := $(ROOT_DIR)/dist
IOS_DIST_DIR := $(ROOT_DIR)/dist-ios
CONTROLLER_BIN := $(BIN_DIR)/stargrace-controller
DEV_SCRIPT := $(ROOT_DIR)/scripts/dev.sh
BUILD_APP_SCRIPT := $(ROOT_DIR)/scripts/build_app.sh
BUILD_IPA_SCRIPT := $(ROOT_DIR)/scripts/build_ipa.sh
SOCKET_PATH ?= /tmp/stargrace.sock
EVENT_SOCKET_PATH ?= /tmp/stargrace-events.sock
MODE ?= counter
MESSAGE ?= Stargrace Counter
APP_NAME ?= Stargrace.app
BUNDLE_ID ?= com.yuki.stargrace
IOS_APP_NAME ?= StargraceRenderer
IOS_DISPLAY_NAME ?= Stargrace Renderer
IOS_BUNDLE_ID ?= com.yuki.stargrace.ios
IOS_VERSION ?= 0.1.0-Beta-1c
IOS_BUILD_NUMBER ?= 1
IOS_MIN_VERSION ?= 16.0

.PHONY: build-controller run-controller build-renderer run-renderer dev dev-text bundle-app run-app bundle-ipa clean

build-controller:
	@mkdir -p "$(BIN_DIR)"
	go build -o "$(CONTROLLER_BIN)" ./controller/cmd/stargrace-controller

run-controller: build-controller
	"$(CONTROLLER_BIN)" --socket "$(SOCKET_PATH)" --event-socket "$(EVENT_SOCKET_PATH)" --mode "$(MODE)" --message "$(MESSAGE)"

build-renderer:
	swift build --package-path ./renderer

dev:
	"$(DEV_SCRIPT)" --socket "$(SOCKET_PATH)" --event-socket "$(EVENT_SOCKET_PATH)" --mode "$(MODE)" --message "$(MESSAGE)"

dev-text:
	"$(DEV_SCRIPT)" --socket "$(SOCKET_PATH)" --event-socket "$(EVENT_SOCKET_PATH)" --mode "text" --message "$(MESSAGE)"

run-renderer: dev

bundle-app:
	"$(BUILD_APP_SCRIPT)" --app-name "$(APP_NAME)" --bundle-id "$(BUNDLE_ID)" --output-dir "$(DIST_DIR)"

run-app: bundle-app
	open "$(DIST_DIR)/$(APP_NAME)"

bundle-ipa:
	"$(BUILD_IPA_SCRIPT)" \
		--output-dir "$(IOS_DIST_DIR)" \
		--app-name "$(IOS_APP_NAME)" \
		--display-name "$(IOS_DISPLAY_NAME)" \
		--bundle-id "$(IOS_BUNDLE_ID)" \
		--version "$(IOS_VERSION)" \
		--build-number "$(IOS_BUILD_NUMBER)" \
		--min-ios "$(IOS_MIN_VERSION)"

clean:
	rm -rf "$(BIN_DIR)"
	rm -rf "$(DIST_DIR)"
	rm -rf "$(IOS_DIST_DIR)"
	rm -f "$(SOCKET_PATH)"
	rm -f "$(EVENT_SOCKET_PATH)"
