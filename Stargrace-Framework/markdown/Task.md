# Task: ランダム値更新の折れ線グラフサンプル追加

## 背景

最適化した更新パイプラインの実効性を確認するため、実際に 1 秒ごとに値が変化する折れ線グラフのサンプルが必要。
Controller / Schema / Renderer を通した end-to-end の動作検証を可能にする。

## 目的

* `linechart` コンポーネントを SDUI スキーマへ追加する。
* サンプルアプリに 1 秒ごとのランダム値更新モードを追加する。
* Renderer で折れ線グラフを描画し、最新値の変化を視覚確認できるようにする。
* `make dev` 経由で即座に挙動確認できる手順を整備する。

## 完了条件

* `controller/cmd/stargrace-controller --mode linechart` が動作する。
* `linechart` ノードが Renderer で描画される。
* `MODE=linechart make dev` で 1 秒ごとに折れ線が更新される。
* `swift build --package-path ./renderer` と `go test ./...` が成功する。
