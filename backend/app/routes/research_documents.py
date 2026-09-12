from fastapi import APIRouter, HTTPException
from typing import List

from app.models.research_document import ResearchDocument, ResearchDocumentCreate, ResearchDocumentUpdate
from app.services.storage import storage

router = APIRouter(prefix="/api/research-documents", tags=["research_documents"])

COLLECTION = "research_documents"


@router.get("", response_model=List[ResearchDocument])
def list_documents():
    return storage.get_all(COLLECTION)


@router.post("", response_model=ResearchDocument, status_code=201)
def create_document(body: ResearchDocumentCreate):
    item = ResearchDocument(**body.model_dump())
    return storage.create(COLLECTION, item.model_dump())


@router.get("/{document_id}", response_model=ResearchDocument)
def get_document(document_id: str):
    item = storage.get_by_id(COLLECTION, document_id)
    if not item:
        raise HTTPException(404, "Research document not found")
    return item


@router.patch("/{document_id}", response_model=ResearchDocument)
def update_document(document_id: str, body: ResearchDocumentUpdate):
    updates = {key: value for key, value in body.model_dump().items() if value is not None}
    item = storage.update(COLLECTION, document_id, updates)
    if not item:
        raise HTTPException(404, "Research document not found")
    return item


@router.delete("/{document_id}")
def delete_document(document_id: str):
    if not storage.delete(COLLECTION, document_id):
        raise HTTPException(404, "Research document not found")
    return {"ok": True}
