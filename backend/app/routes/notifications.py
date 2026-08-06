from fastapi import APIRouter, Query
from app.services.notification_service import (
    get_catch_up_notifications,
    mark_notification_read,
    send_notification,
    log_notification,
)
import uuid

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
def list_notifications():
    return get_catch_up_notifications()


@router.post("/{notification_id}/read")
def read_notification(notification_id: str):
    mark_notification_read(notification_id)
    return {"ok": True}


@router.post("/test")
def test_notification(title: str = Query("Celestial Desk Test"), message: str = Query("If you see this, notifications work!")):
    ok = send_notification(title, message, "critical")
    log_notification(uuid.uuid4().hex[:8], title, "test")
    return {"sent": ok, "title": title, "message": message}
