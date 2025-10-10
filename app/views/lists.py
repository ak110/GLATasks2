"""コントローラー。"""

import datetime
import typing

import helpers
import models
import quart
import quart_auth

app = quart.Blueprint("lists", __name__, url_prefix="/lists")


@app.before_request
@quart_auth.login_required
async def _before_request():
    pass


@app.route("/api", methods=["GET"])
async def api():
    """リスト一覧の取得（タスクなし）。"""
    import logging

    logging.info("[DEBUG] lists.api: リスト一覧取得開始")
    current_user = helpers.get_logged_in_user()
    logging.info(f"[DEBUG] lists.api: ユーザーID={current_user.id}")

    # リスト情報のみ（タスクなし）
    list_data = []
    for list_ in current_user.lists:
        list_data.append({"id": list_.id, "title": list_.title, "last_updated": list_.last_updated.isoformat()})

    logging.info(f"[DEBUG] lists.api: リスト数={len(list_data)}")
    logging.info(f"[DEBUG] lists.api: リストデータ={list_data}")

    encrypted_data = helpers.encryptObject(list_data)
    response = quart.jsonify({"data": encrypted_data})

    # 最新のリストの最終更新時刻をヘッダーに設定
    if current_user.lists:
        latest_update = max(list_.last_updated for list_ in current_user.lists)
        response.headers["Last-Modified"] = latest_update.isoformat()
        logging.info(f"[DEBUG] lists.api: Last-Modified={latest_update.isoformat()}")

    logging.info("[DEBUG] lists.api: レスポンス送信")
    return response


@app.route("/api/<int:list_id>/tasks", methods=["GET"])
async def api_tasks(list_id: int):
    """リストのタスク一覧取得（キャッシュ対応）。"""
    list_ = await get_owned(list_id)

    # If-Modified-Since ヘッダーをチェック
    if_modified_since = quart.request.headers.get("If-Modified-Since")
    if if_modified_since:
        try:
            client_last_updated = datetime.datetime.fromisoformat(if_modified_since.replace("Z", "+00:00"))
            # タイムゾーン情報を統一（UTCに変換）
            if list_.last_updated.tzinfo is None:
                list_last_updated = list_.last_updated.replace(tzinfo=datetime.UTC)
            else:
                list_last_updated = list_.last_updated.astimezone(datetime.UTC)

            if client_last_updated.tzinfo is None:
                client_last_updated = client_last_updated.replace(tzinfo=datetime.UTC)
            else:
                client_last_updated = client_last_updated.astimezone(datetime.UTC)

            if list_last_updated <= client_last_updated:
                return quart.Response(status=304)
        except (ValueError, TypeError):
            pass  # パースに失敗した場合は通常のレスポンスを返す

    # タスクデータのみを暗号化して返す
    tasks_data = [task.to_dict_() for task in list_.tasks]
    encrypted_data = helpers.encryptObject(tasks_data)
    response = quart.jsonify({"data": encrypted_data})
    response.headers["Last-Modified"] = list_.last_updated.isoformat()
    return response


@app.route("/post", methods=["POST"])
async def post():
    """リストの追加。"""
    form = await quart.request.form
    title = typing.cast(str, form.get("title"))
    title = helpers.decrypt(title)
    if len(title) <= 0:
        quart.abort(400)
    current_user = helpers.get_logged_in_user()
    models.Base.session().add(models.List(title=title, user_id=current_user.id))
    models.Base.session().commit()
    return quart.redirect(quart.url_for("main.index"))


@app.route("/<int:list_id>/clear/", methods=["POST"])
async def clear(list_id: int):
    """完了済みを非表示化。"""
    list_ = await get_owned(list_id)

    tasks = (
        models.Base.session().execute(
            models.Task.select().filter(
                models.Task.list_id == list_.id,
                models.Task.status_id == models.STATUS_IDS["completed"],
            )
        )
    ).scalars()
    for task in tasks:
        task.status = "hidden"
    list_.last_updated = datetime.datetime.now()
    models.Base.session().commit()

    return quart.redirect(quart.url_for("main.index"))


@app.route("/<int:list_id>/rename/", methods=["POST"])
async def rename(list_id: int):
    """リストの名前変更。"""
    list_ = await get_owned(list_id)

    form = await quart.request.form
    title = typing.cast(str, form.get("title"))
    title = helpers.decrypt(title)
    if len(title) <= 0:
        quart.abort(400)
    list_.title = title
    list_.last_updated = datetime.datetime.now()
    models.Base.session().commit()

    return quart.redirect(quart.url_for("main.index"))


@app.route("/<int:list_id>/delete/", methods=["POST"])
async def delete(list_id: int):
    """リストの削除。"""
    list_ = await get_owned(list_id)

    # 関連するタスクも削除
    models.Base.session().execute(models.Task.delete().where(models.Task.list_id == list_.id))

    models.Base.session().delete(list_)
    models.Base.session().commit()

    return quart.redirect(quart.url_for("main.index"))


@app.route("/<int:list_id>/hide/", methods=["POST"])
async def hide(list_id: int):
    """リストの非表示化。"""
    list_ = await get_owned(list_id)
    list_.status = "hidden"
    models.Base.session().commit()
    return quart.redirect(quart.url_for("main.index"))


@app.route("/<int:list_id>/show/", methods=["POST"])
async def show(list_id: int):
    """リストの再表示。"""
    list_ = await get_owned(list_id)
    list_.status = "active"
    models.Base.session().commit()
    return quart.redirect(quart.url_for("main.index"))


async def get_owned(list_id: int) -> models.List:
    """リストの取得(所有者用)。"""
    list_ = models.List.get_by_id(list_id)
    if list_ is None:
        quart.abort(404)
    current_user = helpers.get_logged_in_user()
    if list_.user_id != current_user.id:
        quart.abort(403)
    return list_
