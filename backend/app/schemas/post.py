from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.schemas.category import CategoryResponse


class FileResponse(BaseModel):
    id: UUID
    filename: str
    original_filename: str
    file_size: int
    content_type: str

    model_config = {"from_attributes": True}


class PostCreate(BaseModel):
    title: str
    content: str | None = None
    category_id: int | None = None


class PostResponse(BaseModel):
    id: UUID
    title: str
    content: str | None = None
    user_id: UUID
    view_count: int
    up_votes: int = 0
    down_votes: int = 0
    net_votes: int = 0
    is_hot: bool = False
    category: CategoryResponse | None = None
    created_at: datetime
    updated_at: datetime
    author: str
    author_points: int = 0
    author_role: str = "USER"
    author_is_mod: bool = False
    viewer_is_mod: bool = False
    files: list[FileResponse] = []
    my_vote: str | None = None
    is_bookmarked: bool = False

    model_config = {"from_attributes": True}


class PostListItem(BaseModel):
    id: UUID
    title: str
    user_id: UUID
    view_count: int
    up_votes: int = 0
    down_votes: int = 0
    net_votes: int = 0
    is_hot: bool = False
    category: CategoryResponse | None = None
    created_at: datetime
    author: str
    author_points: int = 0
    author_role: str = "USER"
    author_is_mod: bool = False
    comment_count: int = 0

    model_config = {"from_attributes": True}


class PostListResult(BaseModel):
    items: list[PostListItem]
    total: int
    page: int
    size: int
    pages: int
    hot_threshold: int = 0
