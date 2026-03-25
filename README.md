# GLATasks

[![CI](https://github.com/ak110/GLATasks/actions/workflows/ci.yaml/badge.svg)](https://github.com/ak110/GLATasks/actions/workflows/ci.yaml)
[![Deploy](https://github.com/ak110/GLATasks/actions/workflows/deploy.yaml/badge.svg)](https://github.com/ak110/GLATasks/actions/workflows/deploy.yaml)

タスク管理＆カウントダウンタイマーアプリ。

## 技術スタック

SvelteKit + Drizzle ORM + MariaDB + nginx

詳細は [docs/architecture.md](docs/architecture.md) を参照。

## 利用方法

### ローカル起動

```bash
make deploy
```

### 停止

```bash
make stop
```

### 本番デプロイ

GitHub Actions 経由で自動デプロイされる。詳細は [docs/development.md の CI/CD セクション](docs/development.md#cicd) を参照。

## 開発

[docs/development.md](docs/development.md) を参照。

## Chrome拡張機能

[./chrome_extension](./chrome_extension)

## Android 共有

PWA としてホーム画面に追加すると、Android の共有メニューから直接タスクを追加できる（Web Share Target API を使用）。
