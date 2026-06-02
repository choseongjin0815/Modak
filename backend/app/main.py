import os
from contextlib import asynccontextmanager

from app.config import settings

# LangSmith 추적 활성화 (LANGCHAIN_TRACING_V2=true 일 때만)
os.environ.setdefault("LANGCHAIN_TRACING_V2", settings.LANGCHAIN_TRACING_V2)
os.environ.setdefault("LANGCHAIN_API_KEY", settings.LANGCHAIN_API_KEY)
os.environ.setdefault("LANGCHAIN_PROJECT", settings.LANGCHAIN_PROJECT)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1 import admin, auth, blacklist, bookmarks, categories, chatbot, comments, files, messages, moderation, notifications, points, posts, reports, users, votes
from app.services.chatbot import chatbot_service

# Ensure all models are imported for Alembic autogenerate
from app.models import attendance, blacklist as blacklist_model, bookmark, category as category_model, category_moderator, comment, file, message, moderator_ban, notification, point, post, report as report_model, user, vote as vote_model  # noqa

@asynccontextmanager
async def lifespan(app: FastAPI):
    chatbot_service.initialize()
    yield


app = FastAPI(
    title="게시판 API",
    description="FastAPI 기반 게시판 서비스",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(categories.router, prefix="/api/v1")
app.include_router(posts.router, prefix="/api/v1")
app.include_router(comments.router, prefix="/api/v1")
app.include_router(files.router, prefix="/api/v1")
app.include_router(votes.router, prefix="/api/v1")
app.include_router(points.router, prefix="/api/v1")
app.include_router(bookmarks.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(blacklist.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(messages.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(moderation.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(chatbot.router, prefix="/api/v1")

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.get("/")
async def root():
    return {"message": "게시판 API가 실행 중입니다"}


@app.get("/health")
async def health():
    return {"status": "ok"}
