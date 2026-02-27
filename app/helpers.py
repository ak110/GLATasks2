"""ヘルパー関数。"""

import logging

import config
import fastapi
import models

logger = logging.getLogger(__name__)


async def get_current_user(
    x_api_key: str | None = fastapi.Header(default=None),
    x_user_id: int | None = fastapi.Header(default=None),
) -> models.User:
    """現在のユーザーを取得するFastAPI Dependency（内部APIキーによる認証）。"""
    if x_api_key != config.INTERNAL_API_KEY:
        raise fastapi.HTTPException(status_code=403)
    if x_user_id is None:
        raise fastapi.HTTPException(status_code=403)
    user = models.Base.session().execute(models.User.select().filter(models.User.id == x_user_id)).scalar_one_or_none()
    if user is None:
        raise fastapi.HTTPException(status_code=401)
    return user
