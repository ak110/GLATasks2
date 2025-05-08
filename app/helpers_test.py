"""テスト。"""

import helpers
import pytest


@pytest.mark.parametrize(
    "test_data",
    [
        "Hello, World!",
        "こんにちは、世界！",
        "123456789",
        "!@#$%^&*()",
        "あいうえお\nかきくけこ",
        "",  # 空文字列
        " ",  # スペース
    ],
)
def test_encrypt_decrypt_various(test_data):
    """様々なパターンの暗号化・復号テスト。"""
    encrypted = helpers.encrypt(test_data)
    decrypted = helpers.decrypt(encrypted)
    assert decrypted == test_data
