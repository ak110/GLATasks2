"""ASGI。"""

import asyncio
import datetime
import secrets
import time

import config
import ctl.auth
import ctl.lists
import ctl.main
import ctl.tasks
import helpers
import models
import pytilpack.quart_
import pytilpack.quart_auth_
import pytilpack.sqlalchemy_
import quart
import quart_auth
import web_utils
import werkzeug.exceptions


def create_app():
    """quartのappを作って返す。"""
    return asyncio.run(acreate_app())


async def acreate_app():
    """quartのappを作って返す。"""
    app = quart.Quart(__name__)
    # Flask extension compatibility is enabled by importing quart_flask_patch
    app.secret_key = config.FLASK_CONFIG["SECRET_KEY"]

    app.config.from_mapping(config.FLASK_CONFIG)
    app.asgi_app = pytilpack.quart_.ProxyFix(app)  # type: ignore

    assert config.SQLALCHEMY_DATABASE_URI is not None
    await pytilpack.sqlalchemy_.await_for_connection(config.SQLALCHEMY_DATABASE_URI)
    models.Base.init(config.SQLALCHEMY_DATABASE_URI)

    app.register_blueprint(ctl.auth.app)
    app.register_blueprint(ctl.lists.app)
    app.register_blueprint(ctl.main.app)
    app.register_blueprint(ctl.tasks.app)

    @app.route("/health")
    async def _healthcheck():
        """ヘルスチェック。"""
        return quart.jsonify({"status": "ok"})

    @app.route("/sw.js")
    async def _swjs():
        response = await quart.make_response(
            await quart.send_file(config.BASE_DIR / "templates" / "sw.js")
        )
        response.headers["Content-Type"] = "application/javascript"
        return response

    @app.errorhandler(quart_auth.Unauthorized)
    async def _redirect_to_login(_: quart_auth.Unauthorized):
        next_url = quart.request.full_path
        return quart.redirect(quart.url_for("auth.login", next=next_url))

    @app.errorhandler(werkzeug.exceptions.HTTPException)
    async def _http_error_handler(e: werkzeug.exceptions.HTTPException):
        """HTTPエラー"""
        app.logger.error(f"HTTPエラー: {quart.request.full_path}", exc_info=True)
        await pytilpack.sqlalchemy_.asafe_close(models.Base.session())
        return (
            await quart.render_template(
                "error.html", name="HTTP Error", desc=e.description
            ),
            e.code or 500,
        )

    @app.errorhandler(Exception)
    async def _server_error_handler(e: Exception):
        """サーバーエラー"""
        del e  # noqa
        app.logger.error(f"サーバーエラー: {quart.request.full_path}", exc_info=True)
        await pytilpack.sqlalchemy_.asafe_close(models.Base.session())
        return (
            await quart.render_template("error.html", name="Server Error", desc=None),
            500,
        )

    @app.before_request
    async def _before_request():
        """リクエストの前処理。"""
        # nonceの生成。
        quart.g.script_nonce = secrets.token_hex(4)
        # DBセッションの開始。
        quart.g.db_session_token = await models.Base.start_session()

    @app.after_request
    async def _after_request(r: quart.Response):
        """リクエストの後処理。"""
        # DBセッションのクローズ。
        await models.Base.close_session(quart.g.db_session_token)

        # レスポンスヘッダを適当に設定。
        try:
            script_nonce = quart.g.script_nonce
        except AttributeError:  # 念のため
            script_nonce = secrets.token_hex(4)
            quart.g.script_nonce = script_nonce

        # 動的コンテンツのみprivate指定
        if "Cache-Control" not in r.headers:
            r.cache_control.private = True

        if r.content_type is not None and "text/html" in r.content_type:
            r.headers["Content-Security-Policy"] = (
                "default-src * data: blob:;"
                f" script-src * 'nonce-{script_nonce}' 'unsafe-eval';"
                " style-src * 'unsafe-inline';"
            )
            r.headers["X-XSS-Protection"] = "1; mode=block"

        r.headers["X-Content-Type-Options"] = "nosniff"
        r.headers["X-Frame-Options"] = "SAMEORIGIN"

        return r

    # app.before_requestの順番問題があるのでここで初期化..
    auth_manager = pytilpack.quart_auth_.QuartAuth[models.User]()
    auth_manager.init_app(app)

    @auth_manager.user_loader
    async def _load_user(auth_id: str) -> models.User | None:
        """ユーザの読み込み。"""
        user = (
            await models.Base.session().execute(
                models.User.select().filter(models.User.user == auth_id)
            )
        ).scalar_one_or_none()
        if user is None:
            return None
        # 最終ログイン日時の更新
        user.last_login = datetime.datetime.now(datetime.UTC)
        await models.Base.session().commit()
        return user

    web_utils.register_csrf_token(app)

    app.jinja_env.globals["time"] = time.time
    app.jinja_env.globals["localtime"] = time.localtime
    app.jinja_env.globals["strftime"] = time.strftime
    app.jinja_env.globals["config"] = config
    app.jinja_env.globals["helpers"] = helpers

    return app
