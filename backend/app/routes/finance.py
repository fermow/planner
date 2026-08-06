from fastapi import APIRouter, HTTPException
from typing import List
import urllib.request
import re
from datetime import datetime, timedelta

from app.models.finance import (
    FinanceCard, FinanceCardCreate, FinanceCardUpdate,
    FinanceTransaction, FinanceTransactionCreate, FinanceTransactionUpdate,
)
from app.services.storage import storage

router = APIRouter(prefix="/api/finance", tags=["finance"])

CARDS_COLLECTION = "finance_cards"
TRANSACTIONS_COLLECTION = "finance_transactions"

_rate_cache = {"value": None, "time": None}

@router.get("/rate")
def get_dollar_rate():
    now = datetime.utcnow()
    if _rate_cache["time"] and now - _rate_cache["time"] < timedelta(seconds=30):
        return {"rate": _rate_cache["value"]}

    try:
        req = urllib.request.Request(
            "https://www.tgju.org/profile/price_dollar_rl",
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode("utf-8")

        m = re.search(r'نرخ فعلی</td>\s*<td[^>]*class="text-left"[^>]*>([\d,]+)', html)
        if m:
            rate = int(m.group(1).replace(",", ""))
            _rate_cache["value"] = rate
            _rate_cache["time"] = now
            return {"rate": rate}
    except Exception:
        pass

    if _rate_cache["value"] is not None:
        return {"rate": _rate_cache["value"]}
    raise HTTPException(502, "Failed to fetch exchange rate")


# ─── Cards ───

@router.get("/cards", response_model=List[FinanceCard])
def list_cards():
    return storage.get_all(CARDS_COLLECTION)


@router.post("/cards", response_model=FinanceCard, status_code=201)
def create_card(body: FinanceCardCreate):
    item = FinanceCard(**body.model_dump())
    return storage.create(CARDS_COLLECTION, item.model_dump())


@router.get("/cards/{card_id}", response_model=FinanceCard)
def get_card(card_id: str):
    item = storage.get_by_id(CARDS_COLLECTION, card_id)
    if not item:
        raise HTTPException(404, "Card not found")
    return item


@router.patch("/cards/{card_id}", response_model=FinanceCard)
def update_card(card_id: str, body: FinanceCardUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    item = storage.update(CARDS_COLLECTION, card_id, updates)
    if not item:
        raise HTTPException(404, "Card not found")
    return item


@router.delete("/cards/{card_id}")
def delete_card(card_id: str):
    if not storage.delete(CARDS_COLLECTION, card_id):
        raise HTTPException(404, "Card not found")
    return {"ok": True}


# ─── Transactions ───

@router.get("/transactions", response_model=List[FinanceTransaction])
def list_transactions():
    return storage.get_all(TRANSACTIONS_COLLECTION)


@router.post("/transactions", response_model=FinanceTransaction, status_code=201)
def create_transaction(body: FinanceTransactionCreate):
    item = FinanceTransaction(**body.model_dump())
    return storage.create(TRANSACTIONS_COLLECTION, item.model_dump())


@router.get("/transactions/{txn_id}", response_model=FinanceTransaction)
def get_transaction(txn_id: str):
    item = storage.get_by_id(TRANSACTIONS_COLLECTION, txn_id)
    if not item:
        raise HTTPException(404, "Transaction not found")
    return item


@router.patch("/transactions/{txn_id}", response_model=FinanceTransaction)
def update_transaction(txn_id: str, body: FinanceTransactionUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    item = storage.update(TRANSACTIONS_COLLECTION, txn_id, updates)
    if not item:
        raise HTTPException(404, "Transaction not found")
    return item


@router.delete("/transactions/{txn_id}")
def delete_transaction(txn_id: str):
    if not storage.delete(TRANSACTIONS_COLLECTION, txn_id):
        raise HTTPException(404, "Transaction not found")
    return {"ok": True}
