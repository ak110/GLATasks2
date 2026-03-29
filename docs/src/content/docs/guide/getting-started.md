---
title: はじめに
description: GLATasks のセットアップと基本的な使い方
---

## 技術スタック

SvelteKit + Drizzle ORM + MariaDB + nginx

詳細は[アーキテクチャ](/GLATasks/development/architecture/)を参照。

## ローカル起動

```bash
make deploy
```

## 停止

```bash
make stop
```

## 本番デプロイ

GitHub Actions 経由で自動デプロイされる。詳細は[開発手順の CI/CD セクション](/GLATasks/development/development/#cicd)を参照。
