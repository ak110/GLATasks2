# コーディングスタイル

## 全般

- 関数やクラスなどの定義の順番は可能な限りトップダウンにする。
  つまり関数Aから関数Bを呼び出す場合、関数Aを前に、関数Bを後ろに定義する。
- テストコードは速度と簡潔さを重視する。
  - テスト関数は1つのテスト対象に対して原則1つとする。
  - 網羅性のため、必要に応じて `pytest.mark.parametrize` などを使用する。
  - sleepなどは0.01秒単位とし、テスト関数全体で0.1秒を超えないようにする。

## Pythonコーディングスタイル

- importについて:
  - 可能な限り`import xxx`形式で書く (`from xxx import yyy`ではなく)
  - 可能な限りトップレベルでimportする (循環参照や初期化順による問題を避ける場合に限りブロック内も可)
- タイプヒントは可能な限り書く:
  - `typing.List`ではなく`list`を使用する。`dict`やその他も同様。
  - `typing.Optional`ではなく`| None`を使用する。
- docstringはGoogle Style
  - 自明なArgs, Returns, Raisesは省略する
- ログは`logging`を使う
  - ログやエラーメッセージなどは日本語で書く
  - エラーメッセージはエンドユーザーに対処法が分かるように書く
- 日付関連の処理は`datetime`を使う
- ファイル関連の処理は`pathlib`を使う (`open`関数や`os`モジュールは使わない)
- テーブルデータの処理には`polars`を使う (`pandas`は使わない)
- パッケージ管理には`uv`を使う
- .venvの更新には`make update`を使う
- `make test`でmypy, pytestなどをまとめて実行できる
- インターフェースの都合上未使用の引数がある場合は、関数先頭で`del xxx # noqa`のように書く(lint対策)

### Pythonテストコード

- テストコードは`pytest`で書く
- テストコードは`xxx.py`に対して`xxx_test.py`として配置する
- `uv run pytest` で個別実行も可能

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

- テストコードの実行は `uv run pytest`

## SvelteKitコーディングスタイル

- コンポーネントファイルは `frontend/src/` 以下に配置
- サーバーサイドの load 関数（`+page.server.ts`）でデータ取得を行い、クライアントに渡す
- API 呼び出しは BFF ルート（`src/routes/api/`）経由で行い、URL は直書きする
- JSDocコメントを記述する
  - ファイルの先頭に`@fileoverview`で概要を記述
  - 関数・クラス・メソッドには機能を説明するコメントを記述
  - 自明な`@param`や`@returns`は省略する
