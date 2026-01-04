# TODO (current) — one sec MVP (A 案 / iOS Safari Extension)

目的:

- iOS Safari で `youtube.com` / `x.com` / `twitter.com` を開いたら、
  ページ本体を表示せず Blocked UI を表示する最小 MVP を実装する。
- ブロック対象は Safari Web Extension 側でハードコードする。
- 解除 / 広告 / 課金 / 設定 UI / Android はこのフェーズでは扱わない。

前提:

- 作業ディレクトリ = プロジェクトルート
- このディレクトリ直下に `TODO.md` / `AGENTS.md` が存在している
- package manager は pnpm 固定
- Expo Go は使わず、Dev Client + prebuild で進める

---

## 1) プロジェクトルートを Expo プロジェクトとして初期化する

目的:

- 既存ディレクトリ（TODO.md / AGENTS.md が置かれている場所）を
  そのまま Expo プロジェクトにする。
- 後続でディレクトリ移動が発生しない状態を作る。

タスク:

- pnpm を使って、**カレントディレクトリ (`.`)** に Expo アプリを作成する
  - コマンド:
    - `pnpm create expo-app . --template blank-typescript`
- `package.json` / `pnpm-lock.yaml` が生成されていることを確認する

完了条件:

- ディレクトリ移動なしで Expo プロジェクトが初期化されている
- `TODO.md` / `AGENTS.md` がプロジェクト直下に残っている

---

## 2) Expo Dev Client を導入し、pnpm でコマンドが動くことを確認する

目的:

- Expo Go を使わず、iOS App Extension を含む開発ができる状態にする。

タスク:

- `pnpm add expo-dev-client`
- 以下のコマンドがエラーなく動くことを確認する:
  - `pnpm expo --version`
  - `pnpm expo start`（起動確認のみ。すぐ停止して OK）

完了条件:

- pnpm 経由で Expo CLI が動作する
- Dev Client 導入が完了している

---

## 3) Safari Web Extension ターゲットを Config Plugin で追加する

目的:

- iOS App Extension（Safari Web Extension）ターゲットを
  Expo prebuild 時に自動生成できるようにする。

方針:

- `react-native-safari-extension` を利用する
- 設定内容は README に従って正確に記述する

タスク:

- `pnpm add react-native-safari-extension`
- `app.json` または `app.config.ts` に plugin 設定を追加する
- Safari 拡張用ディレクトリを作成する:
  - `safari-extension/`
- `safari-extension/manifest.json` を作成する（MV3）
  - `content_scripts.matches` は広め（例: `<all_urls>`）
  - 実際のブロック判定は content script 側で行う

完了条件:

- prebuild 実行時に Safari 拡張ターゲットが生成される設定が入っている

---

## 4) Safari 拡張の content script を実装する（ドメインブロック）

目的:

- 指定ドメインで Safari ページ本体を見せない状態を作る。

ブロック対象:

- `youtube.com`
- `x.com`
- `twitter.com`
  （hostname は `www.` を除去して正規化する）

タスク:

- content script に以下を実装する:
  - hostname 正規化関数
  - ハードコードされたブロック判定関数
  - DOM を全面置換して Blocked UI を表示する処理
- Blocked UI の最小要件:
  - タイトル: `Blocked`
  - 説明文: `This site is blocked by your settings.`
  - ブロック対象ドメインの表示
  - ダミーボタン（`Open app`, `Close`）
- （任意だが推奨）
  - `pushState` / `replaceState` / `popstate` をフックして
    SPA 遷移時にも再判定する

完了条件:

- 対象ドメインで DOM 置換が実行される状態になっている

---

## 5) iOS prebuild + Simulator 起動を行う

目的:

- Safari Web Extension を含む iOS プロジェクトを生成し、起動できることを確認する。

タスク:

- 以下のコマンドを **pnpm** で実行する:
  - `pnpm expo prebuild -p ios --clean`
  - `pnpm expo run:ios`

完了条件:

- ビルドエラーなく iOS Simulator でアプリが起動する

---

## 6) Safari 拡張を有効化し、実際の動作を確認する

目的:

- Safari で対象ドメインが本当に「開けない」ことを確認する。

手動確認タスク:

- iOS 設定 → Safari → 機能拡張（Extensions）
  - 本アプリの拡張を ON
  - 必要に応じて「すべての Web サイトで許可」も ON
- Safari で以下を確認:
  - Blocked UI が表示される:
    - `https://youtube.com`
    - `https://x.com`
    - `https://twitter.com`
  - 通常表示される:
    - `https://example.com`
    - `https://wikipedia.org`

完了条件:

- 対象ドメインで元ページが表示されず Blocked UI に置換される
- 非対象ドメインは通常表示される

---

## 7) TODO / DONE ファイルを更新する

目的:

- 運用ルールに従い、進捗を正しく反映する。

タスク:

- 完了したタスクを TODO.md から **削除**
- 削除した内容を DONE.md に **完了ログとして追記**
- TODO.md には未完了タスクのみが残っている状態にする

完了条件:

- TODO.md が「次にやること」だけを示している
- DONE.md に今回の完了内容が記録されている
