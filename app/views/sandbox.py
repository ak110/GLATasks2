"""コントローラー。"""

import asyncio

import models
import quart

app = quart.Blueprint("sandbox", __name__, url_prefix="/sandbox")


@app.before_request
# @quart_auth.login_required
async def _before_request():
    pass


@app.route("/sse", methods=["GET"])
async def sse():
    """SSEお試し。"""
    # https://quart.palletsprojects.com/en/latest/how_to_guides/server_sent_events/

    async def send_events():
        """SSEイベントを送信するジェネレーター関数。"""
        # print(f"1 {models.Base.session()}")
        await asyncio.sleep(0.01)
        yield f"data: foo {getattr(quart.g, 'sse_test', 'novalue')} {quart.request.path=}\n\n"

        # print(f"2 {models.Base.session()}")
        await asyncio.sleep(0.01)
        yield f"data: bar {getattr(quart.g, 'sse_test', 'novalue')} {quart.request.remote_addr=}\n\n"

        # print(f"3 {models.Base.session()}")
        await asyncio.sleep(0.01)
        yield f"data: baz {getattr(quart.g, 'sse_test', 'novalue')} {quart.request.script_root=}\n\n"

        # print(f"4 {models.Base.session()}")
        await asyncio.sleep(0.01)
        yield "data: [DONE]\n\n"

    print(f"0 {models.Base.session()}")
    quart.g.sse_test = "sse_test!"

    response = await quart.make_response(
        quart.stream_with_context(send_events)(),
        {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Transfer-Encoding": "chunked",
            "X-Accel-Buffering": "no",
        },
    )
    assert isinstance(response, quart.Response)
    response.timeout = None
    return response
