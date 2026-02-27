"""コントローラー。"""

import datetime
import logging
import zoneinfo

import fastapi
import fastapi.responses
import helpers
import models
import pydantic
import pytilpack.datetime
import starlette.requests
import starlette.responses

router = fastapi.APIRouter(prefix="/lists", tags=["lists"])
logger = logging.getLogger(__name__)


@router.get("/api/{show_type}", name="lists.api")
async def api(
    show_type: str,
    current_user: models.User = fastapi.Depends(helpers.get_current_user),
) -> fastapi.responses.JSONResponse:
    """リスト一覧の取得（タスクなし）。"""
    if show_type not in ("list", "hidden", "all"):
        raise fastapi.HTTPException(status_code=400)

    list_data = []
    for list_ in current_user.lists:
        # show_typeに応じた表示判定
        if show_type == "list" and list_.status == "hidden":
            continue
        # show_type == "hidden" / "all" の場合は全て表示

        list_data.append(
            {
                "id": list_.id,
                "title": list_.title,
                "last_updated": list_.last_updated.replace(tzinfo=zoneinfo.ZoneInfo("Asia/Tokyo"))
                .astimezone(zoneinfo.ZoneInfo("UTC"))
                .isoformat(),
            }
        )

    headers: dict[str, str] = {}
    if list_data:
        latest_update = max(list_.last_updated for list_ in current_user.lists if any(d["id"] == list_.id for d in list_data))
        headers["Last-Modified"] = latest_update.isoformat()

    return fastapi.responses.JSONResponse(content=list_data, headers=headers)


@router.get("/api/{list_id}/tasks/{show_type}", name="lists.api_tasks")
async def api_tasks(
    request: starlette.requests.Request,
    list_id: int,
    show_type: str,
    current_user: models.User = fastapi.Depends(helpers.get_current_user),
) -> starlette.responses.Response:
    """リストのタスク一覧取得（キャッシュ対応）。"""
    list_ = get_owned(list_id, current_user)

    # If-Modified-Since ヘッダーをチェック
    if_modified_since = request.headers.get("If-Modified-Since")
    if if_modified_since:
        try:
            client_last_updated = pytilpack.datetime.fromiso(if_modified_since)
            # タイムゾーン情報を統一（UTCに変換）
            server_last_updated = pytilpack.datetime.toutc(list_.last_updated.replace(tzinfo=zoneinfo.ZoneInfo("Asia/Tokyo")))
            client_last_updated = pytilpack.datetime.toutc(client_last_updated)
            # サーバー側のデータがクライアント側と同じか古い場合、304を返す
            if server_last_updated <= client_last_updated:
                return starlette.responses.Response(status_code=304)
        except ValueError, TypeError:
            # パースに失敗した場合は通常のレスポンスを返す
            logger.warning("Invalid If-Modified-Since header: %s", if_modified_since, exc_info=True)

    tasks_data = [
        task.to_dict_()
        for task in list_.tasks
        if show_type == "all"
        or (show_type == "list" and task.status != "hidden")
        or (show_type == "hidden" and task.status == "hidden")
    ]
    last_modified = (
        list_.last_updated.replace(tzinfo=zoneinfo.ZoneInfo("Asia/Tokyo")).astimezone(zoneinfo.ZoneInfo("UTC")).isoformat()
    )
    return fastapi.responses.JSONResponse(
        content=tasks_data,
        headers={"Last-Modified": last_modified},
    )


class _PostBody(pydantic.BaseModel):
    title: str


@router.post("/post", name="lists.post")
async def post(
    body: _PostBody,
    current_user: models.User = fastapi.Depends(helpers.get_current_user),
) -> fastapi.responses.JSONResponse:
    """リストの追加。"""
    if len(body.title) <= 0:
        raise fastapi.HTTPException(status_code=400)
    models.Base.session().add(models.List(title=body.title, user_id=current_user.id))
    models.Base.session().commit()
    return fastapi.responses.JSONResponse(content={"status": "ok"})


@router.post("/{list_id}/clear/", name="lists.clear")
async def clear(
    list_id: int,
    current_user: models.User = fastapi.Depends(helpers.get_current_user),
) -> fastapi.responses.JSONResponse:
    """完了済みを非表示化。"""
    list_ = get_owned(list_id, current_user)

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

    return fastapi.responses.JSONResponse(content={"status": "ok"})


class _RenameBody(pydantic.BaseModel):
    title: str


@router.post("/{list_id}/rename/", name="lists.rename")
async def rename(
    list_id: int,
    body: _RenameBody,
    current_user: models.User = fastapi.Depends(helpers.get_current_user),
) -> fastapi.responses.JSONResponse:
    """リストの名前変更。"""
    list_ = get_owned(list_id, current_user)

    if len(body.title) <= 0:
        raise fastapi.HTTPException(status_code=400)
    list_.title = body.title
    list_.last_updated = datetime.datetime.now()
    models.Base.session().commit()

    return fastapi.responses.JSONResponse(content={"status": "ok"})


@router.post("/{list_id}/delete/", name="lists.delete")
async def delete(
    list_id: int,
    current_user: models.User = fastapi.Depends(helpers.get_current_user),
) -> fastapi.responses.JSONResponse:
    """リストの削除。"""
    list_ = get_owned(list_id, current_user)

    # 関連するタスクも削除
    models.Base.session().execute(models.Task.delete().where(models.Task.list_id == list_.id))

    models.Base.session().delete(list_)
    models.Base.session().commit()

    return fastapi.responses.JSONResponse(content={"status": "ok"})


@router.post("/{list_id}/hide/", name="lists.hide")
async def hide(
    list_id: int,
    current_user: models.User = fastapi.Depends(helpers.get_current_user),
) -> fastapi.responses.JSONResponse:
    """リストの非表示化。"""
    list_ = get_owned(list_id, current_user)
    list_.status = "hidden"
    models.Base.session().commit()
    return fastapi.responses.JSONResponse(content={"status": "ok"})


@router.post("/{list_id}/show/", name="lists.show")
async def show(
    list_id: int,
    current_user: models.User = fastapi.Depends(helpers.get_current_user),
) -> fastapi.responses.JSONResponse:
    """リストの再表示。"""
    list_ = get_owned(list_id, current_user)
    list_.status = "active"
    models.Base.session().commit()
    return fastapi.responses.JSONResponse(content={"status": "ok"})


def get_owned(list_id: int, current_user: models.User) -> models.List:
    """リストの取得(所有者用)。"""
    list_ = models.List.get_by_id(list_id)
    if list_ is None:
        raise fastapi.HTTPException(status_code=404)
    if list_.user_id != current_user.id:
        raise fastapi.HTTPException(status_code=403)
    return list_
