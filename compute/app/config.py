"""
SafeVision Compute - Configuration
Minimal settings for the ML compute server.
"""

from pydantic_settings import BaseSettings
import os


class Settings(BaseSettings):
    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # Internal API key (middleware must send this)
    compute_api_key: str = ""

    # Detection
    default_threshold: float = 0.25
    max_upload_size_mb: int = 50

    # Model
    model_url: str = "https://github.com/im-syn/SafeVision/raw/refs/heads/main/Models/best.onnx"

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    @property
    def model_dir(self) -> str:
        return os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
