"""コントローラー。"""

import datetime
import logging
import typing
import zoneinfo

import helpers
import models
import pytilpack.datetime
import quart
import quart_auth

bp = quart.Blueprint("lists", __name__, url_prefix="/lists")
logger = logging.getLogger(__name__)


@bp.before_request
@quart_auth.login_required
async def _before_request():
    pass


@bp.route("/api/<show_type>", methods=["GET"])
async def api(show_type: str):
    """リスト一覧の取得（タスクなし）。"""
    if show_type not in ("list", "hidden", "all"):
        quart.abort(400)

    current_user = helpers.get_logged_in_user()

    # リスト情報のみ（タスクなし）
    # show_typeに応じてフィルタリング
    list_data = []
    for list_ in current_user.lists:
        # show_typeに応じた表示判定
        if show_type == "list" and list_.status == "hidden":
            continue
        # show_type == "hidden" / "all" の場合は全て表示 (hiddenはtaskだけhiddenの場合があるのでリストは全部表示)

        list_data.append(
            {
                "id": list_.id,
                "title": list_.title,
                "last_updated": list_.last_updated.replace(tzinfo=zoneinfo.ZoneInfo("Asia/Tokyo"))
                .astimezone(zoneinfo.ZoneInfo("UTC"))
                .isoformat(),
            }
        )

    encrypted_data = helpers.encryptObject(list_data)
    response = quart.jsonify({"data": encrypted_data})

    # 最新のリストの最終更新時刻をヘッダーに設定
    if list_data:
        latest_update = max(list_.last_updated for list_ in current_user.lists if any(d["id"] == list_.id for d in list_data))
        response.headers["Last-Modified"] = latest_update.isoformat()

    return response


@bp.route("/api/<int:list_id>/tasks", methods=["GET"])
async def api_tasks(list_id: int):
    """リストのタスク一覧取得（キャッシュ対応）。"""
    list_ = await get_owned(list_id)

    # If-Modified-Since ヘッダーをチェック
    if_modified_since = quart.request.headers.get("If-Modified-Since")
    if if_modified_since:
        try:
            client_last_updated = pytilpack.datetime.fromiso(if_modified_since)
            # タイムゾーン情報を統一（UTCに変換）
            server_last_updated = pytilpack.datetime.toutc(list_.last_updated.replace(tzinfo=zoneinfo.ZoneInfo("Asia/Tokyo")))
            client_last_updated = pytilpack.datetime.toutc(client_last_updated)
            # サーバー側のデータがクライアント側と同じか古い場合、304を返す
            if server_last_updated <= client_last_updated:
                return quart.Response(status=304)
        except (ValueError, TypeError):
            # パースに失敗した場合は通常のレスポンスを返す
            logger.warning("Invalid If-Modified-Since header: %s", if_modified_since, exc_info=True)

    # タスクデータのみを暗号化して返す
    tasks_data = [task.to_dict_() for task in list_.tasks]
    encrypted_data = helpers.encryptObject(tasks_data)
    response = quart.jsonify({"data": encrypted_data})
    response.headers["Last-Modified"] = (
        list_.last_updated.replace(tzinfo=zoneinfo.ZoneInfo("Asia/Tokyo")).astimezone(zoneinfo.ZoneInfo("UTC")).isoformat()
    )
    return response


@bp.route("/post", methods=["POST"])
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


@bp.route("/<int:list_id>/clear/", methods=["POST"])
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


@bp.route("/<int:list_id>/rename/", methods=["POST"])
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


@bp.route("/<int:list_id>/delete/", methods=["POST"])
async def delete(list_id: int):
    """リストの削除。"""
    list_ = await get_owned(list_id)

    # 関連するタスクも削除
    models.Base.session().execute(models.Task.delete().where(models.Task.list_id == list_.id))

    models.Base.session().delete(list_)
    models.Base.session().commit()

    return quart.redirect(quart.url_for("main.index"))


@bp.route("/<int:list_id>/hide/", methods=["POST"])
async def hide(list_id: int):
    """リストの非表示化。"""
    list_ = await get_owned(list_id)
    list_.status = "hidden"
    models.Base.session().commit()
    return quart.redirect(quart.url_for("main.index"))


@bp.route("/<int:list_id>/show/", methods=["POST"])
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
