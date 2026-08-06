from fastapi import APIRouter, HTTPException
from typing import List

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
