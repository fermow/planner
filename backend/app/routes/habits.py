from fastapi import APIRouter, HTTPException
from app.models.habit import Habit, HabitCreate, HabitUpdate
from app.services.storage import storage
from typing import List

router = APIRouter(prefix="/api/habits", tags=["habits"])

COLLECTION = "habits"


@router.get("", response_model=List[Habit])
def list_habits():
    return storage.get_all(COLLECTION)


@router.post("", response_model=Habit, status_code=201)
def create_habit(body: HabitCreate):
    item = Habit(**body.model_dump())
    return storage.create(COLLECTION, item.model_dump())


@router.patch("/{habit_id}", response_model=Habit)
def update_habit(habit_id: str, body: HabitUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    item = storage.update(COLLECTION, habit_id, updates)
    if not item:
        raise HTTPException(404, "Habit not found")
    return item


@router.delete("/{habit_id}")
def delete_habit(habit_id: str):
    if not storage.delete(COLLECTION, habit_id):
        raise HTTPException(404, "Habit not found")
    return {"ok": True}
