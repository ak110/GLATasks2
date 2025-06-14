# 開発手順

## パッケージ管理

- [uv](https://docs.astral.sh/uv/)を使用してパッケージ管理を行う。

## pre-commit

- [pre-commit](https://pre-commit.com/)を使用してコミット時にコードの整形・チェックを行う。
- `pre-commit install`で有効化する。

## DB関連

```bash
docker compose up --detach db
docker compose run --rm app alembic init -t async migrations
docker compose run --rm app alembic revision --autogenerate --message=""
docker compose run --rm app alembic upgrade head
docker compose run --rm app alembic downgrade -1
docker compose run --rm app alembic history
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
  `gh release create --target=master --generate-notes v1.x.x`
4. リリースアクションの確認:
  `gh run list --commit=$(git rev-parse HEAD)`
