from pydantic import BaseModel, Field
from typing import Optional
import uuid

from app.config import now_iso


def new_id() -> str:
    return uuid.uuid4().hex[:12]


class Exercise(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:8])
    name: str
    duration: int = 0
    intensity: str = "medium"
    done: bool = False
    scheduled_time: str = ""


class SportEntry(BaseModel):
    id: str = Field(default_factory=new_id)
    date: str
    exercises: list[Exercise] = Field(default_factory=list)
    total_duration: int = 0
    notes: str = ""
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


class SportCreate(BaseModel):
    date: str
    exercises: list[Exercise] = Field(default_factory=list)
    total_duration: int = 0
    notes: str = ""


class SportUpdate(BaseModel):
    exercises: Optional[list[Exercise]] = None
    total_duration: Optional[int] = None
    notes: Optional[str] = None
