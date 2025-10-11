"""コントローラー。"""

import logging

import quart
import quart_auth

bp = quart.Blueprint("main", __name__)
logger = logging.getLogger(__name__)


@bp.before_request
@quart_auth.login_required
async def _before_request():
    pass


@bp.route("/", methods=["GET"])
async def index():
    """indexページ"""
    show_type = quart.request.args.get("show_type", "list")
    response = await quart.make_response(await quart.render_template("index.html", show_type=show_type))
    response.headers["Service-Worker-Allowed"] = quart.url_for("main.index")
    return response


@bp.route("/add", methods=["GET"])
async def add():
    """addページ"""
    return await quart.render_template("add.html")
