from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class CommentBase(BaseModel):
    content: str


class CommentCreate(CommentBase):
    pass


class CommentUpdate(BaseModel):
    content: str


class CommentResponse(CommentBase):
    id: UUID
    user_id: UUID
    post_id: UUID
    created_at: datetime
    updated_at: datetime
    author: str
    author_points: int = 0
    up_votes: int = 0
    down_votes: int = 0
    my_vote: str | None = None
    is_deleted: bool = False
    deleted_by_admin: bool = False

    model_config = {"from_attributes": True}
