# Schema: Phase 4 双方向 SDUI

## 伝送形式

* SDUI モードでは、Controller -> Renderer、Renderer -> Controller ともに **Binary Property List (binary plist)** を使用する。
* 1 接続につき 1 メッセージを送信し、送信後に接続をクローズする。
* `embedded` モードではプロセス間通信を使わず、同一プロセス内で同じ論理構造を扱う。
* 下記は **論理構造** を示す（ワイヤ上は JSON ではない）。

## Render メッセージ

```text
{
  "type": "render",
  "root": {
    "kind": "vstack",
    "id": "root",
    "spacing": 16,
    "children": []
  }
}
```

## Event メッセージ

```text
{
  "type": "event",
  "action": "add_note",
  "value": "my first note"
}
```

## フィールド定義

### Render

* `type`: `render` 固定。
* `root`: ルートコンポーネント。`null` は無効扱い。

### ノード共通

* `kind`: `vstack` / `hstack` / `list` / `scrollview` / `linechart` / `text` / `textfield` / `button`
* `id`: 任意の識別子
* `spacing`: `vstack` / `hstack` で利用
* `children`: `vstack` / `hstack` の子ノード配列
* `values`: `linechart` のプロット値配列（0..100 想定）
* `text`: `text` の内容、`button` のラベル
* `placeholder`: `textfield` のプレースホルダー
* `value`: `textfield` の初期値
* `action`: `button` の論理アクション名

### Event

* `type`: `event` 固定。
* `action`: `button` クリック時に送る論理アクション名。
* `value`: `textfield` 送信時の入力値（任意）。

## 方針メモ

* 低遅延化のため、テキスト JSON から binary plist へ移行済み。
* 将来的には MessagePack または Protocol Buffers の導入余地を残す。
