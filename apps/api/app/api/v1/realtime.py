import asyncio
import json
import logging
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from apps.api.app.core.pipeline import event_broadcaster

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/realtime", tags=["Real-Time Event Stream"])

@router.get("/events")
async def realtime_events_stream(request: Request):
    """
    Master Prompt Section 20: Real-Time Dashboard SSE Event Stream.
    
    Streams server-sent events to frontend when new authorized data arrives.
    Supported events:
    - DATA_UPDATED: Safe metadata notification indicating a source/area has new data.
    - PING: Keep-alive heartbeat every 15 seconds.

    Zero PII, zero internal credentials exposed.
    """
    subscriber_queue = await event_broadcaster.subscribe()

    async def event_generator():
        try:
            # Yield initial connection confirmation
            init_payload = json.dumps({"status": "CONNECTED", "protocol": "SSE", "stream": "floodtrace_realtime"})
            yield f"event: CONNECTED\ndata: {init_payload}\n\n"

            while True:
                # Disconnect if client disconnected
                if await request.is_disconnected():
                    logger.info("Client disconnected from SSE stream.")
                    break

                try:
                    # Wait up to 15s for new events or send keep-alive ping
                    message = await asyncio.wait_for(subscriber_queue.get(), timeout=15.0)
                    event_name = message.get("event", "DATA_UPDATED")
                    data_str = json.dumps(message.get("data", {}), ensure_ascii=False)
                    yield f"event: {event_name}\ndata: {data_str}\n\n"
                    subscriber_queue.task_done()
                except asyncio.TimeoutError:
                    # Send keep-alive heartbeat ping comment
                    yield ": ping\n\n"
        except asyncio.CancelledError:
            logger.info("SSE event stream cancelled.")
        finally:
            await event_broadcaster.unsubscribe(subscriber_queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
