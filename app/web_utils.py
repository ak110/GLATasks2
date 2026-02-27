"""Web関連の諸々。"""

import time

import starlette.middleware.base
import starlette.requests
import starlette.responses


class RequestContextMiddleware(starlette.middleware.base.BaseHTTPMiddleware):
    """セキュリティヘッダーを設定するミドルウェア。"""

    async def dispatch(
        self,
        request: starlette.requests.Request,
        call_next: starlette.middleware.base.RequestResponseEndpoint,
    ) -> starlette.responses.Response:
        request.state.request_start_time = time.time()

        response = await call_next(request)

        response.headers["X-Content-Type-Options"] = "nosniff"

        if "Cache-Control" not in response.headers:
            response.headers["Cache-Control"] = "private"

        return response
