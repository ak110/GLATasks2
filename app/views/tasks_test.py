"""タスクコントローラーのテストコード。"""

import httpx
import models
import pytest


@pytest.mark.asyncio
async def test_anonymous(client: httpx.AsyncClient):
    """未認証のテスト。"""
    response = await client.post("/tasks/1", json={"text": "テスト"})
    assert response.status_code == 403

    response = await client.patch("/tasks/api/1/1", json={"status": "completed"})
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_task_operations(user_client: httpx.AsyncClient):
    """タスク操作のテスト。"""
    # テスト用リストの作成
    response = await user_client.post("/lists/post", json={"title": "テストリスト"})
    assert response.status_code == 200

    # リストIDの取得
    response = await user_client.get("/lists/api/list")
    lists = response.json()
    list_id = lists[0]["id"]

    # タスクの追加
    response = await user_client.post(f"/tasks/{list_id}", json={"text": "テストタスク"})
    assert response.status_code == 200

    # タスクIDの取得
    with models.Base.session_scope():
        list_ = models.List.get_by_id(list_id)
        assert list_ is not None
        task_id = list_.tasks[0].id

    # ステータス更新
    response = await user_client.patch(f"/tasks/api/{list_id}/{task_id}", json={"status": "completed"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["completed"] is not None

    # テキスト更新
    response = await user_client.patch(f"/tasks/api/{list_id}/{task_id}", json={"text": "更新済みタスク"})
    assert response.status_code == 200

    # completed日時の更新
    test_date = "2024-01-01T00:00:00+00:00"
    response = await user_client.patch(f"/tasks/api/{list_id}/{task_id}", json={"completed": test_date})
    assert response.status_code == 200
    data = response.json()
    assert data["completed"] == test_date


@pytest.mark.asyncio
async def test_access_control(user_client: httpx.AsyncClient):
    """アクセス制御のテスト。"""
    # 存在しないリストへのアクセス
    response = await user_client.post("/tasks/99999", json={"text": "テスト"})
    assert response.status_code == 404

    response = await user_client.patch("/tasks/api/99999/99999", json={"status": "completed"})
    assert response.status_code == 404
