from pydantic import BaseModel
from typing import Literal


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    mode: Literal["chat", "report", "analysis"] = "chat"


class ChatResponse(BaseModel):
    response: str
    timestamp: str


class ChatHistoryEntry(BaseModel):
    id: str
    mode: str
    user_message: str
    assistant_response: str
    timestamp: str


class ChatHistoryResponse(BaseModel):
    entries: list[ChatHistoryEntry]


class HealthResponse(BaseModel):
    status: str
    model: str
    ollama_host: str
