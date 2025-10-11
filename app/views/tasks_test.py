"""タスクコントローラーのテストコード。"""

import json
import re

import helpers
import models
import pytest
import pytilpack.quart
import quart.typing


async def get_nonce(client: quart.typing.TestClientProtocol) -> str:
    """CSRFトークンを取得する。"""
    response = await client.get("/auth/login")
    page_data = await pytilpack.quart.assert_html(response)
    nonce_match = re.search(r'name="nonce" value="(\w+)"', page_data)
    assert nonce_match is not None
    return nonce_match.group(1)


@pytest.mark.asyncio
async def test_anonymous(client: quart.typing.TestClientProtocol):
    """未ログインのテスト。"""
    response = await client.post("/tasks/1")
    assert response.status_code == 403  # CSRFトークンがないため403エラー

    response = await client.post("/tasks/patch/1/1")
    assert response.status_code == 403  # CSRFトークンがないため403エラー

    response = await client.patch("/tasks/api/1/1")
    assert response.status_code == 302


@pytest.mark.asyncio
async def test_task_operations(user_client: quart.typing.TestClientProtocol):
    """タスク操作のテスト。"""
    # テスト用リストの作成
    nonce = await get_nonce(user_client)
    response = await user_client.post("/lists/post", form={"title": helpers.encrypt("テストリスト"), "nonce": nonce})
    assert response.status_code == 302

    # リストIDの取得
    response = await user_client.get("/lists/api/list")
    data = json.loads(await response.get_data())
    lists = json.loads(helpers.decrypt(data["data"]))
    list_id = lists[0]["id"]

    # タスクの追加
    nonce = await get_nonce(user_client)
    response = await user_client.post(f"/tasks/{list_id}", form={"text": helpers.encrypt("テストタスク"), "nonce": nonce})
    assert response.status_code == 302

    # タスクIDの取得
    with models.Base.session_scope():
        list_ = models.List.get_by_id(list_id)
        assert list_ is not None
        task_id = list_.tasks[0].id

    # タスクのAPIを使用した更新
    # ステータス更新
    response = await user_client.patch(f"/tasks/api/{list_id}/{task_id}", json={"status": "completed"})
    assert response.status_code == 200
    data = json.loads(await response.get_data())
    assert data["status"] == "completed"
    assert data["completed"] is not None

    # テキスト更新
    response = await user_client.patch(f"/tasks/api/{list_id}/{task_id}", json={"text": "API経由で更新"})
    assert response.status_code == 200

    # completed日時の更新
    test_date = "2024-01-01T00:00:00+00:00"
    response = await user_client.patch(f"/tasks/api/{list_id}/{task_id}", json={"completed": test_date})
    assert response.status_code == 200
    data = json.loads(await response.get_data())
    assert data["completed"] == test_date


@pytest.mark.asyncio
async def test_access_control(user_client: quart.typing.TestClientProtocol):
    """アクセス制御のテスト。"""
    # 存在しないリストへのアクセス
    nonce = await get_nonce(user_client)
    response = await user_client.post("/tasks/99999", form={"text": helpers.encrypt("テスト"), "nonce": nonce})
    assert response.status_code == 404

    # 存在しないタスクへのアクセス
    nonce = await get_nonce(user_client)
    response = await user_client.post("/tasks/patch/1/99999", form={"text": helpers.encrypt("テスト"), "nonce": nonce})
    assert response.status_code == 404

    response = await user_client.patch("/tasks/api/1/99999", json={"status": "completed"})
    assert response.status_code == 404
