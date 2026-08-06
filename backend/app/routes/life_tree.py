from fastapi import APIRouter, HTTPException
from typing import List

from app.models.life_tree import LifeTreeEntry, LifeTreeCreate, LifeTreeUpdate
from app.services.storage import storage

router = APIRouter(prefix="/api/life-tree", tags=["life_tree"])

COLLECTION = "life_tree"


@router.get("", response_model=List[LifeTreeEntry])
def list_trees():
    return storage.get_all(COLLECTION)


@router.post("", response_model=LifeTreeEntry, status_code=201)
def create_tree(body: LifeTreeCreate):
    item = LifeTreeEntry(**body.model_dump())
    return storage.create(COLLECTION, item.model_dump())


@router.get("/{entry_id}", response_model=LifeTreeEntry)
def get_tree(entry_id: str):
    item = storage.get_by_id(COLLECTION, entry_id)
    if not item:
        raise HTTPException(404, "Life tree entry not found")
    return item


@router.patch("/{entry_id}", response_model=LifeTreeEntry)
def update_tree(entry_id: str, body: LifeTreeUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    item = storage.update(COLLECTION, entry_id, updates)
    if not item:
        raise HTTPException(404, "Life tree entry not found")
    return item


@router.delete("/{entry_id}")
def delete_tree(entry_id: str):
    if not storage.delete(COLLECTION, entry_id):
        raise HTTPException(404, "Life tree entry not found")
    return {"ok": True}
