# コーディングスタイル

## Pythonコーディングスタイル

- importについて
  - 可能な限り`import xxx`形式で書く (`from xxx import yyy`ではなく)
  - 可能な限りトップレベルでimportする (循環参照や初期化順による問題を避ける場合に限りブロック内も可)
- タイプヒントは可能な限り書く
  - `typing.List`ではなく`list`を使用する。`dict`やその他も同様。
  - `typing.Optional`ではなく`| None`を使用する。
- docstringは基本的には概要のみ書く
- ログは`logging`を使う
  - ログやエラーメッセージなどは日本語で書く
  - エラーメッセージはエンドユーザーに対処法が分かるように書く
- 日付関連の処理は`datetime`を使う
- ファイル関連の処理は`pathlib`を使う (`open`関数や`os`モジュールは使わない)
- テーブルデータの処理には`polars`を使う (`pandas`は使わない)
- パッケージ管理には`uv`を使う
- .venvの更新には`make update`を使う
- コードを書いた後は必ず`make format`で整形する
  ― 新しいファイルを作成する場合は近い階層の代表的なファイルを確認し、スタイルを揃える
- `make test`でmypy, pytestなどをまとめて実行できる
- `git grep`コマンドを活用して影響範囲やコードスタイルを調査する
- 関数やクラスなどの定義の順番は可能な限りトップダウンにする。
  つまり関数Aから関数Bを呼び出す場合、関数Aを前に、関数Bを後ろに定義する。
- インターフェースの都合上未使用の引数がある場合は、関数先頭で`del xxx # noqa`のように書く(lint対策)

### Pythonテストコード

- テストコードは`pytest`で書く
- テストコードは`xxx.py`に対して`xxx_test.py`として配置する

テストコードの例:

```python
"""テストコード。"""

import pathlib

import pytest
import xxx


@pytest.mark.parametrize(
    "x,expected",
    [
        ("test1", "test1"),
        ("test2", "test2"),
    ],
)
def test_yyy(tmp_path: pathlib.Path, x: str, expected: str) -> None:
    """yyyのテスト。"""
    actual = xxx.yyy(tmp_path, x)
    assert actual == expected

```

- テストコードの実行は `uv run pytest` で実行する

## HTMLコーディングスタイル

- URLは直接書かず、`{{ url_for("xxx") }}`を使用する
- Alpine.jsであまり複雑な処理を実装せず、可能な限りTypeScriptで実装した関数を呼び出す形にする

## TypeScriptコーディングスタイル

- TypeScript側でaddEventListenerは極力使わず、Alpine.jsから呼び出す形にする
- TypeScript内にURLを直書きせず、`window.appConfig`から取得する
  - URLの設定は`app/templates/_layout.html`でのみ行い、`url_for`を使用してFlaskのルーティングと連携
  - 例：`fetch("/api/lists")` ではなく `fetch(window.appConfig.urls["lists.api"])`
  - 各ページでURLを重複定義しない（_layout.htmlで一元管理）

### TypeScriptテストコード

- テストコードは`vitest`で書く
