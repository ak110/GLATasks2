"""ASGI。"""

import asyncio
import logging

import config
import fastapi
import fastapi.concurrency
import fastapi.responses
import models
import pytilpack.sqlalchemy
import starlette.requests
import starlette.responses
import views.auth
import views.lists
import views.sandbox
import views.tasks
import web_utils

logger = logging.getLogger(__name__)


def create_app() -> fastapi.FastAPI:
    """FastAPIのappを作って返す。"""
    return asyncio.run(acreate_app())


async def acreate_app() -> fastapi.FastAPI:
    """FastAPIのappを作って返す。"""
    assert config.SQLALCHEMY_DATABASE_URI is not None
    await fastapi.concurrency.run_in_threadpool(pytilpack.sqlalchemy.wait_for_connection, config.SQLALCHEMY_DATABASE_URI)
    models.Base.init(config.SQLALCHEMY_DATABASE_URI)

    app = fastapi.FastAPI(docs_url=None, redoc_url=None)

    # ミドルウェアの登録（後に追加したものが外側になる）
    app.add_middleware(web_utils.RequestContextMiddleware)

    # DBセッションミドルウェア
    @app.middleware("http")
    async def _db_session_middleware(request: starlette.requests.Request, call_next):  # type: ignore[no-untyped-def]
        """DBセッションを管理するミドルウェア。"""
        token = models.Base.start_session()
        request.state.db_session_token = token
        try:
            response = await call_next(request)
        except Exception:
            pytilpack.sqlalchemy.safe_close(models.Base.session())
            raise
        finally:
            models.Base.close_session(token)
        return response

    # ルーターの登録
    app.include_router(views.auth.router)
    app.include_router(views.lists.router)
    app.include_router(views.tasks.router)
    app.include_router(views.sandbox.router)

    # /healthcheck
    @app.get("/healthcheck", name="healthcheck")
    async def _healthcheck() -> dict:
        """ヘルスチェック。"""
        return {"status": "ok"}

    # 例外ハンドラ
    @app.exception_handler(fastapi.HTTPException)
    async def _http_error_handler(
        request: starlette.requests.Request, exc: fastapi.HTTPException
    ) -> starlette.responses.Response:
        """HTTPエラー。"""
        del request  # noqa
        logger.error("HTTPエラー: %s", exc)
        if exc.status_code in (301, 302, 303, 307, 308):
            location = exc.headers.get("Location", "/") if exc.headers else "/"
            return starlette.responses.Response(status_code=exc.status_code, headers={"Location": location})
        return fastapi.responses.JSONResponse(content={"detail": exc.detail}, status_code=exc.status_code)

    @app.exception_handler(Exception)
    async def _server_error_handler(request: starlette.requests.Request, exc: Exception) -> starlette.responses.Response:
        """サーバーエラー。"""
        del request  # noqa
        logger.error("サーバーエラー", exc_info=True)
        del exc  # noqa
        return fastapi.responses.JSONResponse(content={"detail": "Internal Server Error"}, status_code=500)

    return app
