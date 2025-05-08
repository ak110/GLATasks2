"""コントローラー。"""

import datetime
import json

import quart
import quart_auth

import ctl.lists
import helpers
import models

app = quart.Blueprint("tasks", __name__, url_prefix="/tasks")


@app.before_request
@quart_auth.login_required
async def _before_request():
    pass


@app.route("/<list_id>", methods=["POST"])
async def post(list_id):
    """タスクの追加。"""
    list_ = await ctl.lists.get_owned(list_id)
    form = await quart.request.form
    text = form.get("text", "").strip()
    models.Base.session().add(models.Task(list_id=list_.id, text=text))
    await models.Base.session().commit()
    return quart.redirect(quart.url_for("main.index"))


@app.route("/api/<list_id>/<task_id>", methods=["PATCH"])
async def patch_api(list_id, task_id):
    """タスクの更新。"""
    _, task = await get_owned(list_id, task_id)

    json_data = await quart.request.get_json()  # type: ignore
    if "data" in json_data:
        # 難読化されたデータを復号
        data = json.loads(helpers.decrypt(json_data["data"]))
    else:
        data = json_data  # 後方互換性のため、難読化されていない場合もサポート
    if "text" in data:
        task.text = data["text"]
        task.updated = datetime.datetime.now(datetime.UTC)
    if "status" in data:
        if task.status == "needsAction" and data["status"] == "completed":
            task.completed = datetime.datetime.now(datetime.UTC)
        task.status = data["status"]
    if "completed" in data:
        if data["completed"] is None:
            task.completed = None
        else:
            task.completed = datetime.datetime.fromisoformat(data["completed"])
    if "move_to" in data:
        move_to = data["move_to"]
        if move_to != list_id:
            list2 = (
                await models.Base.session().execute(
                    models.List.select().filter(models.List.id == move_to)
                )
            ).scalar_one()
            current_user = helpers.get_logged_in_user()
            if list2.user_id != current_user.id:
                quart.abort(403)
            task.list_id = move_to

    await models.Base.session().commit()
    return quart.jsonify(
        {
            "status": task.status,
            "completed": task.completed.isoformat() if task.completed else None,
            "list_id": task.list_id,
        }
    )


async def get_owned(list_id, task_id) -> tuple[models.List, models.Task]:
    list_ = await ctl.lists.get_owned(list_id)
    task = await models.Task.get_by_id(task_id)
    if task is None:
        quart.abort(404)
    if task.list_id != list_.id:
        quart.abort(403)
    return list_, task
