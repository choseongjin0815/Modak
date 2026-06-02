import asyncio
import json
import uuid
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.security.dependencies import get_current_active_user
from app.security.jwt import decode_access_token
from app.models.user import User
from app.repository.notification_repository import NotificationRepository, get_notification_repo
from app.repository.user_repository import UserRepository
from app.services.sse_manager import sse_manager

router = APIRouter(prefix="/notifications", tags=["notifications"])


async def _get_user_from_token(token: str, db: AsyncSession) -> User:
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")
    user = await UserRepository(db).get_by_username(payload["sub"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="인증이 필요합니다")
    return user


@router.get("/stream")
async def notification_stream(
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    user = await _get_user_from_token(token, db)

    async def event_generator() -> AsyncGenerator[str, None]:
        queue = sse_manager.register(user.id)
        try:
            yield "event: connected\ndata: ok\n\n"
            while True:
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=25)
                    yield f"event: notification\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
                except asyncio.TimeoutError:
                    yield "event: ping\ndata: {}\n\n"
        finally:
            sse_manager.unregister(user.id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


def _serialize(n) -> dict:
    return {
        "id": str(n.id),
        "type": n.type,
        "actor": n.actor,
        "content": n.content,
        "link": n.link,
        "is_read": n.is_read,
        "created_at": n.created_at.isoformat(),
    }


@router.get("")
async def list_notifications(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
    noti_repo: NotificationRepository = Depends(get_notification_repo),
):
    items, total, pages = await noti_repo.get_list(current_user.id, page, size)
    return {
        "items": [_serialize(n) for n in items],
        "total": total, "page": page, "size": size, "pages": pages,
    }


@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_active_user),
    noti_repo: NotificationRepository = Depends(get_notification_repo),
):
    return {"count": await noti_repo.get_unread_count(current_user.id)}


@router.patch("/{notification_id}/read", status_code=204)
async def mark_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    noti_repo: NotificationRepository = Depends(get_notification_repo),
):
    await noti_repo.mark_read(notification_id, current_user.id)


@router.patch("/read-all", status_code=204)
async def mark_all_read(
    current_user: User = Depends(get_current_active_user),
    noti_repo: NotificationRepository = Depends(get_notification_repo),
):
    await noti_repo.mark_all_read(current_user.id)
