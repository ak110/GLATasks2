# プロジェクト概要

Google Tasksのキャンバスビューが無くなったことを受けて開発された、タスク管理Webアプリケーション。Python/Quartベースで、以下の主要機能を提供:

## 主要機能

- ユーザー認証 (ctl_auth.py)
- タスク管理 (ctl_tasks.py)
- リスト管理 (ctl_lists.py)

## 技術スタック

### バックエンド

- Python 3.13
- Quart (非同期Webフレームワーク)
- SQLAlchemy (データベース)
- Alembic (マイグレーション)

### フロントエンド

- HTML/CSS/JavaScript
- TypeScript/Vite
- Jest (テスト)
- PWA対応 (sw.js, manifest.webmanifest)

### インフラ

- Docker
- Nginx
- MariaDB

## 開発環境

- uv (パッケージ管理)
- pre-commit (コード品質管理)
- make deploy: デプロイ
- make test: テスト実行
- make format: コードフォーマット
- make update: 依存関係の更新

## プロジェクトの目標

1. Google Tasksのキャンバスビューの代替として、シンプルで使いやすいタスク管理システムの提供
2. Progressive Web App (PWA)として実装し、オフライン対応を実現
3. Docker化による容易なデプロイと環境の統一
4. TypeScriptによる型安全性の確保
5. 堅牢なテストと型チェックによる品質保証
