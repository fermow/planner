from pydantic_settings import BaseSettings
from pathlib import Path
from datetime import datetime, timezone
import zoneinfo


class Settings(BaseSettings):
    APP_NAME: str = "Celestial Desk"
    DATA_DIR: str = "/data"
    TZ: str = "Asia/Tehran"
    LOG_LEVEL: str = "INFO"
    OLLAMA_HOST: str = "http://host.docker.internal:11434"
    OLLAMA_MODEL: str = "qwen2.5-coder:7b"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
DATA_DIR = Path(settings.DATA_DIR)
DATA_DIR.mkdir(parents=True, exist_ok=True)

TZ = zoneinfo.ZoneInfo(settings.TZ)


def now_iso() -> str:
    return datetime.now(TZ).isoformat()
