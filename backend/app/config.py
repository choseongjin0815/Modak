from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/board_db"
    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    UPLOAD_DIR: str = "uploads"
    OPENAI_API_KEY: str = ""
    # AI 이미지 생성 (OpenAI Images API)
    OPENAI_IMAGE_MODEL: str = "gpt-image-1.5"
    IMAGE_GEN_LIMIT: int = 3
    IMAGE_GEN_WINDOW_HOURS: int = 168
    IMAGE_TMP_SUBDIR: str = "tmp"
    LANGCHAIN_TRACING_V2: str = "false"
    LANGCHAIN_API_KEY: str = ""
    LANGCHAIN_PROJECT: str = "board-chatbot"

    class Config:
        env_file = ".env"


settings = Settings()
