"""共有機能のコントローラー。"""

import logging
import urllib.parse

import quart
import quart_auth

bp = quart.Blueprint("share", __name__, url_prefix="/share")
logger = logging.getLogger(__name__)


@bp.before_request
@quart_auth.login_required
async def _before_request():
    pass


@bp.route("/ingest", methods=["GET"])
async def ingest():
    """Android共有からのタスク追加。"""
    # クエリパラメータから共有データを取得
    title = quart.request.args.get("title", "")
    text = quart.request.args.get("text", "")
    url = quart.request.args.get("url", "")
    # in_popup = quart.request.args.get("in_popup", "")

    # URLをクリーニング
    if url:
        url = _clean_url(url)

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

    return await quart.render_template("add.html", shared_text=task_text)


def _clean_url(url: str) -> str:
    """URLからトラッキングパラメータやアフィリエイトタグを除去する。

    Args:
        url: クリーンにする対象のURL

    Returns:
        クリーンにされたURL
    """
    if not url:
        return url

    # 除去対象のクエリパラメータ
    tracking_params = {
        # UTMパラメータ
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_content",
        "utm_term",
        # Amazonアフィリエイト
        "tag",
        "linkCode",
        "ref",
        "ref_",
        "pf_rd_r",
        "pf_rd_s",
        "pf_rd_t",
        "pf_rd_i",
        "pf_rd_m",
        "pf_rd_p",
        "pd_rd_r",
        "pd_rd_w",
        "pd_rd_wg",
        "pd_rd_i",
        # その他のトラッキング
        "fbclid",
        "gclid",
        "mc_eid",
        "mc_cid",
        "_ga",
        "_gl",
        "msclkid",
    }

    try:
        parsed = urllib.parse.urlparse(url)
        if not parsed.query:
            return url

        # クエリパラメータをパース
        query_params = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)

        # トラッキングパラメータを除去
        cleaned_params = {key: value for key, value in query_params.items() if key not in tracking_params}

        # URLを再構築
        if cleaned_params:
            # parse_qsはリストを返すため、各値の最初の要素を使う
            query_string = urllib.parse.urlencode({k: v[0] for k, v in cleaned_params.items()}, doseq=False)
            cleaned_url = urllib.parse.urlunparse(
                (parsed.scheme, parsed.netloc, parsed.path, parsed.params, query_string, parsed.fragment)
            )
        else:
            # クエリパラメータが全て削除された場合
            cleaned_url = urllib.parse.urlunparse(
                (parsed.scheme, parsed.netloc, parsed.path, parsed.params, "", parsed.fragment)
            )

        return cleaned_url
    except Exception:
        # URLのパースに失敗した場合は元のURLを返す
        logger.exception("URLのクリーニングに失敗しました: %s", url)
        return url
