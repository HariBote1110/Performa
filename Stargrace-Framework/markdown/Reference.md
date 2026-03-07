# Stargrace Framework リファレンス

## 1. このドキュメントの位置づけ

本ドキュメントは、**Phase 4 時点**の Stargrace Framework における実装済み仕様をまとめたリファレンスです。  
詳細な背景や計画は `project.md` `Task.md` `Implementation_Plan.md` を参照してください。

## 2. 概要

Stargrace Framework は、Go で UI 構造とイベント処理を記述し、SwiftUI でネイティブ描画する macOS 向け SDUI フレームワークです。

* Controller (Go): UI ドキュメント生成、イベント処理、状態管理
* Renderer (SwiftUI): 動的 View 生成、ユーザー操作のイベント送信
* IPC: Unix Domain Socket (UDS) を利用
* シリアライズ: Binary Property List (binary plist)

## 3. 動作要件

* macOS 13.0 以上
* iOS / iPadOS 16.0 以上（`embedded` モード）
* Go 1.25.0 以上（`go.mod` 基準）
* Swift 6 系（`renderer/Package.swift` 基準）

## 4. クイックスタート

### 4.1 開発起動

```bash
make dev
```

既定値:

* Render Socket: `/tmp/stargrace.sock`
* Event Socket: `/tmp/stargrace-events.sock`
* Mode: `counter`
* Message: `Stargrace Counter`

### 4.2 `.app` バンドル生成

```bash
make bundle-app
```

### 4.3 `.app` 起動

```bash
make run-app
```

### 4.4 検証コマンド

```bash
go test ./...
swift build --package-path ./renderer
```

### 4.5 iOS / iPadOS 用 IPA 生成（未署名）

```bash
make bundle-ipa
```

AltStore で再署名してインストールする前提。

## 5. Controller CLI リファレンス

実行バイナリ: `controller/cmd/stargrace-controller`

### 5.1 フラグ

* `--socket` (default: `/tmp/stargrace.sock`)  
  Render メッセージ送信先 UDS
* `--event-socket` (default: `/tmp/stargrace-events.sock`)  
  Event 受信待受 UDS
* `--message` (default: `Stargrace Counter`)  
  `text`/`render`/`counter`/`linechart` モードで利用する表示文字列
* `--mode` (default: `counter`)  
  `counter` / `interactive` / `linechart` / `render` / `sdui` / `text`
* `--retries` (default: `40`)  
  Render ソケット接続のリトライ回数
* `--retry-interval` (default: `250ms`)  
  Render ソケット接続のリトライ間隔

### 5.2 モード別挙動

* `text`: `--message` のプレーンテキストを送信
* `render` / `sdui`: 固定レイアウトの Render ドキュメントを binary plist で送信
* `counter` / `interactive`: Counter 状態を保持し、イベント受信ごとに再レンダリング
* `linechart`: 1 秒ごとにランダム値を生成し、折れ線グラフ用ドキュメントを再送

### 5.3 イベント受信仕様

* Event Socket で 1 メッセージずつ受信
* binary plist の `event` を優先解析
* plist 解析失敗時はプレーン文字列を `action` として扱う
* `type` が存在する場合は `event` 以外を拒否

## 6. Renderer リファレンス

実行バイナリ: `renderer` パッケージの `StargraceRenderer`

### 6.1 環境変数

* `STARGRACE_SOCKET_PATH`  
  Render 受信ソケット（default: `/tmp/stargrace.sock`）
* `STARGRACE_EVENT_SOCKET_PATH`  
  Event 送信ソケット（default: `/tmp/stargrace-events.sock`）
* `STARGRACE_CONTROLLER_PATH`  
  起動する Controller バイナリの明示パス
* `STARGRACE_BOOTSTRAP_MODE`  
  Controller 起動モード（default: `counter`）
* `STARGRACE_BOOTSTRAP_MESSAGE`  
  Controller 起動時メッセージ（default: `Stargrace Counter`）
* `STARGRACE_RUNTIME_MODE`  
  `auto` / `socket` / `embedded`（default: `auto`、macOS は `socket`、iOS は `embedded`）
* `STARGRACE_RENDER_MAX_FPS`  
  render 反映上限 FPS（default: `30`、範囲: `1..120`）

### 6.2 Controller 自動検出ルール

1. `STARGRACE_CONTROLLER_PATH` が指定されていればそれを使用
2. 未指定の場合、Renderer 実行ファイルと同じディレクトリにある `stargrace-controller` を探索
3. 見つからない場合、Controller 起動をスキップ

### 6.3 メニュー機能

`CommandMenu("Stargrace")` で以下を提供:

* `+1`（`Cmd+=`）
* `-1`（`Cmd+-`）
* `Reset`（`Cmd+0`）
* 外観切替（`システム` `ライト` `ダーク`）

### 6.4 iOS 表示崩れ緩衝

`iOS` のコンパクト幅では、macOS 前提 UI の崩れを抑えるために Renderer 側で以下を自動適用する。

* ルートビューを `ScrollView` ラップし、縦方向オーバーフローを吸収。
* `hstack` は子要素が多い場合に `vstack` へフォールバック。
* `list` / `scrollview` の高さレンジを縮小して画面圧迫を抑制。
* ボタンスタイルを `bordered` へ切り替えて横方向圧迫を軽減。
* `textfield` に `.submitLabel(.done)` を適用。

### 6.5 リアルタイム更新向け最適化

* 受信 payload は即時反映せず、最新 1 件へ集約（coalescing）して適用。
* payload デコードはバックグラウンドタスクで実行し、MainActor 負荷を削減。
* `STARGRACE_RENDER_MAX_FPS` を超える更新は次回 flush で最新値へ吸収。
* render 受信時の `statusMessage` 更新を抑制し、不要な再描画トリガを減らす。

## 7. SDUI スキーマ

* ワイヤ形式は binary plist（以下は論理構造の例）

### 7.1 Render メッセージ

```text
{
  "type": "render",
  "root": {
    "kind": "vstack",
    "id": "root",
    "spacing": 14,
    "children": []
  }
}
```

### 7.2 Event メッセージ

```text
{
  "type": "event",
  "action": "add_note",
  "value": "my first note"
}
```

### 7.3 フィールド

#### Document

* `type`: `render` 固定
* `root`: ルートノード（`null` は無効）

#### Event

* `type`: `event` 固定
* `action`: 実行する論理アクション
* `value`: 補助入力値（任意）

#### Node 共通

* `kind`: `vstack` / `hstack` / `list` / `scrollview` / `linechart` / `text` / `textfield` / `button`
* `id`: 任意識別子
* `text`: `text` 本文、`button` ラベル
* `placeholder`: `textfield` プレースホルダー
* `value`: `textfield` 初期値
* `values`: `linechart` 用の数値配列（0..100 想定）
* `action`: `button` や `textfield` Submit 時のアクション名
* `spacing`: `vstack` / `hstack` の間隔
* `children`: コンテナノードの子要素

## 8. Go UI DSL リファレンス

パッケージ: `github.com/yuki/stargrace-framework/controller/stargrace/ui`

### 8.1 要素生成関数

* `VStack(children ...*Element) *Element`
* `HStack(children ...*Element) *Element`
* `List(children ...*Element) *Element`
* `ScrollView(children ...*Element) *Element`
* `LineChart(values []float64) *Element`
* `Text(value string) *Element`
* `TextField(value string) *Element`
* `Button(label string) *Element`
* `Document(root *Element) schema.Document`

### 8.2 チェーンメソッド

* `(*Element).ID(value string) *Element`
* `(*Element).Action(value string) *Element`
* `(*Element).Placeholder(value string) *Element`
* `(*Element).Value(value string) *Element`
* `(*Element).Spacing(value float64) *Element`
* `(*Element).Child(children ...*Element) *Element`

`Child()` は `nil` 要素を無視して追加します。

### 8.3 サンプル

```go
root := ui.VStack(
	ui.Text("タイトル").ID("title"),
	ui.HStack(
		ui.Button("Primary").Action("primary_tap"),
		ui.Button("Secondary").Action("secondary_tap"),
	).Spacing(12),
).ID("root").Spacing(16)

doc := ui.Document(root)
```

## 9. 標準 Counter アプリ仕様

`runtime.NewCounterApp(title)` が提供する標準アクション:

* `increment`: カウント +1
* `decrement`: カウント -1
* `reset`: カウントを 0 に戻す
* `add_note`: `value` をメモ一覧に追加（空白のみは無視）

補足:

* Event Log は最大 30 件を保持
* Notes 初期値は `Stargrace Framework` と `Phase 4`
* 未対応アクションは無視（再レンダリングなし）

## 10. 折れ線グラフサンプル仕様

`--mode linechart` が提供する挙動:

* 1 秒ごとに 0..100 のランダム値を生成
* 最新 60 点を `linechart` ノードへ送信
* `title` `linechart` `最新値テキスト` を含むドキュメントを再送

## 11. `.app` バンドル構成

`make bundle-app` 実行時の出力:

```text
dist/
  Stargrace.app/
    Contents/
      Info.plist
      MacOS/
        StargraceRenderer
        stargrace-controller
      Resources/
```

### 11.1 `scripts/build_app.sh` オプション

* `--app-name NAME`
* `--bundle-id ID`
* `--output-dir DIR`
* `--no-sign`（ad-hoc 署名をスキップ）

## 12. 既知の制約（Phase 4）

* シリアライズ方式は binary plist 固定（MessagePack / Protocol Buffers 未導入）
* 差分レンダリングは未実装（イベントごとに全体再送）
* notarization / Developer ID 署名は未対応
* コンポーネントは基本セット（`vstack` `hstack` `list` `scrollview` `linechart` `text` `textfield` `button`）のみ
* iOS / iPadOS は埋め込み Controller 前提で、Renderer からの外部プロセス起動は対象外
