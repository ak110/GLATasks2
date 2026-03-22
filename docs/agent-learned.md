# Lessons Learned

## tRPC v11

- ミドルウェアの `rawInput` は存在しない。`await getRawInput()` を使う
- ミドルウェアで出力を変更する場合、新しいオブジェクトを返すと型推論が壊れる。`result` を `as unknown as Record<string, unknown>` で直接変更する
- `observable` の `next` が async の場合、`complete` が先に発火する。`pending` で Promise を追跡して `complete` 時に待つ

## Svelte

- `@tanstack/svelte-query` の `createQuery` は関数形式 `() => options` 非対応。リアクティブには `derived` ストア + `$effect` を使う
- `class:` ディレクティブ名に `:` `/` は使えない。条件付きダークモードクラスは動的 class 式で書く: `class="... {cond ? 'bg-blue-50 dark:bg-blue-900/30' : ''}"`
- D&D イベントハンドラを持つ `<div>` には `role="listitem"` 等の ARIA ロールが必要

## JavaScript

- `String.split(sep, limit)` は残りを捨てる（Python と異なる）。2分割には `indexOf` + `slice` を使う
