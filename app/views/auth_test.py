"""テストコード。"""

import config
import httpx
import pytest


@pytest.mark.asyncio
async def test_validate(client: httpx.AsyncClient):
    """認証APIのテスト。"""
    # APIキーなしは403
    response = await client.post("/auth/validate", json={"user": "user", "password": "user"})
    assert response.status_code == 403

    # 正しい資格情報
    response = await client.post(
        "/auth/validate",
        json={"user": "user", "password": "user"},
        headers={"x-api-key": config.INTERNAL_API_KEY},
    )
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["user"] == "user"

    # 誤ったパスワード
    response = await client.post(
        "/auth/validate",
        json={"user": "user", "password": "wrong"},
        headers={"x-api-key": config.INTERNAL_API_KEY},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_register(client: httpx.AsyncClient):
    """ユーザー登録APIのテスト。"""
    # APIキーなしは403
    response = await client.post("/auth/register", json={"user_id": "newuser", "password": "pass"})
    assert response.status_code == 403

    # 正常な登録
    response = await client.post(
        "/auth/register",
        json={"user_id": "newuser2", "password": "pass"},
        headers={"x-api-key": config.INTERNAL_API_KEY},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["user"] == "newuser2"

    # 重複ユーザー
    response = await client.post(
        "/auth/register",
        json={"user_id": "newuser2", "password": "pass"},
        headers={"x-api-key": config.INTERNAL_API_KEY},
    )
    assert response.status_code == 400
