"""リストコントローラーのテストコード。"""

import json
import re

import helpers
import pytest
import pytilpack.quart
import quart.typing


@pytest.mark.asyncio
async def test_anonymous(client: quart.typing.TestClientProtocol):
    """未ログインのテスト。"""
    response = await client.get("/lists/api/list")
    assert response.status_code == 302

    response = await client.post("/lists/post")
    assert response.status_code == 403  # CSRFトークンがないので403エラー


@pytest.mark.asyncio
async def test_api(user_client: quart.typing.TestClientProtocol):
    """APIのテスト。"""
    response = await user_client.get("/lists/api/list")
    await pytilpack.quart.assert_json(response)
    data = json.loads(await response.get_data())
    assert "data" in data
    decoded_data = json.loads(helpers.decrypt(data["data"]))
    assert isinstance(decoded_data, list)


@pytest.mark.asyncio
async def test_post(user_client: quart.typing.TestClientProtocol):
    """リスト作成のテスト。"""
    # nonceの取得
    response = await user_client.get("/auth/login")
    page_data = await pytilpack.quart.assert_html(response)
    nonce_match = re.search(r'name="nonce" value="(\w+)"', page_data)
    assert nonce_match is not None
    nonce = nonce_match.group(1)

    # 空のタイトルは400エラー
    response = await user_client.post("/lists/post", form={"title": helpers.encrypt(""), "nonce": nonce})
    assert response.status_code == 400

    # 新しいnonceを取得
    response = await user_client.get("/auth/login")
    page_data = await pytilpack.quart.assert_html(response)
    nonce_match = re.search(r'name="nonce" value="(\w+)"', page_data)
    assert nonce_match is not None
    nonce = nonce_match.group(1)

    # 正常なリスト作成
    response = await user_client.post("/lists/post", form={"title": helpers.encrypt("テストリスト"), "nonce": nonce})
    assert response.status_code == 302


@pytest.mark.asyncio
async def test_list_operations(user_client: quart.typing.TestClientProtocol):
    """リスト操作のテスト。"""
    # nonceの取得
    response = await user_client.get("/auth/login")
    page_data = await pytilpack.quart.assert_html(response)
    nonce_match = re.search(r'name="nonce" value="(\w+)"', page_data)
    assert nonce_match is not None
    nonce = nonce_match.group(1)

    # テスト用リストの作成
    response = await user_client.post("/lists/post", form={"title": helpers.encrypt("テストリスト"), "nonce": nonce})
    assert response.status_code == 302

    # 作成されたリストのIDを取得
    response = await user_client.get("/lists/api/list")
    data = json.loads(await response.get_data())
    lists = json.loads(helpers.decrypt(data["data"]))
    list_id = lists[0]["id"]

    # 新しいnonceを取得
    response = await user_client.get("/auth/login")
    page_data = await pytilpack.quart.assert_html(response)
    nonce_match = re.search(r'name="nonce" value="(\w+)"', page_data)
    assert nonce_match is not None
    nonce = nonce_match.group(1)

    # リネーム
    response = await user_client.post(
        f"/lists/{list_id}/rename/", form={"title": helpers.encrypt("新しいタイトル"), "nonce": nonce}
    )
    assert response.status_code == 302

    # 新しいnonceを取得
    response = await user_client.get("/auth/login")
    page_data = await pytilpack.quart.assert_html(response)
    nonce_match = re.search(r'name="nonce" value="(\w+)"', page_data)
    assert nonce_match is not None
    nonce = nonce_match.group(1)

    response = await user_client.post(f"/lists/{list_id}/rename/", form={"title": helpers.encrypt(""), "nonce": nonce})
    assert response.status_code == 400

    # 新しいnonceを取得してから非表示化
    response = await user_client.get("/auth/login")
    page_data = await pytilpack.quart.assert_html(response)
    nonce_match = re.search(r'name="nonce" value="(\w+)"', page_data)
    assert nonce_match is not None
    nonce = nonce_match.group(1)

    response = await user_client.post(f"/lists/{list_id}/hide/", form={"nonce": nonce})
    assert response.status_code == 302

    # 新しいnonceを取得してから再表示
    response = await user_client.get("/auth/login")
    page_data = await pytilpack.quart.assert_html(response)
    nonce_match = re.search(r'name="nonce" value="(\w+)"', page_data)
    assert nonce_match is not None
    nonce = nonce_match.group(1)

    response = await user_client.post(f"/lists/{list_id}/show/", form={"nonce": nonce})
    assert response.status_code == 302

    # 新しいnonceを取得してからクリア
    response = await user_client.get("/auth/login")
    page_data = await pytilpack.quart.assert_html(response)
    nonce_match = re.search(r'name="nonce" value="(\w+)"', page_data)
    assert nonce_match is not None
    nonce = nonce_match.group(1)

    response = await user_client.post(f"/lists/{list_id}/clear/", form={"nonce": nonce})
    assert response.status_code == 302

    # 新しいnonceを取得してから削除
    response = await user_client.get("/auth/login")
    page_data = await pytilpack.quart.assert_html(response)
    nonce_match = re.search(r'name="nonce" value="(\w+)"', page_data)
    assert nonce_match is not None
    nonce = nonce_match.group(1)

    response = await user_client.post(f"/lists/{list_id}/delete/", form={"nonce": nonce})
    assert response.status_code == 302

    # 存在しないリストへのアクセス
    response = await user_client.post("/lists/99999/delete/", form={"nonce": nonce})
    assert response.status_code == 404
