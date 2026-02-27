"""テスト用の設定。"""

import logging
import typing

import config
import fastapi
import httpx
import models
import pytest_asyncio

logger = logging.getLogger(__name__)

TEST_USER = "user"
TEST_PASS = "user"


@pytest_asyncio.fixture(name="app", scope="session")
async def _app(tmp_path_factory) -> fastapi.FastAPI:
    """テスト用のアプリケーションを生成する。"""
    data_dir = tmp_path_factory.mktemp("data_dir")
    config.DATA_DIR = data_dir
    config.SQLALCHEMY_DATABASE_URI = f"sqlite:///{data_dir}/testdb.sqlite"
    # INTERNAL_API_KEY を新しい DATA_DIR に合わせて再生成
    import pytilpack.secrets

    config.INTERNAL_API_KEY = pytilpack.secrets.generate_secret_key(data_dir / ".internal_api_key").hex()

    import asgi

    app_ = await asgi.acreate_app()

    with models.Base.connect() as conn:
        models.Base.metadata.create_all(conn)
    with models.Base.session_scope():
        models.User.add(TEST_USER, TEST_PASS)

    return app_


@pytest_asyncio.fixture(name="client", scope="function")
async def _client(app: fastapi.FastAPI) -> typing.AsyncGenerator[httpx.AsyncClient]:
    """認証なしのテストクライアント。"""
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://testserver",
    ) as c:
        yield c


@pytest_asyncio.fixture(name="user_client", scope="function")
async def _user_client(app: fastapi.FastAPI) -> typing.AsyncGenerator[httpx.AsyncClient]:
    """認証済みのテストクライアント。"""
    with models.Base.session_scope():
        user = models.Base.session().execute(models.User.select().filter(models.User.user == TEST_USER)).scalar_one()
        user_id = user.id

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://testserver",
        headers={
            "x-api-key": config.INTERNAL_API_KEY,
            "x-user-id": str(user_id),
        },
    ) as c:
        yield c
