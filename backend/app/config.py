"""
SafeVision API - Configuration
Loads settings from environment variables with sensible defaults.
"""

from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False

    # CORS
    allowed_origins: str = "http://localhost:5173,http://localhost:3000"

    # Upload
    max_upload_size_mb: int = 50

    # Detection
    default_threshold: float = 0.25

    # useautumn
    autumn_secret_key: str = ""
    autumn_enabled: bool = False

    # Model
    model_url: str = "https://github.com/im-syn/SafeVision/raw/refs/heads/main/Models/best.onnx"

    # PostgreSQL (Railway)
    database_url: str = ""  # e.g. postgresql+asyncpg://user:pass@host:port/dbname

    # Cloudflare R2
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = "safevision"
    r2_public_url: str = ""  # e.g. https://pub-xxx.r2.dev

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def model_dir(self) -> str:
        return os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
