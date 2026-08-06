from fastapi import APIRouter, HTTPException
import uuid
from app.services.storage import storage
from app.config import now_iso

router = APIRouter(prefix="/api/tables", tags=["tables"])

COLLECTION = "tables"


@router.get("")
def list_tables():
    return storage.get_all(COLLECTION)


@router.post("", status_code=201)
def create_table():
    tbl = {
        "id": uuid.uuid4().hex[:12],
        "title": "Table",
        "headers": ["Column A", "Column B"],
        "rows": [["", ""]],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    return storage.create(COLLECTION, tbl)


@router.get("/{tbl_id}")
def get_table(tbl_id: str):
    tbl = storage.get_by_id(COLLECTION, tbl_id)
    if not tbl:
        raise HTTPException(404, "Table not found")
    return tbl


@router.put("/{tbl_id}")
def update_table(tbl_id: str, body: dict):
    tbl = storage.get_by_id(COLLECTION, tbl_id)
    if not tbl:
        raise HTTPException(404, "Table not found")
    updates = {k: v for k, v in body.items() if k in ("title", "headers", "rows")}
    return storage.update(COLLECTION, tbl_id, updates)


@router.delete("/{tbl_id}")
def delete_table(tbl_id: str):
    if not storage.delete(COLLECTION, tbl_id):
        raise HTTPException(404, "Table not found")
    return {"ok": True}
