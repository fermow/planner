"""
Deadline notification scheduler.
Runs periodic checks and sends native desktop notifications.
Supports catch-up for missed notifications when system was offline.
"""

import logging
from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from app.services.storage import storage
from app.services.notification_service import send_notification, log_notification
from app.config import settings
from app.models.daily_summary import DailySummary, DailyTaskSummary

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone=settings.TZ)

CHECK_INTERVAL_MINUTES = 1


def _parse_iso(due_str: str) -> datetime:
    """Parse ISO datetime string, handling both 'Z' and '+00:00' suffixes."""
    if due_str.endswith("Z"):
        due_str = due_str[:-1] + "+00:00"
    return datetime.fromisoformat(due_str)


def _check_deadline_notifications() -> None:
    """Check all deadlines and send notifications if conditions are met."""
    now = datetime.now(timezone.utc)
    deadlines = storage.get_all("deadlines")

    for dl in deadlines:
        if not dl.get("reminder_enabled", True):
            continue
        if dl.get("status") in ("completed", "cancelled"):
            continue

        try:
            due = _parse_iso(dl["due_date"])
        except (ValueError, KeyError):
            continue

        diff = due - now
        diff_hours = diff.total_seconds() / 3600

        checks = [
            ("3d", 72, "reminded_3d", "low"),
            ("2d", 48, "reminded_2d", "low"),
            ("1d", 24, "reminded_1d", "normal"),
            ("1h", 1, "reminded_1h", "critical"),
        ]

        for check_type, hours_before, flag, urgency in checks:
            lower = hours_before - 0.02
            upper = hours_before + CHECK_INTERVAL_MINUTES / 60.0

            if lower < diff_hours <= upper and not dl.get(flag, False):
                title = f"Deadline: {dl['title']}"
                time_left = f"{hours_before} hour(s)" if hours_before < 24 else f"{hours_before // 24} day(s)"
                message = f"Due in {time_left}! {dl.get('description', '')}"
                success = send_notification(title, message, urgency)
                if success:
                    storage.update("deadlines", dl["id"], {flag: True})
                    log_notification(dl["id"], dl["title"], check_type)
                    logger.info(f"Sent {check_type} notification for: {dl['title']}")

        if diff_hours <= 0 and dl.get("status") != "overdue":
            storage.update("deadlines", dl["id"], {"status": "overdue"})
            if not dl.get("reminded_1h", False):
                send_notification(
                    f"Deadline Missed: {dl['title']}",
                    f"Was due at {dl['due_date']}",
                    "critical",
                )


async def startup_catch_up() -> None:
    """On system startup, detect any deadlines where notifications were missed
    and send urgent reminders for deadlines within 24 hours."""
    logger.info("Running startup catch-up for missed notifications...")
    _check_deadline_notifications()

    now = datetime.now(timezone.utc)
    deadlines = storage.get_all("deadlines")

    for dl in deadlines:
        if not dl.get("reminder_enabled", True):
            continue
        if dl.get("status") in ("completed", "cancelled"):
            continue
        try:
            due = _parse_iso(dl["due_date"])
        except (ValueError, KeyError):
            continue

        diff = due - now
        diff_hours = diff.total_seconds() / 3600

        # Notify for any deadline within 24 hours (every startup)
        if 0 < diff_hours <= 24:
            title = f"⚠ Urgent: {dl['title']}"
            hours_left = int(diff_hours)
            message = f"Due in {hours_left}h! {dl.get('description', '')}"
            send_notification(title, message, "critical")
            log_notification(dl["id"], dl["title"], "startup_urgent")
            logger.info(f"Sent startup urgent notification for: {dl['title']} (due in {hours_left}h)")

        # Check specific missed windows for non-urgent deadlines
        checks = [
            ("3d", 72, "reminded_3d", "low"),
            ("2d", 48, "reminded_2d", "low"),
            ("1d", 24, "reminded_1d", "normal"),
            ("1h", 1, "reminded_1h", "critical"),
            ("overdue", 0, None, "critical"),
        ]

        for check_type, hours_before, flag, urgency in checks:
            if flag is not None and dl.get(flag, False):
                continue
            lower = hours_before - 0.02
            upper = hours_before + CHECK_INTERVAL_MINUTES / 60.0
            if check_type == "overdue" and diff_hours <= 0:
                title = f"Overdue: {dl['title']}"
                message = f"Was due at {dl['due_date']}"
                send_notification(title, message, urgency)
                log_notification(dl["id"], dl["title"], check_type)
                if flag:
                    storage.update("deadlines", dl["id"], {flag: True})
            elif lower < diff_hours <= upper and flag is not None:
                title = f"Missed Notice: {dl['title']}"
                message = f"Deadline is within {hours_before} hour(s)! Was due at {dl['due_date']}"
                send_notification(title, message, urgency)
                log_notification(dl["id"], dl["title"], f"catch_up_{check_type}")
                if flag:
                    storage.update("deadlines", dl["id"], {flag: True})


def _generate_end_of_day_summary() -> None:
    """Auto-generate daily summary at end of day."""
    from datetime import datetime as dt
    today = dt.now().strftime("%Y-%m-%d")
    logger.info(f"Auto-generating end-of-day summary for {today}")

    all_planner = storage.get_all("planner")
    all_journal = storage.get_all("journal")
    all_activities = storage.get_all("daily_activities")

    planner_entry = None
    for p in all_planner:
        if p["date"] == today:
            planner_entry = p
            break

    journal_entry = None
    for j in all_journal:
        if j["date"] == today:
            journal_entry = j
            break

    activity_entry = None
    for a in all_activities:
        if a["date"] == today:
            activity_entry = a
            break

    done_tasks = []
    not_done_tasks = []
    total_hours = 0.0

    if planner_entry:
        for tb in planner_entry.get("time_blocks", []):
            task = DailyTaskSummary(
                title=tb.get("title", ""),
                done=tb.get("done", False),
                source="planner",
            )
            if tb.get("done", False):
                done_tasks.append(task)
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

    summary = DailySummary(
        date=today,
        done_tasks=done_tasks,
        not_done_tasks=not_done_tasks,
        journal_what_i_did=what_i_did,
        total_hours=total_hours,
        summary_text=summary_text,
    )

    existing = storage.query("daily_summaries", lambda x: x["date"] == today)
    for e in existing:
        storage.delete("daily_summaries", e["id"])

    storage.create("daily_summaries", summary.model_dump())
    logger.info(f"End-of-day summary saved for {today}: {summary_text}")


def start_scheduler() -> None:
    """Start the APScheduler background scheduler."""
    trigger = IntervalTrigger(minutes=CHECK_INTERVAL_MINUTES, timezone=settings.TZ)
    scheduler.add_job(
        _check_deadline_notifications,
        trigger=trigger,
        id="deadline_check",
        replace_existing=True,
    )
    # Schedule end-of-day summary generation at 23:55 daily
    scheduler.add_job(
        _generate_end_of_day_summary,
        trigger=CronTrigger(hour=23, minute=55, timezone=settings.TZ),
        id="end_of_day_summary",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(f"Notification scheduler started (check every {CHECK_INTERVAL_MINUTES} min)")


def stop_scheduler() -> None:
    """Gracefully stop the scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Notification scheduler stopped")
