from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class ImageGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=1000)
    size: Literal["1024x1024", "1024x1536", "1536x1024"] = "1024x1024"

    @field_validator("prompt")
    @classmethod
    def _strip_prompt(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("프롬프트를 입력해 주세요")
        return v


class ImageGenerateResponse(BaseModel):
    token: str
    preview_url: str
    original_filename: str
    content_type: str
    remaining: int
    limit: int
    reset_at: datetime | None = None


class ImageQuotaResponse(BaseModel):
    used: int
    remaining: int
    limit: int
    reset_at: datetime | None = None
