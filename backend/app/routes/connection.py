from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from app.models.connection import Connection, ConnectionCreate, ConnectionUpdate
from app.services.storage import storage

router = APIRouter(prefix="/api/connections", tags=["connections"])

COLLECTION = "connections"


@router.get("", response_model=List[Connection])
def list_connections():
    return storage.get_all(COLLECTION)


@router.post("", response_model=Connection, status_code=201)
def create_connection(body: ConnectionCreate):
    item = Connection(**body.model_dump())
    return storage.create(COLLECTION, item.model_dump())


@router.get("/{connection_id}", response_model=Connection)
def get_connection(connection_id: str):
    item = storage.get_by_id(COLLECTION, connection_id)
    if not item:
        raise HTTPException(404, "Connection not found")
    return item


@router.patch("/{connection_id}", response_model=Connection)
def update_connection(connection_id: str, body: ConnectionUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    item = storage.update(COLLECTION, connection_id, updates)
    if not item:
        raise HTTPException(404, "Connection not found")
    return item


@router.delete("/{connection_id}")
def delete_connection(connection_id: str):
    if not storage.delete(COLLECTION, connection_id):
        raise HTTPException(404, "Connection not found")
    return {"ok": True}


@router.get("/search", response_model=List[Connection])
def search_connections(q: str = Query(..., min_length=1)):
    """Fast client-side search across name, label, relationship, description, and tags."""
    query = q.lower()
    items = storage.get_all(COLLECTION)
    results: List[dict] = []
    for item in items:
        haystack_parts = [
            item.get("name", ""),
            item.get("label", "") or item.get("relationship", ""),
            item.get("relationship", ""),
            item.get("description", ""),
        ]
        haystack_parts.extend(item.get("tags", []))
        haystack = " ".join(haystack_parts).lower()
        if query in haystack:
            results.append(item)
    return results


class PositionUpdate(BaseModel):
    id: str
    x: float
    y: float


@router.post("/positions/bulk", response_model=dict)
def update_positions(body: List[PositionUpdate]):
    """Bulk-update node positions for persistence after graph dragging."""
    for pos in body:
        storage.update(COLLECTION, pos.id, {"x": pos.x, "y": pos.y})
    return {"ok": True, "updated": len(body)}
