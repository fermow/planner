from pydantic import BaseModel, Field
import uuid

from app.config import now_iso


def new_id() -> str:
    return uuid.uuid4().hex[:12]


class TableData(BaseModel):
    id: str = Field(default_factory=new_id)
    title: str = "Table"
    headers: list[str] = Field(default_factory=lambda: ["Column A", "Column B"])
    rows: list[list[str]] = Field(default_factory=lambda: [["", ""]])
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)
