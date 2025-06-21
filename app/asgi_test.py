"""ASGIアプリケーションのテスト。"""

import pytest
import pytilpack.quart_
import quart.typing


@pytest.mark.asyncio
async def test_anonymous(client: quart.typing.TestClientProtocol):
    """未ログインのテスト"""
    # ヘルスチェック
    response = await client.get("/healthcheck")
    assert (await pytilpack.quart_.assert_json(response)) == {"status": "ok"}

    # サービスワーカー
    response = await client.get("/sw.js")
    assert response.status_code == 200
    assert response.headers["Content-Type"] == "application/javascript"
