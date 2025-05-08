"""コントローラー。"""

import quart
import quart_auth

import helpers
import models

app = quart.Blueprint("main", __name__)


@app.before_request
@quart_auth.login_required
async def _before_request():
    pass


@app.route("/", methods=["GET"])
async def index():
    """indexページ"""
    show_type = quart.request.args.get("show_type", "list")
    current_user = helpers.get_logged_in_user()
    lists = await _get_lists(current_user, show_type=show_type)
    response = await quart.make_response(
        await quart.render_template("index.html", show_type=show_type, lists=lists)
    )
    response.headers["Service-Worker-Allowed"] = quart.url_for("main.index")
    return response


@app.route("/add", methods=["GET"])
async def add():
    """addページ"""
    current_user = helpers.get_logged_in_user()
    lists = await _get_lists(current_user)
    return await quart.render_template("add.html", lists=lists)


async def _get_lists(current_user: models.User, show_type: str = "list"):
    """リストをロードする"""
    await current_user.awaitable_attrs.lists
    for list_ in current_user.lists:
        await list_.awaitable_attrs.tasks
    return [
        await list_.to_dict_()
        for list_ in current_user.lists
        if list_.status != "hidden" or show_type in ("hidden", "all")
    ]
