from pydantic import BaseModel, Field
from typing import Optional, List
import uuid
from app.config import now_iso


def new_id() -> str:
    return uuid.uuid4().hex[:12]


class DailyTaskSummary(BaseModel):
    title: str
    done: bool
    source: str = ""
    hours: float = 0.0


class DailySummary(BaseModel):
    id: str = Field(default_factory=new_id)
    date: str
    done_tasks: List[DailyTaskSummary] = Field(default_factory=list)
    not_done_tasks: List[DailyTaskSummary] = Field(default_factory=list)
    notes: List[str] = Field(default_factory=list)
    journal_what_i_did: str = ""
    total_hours: float = 0.0
    summary_text: str = ""
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)
