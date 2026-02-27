"""認証周りのコントローラー。"""

import datetime
import logging

import config
import fastapi
import fastapi.responses
import models
import pydantic

router = fastapi.APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)


class _ValidateBody(pydantic.BaseModel):
    user: str
    password: str


class _RegisterBody(pydantic.BaseModel):
    user_id: str
    password: str


async def _check_api_key(x_api_key: str | None = fastapi.Header(default=None)) -> None:
    """内部APIキーを検証するFastAPI Dependency。"""
    if x_api_key != config.INTERNAL_API_KEY:
        raise fastapi.HTTPException(status_code=403)


@router.post("/validate", name="auth.validate")
async def validate(
    body: _ValidateBody,
    _: None = fastapi.Depends(_check_api_key),
) -> fastapi.responses.JSONResponse:
    """資格情報を検証してユーザー情報を返す。"""
    user_obj = models.Base.session().execute(models.User.select().filter(models.User.user == body.user)).scalar_one_or_none()
    if user_obj is None or not user_obj.password_is_ok(body.password):
        raise fastapi.HTTPException(status_code=401, detail="ユーザーIDまたはパスワードが異なります。")

    user_obj.last_login = datetime.datetime.now(datetime.UTC)
    models.Base.session().commit()

    return fastapi.responses.JSONResponse(content={"id": user_obj.id, "user": user_obj.user})


@router.post("/register", name="auth.register")
async def register(
    body: _RegisterBody,
    _: None = fastapi.Depends(_check_api_key),
) -> fastapi.responses.JSONResponse:
    """ユーザーを登録してユーザー情報を返す。"""
    try:
        models.User.add(body.user_id, body.password)
    except ValueError as e:
        raise fastapi.HTTPException(status_code=400, detail=str(e)) from e

    user_obj = models.Base.session().execute(models.User.select().filter(models.User.user == body.user_id)).scalar_one()
    return fastapi.responses.JSONResponse(content={"id": user_obj.id, "user": user_obj.user})
