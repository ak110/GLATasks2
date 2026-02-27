# 開発手順

## 開発環境構築手順

1. 本リポジトリをcloneする。
2. [uvをインストール](https://docs.astral.sh/uv/getting-started/installation/)する。
3. [pre-commit](https://pre-commit.com/)フックをインストールする。

    ```bash
    uv run pre-commit install
    ```

4. 起動する。

    ```bash
    make deploy
    ```

## クライアント・サーバー間の通信難読化

本プロジェクトでは諸事情（MITM プロキシ対策）によりクライアント・サーバー間の通信を難読化している。
詳細は [architecture.md](architecture.md) を参照。

関連ソースコード:

- `frontend/src/lib/crypto.ts`（ブラウザ側 AES-GCM）
- `frontend/src/lib/server/crypto.ts`（サーバー側 AES-GCM）

## e2e テスト

Playwright を使った e2e テストを `make test-e2e` で実行できる。

```bash
make test-e2e
```

テストコードは `frontend/tests/` に配置する。
nginx 経由の HTTPS（port 38180）でテストするため、開発環境が起動している必要がある。

- `auth.test.ts` — ログイン・ログアウト・ユーザー登録
- `lists.test.ts` — リスト CRUD（作成・名前変更・非表示・削除）
- `tasks.test.ts` — タスク CRUD（追加・multiline・toggle・編集・移動）
- `share.test.ts` — share/ingest ページ（Chrome 拡張エミュレート）

テストユーザーは `tests/global-setup.ts` で初回自動作成される（`e2etest` / `e2etest_password`）。

### Playwright テスト実装の注意点

- **SvelteKit の hydration 完了を待つ**: `waitForSelector` はSSRで描画されるため即返るが、`onMount` の API 呼び出しはまだ完了していない。`page.goto(url, { waitUntil: "networkidle" })` を使うこと。
- **`browser.newContext()` を使う場合は `baseURL` を明示する**: `page.goto("/")` が動くよう `baseURL` を指定すること。
- **セレクタの曖昧さに注意**: `button:has-text("追加")` はサイドバーのリスト追加ボタンにも一致する。`main button:has-text("追加")` のようにスコープを限定すること。

## 開発時の注意点

- サーバーサイドのコードを変更した場合は`make hup`でリロードする。
- FastAPIのパスパラメータとJSONボディの型の不一致に注意:
  - FastAPIは `list_id: int` のようにパスパラメータを自動的に整数に変換する
  - クライアントから送られてくるJSONボディ内の値（`move_to` など）は文字列のまま来る場合がある
  - 比較や代入の前に明示的に `int()` で変換すること
    - 例: `move_to = int(data["move_to"])` ← `"5" != 5` になる型不一致を防ぐ

- 日時の取り扱いについて:
  - **DBに保存**: ローカルタイム(Asia/Tokyo)、タイムゾーン情報なしで保存
    - 例: `datetime.datetime.now()` を使用
  - **クライアントに送信**: ローカルタイムをUTC(GMT)に変換してから送信
    - 例: `dt.replace(tzinfo=zoneinfo.ZoneInfo("Asia/Tokyo")).astimezone(zoneinfo.ZoneInfo("UTC")).isoformat()`
  - **クライアントから受信**: UTC→ローカルタイムに変換してからDBに保存
    - 例: `dt.astimezone(zoneinfo.ZoneInfo("Asia/Tokyo")).replace(tzinfo=None)`

## DB関連

```bash
docker compose up --detach db
# docker compose run --rm app alembic init -t async migrations
docker compose run --rm app alembic revision --autogenerate --message=""
make db-up  # docker compose run --rm app alembic upgrade head
make db-down  # docker compose run --rm app alembic downgrade -1
make db-history  # docker compose run --rm app alembic history
```

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
