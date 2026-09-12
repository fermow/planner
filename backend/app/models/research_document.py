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
    template: Literal["simple", "paper", "proposal", "results"] = "simple"
    table_headers: list[str] = Field(default_factory=lambda: ["Variable", "Value", "Notes"])
    table_rows: list[list[str]] = Field(default_factory=lambda: [["", "", ""]])
    page_size: Literal["a4", "letter"] = "a4"
    page_margin: Literal["normal", "narrow", "wide"] = "normal"
    header_text: str = ""
    footer_text: str = ""
    citation_style: Literal["apa", "ieee", "chicago"] = "apa"
    show_toc: bool = False
    author_name: str = ""
    affiliation: str = ""
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
    template: Literal["simple", "paper", "proposal", "results"] = "simple"
    table_headers: list[str] = Field(default_factory=lambda: ["Variable", "Value", "Notes"])
    table_rows: list[list[str]] = Field(default_factory=lambda: [["", "", ""]])
    page_size: Literal["a4", "letter"] = "a4"
    page_margin: Literal["normal", "narrow", "wide"] = "normal"
    header_text: str = ""
    footer_text: str = ""
    citation_style: Literal["apa", "ieee", "chicago"] = "apa"
    show_toc: bool = False
    author_name: str = ""
    affiliation: str = ""


class ResearchDocumentUpdate(BaseModel):
    title: Optional[str] = None
    abstract: Optional[str] = None
    content: Optional[str] = None
    references: Optional[list[str]] = None
    tags: Optional[list[str]] = None
    direction: Optional[Literal["auto", "ltr", "rtl"]] = None
    status: Optional[Literal["draft", "review", "final"]] = None
    template: Optional[Literal["simple", "paper", "proposal", "results"]] = None
    table_headers: Optional[list[str]] = None
    table_rows: Optional[list[list[str]]] = None
    page_size: Optional[Literal["a4", "letter"]] = None
    page_margin: Optional[Literal["normal", "narrow", "wide"]] = None
    header_text: Optional[str] = None
    footer_text: Optional[str] = None
    citation_style: Optional[Literal["apa", "ieee", "chicago"]] = None
    show_toc: Optional[bool] = None
    author_name: Optional[str] = None
    affiliation: Optional[str] = None


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
    template: Literal["simple", "paper", "proposal", "results"] = "simple"
    table_headers: list[str] = Field(default_factory=list)
    table_rows: list[list[str]] = Field(default_factory=list)
    page_size: Literal["a4", "letter"] = "a4"
    page_margin: Literal["normal", "narrow", "wide"] = "normal"
    header_text: str = ""
    footer_text: str = ""
    citation_style: Literal["apa", "ieee", "chicago"] = "apa"
    show_toc: bool = False
    author_name: str = ""
    affiliation: str = ""
    created_at: str = Field(default_factory=now_iso)
