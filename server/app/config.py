from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=None, extra="ignore")

    database_url: str
    anthropic_api_key: str = ""
    app_password_hash: str
    jwt_secret: str
    jwt_days: int = 365
    ai_monthly_cap_usd: float = 50.0
    upload_dir: str = "/data/uploads"
    mcp_enabled: bool = True
    # not yükleme sınırları (spec Bölüm 8)
    max_upload_mb: int = 20
    max_pdf_pages: int = 50


@lru_cache
def get_settings() -> Settings:
    return Settings()
