import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse

from app.security.dependencies import get_current_active_user
from app.models.user import User
from app.repository.post_repository import PostRepository, get_post_repo

router = APIRouter(prefix="/files", tags=["files"])


@router.get("/{file_id}")
async def download_file(
    file_id: uuid.UUID,
    post_repo: PostRepository = Depends(get_post_repo),
):
    file = await post_repo.get_file(file_id)
    if not file:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다")
    return FileResponse(
        path=file.file_path,
        filename=file.original_filename,
        media_type=file.content_type,
    )


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    file_id: uuid.UUID,
    post_repo: PostRepository = Depends(get_post_repo),
    current_user: User = Depends(get_current_active_user),
):
    file = await post_repo.get_file(file_id)
    if not file:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다")
    post = await post_repo.get_by_id(file.post_id)
    if not post or post.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다")
    await post_repo.delete_file(file)
