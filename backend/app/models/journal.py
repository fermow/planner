from pydantic import BaseModel, Field
from typing import Optional
import uuid

from app.config import now_iso


def new_id() -> str:
    return uuid.uuid4().hex[:12]


"""
Example journal.json structure:
[
  {
    "id": "d4e5f6a7b8c9",
    "date": "2026-05-22",
    "what_i_did": "Built the notification system",
    "plans": "Create frontend components",
    "reflection": "Felt productive today",
    "mood": "happy",
    "is_markdown": true,
    "created_at": "2026-05-22T20:00:00Z",
    "updated_at": "2026-05-22T20:00:00Z"
  }
]
"""


class JournalEntry(BaseModel):
    id: str = Field(default_factory=new_id)
    date: str
    what_i_did: str = ""
    plans: str = ""
    reflection: str = ""
    mood: str = "neutral"
    is_markdown: bool = True
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


class JournalCreate(BaseModel):
    date: str
    what_i_did: str = ""
    plans: str = ""
    reflection: str = ""
    mood: str = "neutral"
    is_markdown: bool = True


class JournalUpdate(BaseModel):
    what_i_did: Optional[str] = None
    plans: Optional[str] = None
    reflection: Optional[str] = None
    mood: Optional[str] = None
    is_markdown: Optional[bool] = None
