from fastapi import APIRouter, Query
from app.services.storage import storage

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("")
def global_search(q: str = Query(..., min_length=1)):
    results = {}
    for collection in ["deadlines", "planner", "journal", "whiteboards", "tables"]:
        items = storage.search(collection, q)
        if items:
            results[collection] = items
    return results
