from fastapi import APIRouter, HTTPException, Query
from app.models.daily_summary import DailySummary, DailyTaskSummary
from app.services.storage import storage
from datetime import datetime, timedelta
from typing import List, Optional

router = APIRouter(prefix="/api/daily-summary", tags=["daily-summary"])

COLLECTION = "daily_summaries"


def calculate_duration(start_time: str, end_time: str | None) -> float | None:
    if not start_time or not end_time:
        return None
    try:
        t1 = datetime.strptime(start_time, "%H:%M")
        t2 = datetime.strptime(end_time, "%H:%M")
        diff = t2 - t1
        hours = diff.total_seconds() / 3600.0
        return round(hours, 2) if hours > 0 else None
    except (ValueError, TypeError):
        return None


def generate_daily_summary(date: str) -> dict:
    all_planner = storage.get_all("planner")
    all_journal = storage.get_all("journal")
    all_activities = storage.get_all("daily_activities")
    all_deadlines = storage.get_all("deadlines")

    planner_entry = None
    for p in all_planner:
        if p["date"] == date:
            planner_entry = p
            break

    journal_entry = None
    for j in all_journal:
        if j["date"] == date:
            journal_entry = j
            break

    activity_entry = None
    for a in all_activities:
        if a["date"] == date:
            activity_entry = a
            break

    done_tasks: list[dict] = []
    not_done_tasks: list[dict] = []
    total_hours = 0.0

    if planner_entry:
        for tb in planner_entry.get("time_blocks", []):
            duration = 0.0
            if tb.get("done", False) and tb.get("is_work", True):
                d = calculate_duration(tb.get("time", ""), tb.get("completed_time"))
                if d:
                    duration = d
            task = DailyTaskSummary(
                title=tb.get("title", ""),
                done=tb.get("done", False),
                source="planner",
                hours=duration,
            )
            if tb.get("done", False):
                done_tasks.append(task)
                total_hours += duration
            else:
                not_done_tasks.append(task)

    if activity_entry:
        for entry in activity_entry.get("entries", []):
            task = DailyTaskSummary(
                title=entry.get("task", ""),
                done=True,
                source="activity",
                hours=entry.get("hours", 0),
            )
            done_tasks.append(task)
            if entry.get("is_study", True):
                total_hours += entry.get("hours", 0)

    if activity_entry and activity_entry.get("total_hours", 0) > 0:
        total_hours = activity_entry["total_hours"]

    what_i_did = ""
    if journal_entry:
        what_i_did = journal_entry.get("what_i_did", "")

    hours_text = f"{total_hours:.1f}h" if total_hours > 0 else ""
    done_count = len(done_tasks)
    not_done_count = len(not_done_tasks)
    summary_parts = []
    if done_count > 0:
        summary_parts.append(f"{done_count} task{' done' if done_count == 1 else 's done'}")
    if not_done_count > 0:
        summary_parts.append(f"{not_done_count} not done")
    if hours_text:
        summary_parts.append(f"{hours_text} total")
    summary_text = ", ".join(summary_parts) if summary_parts else "No tasks logged"

    return DailySummary(
        date=date,
        done_tasks=done_tasks,
        not_done_tasks=not_done_tasks,
        journal_what_i_did=what_i_did,
        total_hours=total_hours,
        summary_text=summary_text,
    ).model_dump()


@router.get("", response_model=DailySummary)
def get_daily_summary(date: str = Query(..., description="Date YYYY-MM-DD")):
    items = storage.query(COLLECTION, lambda x: x["date"] == date)
    if items:
        return items[0]
    generated = generate_daily_summary(date)
    return storage.create(COLLECTION, generated)


@router.get("/range", response_model=List[DailySummary])
def get_daily_summaries(
    start_date: str = Query(...),
    end_date: str = Query(...),
):
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    dates: list[str] = []
    current = start
    while current <= end:
        dates.append(current.strftime("%Y-%m-%d"))
        current += timedelta(days=1)

    existing = storage.get_all(COLLECTION)
    existing_by_date = {e["date"]: e for e in existing}

    results = []
    for date in dates:
        if date in existing_by_date:
            results.append(existing_by_date[date])
        else:
            generated = generate_daily_summary(date)
            created = storage.create(COLLECTION, generated)
            results.append(created)

    return results


@router.post("/generate-today", response_model=DailySummary)
def generate_today_summary():
    today = datetime.now().strftime("%Y-%m-%d")
    generated = generate_daily_summary(today)
    # Remove existing if any
    existing = storage.query(COLLECTION, lambda x: x["date"] == today)
    for e in existing:
        storage.delete(COLLECTION, e["id"])
    return storage.create(COLLECTION, generated)
