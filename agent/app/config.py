"""Application settings loaded from environment variables.

Note:
    The user's AI provider key (e.g. OpenAI API key) is not sourced from env.
    It should be set by the user (via the dashboard) and stored in the backend
    owner profile. The agent fetches that key from the backend internal profile
    endpoint at runtime.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Central configuration — values sourced from env / .env file."""

    # AI defaults
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
