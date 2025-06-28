"""Web関連の諸々。"""

import logging
import secrets

import quart

logger = logging.getLogger(__name__)


def register_csrf_token(app, session_key="_csrf_token", form_key="nonce", func_name="csrf_token"):
    """CSRF対策の処理を登録する。

    使用例：POSTなformに以下を入れる。::

        <input type="hidden" name="nonce" value="{{ csrf_token() }}" />

    """

    async def _csrf_protect():
        if quart.request.method == "POST":
            token = quart.session.get(session_key, None)
            if not token:
                quart.current_app.logger.warning(f"No CSRF token in session. ({quart.current_app.root_path})")
                quart.abort(403)
            if token != (form_token := (await quart.request.form).get(form_key)):
                quart.current_app.logger.warning(f"CSRF Token Error! ({token=} {form_token=} {quart.request.path})")
                quart.abort(403)

    def _generate_csrf_token():
        if session_key not in quart.session:
            quart.session[session_key] = secrets.token_hex()
        return quart.session[session_key]

    app.before_request(_csrf_protect)
    app.jinja_env.globals[func_name] = _generate_csrf_token
