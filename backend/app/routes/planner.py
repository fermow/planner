from fastapi import APIRouter, HTTPException, Query
from app.models.planner import PlannerEntry, PlannerCreate, PlannerUpdate
from app.services.storage import storage
from typing import List, Optional

router = APIRouter(prefix="/api/planner", tags=["planner"])

COLLECTION = "planner"


@router.get("", response_model=List[PlannerEntry])
def list_planner(week_start: Optional[str] = Query(None)):
    items = storage.get_all(COLLECTION)
    if week_start:
        return [i for i in items if i.get("date", "") >= week_start]
    return items


@router.post("", response_model=PlannerEntry, status_code=201)
def create_planner_entry(body: PlannerCreate):
    existing = storage.query(COLLECTION, lambda e: e.get("date") == body.date)
    if existing:
        raise HTTPException(409, "Entry for this date already exists")
    item = PlannerEntry(**body.model_dump())
    return storage.create(COLLECTION, item.model_dump())


@router.get("/{entry_id}", response_model=PlannerEntry)
def get_planner_entry(entry_id: str):
    item = storage.get_by_id(COLLECTION, entry_id)
    if not item:
        raise HTTPException(404, "Planner entry not found")
    return item


@router.patch("/{entry_id}", response_model=PlannerEntry)
def update_planner_entry(entry_id: str, body: PlannerUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    item = storage.update(COLLECTION, entry_id, updates)
    if not item:
        raise HTTPException(404, "Planner entry not found")
    return item


@router.delete("/{entry_id}")
def delete_planner_entry(entry_id: str):
    if not storage.delete(COLLECTION, entry_id):
        raise HTTPException(404, "Planner entry not found")
    return {"ok": True}
