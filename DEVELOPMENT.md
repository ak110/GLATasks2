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

- サーバーサイドのコードを変更した場合は`make hup`でリロードする。

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

事前に`gh`コマンドをインストールし、`gh auth login`でログインしておく。

1. 変更がコミット・プッシュ済みでアクションが成功していることを確認:
   `git status ; gh run list --commit=$(git rev-parse HEAD)`
    - 未完了の場合は `gh run watch run_id` で完了を待機する
2. 現在のバージョンの確認:
  `git fetch --tags && git tag --sort=version:refname | tail -n1`
3. GitHubでリリースを作成:
  `gh release create --target=master --generate-notes v2.x.x`
