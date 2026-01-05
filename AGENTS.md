# AGENTS.md

## 目的

本プロジェクトは **one sec 型アプリの最小 MVP**として、  
**iOS Safari で特定ドメインを開けなくする仕組み（Safari Web Extension）**を実装する。

本フェーズで実装するのは以下のみ：

- iOS Safari Web Extension
- popup UI によるブロックリストの追加/削除（MVP）
- browser.storage.local に保存したブロックリストに基づくドメインブロック
- DOM を全面置換する Blocked UI
- Expo Dev Client + prebuild による iOS Simulator 動作確認

以下は **本フェーズでは扱わない**：

- アプリ側のアンロック（解除）処理
- 広告 / タスク
- 課金
- アプリ側の設定画面
- Android 対応
- App Store 提出対応

---

## 技術スタック・前提条件

- Package manager：**pnpm（必須）**
- Expo ワークフロー：**Dev Client + prebuild**
  - Expo Go は使用禁止
- iOS：
  - Safari Web Extension
  - iOS App Extension ターゲットが必要
  - Expo Config Plugin によりターゲットを生成する
- サーバー：不要（端末内で完結）
- 実行環境：
  - macOS
  - Xcode
  - iOS Simulator

---

## プロジェクト構造に関する前提（重要）

- 作業ディレクトリ = プロジェクトルート
- プロジェクトルート直下に以下が存在すること：
  - `TODO.md`
  - `AGENTS.md`
  - `package.json`
- Expo プロジェクトは  
  **`pnpm create expo-app .` により、既存ディレクトリをそのまま初期化**する
- 作業中に `cd` によるディレクトリ移動は前提としない

---

## TODO / DONE 運用ルール（厳守）

### TODO.md のルール

- **未完了タスクのみ**を記載する
- 「今やるべきこと」だけが残っている状態を常に保つ
- 完了したタスクを残してはいけない

### 完了（Done）の定義

以下を **すべて満たした場合のみ完了**とする：

1. 実装が完了している
2. `pnpm expo prebuild` および `pnpm expo run:ios` が成功している
3. iOS Simulator の Safari で **実際に挙動を確認できている**

### 完了時の処理

- 該当タスクを **TODO.md から完全に削除**する
- 削除した内容を **DONE.md に完了ログとして追記**する
- `[x]` チェック、コメントアウト、履歴残しは禁止

---

## Safari Web Extension 実装方針

### ブロック対象ドメイン（可変）

- Safari 拡張 popup で追加/削除するドメインを使用
- `browser.storage.local` の `blocklist` に保存する

### ドメイン判定ルール

- `location.hostname` を使用する
- 先頭の `www.` を除去して正規化してから比較する

### ブロック方法

- 対象ドメインの場合：
  - `document.documentElement.innerHTML = ...` により  
    **DOM を全面的に置換**する
- 元ページの UI / JavaScript が一切使えない状態にする
- Blocked UI は **静的 HTML を基本**とする

### Blocked UI の最小要件

- タイトル：`Blocked`
- 説明文：`This site is blocked by your settings.`
- ブロックされたドメイン名の表示
- ボタン（将来用・今はダミーで可）：
  - `Open app`
  - `Close`

### 推奨（任意だが望ましい）

- SPA 対策として以下をフックし、URL 遷移時にも再判定する：
  - `history.pushState`
  - `history.replaceState`
  - `popstate`

---

## ビルド・動作確認ルール（必須）

### 使用コマンド

すべて **pnpm** を使用すること。

```bash
pnpm expo prebuild -p ios --clean
pnpm expo run:ios
```
