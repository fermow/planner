from fastapi import APIRouter, HTTPException
from typing import List

from app.models.research_document import ResearchDocument, ResearchDocumentCreate, ResearchDocumentRevision, ResearchDocumentUpdate
from app.services.storage import storage

router = APIRouter(prefix="/api/research-documents", tags=["research_documents"])

COLLECTION = "research_documents"
REVISION_COLLECTION = "research_document_revisions"
REVISION_FIELDS = ("title", "abstract", "content", "references", "tags", "direction", "status", "template", "table_headers", "table_rows", "page_size", "page_margin", "header_text", "footer_text", "citation_style", "show_toc", "author_name", "affiliation")


def save_revision(document: dict):
    revision = ResearchDocumentRevision(
        document_id=document["id"],
        **{field: document.get(field, ResearchDocument.model_fields[field].get_default()) for field in REVISION_FIELDS},
    )
    storage.create(REVISION_COLLECTION, revision.model_dump())


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
    previous = storage.get_by_id(COLLECTION, document_id)
    if not previous:
        raise HTTPException(404, "Research document not found")
    if any(previous.get(key) != value for key, value in updates.items()):
        save_revision(previous)
    item = storage.update(COLLECTION, document_id, updates)
    if not item:
        raise HTTPException(404, "Research document not found")
    return item


@router.get("/{document_id}/revisions", response_model=List[ResearchDocumentRevision])
def list_revisions(document_id: str):
    if not storage.get_by_id(COLLECTION, document_id):
        raise HTTPException(404, "Research document not found")
    revisions = storage.query(REVISION_COLLECTION, lambda item: item["document_id"] == document_id)
    return sorted(revisions, key=lambda item: item["created_at"], reverse=True)[:100]


@router.post("/{document_id}/revisions/{revision_id}/restore", response_model=ResearchDocument)
def restore_revision(document_id: str, revision_id: str):
    current = storage.get_by_id(COLLECTION, document_id)
    revision = storage.get_by_id(REVISION_COLLECTION, revision_id)
    if not current or not revision or revision["document_id"] != document_id:
        raise HTTPException(404, "Revision not found")
    save_revision(current)
    item = storage.update(COLLECTION, document_id, {field: revision[field] for field in REVISION_FIELDS})
    return item


@router.delete("/{document_id}")
def delete_document(document_id: str):
    if not storage.delete(COLLECTION, document_id):
        raise HTTPException(404, "Research document not found")
    return {"ok": True}
