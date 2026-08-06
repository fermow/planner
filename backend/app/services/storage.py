"""
JSON-file based storage engine.
Each data type gets its own file under DATA_DIR.
Thread-safe reads/writes with atomic file operations.
"""

import json
import threading
import shutil
from pathlib import Path
from typing import Any, Optional, TypeVar
from app.config import DATA_DIR, now_iso

T = TypeVar("T")

_lock = threading.Lock()


class StorageEngine:
    def __init__(self) -> None:
        self._cache: dict[str, list[dict]] = {}
        self._dirty: set[str] = set()

    def _path(self, collection: str) -> Path:
        return DATA_DIR / f"{collection}.json"

    def _load(self, collection: str) -> list[dict]:
        path = self._path(collection)
        if path.exists():
            with open(path, "r") as f:
                return json.load(f)
        return []

    def _save(self, collection: str, data: list[dict]) -> None:
        path = self._path(collection)
        tmp = path.with_suffix(".json.tmp")
        with open(tmp, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        shutil.move(str(tmp), str(path))

    def get_all(self, collection: str) -> list[dict]:
        with _lock:
            return self._load(collection)

    def get_by_id(self, collection: str, item_id: str) -> Optional[dict]:
        with _lock:
            items = self._load(collection)
            for item in items:
                if item["id"] == item_id:
                    return item
            return None

    def create(self, collection: str, item: dict) -> dict:
        with _lock:
            items = self._load(collection)
            items.append(item)
            self._save(collection, items)
            return item

    def update(self, collection: str, item_id: str, updates: dict) -> Optional[dict]:
        with _lock:
            items = self._load(collection)
            for i, item in enumerate(items):
                if item["id"] == item_id:
                    items[i].update(updates)
                    items[i]["updated_at"] = now_iso()
                    self._save(collection, items)
                    return items[i]
            return None

    def delete(self, collection: str, item_id: str) -> bool:
        with _lock:
            items = self._load(collection)
            new_items = [i for i in items if i["id"] != item_id]
            if len(new_items) == len(items):
                return False
            self._save(collection, new_items)
            return True

    def search(self, collection: str, query: str) -> list[dict]:
        q = query.lower()
        with _lock:
            items = self._load(collection)
            result = []
            for item in items:
                if q in json.dumps(item, ensure_ascii=False).lower():
                    result.append(item)
            return result

    def query(self, collection: str, fn) -> list[dict]:
        with _lock:
            items = self._load(collection)
            return [item for item in items if fn(item)]


storage = StorageEngine()
