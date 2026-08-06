"""
AI Chat Service — Ollama integration with data context.
Reads all user data and builds a context-rich system prompt.
"""

import json
import uuid
import logging
from datetime import datetime, timedelta
from pathlib import Path

import httpx

from app.config import settings, DATA_DIR, TZ, now_iso
from app.services.storage import storage

logger = logging.getLogger(__name__)

HISTORY_FILE = "chat_history.json"


def _load_history() -> list[dict]:
    path = DATA_DIR / HISTORY_FILE
    if path.exists():
        with open(path, "r") as f:
            return json.load(f)
    return []


def _save_history(entries: list[dict]) -> None:
    path = DATA_DIR / HISTORY_FILE
    tmp = path.with_suffix(".json.tmp")
    with open(tmp, "w") as f:
        json.dump(entries, f, indent=2, ensure_ascii=False)
    import shutil
    shutil.move(str(tmp), str(path))


def _safe_get(collection: str) -> list[dict]:
    try:
        return storage.get_all(collection)
    except Exception as e:
        logger.warning(f"Failed to load {collection}: {e}")
        return []


def _build_data_context() -> str:
    now = datetime.now(TZ)
    today = now.strftime("%Y-%m-%d")
    week_start = (now - timedelta(days=now.weekday())).strftime("%Y-%m-%d")

    deadlines = _safe_get("deadlines")
    planner = _safe_get("planner")
    journal = _safe_get("journal")
    sports = _safe_get("sports")
    finance_transactions = _safe_get("finance_transactions")
    life_trees = _safe_get("life_trees")
    connections = _safe_get("connections")
    daily_activities = _safe_get("daily_activities")

    active_deadlines = [d for d in deadlines if d.get("status") in ("pending", "in_progress")]
    overdue_deadlines = [d for d in deadlines if d.get("status") == "overdue"]
    this_week_planner = sorted(
        [p for p in planner if p.get("date", "") >= week_start],
        key=lambda x: x.get("date", ""),
        reverse=True
    )[:7]
    recent_journal = sorted(journal, key=lambda x: x.get("date", ""), reverse=True)[:3]
    recent_activities = sorted(daily_activities, key=lambda x: x.get("date", ""), reverse=True)[:3]
    recent_sports = sorted(sports, key=lambda x: x.get("date", ""), reverse=True)[:5]

    total_income = sum(t.get("amount", 0) for t in finance_transactions if t.get("type") == "income")
    total_expense = sum(t.get("amount", 0) for t in finance_transactions if t.get("type") == "expense")

    lines = [f"امروز: {today}"]

    if active_deadlines:
        lines.append("ددلاین‌ها:")
        for d in active_deadlines[:5]:
            lines.append(f"- {d.get('title','')} | {d.get('priority','')} | {d.get('status','')} | {d.get('progress',0)}% | موعد: {d.get('due_date','')}")

    if overdue_deadlines:
        lines.append("سررسید شده:")
        for d in overdue_deadlines[:3]:
            lines.append(f"- {d.get('title','')} | موعد: {d.get('due_date','')}")

    if this_week_planner:
        lines.append("برنامه این هفته:")
        for p in this_week_planner[:5]:
            day = p.get('day','')
            mood = p.get('mood','')
            tasks = p.get('tasks', [])
            blocks = p.get('time_blocks', [])
            block_info = []
            for b in blocks:
                status = "✓" if b.get("done") else "○"
                block_info.append(f"{status} {b.get('time','')} {b.get('title','')}")
            lines.append(f"- {p.get('date','')} {day}: خلق={mood}")
            if tasks:
                lines.append(f"  وظایف: {', '.join(tasks[:5])}")
            if block_info:
                lines.append(f"  بلوک‌ها: {' | '.join(block_info)}")

    if recent_journal:
        lines.append("ژورنال:")
        for j in recent_journal:
            lines.append(f"- {j.get('date','')}: {j.get('what_i_did','')[:150]}")

    if recent_activities:
        lines.append("فعالیت روزانه:")
        for a in recent_activities:
            tasks = [e.get("task","") for e in a.get("entries",[])[:3]]
            lines.append(f"- {a.get('date','')}: {a.get('total_hours',0)} ساعت | {', '.join(tasks)}")

    if recent_sports:
        lines.append("ورزش:")
        for s in recent_sports[:3]:
            done = len([e for e in s.get("exercises",[]) if e.get("done")])
            lines.append(f"- {s.get('date','')}: {done}/{len(s.get('exercises',[]))} تمرین | {s.get('total_duration',0)} دقیقه")

    lines.append(f"مالی: درآمد {total_income:,} | هزینه {total_expense:,} | مانده {total_income - total_expense:,}")

    if connections:
        names = [f"{c.get('name','')}({c.get('relationship','')})" for c in connections[:5]]
        lines.append(f"ارتباطات: {', '.join(names)}")

    if life_trees:
        for tree in life_trees[:2]:
            done_count = sum(1 for b in tree.get("branches",[]) if b.get("done"))
            lines.append(f"درخت زندگی: {tree.get('title','')} - {done_count}/{len(tree.get('branches',[]))} انجام شده")

    return "\n".join(lines)


def _build_system_prompt(mode: str, data_context: str) -> str:
    base = (
        "تو 'سیاره‌بان' هستی، دستیار هوش مصنوعی مدیریت زندگی کاربر.\n\n"
        "قانون مهم: به همان زبانی جواب بده که کاربر نوشته. "
        "فارسی نوشت = فارسی جواب بده. انگلیسی نوشت = انگلیسی جواب بده.\n\n"
        "قوانین: مختصر باش. از ایموجی استفاده کن. از داده‌های کاربر استفاده کن.\n\n"
    )

    if mode == "report":
        base += "گزارش عملکرد کاربر رو با Markdown بنویس.\n\n"
    elif mode == "analysis":
        base += "تحلیل و پیشنهاد بهبود بده. با Markdown بنویس.\n\n"
    else:
        base += "به سوالات کاربر جواب بده.\n\n"

    base += f"داده‌های کاربر:\n{data_context}"
    return base

    if mode == "report":
        base += (
            "تو الان در حالت **گزارش‌گیری** هستی. "
            "گزارش عملکرد کاربر رو بر اساس داده‌های موجود بنویس. "
            "شامل خلاصه فعالیت‌ها، پیشرفت ددلاین‌ها، وضعیت ورزش، و نکات مالی باش.\n"
            "گزارش رو با فرمت Markdown بنویس.\n\n"
        )
    elif mode == "analysis":
        base += (
            "تو الان در حالت **تحلیل سیستم** هستی. "
            "الگوها، نقاط قوت و ضعف کاربر رو شناسایی کن. "
            "پیشنهادات مشخص و عملی برای بهبود ارائه بده. "
            "تحلیل رو با فرمت Markdown بنویس.\n\n"
        )
    else:
        base += (
            "تو الان در حالت **چت معمولی** هستی. "
            "به سوالات کاربر پاسخ بده و از داده‌های موجود کمک بگیر.\n\n"
        )

    base += f"--- داده‌های کاربر ---\n{data_context}\n--- پایان داده‌ها ---"
    return base


async def chat(messages: list[dict], mode: str = "chat") -> str:
    data_context = _build_data_context()
    system_prompt = _build_system_prompt(mode, data_context)

    full_messages = [{"role": "system", "content": system_prompt}]
    full_messages.extend(messages)

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            resp = await client.post(
                f"{settings.OLLAMA_HOST}/api/chat",
                json={
                    "model": settings.OLLAMA_MODEL,
                    "messages": full_messages,
                    "stream": False,
                    "options": {
                        "num_predict": 1024,
                        "temperature": 0.7,
                    },
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("message", {}).get("content", "پاسخی دریافت نشد.")
        except httpx.ConnectError:
            return "❌ خطا: Ollama در دسترس نیست. لطفاً مطمئن شوید Ollama اجرا شده."
        except httpx.HTTPStatusError as e:
            return f"❌ خطا در ارتباط با Ollama: {e.response.status_code}"
        except Exception as e:
            return f"❌ خطای غیرمنتظره: {str(e)}"


async def chat_stream(messages: list[dict], mode: str = "chat"):
    """Yields text chunks as they arrive from Ollama."""
    data_context = _build_data_context()
    system_prompt = _build_system_prompt(mode, data_context)

    full_messages = [{"role": "system", "content": system_prompt}]
    full_messages.extend(messages)

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            async with client.stream(
                "POST",
                f"{settings.OLLAMA_HOST}/api/chat",
                json={
                    "model": settings.OLLAMA_MODEL,
                    "messages": full_messages,
                    "stream": True,
                    "options": {
                        "num_predict": 1024,
                        "temperature": 0.7,
                    },
                },
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line.strip():
                        continue
                    try:
                        chunk = json.loads(line)
                        token = chunk.get("message", {}).get("content", "")
                        done = chunk.get("done", False)
                        if token:
                            yield token
                        if done:
                            break
                    except json.JSONDecodeError:
                        continue
        except httpx.ConnectError:
            yield "❌ خطا: Ollama در دسترس نیست."
        except Exception as e:
            yield f"❌ خطای غیرمنتظره: {str(e)}"


async def check_health() -> dict:
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            resp = await client.get(f"{settings.OLLAMA_HOST}/api/tags")
            resp.raise_for_status()
            models = [m.get("name", "") for m in resp.json().get("models", [])]
            model_available = any(settings.OLLAMA_MODEL in m for m in models)
            return {
                "status": "connected" if model_available else "model_not_found",
                "model": settings.OLLAMA_MODEL,
                "ollama_host": settings.OLLAMA_HOST,
                "available_models": models,
            }
        except Exception:
            return {
                "status": "disconnected",
                "model": settings.OLLAMA_MODEL,
                "ollama_host": settings.OLLAMA_HOST,
                "available_models": [],
            }


def save_chat_entry(mode: str, user_message: str, assistant_response: str) -> dict:
    entry = {
        "id": str(uuid.uuid4()),
        "mode": mode,
        "user_message": user_message,
        "assistant_response": assistant_response,
        "timestamp": now_iso(),
    }
    history = _load_history()
    history.append(entry)
    _save_history(history)
    return entry


def get_chat_history(limit: int = 50) -> list[dict]:
    history = _load_history()
    return sorted(history, key=lambda x: x.get("timestamp", ""), reverse=True)[:limit]


def clear_chat_history() -> None:
    _save_history([])
