import json
import shutil
from fastapi import APIRouter, Body
from fastapi.responses import StreamingResponse
from app.config import DATA_DIR, now_iso
from app.services.storage import storage
import io

router = APIRouter(prefix="/api/backup", tags=["backup"])


@router.get("/export")
def export_backup():
    backup = {}
    for collection in ["deadlines", "planner", "journal", "whiteboards", "tables", "notification_history"]:
        backup[collection] = storage.get_all(collection)
    backup["_exported_at"] = now_iso()
    content = json.dumps(backup, indent=2, ensure_ascii=False)
    return StreamingResponse(
        io.StringIO(content),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=celestial-desk-backup.json"},
    )


@router.post("/import")
def import_backup(data: dict = Body(...)):
    count = 0
    for collection in ["deadlines", "planner", "journal", "whiteboards", "tables"]:
        items = data.get(collection, [])
        for item in items:
            storage.create(collection, item)
            count += 1
    return {"imported": count}
