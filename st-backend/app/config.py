from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # MongoDB
    MONGO_URL: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "bharathanatyam_db"

    # JWT
    JWT_SECRET: str = "bharathanatyam-secret-key-2024-super-secure-random-string"
    JWT_EXPIRATION_MINUTES: int = 1440

    # Email Config (SMTP)
    MAIL_HOST: str = "smtp.gmail.com"
    MAIL_PORT: int = 587
    MAIL_USER: str = ""
    MAIL_PASS: str = ""

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8080

    # AI (Gemini)
    GEMINI_API_KEY: str = ""
    # Optional: allow selecting model from environment (e.g. "gemini-pro" or "gemini-1.5-flash")
    GEMINI_MODEL: str = "gemini-flash-latest"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
