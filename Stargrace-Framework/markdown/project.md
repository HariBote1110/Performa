# Project Stargrace: macOS Native UI Framework Development Plan

## 1. プロジェクト概要

**Stargrace Framework** は、Go言語を用いてmacOSネイティブUI（SwiftUI）を宣言的に構築するための軽量フレームワークです。ElectronやTauriが抱える「Webエンジンのオーバーヘッド」を排除し、Goの実行速度とSwiftUIの美しさを最小限のメモリフットプリントで実現します。

### コア・コンセプト

* **Go-First:** 開発者はUI定義からロジックまで、すべてをGoで完結させる。
* **Native-Only:** Webviewを一切使用せず、システム標準のコンポーネントのみを使用。
* **Zero-Swift (for users):** ユーザーはSwiftコードを書く必要がない。
* **Server-Driven UI (SDUI):** UIの状態と構造をGo（Controller）からSwift（Renderer）へストリーミングする。

---

## 2. システムアーキテクチャ

システムは2つの独立したプロセスで構成され、高速なIPC（プロセス間通信）で接続されます。

### A. Stargrace Controller (Go)

* **UI DSL:** Goの構造体を用いた宣言的なUI記述インターフェース。
* **State Store:** アプリケーションの状態管理。
* **Event Hub:** Swift側から送られてくるユーザー操作（Click, Input等）の購読と処理。
* **IPC Client:** レンダリング命令をシリアライズして送信。

### B. Stargrace Renderer (Swift / SwiftUI)

* **Bootstrapper:** Goプロセスをサブプロセスとして起動・管理。
* **Component Mapper:** 受信したJSON/MessagePackデータを解析し、対応するSwiftUI Viewを動的に生成。
* **Event Forwarder:** ユーザーイベントをキャプチャし、Go側にバイナリ形式で送出。

---

## 3. 技術スタック選定

| コンポーネント | 技術 | 理由 |
| --- | --- | --- |
| **Main Logic** | Go 1.2x+ | 高い生産性、バイナリの配布性、低メモリ消費。 |
| **UI Engine** | SwiftUI | macOS最新の宣言的UIフレームワーク。 |
| **Communication** | Unix Domain Sockets (UDS) | ローカル通信において最も低遅延かつセキュア。 |
| **Serialization** | MessagePack or Protocol Buffers | JSONより高速で型安全、ペイロードが小さい。 |

---

## 4. 開発ロードマップ（フェーズ別）

### Phase 1: PoC (Proof of Concept) - "Hello Stargrace"

* Swift側でUDSサーバーを立て、文字列を受信して `Text()` に表示する。
* Go側で文字列をUDSに流し込む単純なクライアントを作成。
* **ゴール:** Goから送った文字がmacOSのウィンドウに表示されること。

### Phase 2: SDUI 基礎実装

* UIを定義する共通スキーマ（Schema）の策定。
* `VStack`, `HStack`, `Button`, `Text` の基本4コンポーネントの実装。
* Go側での簡単なDSL（メソッドチェーン形式）の構築。

### Phase 3: 双方向インタラクション

* ボタンクリックイベントのGoへの通知。
* Go側での状態更新に追従したSwiftUI側の「差分レンダリング」の最適化。
* **ゴール:** 「カウンタアプリ」がGoのロジックだけで完結すること。

### Phase 4: エコシステムと配布

* `.app` バンドル作成ツールの提供（Goバイナリを `Contents/MacOS/` に埋め込む）。
* 複雑なコンポーネント（List, ScrollView, TextField）の追加。
* ダークモード、ネイティブメニューバーへの対応。

---

## 5. 直面が予想される課題 (Risks)

1. **レンダリングパフォーマンス:** 大量のコンポーネントを毎秒更新する場合のシリアライズ・オーバーヘッド。
* *対策:* 変更があった部分のみを送るパッチ更新（Diffing）を導入。


2. **SwiftUIの動的生成:** SwiftUIはコンパイル時の型チェックが厳しいため、動的なView生成には `AnyView` やカスタムモディファイアの工夫が必要。
3. **OSのバージョン依存:** SwiftUIの機能がOSバージョンによって異なるため、互換性の担保が必要。