"""コントローラー。"""

import base64
import json
import typing

import quart
import quart_auth

import helpers
import models

app = quart.Blueprint("lists", __name__, url_prefix="/lists")


@app.before_request
@quart_auth.login_required
async def _before_request():
    pass


@app.route("/api", methods=["GET"])
async def api():
    """リストの取得。"""
    current_user = helpers.get_logged_in_user()
    data = json.dumps(
        [await list_.to_dict_() for list_ in await current_user.awaitable_attrs.lists]
    )
    return quart.jsonify(
        {"data": base64.b64encode(data.encode("utf-8")).decode("utf-8")}
    )


@app.route("/post", methods=["POST"])
async def post():
    """リストの追加。"""
    form = await quart.request.form
    title = typing.cast(str, form.get("title"))
    if len(title) <= 0:
        quart.abort(400)
    current_user = helpers.get_logged_in_user()
    models.Base.session().add(models.List(title=title, user_id=current_user.id))
    await models.Base.session().commit()
    return quart.redirect(quart.url_for("main.index"))


@app.route("/<int:list_id>/clear/", methods=["POST"])
async def clear(list_id: int):
    """完了済みを非表示化。"""
    list_ = await get_owned(list_id)

    tasks = (
        await models.Base.session().execute(
            models.Task.select().filter(
                models.Task.list_id == list_.id,
                models.Task.status_id == models.STATUS_IDS["completed"],
            )
        )
    ).scalars()
    for task in tasks:
        task.status = "hidden"
    await models.Base.session().commit()

    return quart.redirect(quart.url_for("main.index"))


@app.route("/<int:list_id>/rename/", methods=["POST"])
async def rename(list_id: int):
    """リストの名前変更。"""
    list_ = await get_owned(list_id)

    form = await quart.request.form
    title = typing.cast(str, form.get("title"))
    if len(title) <= 0:
        quart.abort(400)
    list_.title = title
    await models.Base.session().commit()

    return quart.redirect(quart.url_for("main.index"))


@app.route("/<int:list_id>/delete/", methods=["POST"])
async def delete(list_id: int):
    """リストの削除。"""
    list_ = await get_owned(list_id)

    # 関連するタスクも削除
    await models.Base.session().execute(
        models.Task.delete().where(models.Task.list_id == list_.id)
    )

    await models.Base.session().delete(list_)
    await models.Base.session().commit()

    return quart.redirect(quart.url_for("main.index"))


@app.route("/<int:list_id>/hide/", methods=["POST"])
async def hide(list_id: int):
    """リストの非表示化。"""
    list_ = await get_owned(list_id)
    list_.status = "hidden"
    await models.Base.session().commit()
    return quart.redirect(quart.url_for("main.index"))


@app.route("/<int:list_id>/show/", methods=["POST"])
async def show(list_id: int):
    """リストの再表示。"""
    list_ = await get_owned(list_id)
    list_.status = "active"
    await models.Base.session().commit()
    return quart.redirect(quart.url_for("main.index"))


async def get_owned(list_id: int) -> models.List:
    """リストの取得(所有者用)。"""
    list_ = await models.List.get_by_id(list_id)
    if list_ is None:
        quart.abort(404)
    current_user = helpers.get_logged_in_user()
    if list_.user_id != current_user.id:
        quart.abort(403)
    return list_
