from fastapi import APIRouter, HTTPException
import uuid
from app.models.whiteboard import Whiteboard
from app.services.storage import storage
from app.config import now_iso

router = APIRouter(prefix="/api/whiteboards", tags=["whiteboards"])

COLLECTION = "whiteboards"


@router.get("")
def list_whiteboards():
    return storage.get_all(COLLECTION)


@router.post("", status_code=201)
def create_whiteboard():
    wb = {
        "id": uuid.uuid4().hex[:12],
        "title": "Whiteboard",
        "content": {},
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    return storage.create(COLLECTION, wb)


@router.get("/{wb_id}")
def get_whiteboard(wb_id: str):
    wb = storage.get_by_id(COLLECTION, wb_id)
    if not wb:
        raise HTTPException(404, "Whiteboard not found")
    return wb


@router.put("/{wb_id}")
def update_whiteboard(wb_id: str, body: dict):
    wb = storage.get_by_id(COLLECTION, wb_id)
    if not wb:
        raise HTTPException(404, "Whiteboard not found")
    updates = {k: v for k, v in body.items() if k in ("title", "content")}
    return storage.update(COLLECTION, wb_id, updates)


@router.delete("/{wb_id}")
def delete_whiteboard(wb_id: str):
    if not storage.delete(COLLECTION, wb_id):
        raise HTTPException(404, "Whiteboard not found")
    return {"ok": True}
