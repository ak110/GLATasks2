"""テストコード。"""

import httpx
import pytest


@pytest.mark.asyncio
async def test_sse(client: httpx.AsyncClient):
    """SSEエンドポイントのテスト。"""
    response = await client.get("/sandbox/sse")
    assert response.status_code == 200
    assert b"data: [DONE]" in response.content
