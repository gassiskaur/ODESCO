"""
Centralized configuration. All secrets/config come from environment variables
(loaded from .env in local dev). Nothing here should be hard-coded for prod.
"""
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # --- Mongo ---
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "research_agent")

    # --- Auth ---
    JWT_SECRET: str = os.getenv("JWT_SECRET", "dev-secret-change-me")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))

    # --- OpenAlex ---
    OPENALEX_BASE_URL: str = "https://api.openalex.org"
    OPENALEX_MAILTO: str = os.getenv("OPENALEX_MAILTO", "")
    OPENALEX_API_KEY: str = os.getenv("OPENALEX_API_KEY", "")
    OPENALEX_INCLUDE_XPAC: bool = False  # locked default, see master prompt §12.7

    # --- Gemini / Gemma (same Gemini API, same client, just a different model string) ---
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-flash-latest")

    # --- Agent loop bounds (master prompt §12.9) ---
    AGENT_MAX_ITERATIONS: int = 8
    AGENT_TIMEOUT_SECONDS: int = 45

    # --- Search cost policy (master prompt §12.10) ---
    MAX_SEARCH_STRATEGY_VARIANTS: int = 2
    MAX_RESULTS_PER_SEARCH: int = 200

    # --- Voice transcription (faster-whisper, local, free, no API key) ---
    WHISPER_MODEL_SIZE: str = os.getenv("WHISPER_MODEL_SIZE", "base")
    WHISPER_DEVICE: str = os.getenv("WHISPER_DEVICE", "cpu")
    WHISPER_COMPUTE_TYPE: str = os.getenv("WHISPER_COMPUTE_TYPE", "int8")

    # --- CORS ---
    FRONTEND_ORIGIN: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")


settings = Settings()
