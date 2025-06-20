"""テストコード。"""

import pytest
import pytilpack.quart_
import quart.typing


@pytest.mark.asyncio
async def test_user(user_client: quart.typing.TestClientProtocol):
    """インデックスページのテスト。"""
    # デフォルトのshow_type
    data = await pytilpack.quart_.assert_bytes(user_client.get("/sandbox/sse"))
    assert b"data: [DONE]" in data
