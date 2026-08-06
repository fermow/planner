from fastapi import APIRouter, HTTPException
from app.models.deadline import Deadline, DeadlineCreate, DeadlineUpdate
from app.services.storage import storage
from app.config import now_iso
from typing import List

router = APIRouter(prefix="/api/deadlines", tags=["deadlines"])

COLLECTION = "deadlines"


@router.get("", response_model=List[Deadline])
def list_deadlines():
    return storage.get_all(COLLECTION)


@router.post("", response_model=Deadline, status_code=201)
def create_deadline(body: DeadlineCreate):
    item = Deadline(**body.model_dump())
    return storage.create(COLLECTION, item.model_dump())


@router.get("/{item_id}", response_model=Deadline)
def get_deadline(item_id: str):
    item = storage.get_by_id(COLLECTION, item_id)
    if not item:
        raise HTTPException(404, "Deadline not found")
    return item


@router.patch("/{item_id}", response_model=Deadline)
def update_deadline(item_id: str, body: DeadlineUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates.get("status") == "completed":
        updates["completed_at"] = now_iso()
    elif "status" in updates and updates["status"] != "completed":
        updates["completed_at"] = None
    item = storage.update(COLLECTION, item_id, updates)
    if not item:
        raise HTTPException(404, "Deadline not found")
    return item


@router.delete("/{item_id}")
def delete_deadline(item_id: str):
    if not storage.delete(COLLECTION, item_id):
        raise HTTPException(404, "Deadline not found")
    return {"ok": True}
