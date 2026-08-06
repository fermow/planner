"""
Music profile — upload, list and play your own audio files.
Files are stored under DATA_DIR/music/, metadata in music.json.
"""

import shutil
import uuid
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from app.config import DATA_DIR
from app.models.music import MusicTrack, MusicUpdate
from app.services.storage import storage

router = APIRouter(prefix="/api/music", tags=["music"])

COLLECTION = "music"
MUSIC_DIR = DATA_DIR / "music"

ALLOWED_EXT = {".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac", ".opus", ".webm"}


def _ensure_dir() -> None:
    MUSIC_DIR.mkdir(parents=True, exist_ok=True)


@router.get("", response_model=list[MusicTrack])
def list_music():
    return storage.get_all(COLLECTION)


@router.post("/upload", response_model=MusicTrack, status_code=201)
async def upload_music(file: UploadFile = File(...)):
    _ensure_dir()
    original = file.filename or "audio.mp3"
    suffix = Path(original).suffix.lower()
    if suffix not in ALLOWED_EXT:
        raise HTTPException(415, "Unsupported audio format")
    fid = uuid.uuid4().hex[:8]
    filename = f"{fid}{suffix}"
    path = MUSIC_DIR / filename
    with open(path, "wb") as out:
        shutil.copyfileobj(file.file, out)
    size = path.stat().st_size
    if size == 0:
        path.unlink(missing_ok=True)
        raise HTTPException(400, "Empty file")
    item = MusicTrack(
        title=Path(original).stem,
        filename=filename,
        size=size,
    )
    return storage.create(COLLECTION, item.model_dump())


@router.get("/file/{filename}")
def get_audio(filename: str):
    _ensure_dir()
    safe = Path(filename).name
    if safe != filename:
        raise HTTPException(400, "Invalid filename")
    path = MUSIC_DIR / safe
    if not path.exists():
        raise HTTPException(404, "Audio not found")
    return FileResponse(
        path,
        media_type="audio/mpeg",
        headers={"Accept-Ranges": "bytes"},
    )


@router.patch("/{track_id}", response_model=MusicTrack)
def update_music(track_id: str, body: MusicUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "Nothing to update")
    item = storage.update(COLLECTION, track_id, updates)
    if not item:
        raise HTTPException(404, "Track not found")
    return item


@router.delete("/{track_id}")
def delete_music(track_id: str):
    item = storage.get_by_id(COLLECTION, track_id)
    if not item:
        raise HTTPException(404, "Track not found")
    storage.delete(COLLECTION, track_id)
    _ensure_dir()
    path = MUSIC_DIR / item["filename"]
    if path.exists():
        path.unlink()
    return {"ok": True}
