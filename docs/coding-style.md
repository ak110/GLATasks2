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
- API 呼び出しは BFF ルート（`src/routes/api/`）経由で行い、URL は直書きする
- JSDocコメントを記述する
  - ファイルの先頭に`@fileoverview`で概要を記述
  - 関数・クラス・メソッドには機能を説明するコメントを記述
  - 自明な`@param`や`@returns`は省略する
- パッケージ管理には`pnpm`を使う
- `make format`でprettier + eslintをまとめて実行できる
- `make test`でformat + lint + type check + e2eテストをまとめて実行できる

### Tailwind CSS の規約

- ボーダー色は `border-gray-200` を基本とする（デフォルトの `border` は黒が強すぎるため）
- e2e テストのセレクタには CSS クラスではなく `data-testid` 属性を使用する

## Markdown記述スタイル

- `**`は強調したい箇所のみとし、箇条書きの見出しなどでの使用は禁止
  - NG例: `1. **xx機能**: xxをyyする`
- できるだけmarkdownlintが通るように書く
  - 特に注意するルール:
    - MD040/fenced-code-language: Fenced code blocks should have a language specified
- 別のMarkdownファイルへのリンクは、基本的に`[プロジェクトルートからのパス](記述個所からの相対パス)`で書く。
- lintの実行方法: `pre-commit run --files <file>`
