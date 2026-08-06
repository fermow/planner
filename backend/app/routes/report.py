from fastapi import APIRouter, HTTPException, Query
from app.services.storage import storage
from datetime import datetime, timedelta
from typing import Optional

router = APIRouter(prefix="/api/report", tags=["report"])


def parse_hours(t: str) -> float | None:
    """Parse HH:MM into hours"""
    try:
        parts = t.split(":")
        return int(parts[0]) + int(parts[1]) / 60.0
    except (ValueError, IndexError):
        return None


def calculate_duration(start_time: str, end_time: Optional[str]) -> float | None:
    """Calculate duration in hours between two HH:MM strings."""
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


def generate_dates(start_str: str, end_str: str) -> list[str]:
    """Generate list of dates from start to end inclusive."""
    start = datetime.strptime(start_str, "%Y-%m-%d")
    end = datetime.strptime(end_str, "%Y-%m-%d")
    dates = []
    current = start
    while current <= end:
        dates.append(current.strftime("%Y-%m-%d"))
        current += timedelta(days=1)
    return dates


def get_deadline_tasks_for_date(all_deadlines: list[dict], date: str) -> dict:
    """Get deadline tasks (done/not-done) relevant to a date."""
    done_tasks = []
    not_done_tasks = []
    for dl in all_deadlines:
        for task in dl.get("tasks", []):
            entry = {
                "deadline_title": dl.get("title", ""),
                "task_text": task.get("text", ""),
                "done": task.get("done", False),
            }
            if task.get("done", False):
                done_tasks.append(entry)
            else:
                not_done_tasks.append(entry)
    return {"done": done_tasks, "not_done": not_done_tasks}


@router.get("")
def get_report(
    start_date: str = Query(..., description="Start date YYYY-MM-DD"),
    end_date: str = Query(..., description="End date YYYY-MM-DD"),
):
    """Generate a report for the given date range combining planner, journal, daily activities, notes, and deadlines."""

    all_planner = storage.get_all("planner")
    all_journal = storage.get_all("journal")
    all_activities = storage.get_all("daily_activities")
    all_deadlines = storage.get_all("deadlines")

    days = generate_dates(start_date, end_date)
    total_hours = 0.0
    days_data = []

    for date in days:
        planner_entry = None
        journal_entry = None
        activity_entry = None

        for p in all_planner:
            if p["date"] == date:
                planner_entry = p
                break

        for j in all_journal:
            if j["date"] == date:
                journal_entry = j
                break

        for a in all_activities:
            if a["date"] == date:
                activity_entry = a
                break

        planned_tasks = []
        done_tasks_from_planner = []
        not_done_tasks_from_planner = []
        planner_total_hours = 0.0

        if planner_entry:
            for tb in planner_entry.get("time_blocks", []):
                item = {
                    "title": tb.get("title", ""),
                    "description": tb.get("description", ""),
                    "time": tb.get("time", ""),
                    "completed_time": tb.get("completed_time"),
                    "done": tb.get("done", False),
                    "is_work": tb.get("is_work", True),
                }
                planned_tasks.append(item)
                if tb.get("done", False):
                    done_tasks_from_planner.append(item)
                    if tb.get("is_work", True):
                        duration = calculate_duration(tb.get("time", ""), tb.get("completed_time"))
                        if duration:
                            item["duration_hours"] = duration
                            planner_total_hours += duration
                else:
                    not_done_tasks_from_planner.append(item)

        activity_tasks = []
        activity_total_hours = 0.0
        if activity_entry:
            for entry in activity_entry.get("entries", []):
                activity_tasks.append(entry)
                if entry.get("is_study", True):
                    activity_total_hours += entry.get("hours", 0)

        day_total_hours = max(planner_total_hours, activity_total_hours)
        if activity_entry and activity_entry.get("total_hours", 0) > 0:
            day_total_hours = activity_entry["total_hours"]

        total_hours += day_total_hours

        deadline_tasks = get_deadline_tasks_for_date(all_deadlines, date)

        day_data = {
            "date": date,
            "planner": planner_entry,
            "journal": journal_entry,
            "activity": activity_entry,
            "planned_tasks": planned_tasks,
            "done_tasks": done_tasks_from_planner,
            "not_done_tasks": not_done_tasks_from_planner,
            "activity_tasks": activity_tasks,
            "planner_total_hours": round(planner_total_hours, 2),
            "activity_total_hours": activity_total_hours,
            "day_total_hours": round(day_total_hours, 2),
            "deadline_tasks": deadline_tasks,
        }
        days_data.append(day_data)

    weeks = {}
    for day in days_data:
        d = datetime.strptime(day["date"], "%Y-%m-%d")
        week_start = d - timedelta(days=d.weekday())
        week_key = week_start.strftime("%Y-%m-%d")
        if week_key not in weeks:
            weeks[week_key] = {
                "week_start": week_key,
                "days": [],
                "total_hours": 0.0,
                "days_count": 0,
            }
        weeks[week_key]["days"].append(day)
        weeks[week_key]["total_hours"] += day["day_total_hours"]
        weeks[week_key]["days_count"] += 1

    months = {}
    for day in days_data:
        month_key = day["date"][:7]
        if month_key not in months:
            months[month_key] = {
                "month": month_key,
                "days": [],
                "total_hours": 0.0,
                "days_count": 0,
            }
        months[month_key]["days"].append(day)
        months[month_key]["total_hours"] += day["day_total_hours"]
        months[month_key]["days_count"] += 1

    return {
        "start_date": start_date,
        "end_date": end_date,
        "days": days_data,
        "total_hours": round(total_hours, 2),
        "total_days": len(days_data),
        "weeks": list(weeks.values()),
        "months": list(months.values()),
    }
