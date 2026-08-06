from pydantic import BaseModel, Field
from typing import Optional, List
import uuid
from app.config import now_iso


def new_id() -> str:
    return uuid.uuid4().hex[:12]


class DailyTask(BaseModel):
    task: str
    hours: float
    is_study: bool = True


class DailyActivity(BaseModel):
    id: str = Field(default_factory=new_id)
    date: str  # YYYY-MM-DD
    entries: List[DailyTask] = Field(default_factory=list)
    total_hours: float = 0.0
    notes: str = ""
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


class DailyActivityCreate(BaseModel):
    date: str
    entries: List[DailyTask] = Field(default_factory=list)
    notes: str = ""


class DailyActivityUpdate(BaseModel):
    entries: Optional[List[DailyTask]] = None
    notes: Optional[str] = None