"""コントローラー。"""

import datetime
import logging
import zoneinfo

import fastapi
import fastapi.responses
import helpers
import models
import pydantic
import starlette.requests

import views.lists

router = fastapi.APIRouter(prefix="/tasks", tags=["tasks"])
logger = logging.getLogger(__name__)


class _AddTaskBody(pydantic.BaseModel):
    text: str


@router.post("/{list_id}", name="tasks.post")
async def post(
    list_id: int,
    body: _AddTaskBody,
    current_user: models.User = fastapi.Depends(helpers.get_current_user),
) -> fastapi.responses.JSONResponse:
    """タスクの追加。"""
    list_ = views.lists.get_owned(list_id, current_user)
    text = body.text.lstrip("\r\n").rstrip()  # 左側は改行のみstrip(インデント維持のため)
    models.Base.session().add(models.Task(list_id=list_.id, text=text))
    list_.last_updated = datetime.datetime.now()
    models.Base.session().commit()
    return fastapi.responses.JSONResponse(content={"status": "ok"})


@router.patch("/api/{list_id}/{task_id}", name="tasks.patch_api")
async def patch_api(
    request: starlette.requests.Request,
    list_id: int,
    task_id: int,
    current_user: models.User = fastapi.Depends(helpers.get_current_user),
) -> fastapi.responses.JSONResponse:
    """タスクの更新。"""
    list_, task = get_owned(list_id, task_id, current_user)

    data = await request.json()
    if "text" in data:
        task.text = data["text"]
        if not data.get("keep_order"):
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
        move_to = int(data["move_to"])  # JSONからは文字列で来るため明示的にint変換
        if move_to != list_id:
            list2 = (models.Base.session().execute(models.List.select().filter(models.List.id == move_to))).scalar_one()
            if list2.user_id != current_user.id:
                raise fastapi.HTTPException(status_code=403)
            task.list_id = move_to
            list2.last_updated = datetime.datetime.now()

    list_.last_updated = datetime.datetime.now()
    models.Base.session().commit()

    return fastapi.responses.JSONResponse(
        content={
            "status": task.status,
            "completed": task.completed.replace(tzinfo=zoneinfo.ZoneInfo("Asia/Tokyo"))
            .astimezone(zoneinfo.ZoneInfo("UTC"))
            .isoformat()
            if task.completed
            else None,
            "list_id": task.list_id,
            "title": task.title,
            "notes": task.notes,
        }
    )


def get_owned(list_id: int, task_id: int, current_user: models.User) -> tuple[models.List, models.Task]:
    """タスクの取得(所有者用)。"""
    list_ = views.lists.get_owned(list_id, current_user)
    task = models.Task.get_by_id(task_id)
    if task is None:
        raise fastapi.HTTPException(status_code=404)
    if task.list_id != list_.id:
        raise fastapi.HTTPException(status_code=403)
    return list_, task
