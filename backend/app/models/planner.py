from pydantic import BaseModel, Field
from typing import Optional
import uuid

from app.config import now_iso


def new_id() -> str:
    return uuid.uuid4().hex[:12]






"""
Example planner.json structure:
[
  {
    "id": "c3d4e5f6a7b8",
    "date": "2026-06-01",
    "day": "Monday",
    "time_blocks": [
      {
        "id": "task-abc",
        "title": "Team standup",
        "description": "Discuss sprint progress",
        "time": "09:00",
        "completed_time": null,
        "done": false,
        "tag": "work"
      }
    ],
    "notes": "Important meeting today",
    "tasks": ["task-id-1", "task-id-2"],
    "mood": "motivated",
    "created_at": "2026-05-25T10:00:00Z",
    "updated_at": "2026-05-25T10:00:00Z"
  }
]
"""


def new_task_id() -> str:
    return uuid.uuid4().hex[:8]


class TimeBlock(BaseModel):
    id: str = Field(default_factory=new_task_id)
    title: str
    description: str = ""
    time: str = ""
    completed_time: str | None = None
    done: bool = False
    is_work: bool = True
    tag: str | None = None


class PlannerEntry(BaseModel):
    id: str = Field(default_factory=new_id)
    date: str
    day: str = ""
    time_blocks: list[TimeBlock] = Field(default_factory=list)
    notes: str = ""
    tasks: list[str] = Field(default_factory=list)
    mood: str = "neutral"
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


class PlannerCreate(BaseModel):
    date: str
    day: str = ""
    time_blocks: list[TimeBlock] = Field(default_factory=list)
    notes: str = ""
    tasks: list[str] = Field(default_factory=list)
    mood: str = "neutral"


class PlannerUpdate(BaseModel):
    time_blocks: Optional[list[TimeBlock]] = None
    notes: Optional[str] = None
    tasks: Optional[list[str]] = None
    mood: Optional[str] = None
