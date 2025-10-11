"""コントローラー。"""

import datetime
import json
import logging
import zoneinfo

import helpers
import models
import quart
import quart_auth

import views.lists

bp = quart.Blueprint("tasks", __name__, url_prefix="/tasks")
logger = logging.getLogger(__name__)


@bp.before_request
@quart_auth.login_required
async def _before_request():
    pass


@bp.route("/<list_id>", methods=["POST"])
async def post(list_id):
    """タスクの追加。"""
    list_ = await views.lists.get_owned(list_id)
    form = await quart.request.form
    text = form.get("text", "")
    text = helpers.decrypt(text)
    text = text.lstrip("\r\n").rstrip()  # 左側は改行のみstrip(インデント維持のため)
    models.Base.session().add(models.Task(list_id=list_.id, text=text))
    list_.last_updated = datetime.datetime.now()
    models.Base.session().commit()
    return quart.redirect(quart.url_for("main.index"))


@bp.route("/api/<list_id>/<task_id>", methods=["PATCH"])
async def patch_api(list_id, task_id):
    """タスクの更新。"""
    list_, task = await get_owned(list_id, task_id)

    json_data = await quart.request.get_json()  # type: ignore
    # 難読化されたデータを復号
    # 後方互換性のため、難読化されていない場合もサポート
    data = json.loads(helpers.decrypt(json_data["data"])) if "data" in json_data else json_data
    if "text" in data:
        task.text = data["text"]
        task.updated = datetime.datetime.now()
    if "status" in data:
        if task.status == "needsAction" and data["status"] == "completed":
            task.completed = datetime.datetime.now()
        task.status = data["status"]
    if "completed" in data:
        if data["completed"] is None:
            task.completed = None
        else:
            # クライアントから受け取った日時(UTC)をローカルタイム(Asia/Tokyo)に変換してDBに保存
            completed_dt = datetime.datetime.fromisoformat(data["completed"])
            if completed_dt.tzinfo is not None:
                # タイムゾーン情報がある場合、Asia/Tokyoに変換してタイムゾーン情報を削除
                task.completed = completed_dt.astimezone(zoneinfo.ZoneInfo("Asia/Tokyo")).replace(tzinfo=None)
            else:
                # タイムゾーン情報がない場合、そのまま保存
                task.completed = completed_dt
    if "move_to" in data:
        move_to = data["move_to"]
        if move_to != list_id:
            list2 = (models.Base.session().execute(models.List.select().filter(models.List.id == move_to))).scalar_one()
            current_user = helpers.get_logged_in_user()
            if list2.user_id != current_user.id:
                quart.abort(403)
            task.list_id = move_to
            list2.last_updated = datetime.datetime.now()

    list_.last_updated = datetime.datetime.now()
    models.Base.session().commit()

    return quart.jsonify(
        {
            "status": task.status,
            "completed": task.completed.replace(tzinfo=zoneinfo.ZoneInfo("Asia/Tokyo"))
            .astimezone(zoneinfo.ZoneInfo("UTC"))
            .isoformat()
            if task.completed
            else None,
            "list_id": task.list_id,
        }
    )


async def get_owned(list_id, task_id) -> tuple[models.List, models.Task]:
    list_ = await views.lists.get_owned(list_id)
    task = models.Task.get_by_id(task_id)
    if task is None:
        quart.abort(404)
    if task.list_id != list_.id:
        quart.abort(403)
    return list_, task
