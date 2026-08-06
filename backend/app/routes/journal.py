from fastapi import APIRouter, HTTPException, Query
from app.models.journal import JournalEntry, JournalCreate, JournalUpdate
from app.services.storage import storage
from typing import List, Optional

router = APIRouter(prefix="/api/journal", tags=["journal"])

COLLECTION = "journal"


@router.get("", response_model=List[JournalEntry])
def list_journal(date: Optional[str] = Query(None)):
    if date:
        return storage.query(COLLECTION, lambda e: e.get("date") == date)
    return storage.get_all(COLLECTION)


@router.post("", response_model=JournalEntry, status_code=201)
def create_journal_entry(body: JournalCreate):
    existing = storage.query(COLLECTION, lambda e: e.get("date") == body.date)
    if existing:
        raise HTTPException(409, "Journal entry for this date already exists")
    item = JournalEntry(**body.model_dump())
    return storage.create(COLLECTION, item.model_dump())


@router.get("/{entry_id}", response_model=JournalEntry)
def get_journal_entry(entry_id: str):
    item = storage.get_by_id(COLLECTION, entry_id)
    if not item:
        raise HTTPException(404, "Journal entry not found")
    return item


@router.patch("/{entry_id}", response_model=JournalEntry)
def update_journal_entry(entry_id: str, body: JournalUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    item = storage.update(COLLECTION, entry_id, updates)
    if not item:
        raise HTTPException(404, "Journal entry not found")
    return item


@router.delete("/{entry_id}")
def delete_journal_entry(entry_id: str):
    if not storage.delete(COLLECTION, entry_id):
        raise HTTPException(404, "Journal entry not found")
    return {"ok": True}
