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

# These are deliberately individual reminders, rather than a generic
# "due-soon" alert.  The flags are persisted with the deadline so a restart
# cannot deliver the same reminder twice.
DEADLINE_REMINDERS = (
    ("7d", 7 * 24, "reminded_7d", "low"),
    ("3d", 3 * 24, "reminded_3d", "normal"),
    ("1d", 24, "reminded_1d", "normal"),
    ("12h", 12, "reminded_12h", "normal"),
    ("2h", 2, "reminded_2h", "critical"),
    ("1h", 1, "reminded_1h", "critical"),
)


def _deliver_deadline_notification(
    deadline: dict,
    title: str,
    message: str,
    check_type: str,
    urgency: str,
    flag: str | None = None,
) -> None:
    """Send native notification and always retain a browser/in-app fallback."""
    native_sent = send_notification(title, message, urgency)
    log_notification(deadline["id"], title, check_type, message)
    if flag:
        storage.update("deadlines", deadline["id"], {flag: True})

    channel = "native" if native_sent else "browser/in-app fallback"
    logger.info("Recorded %s notification for %s via %s", check_type, deadline["title"], channel)


def _parse_iso(due_str: str) -> datetime:
    """Parse ISO datetime string, handling both 'Z' and '+00:00' suffixes."""
    if due_str.endswith("Z"):
        due_str = due_str[:-1] + "+00:00"
    parsed = datetime.fromisoformat(due_str)
    # Old hand-edited data may not include an offset. Treat it as UTC instead
    # of letting a naive/aware datetime comparison stop all reminders.
    return parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed


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

        for check_type, hours_before, flag, urgency in DEADLINE_REMINDERS:
            lower = hours_before - 0.02
            upper = hours_before + CHECK_INTERVAL_MINUTES / 60.0

            if lower < diff_hours <= upper and not dl.get(flag, False):
                title = f"Deadline: {dl['title']}"
                time_left = f"{hours_before} hour(s)" if hours_before < 24 else f"{hours_before // 24} day(s)"
                message = f"Due in {time_left}! {dl.get('description', '')}"
                _deliver_deadline_notification(dl, title, message, check_type, urgency, flag)

        # The due-time alert is independent of the one-hour alert.  The old
        # implementation skipped it whenever the 1h alert had fired.
        if diff_hours <= 0:
            if dl.get("status") != "overdue":
                storage.update("deadlines", dl["id"], {"status": "overdue"})
            if not dl.get("reminded_due", False):
                _deliver_deadline_notification(
                    dl,
                    f"Deadline due now: {dl['title']}",
                    f"The deadline has reached its scheduled time. {dl.get('description', '')}",
                    "due",
                    "critical",
                    "reminded_due",
                )


async def startup_catch_up() -> None:
    """Deliver reminder points missed while the backend was not running."""
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

        # A reminder only counts as missed if the deadline already existed at
        # that reminder point. This avoids, for example, sending a 7-day
        # alert for a deadline the user created two days before it is due.
        try:
            created_at = _parse_iso(dl.get("created_at", dl["due_date"]))
        except (ValueError, KeyError):
            created_at = now

        for check_type, hours_before, flag, urgency in DEADLINE_REMINDERS:
            if dl.get(flag, False) or diff_hours <= 0 or diff_hours >= hours_before:
                continue
            reminder_time = due - timedelta(hours=hours_before)
            if created_at <= reminder_time:
                title = f"Missed Notice: {dl['title']}"
                message = f"The {check_type} reminder was missed. Due at {dl['due_date']}. {dl.get('description', '')}"
                _deliver_deadline_notification(dl, title, message, f"catch_up_{check_type}", urgency, flag)


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
