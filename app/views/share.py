"""共有機能のコントローラー。"""

import helpers
import quart
import quart_auth

app = quart.Blueprint("share", __name__, url_prefix="/share")


@app.before_request
@quart_auth.login_required
async def _before_request():
    pass


@app.route("/ingest", methods=["GET"])
async def ingest():
    """Android共有からのタスク追加。"""
    current_user = helpers.get_logged_in_user()

    # クエリパラメータから共有データを取得
    title = quart.request.args.get("title", "")
    text = quart.request.args.get("text", "")
    url = quart.request.args.get("url", "")

    # タスクテキストを構成
    task_text_parts = []
    if title:
        task_text_parts.append(title)
    if text and text != title:  # titleと同じ場合は重複を避ける
        task_text_parts.append(text)
    if url:
        task_text_parts.append(url)

    task_text = "\n".join(task_text_parts).strip()

    if not task_text:
        # 共有データが空の場合はメインページにリダイレクト
        return quart.redirect(quart.url_for("main.index"))

    # 表示されているリストのみを取得
    lists = [list_.to_dict_() for list_ in current_user.lists if list_.status == "show"]

    # add.htmlテンプレートを表示（共有データを事前入力）
    return await quart.render_template("add.html", lists=lists, shared_text=task_text)
