from pydantic import BaseModel, Field
from typing import Optional
from app.config import now_iso
import uuid


def _id():
    return uuid.uuid4().hex[:8]


class MusicTrack(BaseModel):
    id: str = Field(default_factory=_id)
    title: str
    artist: str = ""
    filename: str
    size: int = 0
    duration: Optional[float] = None
    created_at: str = Field(default_factory=now_iso)


class MusicUpdate(BaseModel):
    title: Optional[str] = None
    artist: Optional[str] = None
