"""テストコード。"""

import pytest
import pytilpack.quart
import quart.typing


@pytest.mark.asyncio
async def test_anonymous(client: quart.typing.TestClientProtocol):
    """未ログインのテスト"""
    response = await client.get("/auth/login")
    await pytilpack.quart.assert_html(response)

    response = await client.get("/auth/regist_user")
    await pytilpack.quart.assert_html(response)

    response = await client.get("/auth/logout")
    await pytilpack.quart.assert_html(response, status_code=302)


@pytest.mark.asyncio
async def test_user(user_client: quart.typing.TestClientProtocol):
    """ログインユーザのテスト"""
    response = await user_client.get("/auth/login")
    await pytilpack.quart.assert_html(response)

    response = await user_client.get("/auth/regist_user")
    await pytilpack.quart.assert_html(response)

    response = await user_client.get("/auth/logout")
    await pytilpack.quart.assert_html(response, status_code=302)
