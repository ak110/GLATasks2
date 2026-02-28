# 開発手順

## 作業ディレクトリ

**すべての `make` コマンドはプロジェクトルートから実行すること。**

```bash
cd /path/to/glatasks
make test  # OK
```

`app/` に移動して実行すると `${PWD}` がずれて Makefile 内のパス解決が狂うため、必ずルートから実行する。

## 開発環境構築手順

1. 本リポジトリをcloneする。
2. [pre-commit](https://pre-commit.com/)フックをインストールする。

   ```bash
   pre-commit install
   ```

3. 起動する。

   ```bash
   make deploy
   ```

## make コマンド一覧

| コマンド                   | 説明                                                     |
| -------------------------- | -------------------------------------------------------- |
| `make deploy`              | ビルド → 停止 → 起動                                     |
| `make start` / `make stop` | 起動 / 停止                                              |
| `make format`              | コード整形 + 軽量 lint（自動修正あり）                   |
| `make test`                | format + lint + 型チェック + e2e（これだけ実行すればOK） |
| `make test-e2e`            | Playwright e2e テストのみ                                |
| `make update`              | 依存パッケージ更新 + テスト                              |
| `make sql`                 | MariaDB コンソール                                       |
| `make logs`                | 全サービスのログ                                         |
| `make ps`                  | コンテナ状態確認                                         |
| `make healthcheck`         | ヘルスチェック                                           |

## Docker サービス構成

| サービス | イメージ                          | 役割                                      |
| -------- | --------------------------------- | ----------------------------------------- |
| `web`    | nginx                             | HTTPS 終端（ポート 38180:443）            |
| `app`    | node:lts（開発）/ ghcr.io（本番） | SvelteKit アプリケーション（ポート 3000） |
| `db`     | mariadb:lts                       | データベース                              |

環境変数:

- `COMPOSE_PROFILE`: `development` / `staging` / `production`
- `DATA_DIR`: データ格納ディレクトリ（暗号化キー・JWT 署名鍵・DB データ）
- `DATABASE_URL`: MariaDB 接続 URI（例: `mysql://glatasks:glatasks@db/glatasks`）

## クライアント・サーバー間の通信難読化

本プロジェクトでは諸事情（MITM プロキシ対策）によりクライアント・サーバー間の通信を難読化している。
詳細は [architecture.md](architecture.md) を参照。

関連ソースコード:

- `app/src/lib/crypto.ts`（ブラウザ側 AES-GCM）
- `app/src/lib/server/crypto.ts`（サーバー側 AES-GCM）

## e2e テスト

Playwright を使った e2e テストを `make test-e2e` で実行できる。

```bash
make test-e2e
```

テストコードは `app/tests/` に配置する。
nginx 経由の HTTPS（port 38180）でテストするため、開発環境が起動している必要がある。

- `auth.test.ts` — ログイン・ログアウト・ユーザー登録
- `lists.test.ts` — リスト CRUD（作成・名前変更・非表示・削除）
- `tasks.test.ts` — タスク CRUD（追加・multiline・toggle・編集・移動）
- `share.test.ts` — share/ingest ページ（Chrome 拡張エミュレート）

テストユーザーは `app/tests/global-setup.ts` で初回自動作成される（`e2etest` / `e2etest_password`）。

### Playwright テスト実装の注意点

- **SvelteKit の hydration 完了を待つ**: `waitForSelector` はSSRで描画されるため即返るが、`onMount` の API 呼び出しはまだ完了していない。`page.goto(url, { waitUntil: "networkidle" })` を使うこと。
- **`browser.newContext()` を使う場合は `baseURL` を明示する**: `page.goto("/")` が動くよう `baseURL` を指定すること。
- **セレクタの曖昧さに注意**: `button:has-text("追加")` はサイドバーのリスト追加ボタンにも一致する。`main button:has-text("追加")` のようにスコープを限定すること。

## 開発時の注意点

- 開発中のサーバーサイドコード変更は Vite の HMR で自動反映される。
- JSONボディから受け取る数値は文字列の場合があるため`Number()`で明示変換すること。
  - 例: `Number(data.move_to)` ← `"5" !== 5` になる型不一致を防ぐ
- 日時の取り扱いについて:
  - **DBに保存**: ローカルタイム(Asia/Tokyo)、タイムゾーン情報なしで保存
  - **クライアントに送信**: mysql2 の `timezone: "+09:00"` 設定により `toISOString()` で UTC に変換
  - **クライアントから受信**: `new Date(isoString)` で UTC→Date に変換し、mysql2 が自動的に JST に変換して格納

## GitHub Actionsのデプロイ用SSHキー作成手順

鍵ペアを作成、サーバーに登録:

```bash
ssh-keygen -t ed25519 -C "github-action@GLATasks" -f github_action
ssh-copy-id -i github_action.pub ubuntu@aws.tqzh.tk
```

GitHub に秘密鍵を登録:

- リポジトリ → Settings → Secrets and variables → Actions → New repository secret
  - Name: `SSH_PRIVATE_KEY`
  - Value: `cat github_action` の出力

後始末:

```bash
\rm github_action github_action.pub
```

## リリース手順

事前に`gh`コマンドをインストールして`gh auth login`でログインしておき、以下のコマンドのいずれかを実行。

```bash
gh workflow run release.yml --field="bump=バグフィックス"
gh workflow run release.yml --field="bump=マイナーバージョンアップ"
gh workflow run release.yml --field="bump=メジャーバージョンアップ"
```

<https://github.com/ak110/GLATasks2/actions> で状況を確認できる。
