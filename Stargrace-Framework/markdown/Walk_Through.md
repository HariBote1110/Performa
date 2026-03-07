# Walk Through: Phase 4 `.app` 生成と起動

## 前提

* macOS 上で `go` と `swift` が利用可能であること。
* GUI アプリを起動できるセッションであること。

## 手順

1. 依存環境が利用可能かを確認する。

```bash
go version
swift --version
```

2. `.app` バンドルを生成する。

```bash
make bundle-app
```

3. 生成物を確認する。

```bash
ls -la dist/Stargrace.app/Contents/MacOS
```

4. バンドルを起動する。

```bash
make run-app
```

5. 起動後に `+1` `-1` `Reset` をクリックし、`Count` が更新されることを確認する。
6. `TextField` に任意文字列を入力して Enter を押し、`Notes` の `List` に追加されることを確認する。
7. `Event Log` が `ScrollView` 内で更新されることを確認する。
8. メニューバー `Stargrace` から `外観` を切り替え、ライト/ダーク表示が反映されることを確認する。

## iOS 表示崩れ緩衝の確認

1. iOS 向け IPA を生成する。

```bash
make bundle-ipa
```

2. 生成した `dist-ios/StargraceRenderer.ipa` を AltStore で再署名して端末へ入れる。
3. iPhone 縦向き（コンパクト幅）で起動し、`Count` 行の操作群が横詰まりせず縦積みになることを確認する。
4. 画面全体を縦スクロールして、`Notes` と `Event Log` まで到達できることを確認する。
5. `TextField` のキーボード送信ラベルが `完了` になっていることを確認する。

## 折れ線グラフサンプルの確認

1. linechart モードで開発起動する。

```bash
MODE=linechart MESSAGE="Task Manager Style Graph" make dev
```

2. 画面の折れ線グラフが 1 秒ごとに更新されることを確認する。
3. `最新値` 表示が同じ周期で変化することを確認する。
4. 反映レート上限を確認したい場合は `STARGRACE_RENDER_MAX_FPS=20` を併用する。

## 補助確認

署名を省略して生成する場合:

```bash
./scripts/build_app.sh --no-sign
```

バンドル識別子と出力先を変更する場合:

```bash
./scripts/build_app.sh --bundle-id com.example.stargrace --output-dir ./artifacts
```
