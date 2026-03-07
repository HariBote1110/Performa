# Distribution: `.app` / `.ipa` 配布メモ

## 目的

Phase 4 時点で、個人利用向けに `.app` をローカル生成し配布可能な最小導線を定義する。

## 生成コマンド

```bash
make bundle-app
```

iOS / iPadOS 向け unsigned IPA:

```bash
make bundle-ipa
```

## 出力構成

```
dist/
  Stargrace.app/
    Contents/
      Info.plist
      MacOS/
        StargraceRenderer
        stargrace-controller
      Resources/
```

```
dist-ios/
  StargraceRenderer.ipa
```

## 起動

```bash
make run-app
```

AltStore を使う場合:

1. `dist-ios/StargraceRenderer.ipa` を AltStore に読み込む。
2. AltStore 側で再署名して端末へインストールする。

## 注意点

* 現状は ad-hoc 署名のみで、notarization は未対応。
* 第三者配布で警告を抑止したい場合は、Developer ID 署名と notarization が必要。
* `--no-sign` 指定時は Gatekeeper の警告が増える可能性がある。
* 画面機能として `List` `ScrollView` `TextField` とネイティブメニューバーを含む。
* `make bundle-ipa` の生成物は未署名。AltStore などで再署名して利用する。
