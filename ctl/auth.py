"""認証周りのコントローラー。"""

import datetime

import pytilpack.quart_auth_
import pytilpack.web
import quart
import quart_auth

import models

app = quart.Blueprint("auth", __name__, url_prefix="/auth")


@app.route("/login", methods=["GET"])
async def login():
    """ログインページ"""
    return await quart.render_template(
        "login.html", next=quart.request.args.get("next")
    )


@app.route("/login", methods=["POST"])
async def login_auth():
    """ログイン"""
    form = await quart.request.form
    user_id = form["user"]
    user = (
        await models.Base.session().execute(
            models.User.select().filter(models.User.user == user_id)
        )
    ).scalar_one_or_none()
    if user is None or not user.password_is_ok(form["pass"]):
        await quart.flash("ユーザーIDまたはパスワードが異なります。", "error")
        return quart.redirect(quart.url_for("auth.login"))

    user.last_login = datetime.datetime.now(datetime.UTC)
    await models.Base.session().commit()

    pytilpack.quart_auth_.login_user(user.user)
    quart.session.permanent = True
    next_url = pytilpack.web.get_safe_url(
        quart.request.args.get("next"),
        str(quart.request.host_url),
        quart.url_for("main.index"),
    )
    return quart.redirect(next_url)


@app.route("/regist_user", methods=["GET"])
async def regist_user():
    """ユーザー登録"""
    return await quart.render_template("regist_user.html", user_id="")


@app.route("/regist_user", methods=["POST"])
async def regist_user_do():
    """ユーザー登録(実行)"""
    form = await quart.request.form
    user_id = form["user_id"]

    if form["pass"] != form["pass_conf"]:
        await quart.flash("パスワードとパスワード(確認)が一致していません。", "error")
        return await quart.render_template("regist_user.html", user_id=user_id)

    error = await models.User.add(user_id, form["pass"])
    if error:
        await quart.flash(error, "error")
        return await quart.render_template("regist_user.html", user_id=user_id)

    await quart.flash(f"ユーザー {user_id} を登録しました。", "info")
    return quart.redirect(quart.url_for("auth.login"))


@app.route("/logout", methods=["GET"])
@quart_auth.login_required
async def logout():
    """ログアウト"""
    pytilpack.quart_auth_.logout_user()
    return quart.redirect(quart.url_for("auth.login"))
