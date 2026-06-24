from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class NoticeCreate(BaseModel):
    title: str
    content: str
    is_pinned: bool = False


class NoticeUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    is_pinned: bool | None = None


class NoticeListItem(BaseModel):
    id: UUID
    title: str
    is_pinned: bool
    view_count: int
    author: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class NoticeResponse(BaseModel):
    id: UUID
    title: str
    content: str
    is_pinned: bool
    view_count: int
    author_id: UUID | None = None
    author: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NoticeListResult(BaseModel):
    items: list[NoticeListItem]
    total: int
    page: int
    size: int
    pages: int
