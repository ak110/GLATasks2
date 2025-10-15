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

## 開発時の注意点

- サーバーサイドのコードを変更した場合は`make hup`でリロードする。(クライアントサイドの場合は不要)
- Alpine.jsとTypeScriptの連携について:
  - Alpine.jsのリアクティブデータをTypeScriptに渡す際は、`this`ではなく`$data`を使用すること
  - `$data`のプロパティには単純に代入するだけでリアクティビティが維持される
  - Arrayの中のMapのプロパティは反映されない場合があるためオブジェクト全体を置き換える必要がある
  - 例:

    ```typescript
    // Alpine.jsとTypeScript間でのデータ受け渡し
    globalThis.doSomething($data)  // ✅ $dataを使用
    globalThis.doSomething(this)   // ❌ thisは使わない

    // TypeScript側でのデータ更新
    $data.lists = newLists           // ✅ 単純な代入でOK
    $data.lists[0].tasks = newTasks  // ❌ Array内のMapのプロパティは反映されない
    $data.lists[0] = {               // ✅ オブジェクト全体を置き換える
      ...$data.lists[0],
      tasks: newTasks,
    }
    ```

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

- `gh workflow run リリース --field="bump=バグフィックス"`
- `gh workflow run リリース --field="bump=マイナーバージョンアップ"`
- `gh workflow run リリース --field="bump=メジャーバージョンアップ"`
