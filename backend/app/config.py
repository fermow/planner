from pydantic_settings import BaseSettings
from pathlib import Path
from datetime import datetime, timezone
import zoneinfo


class Settings(BaseSettings):
    APP_NAME: str = "Celestial Desk"
    DATA_DIR: str = str(Path(__file__).resolve().parents[2] / "data")
    TZ: str = "UTC"
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
DATA_DIR = Path(settings.DATA_DIR)
DATA_DIR.mkdir(parents=True, exist_ok=True)

try:
    TZ = zoneinfo.ZoneInfo(settings.TZ)
except zoneinfo.ZoneInfoNotFoundError:
    import logging
    logging.getLogger(__name__).warning(
        "Unknown timezone %r, falling back to UTC", settings.TZ
    )
    TZ = timezone.utc


def now_iso() -> str:
    return datetime.now(TZ).isoformat()
