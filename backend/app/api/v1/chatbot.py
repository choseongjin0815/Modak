from fastapi import APIRouter
from pydantic import BaseModel

from app.services.chatbot import chatbot_service

router = APIRouter(prefix="/chatbot", tags=["chatbot"])


class ChatRequest(BaseModel):
    question: str
    session_id: str = ""  # 빈 문자열이면 히스토리 없이 단발 질문


class ChatResponse(BaseModel):
    answer: str


@router.post("/ask", response_model=ChatResponse)
async def ask(request: ChatRequest) -> ChatResponse:
    answer = await chatbot_service.ask(request.question, request.session_id)
    return ChatResponse(answer=answer)
