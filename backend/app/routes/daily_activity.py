from fastapi import APIRouter, HTTPException
from app.models.daily_activity import DailyActivity, DailyActivityCreate, DailyActivityUpdate
from app.services.storage import storage
from typing import List

router = APIRouter(prefix="/api/daily-activities", tags=["daily-activities"])

COLLECTION = "daily_activities"


@router.get("", response_model=List[DailyActivity])
def list_daily_activities():
    return storage.get_all(COLLECTION)


@router.post("", response_model=DailyActivity, status_code=201)
def create_daily_activity(body: DailyActivityCreate):
    item = DailyActivity(**body.model_dump())
    # Calculate total hours from entries (only study entries count)
    item.total_hours = sum(entry.hours for entry in item.entries if entry.is_study)
    return storage.create(COLLECTION, item.model_dump())


@router.get("/{item_id}", response_model=DailyActivity)
def get_daily_activity(item_id: str):
    item = storage.get_by_id(COLLECTION, item_id)
    if not item:
        raise HTTPException(404, "Daily activity not found")
    return item


@router.patch("/{item_id}", response_model=DailyActivity)
def update_daily_activity(item_id: str, body: DailyActivityUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    item = storage.update(COLLECTION, item_id, updates)
    if not item:
        raise HTTPException(404, "Daily activity not found")
    # Recalculate total hours if entries were updated
    if "entries" in updates:
        item["total_hours"] = sum(entry["hours"] for entry in item["entries"] if entry.get("is_study", True))
        # Update the item in storage with the recalculated total_hours
        storage.update(COLLECTION, item_id, {"total_hours": item["total_hours"]})
        item = storage.get_by_id(COLLECTION, item_id)
    return item


@router.delete("/{item_id}")
def delete_daily_activity(item_id: str):
    if not storage.delete(COLLECTION, item_id):
        raise HTTPException(404, "Daily activity not found")
    return {"ok": True}


@router.get("/date/{date}", response_model=DailyActivity)
def get_daily_activity_by_date(date: str):
    """Get daily activity for a specific date (YYYY-MM-DD)"""
    items = storage.query(COLLECTION, lambda x: x["date"] == date)
    if not items:
        raise HTTPException(404, f"No daily activity found for date {date}")
    return items[0]