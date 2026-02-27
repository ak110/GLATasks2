"""リストコントローラーのテストコード。"""

import httpx
import pytest


@pytest.mark.asyncio
async def test_anonymous(client: httpx.AsyncClient):
    """未認証のテスト。"""
    response = await client.get("/lists/api/list")
    assert response.status_code == 403

    response = await client.post("/lists/post", json={"title": "テスト"})
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_api(user_client: httpx.AsyncClient):
    """APIのテスト。"""
    response = await user_client.get("/lists/api/list")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_post(user_client: httpx.AsyncClient):
    """リスト作成のテスト。"""
    # 空のタイトルは400エラー
    response = await user_client.post("/lists/post", json={"title": ""})
    assert response.status_code == 400

    # 正常なリスト作成
    response = await user_client.post("/lists/post", json={"title": "テストリスト"})
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_list_operations(user_client: httpx.AsyncClient):
    """リスト操作のテスト。"""
    # テスト用リストの作成
    response = await user_client.post("/lists/post", json={"title": "テストリスト"})
    assert response.status_code == 200

    # 作成されたリストのIDを取得
    response = await user_client.get("/lists/api/list")
    lists = response.json()
    list_id = lists[0]["id"]

    # リネーム
    response = await user_client.post(f"/lists/{list_id}/rename/", json={"title": "新しいタイトル"})
    assert response.status_code == 200

    response = await user_client.post(f"/lists/{list_id}/rename/", json={"title": ""})
    assert response.status_code == 400

    # 非表示化
    response = await user_client.post(f"/lists/{list_id}/hide/")
    assert response.status_code == 200

    # 再表示
    response = await user_client.post(f"/lists/{list_id}/show/")
    assert response.status_code == 200

    # クリア
    response = await user_client.post(f"/lists/{list_id}/clear/")
    assert response.status_code == 200

    # 削除
    response = await user_client.post(f"/lists/{list_id}/delete/")
    assert response.status_code == 200

    # 存在しないリストへのアクセス
    response = await user_client.post("/lists/99999/delete/")
    assert response.status_code == 404
