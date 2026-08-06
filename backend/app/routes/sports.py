from fastapi import APIRouter, HTTPException, Query
from app.models.sport import SportEntry, SportCreate, SportUpdate
from app.services.storage import storage
from typing import List, Optional

router = APIRouter(prefix="/api/sports", tags=["sports"])

COLLECTION = "sports"


@router.get("", response_model=List[SportEntry])
def list_sports():
    return storage.get_all(COLLECTION)


@router.post("", response_model=SportEntry, status_code=201)
def create_sport_entry(body: SportCreate):
    existing = storage.query(COLLECTION, lambda e: e.get("date") == body.date)
    if existing:
        raise HTTPException(409, "Entry for this date already exists")
    item = SportEntry(**body.model_dump())
    return storage.create(COLLECTION, item.model_dump())


@router.get("/date/{date}", response_model=SportEntry)
def get_sport_by_date(date: str):
    items = storage.query(COLLECTION, lambda e: e.get("date") == date)
    if not items:
        raise HTTPException(404, "Sport entry not found for this date")
    return items[0]


@router.get("/{entry_id}", response_model=SportEntry)
def get_sport_entry(entry_id: str):
    item = storage.get_by_id(COLLECTION, entry_id)
    if not item:
        raise HTTPException(404, "Sport entry not found")
    return item


@router.patch("/{entry_id}", response_model=SportEntry)
def update_sport_entry(entry_id: str, body: SportUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    item = storage.update(COLLECTION, entry_id, updates)
    if not item:
        raise HTTPException(404, "Sport entry not found")
    return item


@router.delete("/{entry_id}")
def delete_sport_entry(entry_id: str):
    if not storage.delete(COLLECTION, entry_id):
        raise HTTPException(404, "Sport entry not found")
    return {"ok": True}
