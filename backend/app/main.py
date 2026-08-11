"""
Celestial Desk — Backend API
FastAPI application with file-based storage and APScheduler notifications.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes import (
    deadlines,
    planner,
    journal,
    whiteboards,
    tables,
    notifications,
    search,
    backup,
    daily_activity,
    report,
    daily_summary,
    habits,
    life_tree,
    connection,
    music,
    calendar,
)
from app.scheduler.notification_scheduler import (
    start_scheduler,
    stop_scheduler,
    startup_catch_up,
)

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME}...")
    start_scheduler()
    await startup_catch_up()
    yield
    stop_scheduler()
    logger.info(f"{settings.APP_NAME} stopped.")


app = FastAPI(
    title=settings.APP_NAME,
    version="1.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(deadlines.router)
app.include_router(planner.router)
app.include_router(journal.router)
app.include_router(whiteboards.router)
app.include_router(tables.router)
app.include_router(notifications.router)
app.include_router(search.router)
app.include_router(backup.router)
app.include_router(daily_activity.router)
app.include_router(report.router)
app.include_router(daily_summary.router)
app.include_router(habits.router)
app.include_router(life_tree.router)
app.include_router(connection.router)
app.include_router(music.router)
app.include_router(calendar.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME, "tz": settings.TZ}
