from pydantic import BaseModel, Field
from typing import Optional
import uuid
from app.config import now_iso


def new_id() -> str:
    return uuid.uuid4().hex[:12]


class Habit(BaseModel):
    id: str = Field(default_factory=new_id)
    text: str
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


class HabitCreate(BaseModel):
    text: str


class HabitUpdate(BaseModel):
    text: Optional[str] = None
