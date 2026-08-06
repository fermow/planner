from pydantic import BaseModel, Field
from typing import Optional
import uuid

from app.config import now_iso


def new_id() -> str:
    return uuid.uuid4().hex[:12]


TRANSACTION_CATEGORIES = [
    "fun", "work", "food", "transport", "bills",
    "shopping", "health", "education", "other",
]


class FinanceCard(BaseModel):
    id: str = Field(default_factory=new_id)
    nickname: str
    card_number: str
    cvv2: str
    expiry_date: str
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


class FinanceCardCreate(BaseModel):
    nickname: str
    card_number: str
    cvv2: str
    expiry_date: str


class FinanceCardUpdate(BaseModel):
    nickname: Optional[str] = None
    card_number: Optional[str] = None
    cvv2: Optional[str] = None
    expiry_date: Optional[str] = None


class FinanceTransaction(BaseModel):
    id: str = Field(default_factory=new_id)
    date: str
    card_id: str
    type: str  # "income" or "expense"
    amount: float
    category: str = "other"
    description: str = ""
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


class FinanceTransactionCreate(BaseModel):
    date: str
    card_id: str
    type: str
    amount: float
    category: str = "other"
    description: str = ""


class FinanceTransactionUpdate(BaseModel):
    date: Optional[str] = None
    card_id: Optional[str] = None
    type: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
