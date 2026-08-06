from pydantic import BaseModel, Field
from typing import Optional, List
from app.config import now_iso
import uuid


def _id():
    return uuid.uuid4().hex[:8]


class Connection(BaseModel):
    id: str = Field(default_factory=_id)
    name: str
    relationship: str = "friend"
    label: Optional[str] = None
    description: str = ""
    emoji: str = "👤"
    icon: Optional[str] = None
    color: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    parent_id: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


class ConnectionCreate(BaseModel):
    name: str
    relationship: str = "friend"
    label: Optional[str] = None
    description: str = ""
    emoji: str = "👤"
    icon: Optional[str] = None
    color: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    parent_id: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None


class ConnectionUpdate(BaseModel):
    name: Optional[str] = None
    relationship: Optional[str] = None
    label: Optional[str] = None
    description: Optional[str] = None
    emoji: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    tags: Optional[List[str]] = None
    parent_id: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None
