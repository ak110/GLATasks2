# GLATasks

[![Test](https://github.com/ak110/GLATasks2/actions/workflows/test.yml/badge.svg)](https://github.com/ak110/GLATasks2/actions/workflows/test.yml)
[![Deploy](https://github.com/ak110/GLATasks2/actions/workflows/deploy.yml/badge.svg)](https://github.com/ak110/GLATasks2/actions/workflows/deploy.yml)

Google Tasksのcanvasビューが無くなって困ったので自作し始めた低機能Webアプリ。

## 技術スタック

SvelteKit + Drizzle ORM + MariaDB + nginx

詳細は [docs/architecture.md](docs/architecture.md) を参照。

## 利用方法

### 起動

```bash
make deploy
```

### 停止

```bash
make stop
```

## 開発

[docs/development.md](docs/development.md) を参照。

## Chrome拡張機能

[./chrome_extension](./chrome_extension)

## Android 共有

PWA としてホーム画面に追加すると、Android の共有メニューから直接タスクを追加できる（Web Share Target API を使用）。
