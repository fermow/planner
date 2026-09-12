from pydantic import BaseModel, Field
from typing import Literal, Optional
import uuid

from app.config import now_iso


def new_id() -> str:
    return uuid.uuid4().hex[:12]


class ResearchDocument(BaseModel):
    id: str = Field(default_factory=new_id)
    title: str = "Untitled research note"
    abstract: str = ""
    content: str = ""
    references: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    direction: Literal["auto", "ltr", "rtl"] = "auto"
    status: Literal["draft", "review", "final"] = "draft"
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


class ResearchDocumentCreate(BaseModel):
    title: str = "Untitled research note"
    abstract: str = ""
    content: str = ""
    references: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    direction: Literal["auto", "ltr", "rtl"] = "auto"
    status: Literal["draft", "review", "final"] = "draft"


class ResearchDocumentUpdate(BaseModel):
    title: Optional[str] = None
    abstract: Optional[str] = None
    content: Optional[str] = None
    references: Optional[list[str]] = None
    tags: Optional[list[str]] = None
    direction: Optional[Literal["auto", "ltr", "rtl"]] = None
    status: Optional[Literal["draft", "review", "final"]] = None


class ResearchDocumentRevision(BaseModel):
    id: str = Field(default_factory=new_id)
    document_id: str
    title: str
    abstract: str = ""
    content: str = ""
    references: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    direction: Literal["auto", "ltr", "rtl"] = "auto"
    status: Literal["draft", "review", "final"] = "draft"
    created_at: str = Field(default_factory=now_iso)
