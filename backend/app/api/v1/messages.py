import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.security.dependencies import get_current_active_user
from app.models.user import User
from app.repository.message_repository import MessageRepository, get_message_repo
from app.repository.notification_repository import NotificationRepository, get_notification_repo
from app.repository.user_repository import UserRepository, get_user_repo

router = APIRouter(prefix="/messages", tags=["messages"])


class SendMessageRequest(BaseModel):
    receiver_username: str
    content: str


def _serialize(msg, viewer_id: uuid.UUID) -> dict:
    is_sender = msg.sender_id == viewer_id
    other = msg.receiver if is_sender else msg.sender
    return {
        "id": str(msg.id),
        "sender_id": str(msg.sender_id),
        "sender_username": msg.sender.username,
        "receiver_id": str(msg.receiver_id),
        "receiver_username": msg.receiver.username if msg.receiver else "알 수 없음",
        "content": msg.content,
        "is_read": msg.is_read,
        "created_at": msg.created_at.isoformat(),
        "other_username": other.username if other else "알 수 없음",
    }


@router.post("", status_code=201)
async def send_message(
    body: SendMessageRequest,
    current_user: User = Depends(get_current_active_user),
    user_repo: UserRepository = Depends(get_user_repo),
    msg_repo: MessageRepository = Depends(get_message_repo),
    noti_repo: NotificationRepository = Depends(get_notification_repo),
):
    if body.receiver_username == current_user.username:
        raise HTTPException(status_code=400, detail="자기 자신에게 쪽지를 보낼 수 없습니다")
    receiver = await user_repo.get_by_username(body.receiver_username)
    if not receiver:
        raise HTTPException(status_code=404, detail="해당 사용자를 찾을 수 없습니다")
    msg = await msg_repo.send(current_user.id, receiver.id, body.content)
    await noti_repo.create(
        user_id=receiver.id,
        type="new_message",
        actor=current_user.username,
        content=f"{current_user.username}님으로부터 쪽지가 도착했습니다.",
        link="/messages",
    )
    return _serialize(msg, current_user.id)


@router.get("/inbox")
async def get_inbox(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
    msg_repo: MessageRepository = Depends(get_message_repo),
):
    msgs, total, pages = await msg_repo.get_inbox(current_user.id, page, size)
    return {
        "items": [_serialize(m, current_user.id) for m in msgs],
        "total": total, "page": page, "size": size, "pages": pages,
    }


@router.get("/sent")
async def get_sent(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
    msg_repo: MessageRepository = Depends(get_message_repo),
):
    msgs, total, pages = await msg_repo.get_sent(current_user.id, page, size)
    return {
        "items": [_serialize(m, current_user.id) for m in msgs],
        "total": total, "page": page, "size": size, "pages": pages,
    }


@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_active_user),
    msg_repo: MessageRepository = Depends(get_message_repo),
):
    return {"count": await msg_repo.get_unread_count(current_user.id)}


@router.patch("/{message_id}/read", status_code=204)
async def mark_message_read(
    message_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    msg_repo: MessageRepository = Depends(get_message_repo),
):
    await msg_repo.mark_read(message_id, current_user.id)


@router.delete("/{message_id}", status_code=204)
async def delete_message(
    message_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    msg_repo: MessageRepository = Depends(get_message_repo),
):
    removed = await msg_repo.delete_for_user(message_id, current_user.id)
    if not removed:
        raise HTTPException(status_code=404, detail="쪽지를 찾을 수 없습니다")
