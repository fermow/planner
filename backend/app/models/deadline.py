from pydantic import BaseModel, Field
from typing import Optional
import uuid

from app.config import now_iso


def new_id() -> str:
    return uuid.uuid4().hex[:12]


"""
Example deadlines.json structure:
[
  {
    "id": "a1b2c3d4e5f6",
    "title": "Submit quarterly report",
    "description": "Q4 financial review",
    "due_date": "2026-06-15T09:00:00Z",
    "priority": "high",
    "tags": ["work", "finance"],
    "status": "pending",
    "progress": 0,
    "reminder_enabled": true,
    "created_at": "2026-05-20T10:00:00Z",
    "updated_at": "2026-05-20T10:00:00Z"
  }
]
"""


class Deadline(BaseModel):
    id: str = Field(default_factory=new_id)
    title: str
    description: str = ""
    due_date: str
    priority: str = "medium"
    tags: list[str] = Field(default_factory=list)
    tasks: list[dict] = Field(default_factory=list, description="List of {text: str, done: bool}")
    status: str = "pending"
    progress: int = 0
    reminder_enabled: bool = True
    reminded_3d: bool = False
    reminded_2d: bool = False
    reminded_1d: bool = False
    reminded_1h: bool = False
    completed_at: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


class DeadlineCreate(BaseModel):
    title: str
    description: str = ""
    due_date: str
    priority: str = "medium"
    tags: list[str] = Field(default_factory=list)
    tasks: list[dict] = Field(default_factory=list)
    reminder_enabled: bool = True


class DeadlineUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = None
    tags: Optional[list[str]] = None
    tasks: Optional[list[dict]] = None
    status: Optional[str] = None
    progress: Optional[int] = None
    reminder_enabled: Optional[bool] = None
