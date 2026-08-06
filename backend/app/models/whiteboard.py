from pydantic import BaseModel, Field
from typing import Any, Optional
import uuid

from app.config import now_iso


def new_id() -> str:
    return uuid.uuid4().hex[:12]


class Whiteboard(BaseModel):
    id: str = Field(default_factory=new_id)
    title: str = "Whiteboard"
    content: dict[str, Any] = Field(default_factory=dict)
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)
