"""テスト用の設定。"""

import logging
import re
import typing

import config
import models
import pytest_asyncio
import pytilpack.quart_
import quart.typing

logger = logging.getLogger(__name__)


@pytest_asyncio.fixture(name="base_app", scope="session", autouse=True)
async def _base_app(tmp_path_factory) -> typing.AsyncGenerator[quart.Quart]:
    """テスト用のアプリケーションを生成する。"""
    data_dir = tmp_path_factory.mktemp("data_dir")
    config.DATA_DIR = data_dir
    config.SQLALCHEMY_DATABASE_URI = f"sqlite:///{data_dir}/testdb.sqlite"

    import asgi

    _app = await asgi.acreate_app()
    async with _app.app_context():
        with models.Base.connect() as conn:
            models.Base.metadata.create_all(conn)
            token = models.Base.start_session()
            try:
                # テスト用のデータを作成する。
                models.User.add("user", "user")
                models.Base.session().commit()

                yield _app
            finally:
                models.Base.close_session(token)
                models.Base.metadata.drop_all(conn)


@pytest_asyncio.fixture(name="app", scope="function", autouse=True)
async def _app(base_app: quart.Quart) -> typing.AsyncGenerator[quart.Quart]:
    # テストの実行
    async with base_app.app_context():
        token = models.Base.start_session()
        try:
            yield base_app
        finally:
            models.Base.close_session(token)


@pytest_asyncio.fixture(name="client", scope="function")
async def _client(
    app: quart.Quart,
) -> typing.AsyncGenerator[quart.typing.TestClientProtocol]:
    """テストクライアント。"""
    async with app.test_client() as client:
        yield client


@pytest_asyncio.fixture(name="nonce", scope="function")
async def _nonce(client: quart.typing.TestClientProtocol) -> str:
    """nonce取得。"""
    response = await client.get("/auth/login")
    page_data = await pytilpack.quart_.assert_html(response)
    nonce_match = re.search(r'name="nonce" value="(\w+)"', page_data)
    assert nonce_match is not None
    return nonce_match.group(1)


@pytest_asyncio.fixture(name="user_client", scope="function")
async def _user_client(
    client: quart.typing.TestClientProtocol, nonce: str
) -> quart.typing.TestClientProtocol:
    # ログインボタン押下
    response = await client.post(
        "/auth/login", form={"user": "user", "pass": "user", "nonce": nonce}
    )
    await pytilpack.quart_.assert_html(response, status_code=302)
    logger.info(f"user_client: logged in ({nonce=}")
    return client
