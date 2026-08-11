"""
Official Iranian calendar events — sourced live from time.ir (تقویم رسمی).

This keeps the Shamsi calendar's holidays and occasions accurate: lunar
holidays are returned matched to their official Jalali dates, exactly as the
Iranian calendar publishes them.
"""

from fastapi import APIRouter, HTTPException, Query

from app.services.calendar_service import get_year_events

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


@router.get("/events")
def calendar_events(year: int = Query(..., ge=1, le=3000)):
    events = get_year_events(year)
    if not events:
        raise HTTPException(502, "Official calendar data unavailable")
    return events