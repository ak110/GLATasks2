"""コントローラー。"""

import asyncio
import logging
import typing

import fastapi
import starlette.requests
import starlette.responses

router = fastapi.APIRouter(prefix="/sandbox", tags=["sandbox"])
logger = logging.getLogger(__name__)


@router.get("/sse", name="sandbox.sse")
async def sse(request: starlette.requests.Request) -> starlette.responses.StreamingResponse:
    """SSEお試し。"""

    async def send_events() -> typing.AsyncGenerator[str]:
        """SSEイベントを送信するジェネレーター関数。"""
        await asyncio.sleep(0.01)
        yield f"data: foo {request.url.path}\n\n"

        await asyncio.sleep(0.01)
        yield f"data: bar {request.client.host if request.client else 'unknown'}\n\n"

        await asyncio.sleep(0.01)
        yield "data: baz\n\n"

        await asyncio.sleep(0.01)
        yield "data: [DONE]\n\n"

    return starlette.responses.StreamingResponse(
        send_events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
