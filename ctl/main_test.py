"""メインコントローラーのテストコード。"""

import pytest
import pytilpack.quart_
import quart.typing


@pytest.mark.asyncio
async def test_anonymous(client: quart.typing.TestClientProtocol):
    """未ログインのテスト。"""
    # 各ページへのアクセスはログインページへリダイレクト
    response = await client.get("/")
    assert response.status_code == 302

    response = await client.get("/add")
    assert response.status_code == 302


@pytest.mark.asyncio
async def test_index(user_client: quart.typing.TestClientProtocol):
    """インデックスページのテスト。"""
    # デフォルトのshow_type
    response = await user_client.get("/")
    await pytilpack.quart_.assert_html(response)
    assert "Service-Worker-Allowed" in response.headers

    # show_typeの指定
    response = await user_client.get("/?show_type=task")
    await pytilpack.quart_.assert_html(response)

    # サービスワーカー
    response = await user_client.get("/sw.js")
    assert response.status_code == 200
    assert response.headers["Content-Type"] == "application/javascript"


@pytest.mark.asyncio
async def test_add(user_client: quart.typing.TestClientProtocol):
    """追加ページのテスト。"""
    response = await user_client.get("/add")
    await pytilpack.quart_.assert_html(response)
