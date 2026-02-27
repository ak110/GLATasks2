"""ASGIアプリケーションのテスト。"""

import httpx
import pytest


@pytest.mark.asyncio
async def test_healthcheck(client: httpx.AsyncClient):
    """ヘルスチェックのテスト。"""
    response = await client.get("/healthcheck")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
