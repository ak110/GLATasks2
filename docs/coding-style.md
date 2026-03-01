# コーディングスタイル

## 全般

- 関数やクラスなどの定義の順番は可能な限りトップダウンにする。
  つまり関数Aから関数Bを呼び出す場合、関数Aを前に、関数Bを後ろに定義する。
- テストコードは速度と簡潔さを重視する。
  - テスト関数は1つのテスト対象に対して原則1つとする。
  - sleepなどは0.01秒単位とし、テスト関数全体で0.1秒を超えないようにする。

## SvelteKit コーディングスタイル

- コンポーネントファイルは `app/src/` 以下に配置
- サーバーサイドの load 関数（`+page.server.ts`）でデータ取得を行い、クライアントに渡す
- API 呼び出しは tRPC 経由で行う（`src/lib/server/trpc.ts` でルーター定義、`src/lib/trpc.ts` でクライアント）
- 入力バリデーションには Zod スキーマ（`src/lib/schemas.ts`）を使用する
- クライアント側のデータ取得には TanStack Svelte Query を使用する
- JSDocコメントを記述する
  - ファイルの先頭に`@fileoverview`で概要を記述
  - 関数・クラス・メソッドには機能を説明するコメントを記述
  - 自明な`@param`や`@returns`は省略する
- パッケージ管理には`pnpm`を使う
- `make format`でprettier + eslintをまとめて実行できる
- `make test`でformat + lint + type check + e2eテストをまとめて実行できる

### コンポーネント構造

- `app/src/lib/components/` 配下に機能別ディレクトリで分類する
  - `layout/` — ヘッダーなどのレイアウト部品
  - `lists/` — リスト関連コンポーネント
  - `tasks/` — タスク関連コンポーネント

### Tailwind CSS の規約

- ボーダー色は `border-gray-200` を基本とする（デフォルトの `border` は黒が強すぎるため）
- e2e テストのセレクタには CSS クラスではなく `data-testid` 属性を使用する

## Markdown記述スタイル

- `**`は強調したい箇所のみとし、箇条書きの見出しなどでの使用は禁止
  - NG例: `1. **xx機能**: xxをyyする`
- できるだけmarkdownlintが通るように書く
  - 特に注意するルール:
    - MD040/fenced-code-language: Fenced code blocks should have a language specified
- 図はMermaid記法で書く
- 別のMarkdownファイルへのリンクは、基本的に`[プロジェクトルートからのパス](記述個所からの相対パス)`で書く。
- lintの実行方法: `pre-commit run --files <file>`
