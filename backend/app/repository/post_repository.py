import math
import os
import uuid
from typing import Any, Literal

from sqlalchemy import exists, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.category import Category
from app.models.category_moderator import CategoryModerator
from app.models.comment import Comment
from app.models.file import File
from app.models.post import Post
from app.models.user import User
from app.schemas.category import CategoryResponse
from app.schemas.post import PostCreate, PostListItem, PostListResult

HOT_THRESHOLD = 100  # net_votes >= 100


class PostRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, post_in: PostCreate, user_id: uuid.UUID) -> Post:
        post = Post(
            title=post_in.title,
            content=post_in.content,
            user_id=user_id,
            category_id=post_in.category_id,
        )
        self.db.add(post)
        await self.db.commit()
        await self.db.refresh(post)
        return post

    async def get_by_id(self, post_id: uuid.UUID) -> Post | None:
        result = await self.db.execute(
            select(Post)
            .options(
                selectinload(Post.user),
                selectinload(Post.category),
                selectinload(Post.files),
                selectinload(Post.comments).selectinload(Comment.user),
            )
            .where(Post.id == post_id)
        )
        return result.scalar_one_or_none()

    async def get_list(
        self,
        search: str | None = None,
        sort_by: Literal["created_at", "view_count", "net_votes"] = "created_at",
        sort_order: Literal["asc", "desc"] = "desc",
        page: int = 1,
        size: int = 8,
        category_id: int | None = None,
        hot_only: bool = False,
        blocked_by: list[uuid.UUID] | None = None,
    ) -> PostListResult:
        comment_count_sq = (
            select(Comment.post_id, func.count(Comment.id).label("comment_count"))
            .group_by(Comment.post_id)
            .subquery()
        )

        is_mod_sq = exists(
            select(CategoryModerator.id).where(
                CategoryModerator.user_id == Post.user_id,
                CategoryModerator.category_id == Post.category_id,
            ).correlate(Post)
        )

        query = (
            select(
                Post,
                User.username,
                User.points,
                User.role.label("user_role"),
                func.coalesce(comment_count_sq.c.comment_count, 0).label("comment_count"),
                Category.id.label("cat_id"),
                Category.slug.label("cat_slug"),
                Category.name.label("cat_name"),
                Category.group.label("cat_group"),
                Category.sort_order.label("cat_sort_order"),
                is_mod_sq.label("is_mod"),
            )
            .join(User, Post.user_id == User.id)
            .outerjoin(Category, Post.category_id == Category.id)
            .outerjoin(comment_count_sq, Post.id == comment_count_sq.c.post_id)
        )

        query = query.where(Post.is_deleted == False)  # noqa: E712

        if search:
            query = query.where(Post.title.ilike(f"%{search}%") | Post.content.ilike(f"%{search}%"))
        if category_id is not None:
            query = query.where(Post.category_id == category_id)
        if hot_only:
            query = query.where((Post.up_votes - Post.down_votes) >= HOT_THRESHOLD)
        if blocked_by:
            query = query.where(Post.user_id.not_in(blocked_by))

        if sort_by == "net_votes":
            sort_col = Post.up_votes - Post.down_votes
        elif sort_by == "view_count":
            sort_col = Post.view_count
        else:
            sort_col = Post.created_at

        query = query.order_by(sort_col.desc() if sort_order == "desc" else sort_col.asc())

        total = (await self.db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
        offset = (page - 1) * size
        rows = (await self.db.execute(query.offset(offset).limit(size))).all()

        items = [
            PostListItem(
                id=row.Post.id,
                title=row.Post.title,
                user_id=row.Post.user_id,
                view_count=row.Post.view_count,
                up_votes=row.Post.up_votes,
                down_votes=row.Post.down_votes,
                net_votes=row.Post.up_votes - row.Post.down_votes,
                is_hot=(row.Post.up_votes - row.Post.down_votes) >= HOT_THRESHOLD,
                category=CategoryResponse(
                    id=row.cat_id,
                    slug=row.cat_slug,
                    name=row.cat_name,
                    group=row.cat_group,
                    sort_order=row.cat_sort_order or 0,
                ) if row.cat_id else None,
                created_at=row.Post.created_at,
                author=row.username,
                author_points=row.points,
                author_role=row.user_role.value,
                author_is_mod=row.is_mod,
                comment_count=row.comment_count,
            )
            for row in rows
        ]

        return PostListResult(
            items=items,
            total=total,
            page=page,
            size=size,
            pages=math.ceil(total / size) if total > 0 else 1,
            hot_threshold=HOT_THRESHOLD,
        )

    async def update(self, post: Post, **fields: Any) -> Post:
        for k, v in fields.items():
            setattr(post, k, v)
        self.db.add(post)
        await self.db.commit()
        await self.db.refresh(post)
        return post

    async def delete(self, post: Post) -> None:
        for file in post.files:
            file_path = os.path.join(settings.UPLOAD_DIR, file.filename)
            if os.path.exists(file_path):
                os.remove(file_path)
        await self.db.delete(post)
        await self.db.commit()

    async def soft_delete(self, post: Post, by_admin: bool = False) -> None:
        post.is_deleted = True
        post.deleted_by_admin = by_admin
        self.db.add(post)
        await self.db.commit()

    async def soft_delete_comment(self, comment, by_admin: bool = False) -> None:
        comment.is_deleted = True
        comment.deleted_by_admin = by_admin
        self.db.add(comment)
        await self.db.commit()

    async def get_comment_by_id(self, comment_id: uuid.UUID):
        from app.models.comment import Comment
        result = await self.db.execute(select(Comment).where(Comment.id == comment_id))
        return result.scalar_one_or_none()

    async def get_list_admin(self, page: int = 1, size: int = 20, search: str | None = None) -> dict:
        """어드민용 - 삭제된 게시글 포함, 댓글 수 포함"""
        comment_count_sq = (
            select(Comment.post_id, func.count(Comment.id).label("comment_count"))
            .group_by(Comment.post_id)
            .subquery()
        )
        query = (
            select(
                Post,
                User.username,
                func.coalesce(comment_count_sq.c.comment_count, 0).label("comment_count"),
                Category.slug.label("cat_slug"),
                Category.name.label("cat_name"),
            )
            .join(User, Post.user_id == User.id)
            .outerjoin(Category, Post.category_id == Category.id)
            .outerjoin(comment_count_sq, Post.id == comment_count_sq.c.post_id)
        )
        if search:
            query = query.where(Post.title.ilike(f"%{search}%") | Post.content.ilike(f"%{search}%"))
        query = query.order_by(Post.created_at.desc())
        total = (await self.db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
        offset = (page - 1) * size
        rows = (await self.db.execute(query.offset(offset).limit(size))).all()
        items = [
            {
                "id": str(row.Post.id),
                "title": row.Post.title,
                "author": row.username,
                "category": {"slug": row.cat_slug, "name": row.cat_name} if row.cat_slug else None,
                "view_count": row.Post.view_count,
                "up_votes": row.Post.up_votes,
                "down_votes": row.Post.down_votes,
                "comment_count": row.comment_count,
                "is_deleted": row.Post.is_deleted,
                "deleted_by_admin": row.Post.deleted_by_admin,
                "created_at": row.Post.created_at.isoformat(),
            }
            for row in rows
        ]
        return {"items": items, "total": total, "page": page, "size": size, "pages": math.ceil(total / size) if total > 0 else 1}

    async def get_category_id(self, post_id: uuid.UUID) -> int | None:
        result = await self.db.execute(select(Post.category_id).where(Post.id == post_id))
        return result.scalar_one_or_none()

    async def increment_view_count(self, post_id: uuid.UUID) -> None:
        await self.db.execute(
            update(Post).where(Post.id == post_id).values(view_count=Post.view_count + 1),
            execution_options={"synchronize_session": False},
        )
        await self.db.commit()

    async def update_vote_counts(self, post_id: uuid.UUID, up_delta: int = 0, down_delta: int = 0) -> None:
        await self.db.execute(
            update(Post).where(Post.id == post_id).values(
                up_votes=Post.up_votes + up_delta,
                down_votes=Post.down_votes + down_delta,
            ),
            execution_options={"synchronize_session": False},
        )
        await self.db.commit()

    async def update_comment_vote_counts(self, comment_id: uuid.UUID, up_delta: int = 0, down_delta: int = 0) -> None:
        from app.models.comment import Comment
        await self.db.execute(
            update(Comment).where(Comment.id == comment_id).values(
                up_votes=Comment.up_votes + up_delta,
                down_votes=Comment.down_votes + down_delta,
            ),
            execution_options={"synchronize_session": False},
        )
        await self.db.commit()

    # ── 파일 ──────────────────────────────────────────────

    async def add_file(
        self,
        post_id: uuid.UUID,
        filename: str,
        original_filename: str,
        file_path: str,
        file_size: int,
        content_type: str,
    ) -> File:
        file = File(
            post_id=post_id,
            filename=filename,
            original_filename=original_filename,
            file_path=file_path,
            file_size=file_size,
            content_type=content_type,
        )
        self.db.add(file)
        await self.db.commit()
        await self.db.refresh(file)
        return file

    async def get_file(self, file_id: uuid.UUID) -> File | None:
        result = await self.db.execute(select(File).where(File.id == file_id))
        return result.scalar_one_or_none()

    async def delete_file(self, file: File) -> None:
        file_path = os.path.join(settings.UPLOAD_DIR, file.filename)
        if os.path.exists(file_path):
            os.remove(file_path)
        await self.db.delete(file)
        await self.db.commit()


# ── 의존성 팩토리 ─────────────────────────────────────────

from fastapi import Depends  # noqa: E402
from app.database import get_db  # noqa: E402


async def get_post_repo(db: AsyncSession = Depends(get_db)) -> "PostRepository":
    return PostRepository(db)
