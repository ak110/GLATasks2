# 技術コンテキスト

## 開発環境

### 必須ツール

- Python 3.13
- Docker
- Make
- uv (パッケージ管理)
- pre-commit

### パッケージ管理

- uvを使用 (`package = false`設定)
- 依存関係は`pyproject.toml`で管理
- カスタムソース: pytilpack (Gitリポジトリから)
- `make update`で依存関係を更新しテスト実行

## 技術スタック詳細

### バックエンド

1. Quart
   - Flask互換の非同期Webフレームワーク
   - Flask拡張機能の互換性
   - CSRFトークン保護
   - セッション管理
   - カスタムエラーハンドリング

2. SQLAlchemy
   - 非同期ORM (asyncio対応)
   - Alembicによるマイグレーション管理
   - セッション管理
   - MariaDBサポート

3. テスト
   - pytest-asyncio
   - 非同期テストサポート
   - テストフィクスチャ (conftest.py)
   - インメモリSQLiteを使用したテスト

### フロントエンド

1. JavaScript/TypeScript
   - ESモジュールアーキテクチャ
   - 標準DOM API（jQueryなし）
   - Fetch APIによる非同期処理
   - イベント委譲パターン
   - TypeScriptによる型安全性
   - ソースマップによるデバッグ対応

2. フレームワーク
   - Bootstrap 5
   - TailwindCSS
   - CryptoJSによる難読化
   - モダンブラウザ対応
   - アクセシビリティ準拠

3. テンプレートエンジン
   - Jinja2
   - レイアウト継承 (_layout.html)
   - セキュリティヘッダー設定
   - カスタムグローバル関数

4. PWA
   - Service Worker (sw.js)
   - マニフェスト設定
   - オフラインサポート
   - キャッシュ戦略

5. 静的アセット
   - モジュラーJavaScript
   - レスポンシブCSS
   - 最適化された画像アセット
   - アイコンセット

## インフラストラクチャ

### Docker

- 開発環境: compose.development.yaml
- ステージング環境: compose.staging.yaml
- 本番環境: compose.production.yaml
- ベースイメージ: docker/Dockerfile
- 環境変数: .env-example

### データベース

- MariaDB (LTS)
- 自動アップグレード設定
- ヘルスチェック設定
- ボリューム永続化

### Nginx

- リバースプロキシ
- 静的ファイル配信
- エンベロープ変数による設定
- ログローテーション

## コーディング規約

### Python

1. 型ヒント
   - Python 3.13向け型ヒント
   - mypy設定（厳格モード）
   - SQLAlchemy型プラグイン対応

2. コードスタイル
   - black（Python 3.13対応）
   - isort（black互換プロファイル）
   - flake8（line length 88）
   - pylint（並列実行対応）

3. パッケージ・モジュール
   - トップレベルモジュール分割
   - テストファイルは`_test`サフィックス
   - 非同期対応設計

### JavaScript

1. モジュール構造
   - ESモジュールの使用
   - 関数のカプセル化
   - 依存関係の明示
   - 適切な関数分割

2. コードスタイル
   - モダンなJavaScript構文
   - 標準APIの優先使用
   - イベント委譲パターン
   - async/awaitの活用

3. DOM操作
   - 標準DOM APIの使用
   - パフォーマンスを考慮したセレクタ
   - イベントバブリングの活用
   - アクセシビリティ対応

### ビルドツール

1. Vite
   - 高速なモジュールバンドル
   - TypeScriptのネイティブサポート
   - TailwindCSSの統合
   - ソースマップの自動生成
   - 最適化されたビルド出力（app/static/dist）

2. Make
   - フロントエンド/バックエンドの統合的なビルド
   - TypeScriptテストの統合
   - フォーマットとビルドの自動化
   - 環境に応じた柔軟なビルド設定

### 共通規約

1. ファイル命名
   - スネークケース
   - 機能別のモジュール分割
   - 明確な命名規則

2. コード品質
   - `make format`でコード整形
   - `make test`で検証
   - pre-commitによる自動チェック
   - BETTER_EXCEPTIONS有効化

## 開発フロー

1. ローカル開発
   - Docker Compose環境
   - 開発プロファイル設定
   - ホットリロード
   - デバッグモード

2. テスト実行
   - 非同期ユニットテスト
   - フィクスチャベースのテスト
   - セッション分離
   - インメモリデータベース

3. デプロイメント
   - 環境別のCompose設定
   - マイグレーション管理
   - ヘルスチェック
   - ログ管理
