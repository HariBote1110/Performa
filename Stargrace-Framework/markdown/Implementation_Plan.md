# Implementation Plan: ランダム値更新の折れ線グラフサンプル追加

## 1. スコープ

* 対象: linechart スキーマ追加、Go サンプルモード追加、SwiftUI 描画追加、確認手順更新。
* 非対象: 複数系列グラフ、ズーム・パン、履歴永続化。

## 2. 実装方針

### スキーマ / DSL 拡張

* `schema.Node` に `kind=linechart` と `values` を追加する。
* `ui.LineChart(values []float64)` を追加して Controller 側構築を簡潔化する。

### Controller サンプルモード

* `--mode linechart` を追加し、1 秒間隔でランダム値（0..100）を生成する。
* 最新 N 点（既定 60 点）を保持して render ドキュメントへ反映する。
* 初回描画を即時送信し、その後 ticker で再送する。

### Renderer 描画

* `ComponentKind.linechart` を追加する。
* `LineChartNodeView` を実装し、グリッド・折れ線・塗りつぶしを描画する。
* 値が空のときは待機表示、1 点のみは点表示にフォールバックする。

## 3. 受け入れ検証

* ビルド検証: `swift build --package-path ./renderer`
* テスト検証: `go test ./...`
* 開発起動検証: `MODE=linechart make dev`
* UI 検証: 1 秒ごとに折れ線グラフが更新され、最新値表示が変化すること。
