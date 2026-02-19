"""Application settings loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Central configuration — values sourced from env / .env file.

    These serve as **fallback defaults** when the owner hasn't configured
    their AI provider in the profile yet.
    """

    # AI defaults (used when profile.ai_api_key is empty)
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    # Go backend
    backend_url: str = "http://localhost:8080"
    api_key: str = ""

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
