from pydantic import BaseModel, Field
from typing import Optional
import uuid

from app.config import now_iso


def new_id() -> str:
    return uuid.uuid4().hex[:12]


class TreeBranch(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:8])
    title: str
    description: str = ""
    done: bool = False
    children: list["TreeBranch"] = Field(default_factory=list)


class LifeTreeEntry(BaseModel):
    id: str = Field(default_factory=new_id)
    title: str
    description: str = ""
    branches: list[TreeBranch] = Field(default_factory=list)
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


class LifeTreeCreate(BaseModel):
    title: str
    description: str = ""
    branches: list[TreeBranch] = Field(default_factory=list)


class LifeTreeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    branches: Optional[list[TreeBranch]] = None
