"""
AI Chat routes — Streaming Chat, Report, Analysis, Health, History.
"""

import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.models.ai import (
    ChatRequest,
    ChatHistoryResponse,
    HealthResponse,
)
from app.services import ai_service
from app.config import now_iso

router = APIRouter(prefix="/api/ai", tags=["AI"])


@router.post("/chat")
async def chat_endpoint(req: ChatRequest):
    messages = [{"role": m.role, "content": m.content} for m in req.messages]

    async def event_stream():
        full_response = []
        async for chunk in ai_service.chat_stream(messages, mode=req.mode):
            full_response.append(chunk)
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        complete = "".join(full_response)
        ai_service.save_chat_entry(req.mode, messages[-1]["content"], complete)
        yield f"data: {json.dumps({'done': True, 'timestamp': now_iso()})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/report")
async def report_endpoint(req: ChatRequest):
    messages = [{"role": m.role, "content": m.content} for m in req.messages]

    async def event_stream():
        full_response = []
        async for chunk in ai_service.chat_stream(messages, mode="report"):
            full_response.append(chunk)
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        complete = "".join(full_response)
        ai_service.save_chat_entry("report", messages[-1]["content"], complete)
        yield f"data: {json.dumps({'done': True, 'timestamp': now_iso()})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/analysis")
async def analysis_endpoint(req: ChatRequest):
    messages = [{"role": m.role, "content": m.content} for m in req.messages]

    async def event_stream():
        full_response = []
        async for chunk in ai_service.chat_stream(messages, mode="analysis"):
            full_response.append(chunk)
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        complete = "".join(full_response)
        ai_service.save_chat_entry("analysis", messages[-1]["content"], complete)
        yield f"data: {json.dumps({'done': True, 'timestamp': now_iso()})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/health", response_model=HealthResponse)
async def health_endpoint():
    result = await ai_service.check_health()
    return HealthResponse(**result)


@router.get("/history", response_model=ChatHistoryResponse)
async def history_endpoint(limit: int = 50):
    entries = ai_service.get_chat_history(limit=limit)
    return ChatHistoryResponse(entries=entries)


@router.delete("/history")
async def clear_history_endpoint():
    ai_service.clear_chat_history()
    return {"status": "cleared"}
