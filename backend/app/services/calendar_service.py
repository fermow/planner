"""
Official Iranian calendar events, sourced from time.ir (تقویم رسمی کشور).

time.ir publishes the official yearly event/holiday list where lunar
(Islamic) holidays are already mapped to the correct Jalali dates used in
Iran (these can differ by a day from the umalqura calendar the browser
provides). We fetch the yearly page, parse every event item, cache it and
serve it to the frontend.

The cache lives in DATA_DIR/calendar_events.json and is refreshed at most
once per CACHE_TTL.
"""

import json
import logging
import re
import shutil
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path

from app.config import DATA_DIR

logger = logging.getLogger(__name__)

CACHE_FILE = DATA_DIR / "calendar_events.json"
CACHE_TTL = timedelta(hours=12)
FETCH_TIMEOUT = 25

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)

PERSIAN_MONTHS = [
    "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
]

_FA_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789")

# Each official event is rendered as two adjacent spans: the Jalali date
# (day + month) followed by the event title. A "__holiday" class marks it
# as an official public holiday.
_DATE_EVENT_RE = re.compile(
    r'<span class="([^"]*?__root__date[^"]*?)">'
    r"([0-9۰-۹]+)(?:<!--[^>]*-->\s*)+([^<]{1,24}?)"
    r"</span>\s*"
    r'<span class="([^"]*?__root__event[^"]*?)">'
    r"([^<]+?)</span>",
    re.S,
)


def _month_index(name: str) -> int | None:
    for i, month in enumerate(PERSIAN_MONTHS):
        if month in name:
            return i + 1
    return None


def _parse_events(raw: str) -> list[dict]:
    """Extract {m, d, title, is_holiday} for every event of the year."""
    events: list[dict] = []
    for date_cls, day, month, ev_cls, title in _DATE_EVENT_RE.findall(raw):
        try:
            day = int(day.translate(_FA_DIGITS))
        except ValueError:
            continue
        month_i = _month_index(month)
        if not month_i or not (1 <= day <= 31):
            continue
        events.append(
            {
                "m": month_i,
                "d": day,
                "title": title.strip(),
                "is_holiday": "__holiday" in date_cls or "__holiday" in ev_cls,
            }
        )
    return events


def _fetch_year(year: int) -> list[dict] | None:
    """Return parsed events for the given Jalali year, or None on failure."""
    url = f"https://www.time.ir/fa/eventyear-{year}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=FETCH_TIMEOUT) as resp:
            if resp.status != 200:
                logger.warning("time.ir returned %s for %s", resp.status, url)
                return None
            html = resp.read().decode("utf-8", errors="replace")
    except Exception as exc:  # noqa: BLE001 — network failure is non-fatal
        logger.warning("time.ir fetch failed for year %s: %s", year, exc)
        return None
    events = _parse_events(html)
    if not events:
        logger.warning("no events parsed from %s", url)
        return None
    return events


def _read_cache() -> dict:
    if not CACHE_FILE.exists():
        return {}
    try:
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        logger.warning("calendar cache unreadable, ignoring")
        return {}


def _write_cache(cache: dict) -> None:
    tmp = CACHE_FILE.with_suffix(".json.tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)
    shutil.move(str(tmp), str(CACHE_FILE))


def get_year_events(year: int) -> list[dict]:
    """Return official events for a Jalali year, with a file cache."""
    cache = _read_cache()
    entry = cache.get(str(year))
    if entry:
        try:
            updated = datetime.fromisoformat(entry["updated_at"])
            if updated.tzinfo is None:
                updated = updated.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) - updated < CACHE_TTL:
                return entry["events"]
        except (ValueError, KeyError, TypeError):
            pass

    events = _fetch_year(year)
    if events is None:
        if entry:
            logger.info("serving stale calendar data for year %s", year)
            return entry["events"]
        return []
    cache[str(year)] = {"updated_at": datetime.now(timezone.utc).isoformat(), "events": events}
    try:
        _write_cache(cache)
    except OSError as exc:
        logger.warning("calendar cache write failed: %s", exc)
    return events