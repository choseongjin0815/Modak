import json
import logging
from pathlib import Path

from app.config import settings

logger = logging.getLogger(__name__)


# 카테고리 그룹 → slug 목록 매핑
_CATEGORY_GROUPS: dict[str, list[str]] = {
    # 스포츠
    "야구":    ["kbo", "mlb"],
    "축구":    ["kleague", "intl_soccer"],
    "농구":    ["kbl", "nba"],
    "스포츠":  ["kbo", "mlb", "kleague", "intl_soccer", "kbl", "nba", "kovo", "golf", "sports_etc"],
    # 투자·경제
    "주식":    ["domestic_stock", "us_stock"],
    "투자":    ["domestic_stock", "us_stock", "crypto", "realestate"],
    # 연예·문화
    "연예":    ["kpop", "drama", "movie", "entertainment", "webtoon"],
    "문화":    ["kpop", "drama", "movie", "entertainment", "webtoon"],
    # 게임
    "게임":    ["lol", "fc_online", "maplestory"],
    # IT·테크
    "IT":      ["smartphone", "laptop"],
    "테크":    ["smartphone", "laptop"],
    # 라이프
    "라이프":  ["food", "travel", "fashion", "health", "car"],
    # 시사·뉴스
    "뉴스":    ["domestic_news", "intl_news", "politics", "economy_news"],
    "시사":    ["domestic_news", "intl_news", "politics", "economy_news"],
}


class ChatbotService:
    def __init__(self) -> None:
        self._llm_with_tools = None
        self._tools: dict = {}
        self._sessions: dict[str, list] = {}  # session_id → 메시지 히스토리

    # ── 초기화 ────────────────────────────────────────────────────────────────

    def initialize(self) -> None:
        if not settings.OPENAI_API_KEY:
            logger.warning("OPENAI_API_KEY not set — chatbot disabled")
            return
        try:
            from langchain_openai import OpenAIEmbeddings, ChatOpenAI
            from langchain_chroma import Chroma
            from langchain_core.documents import Document

            # FAQ → ChromaDB
            faq_path = Path(__file__).parent.parent / "faq_data.json"
            with open(faq_path, encoding="utf-8") as f:
                faqs = json.load(f)

            docs = [
                Document(
                    page_content=f"Q: {item['question']}\nA: {item['answer']}",
                    metadata={"question": item["question"]},
                )
                for item in faqs
            ]
            embeddings = OpenAIEmbeddings(openai_api_key=settings.OPENAI_API_KEY)
            vectorstore = Chroma.from_documents(documents=docs, embedding=embeddings)

            # Tools
            tools = self._build_tools(vectorstore)

            # LLM
            llm = ChatOpenAI(
                model="gpt-4o-mini",
                openai_api_key=settings.OPENAI_API_KEY,
                temperature=0.2,
            )

            # LLM에 tool 목록을 묶어둠 — 이후 invoke 시 tool 정보가 함께 전달됨
            self._llm_with_tools = llm.bind_tools(tools)
            self._tools = {t.name: t for t in tools}  # name → tool 조회용
            logger.info("Chatbot initialized with %d tools", len(tools))

        except Exception:
            logger.exception("Chatbot initialization failed")

    # ── Tool 정의 ─────────────────────────────────────────────────────────────

    def _build_tools(self, vectorstore):
        from langchain_core.tools import tool

        @tool
        async def search_faq(question: str) -> str:
            """게시판 이용 방법, 기능 설명 등을 FAQ에서 검색합니다.
            회원가입, 로그인, 게시글 작성, 댓글, 포인트, 북마크, 차단, 신고 등
            서비스 사용 방법을 물어볼 때 사용합니다."""
            docs = vectorstore.similarity_search(question, k=3)
            if not docs:
                return "관련 FAQ를 찾을 수 없습니다."
            return "\n\n".join(d.page_content for d in docs)

        @tool
        async def search_posts(keyword: str, category_slug: str = "") -> str:
            """키워드로 게시글을 검색합니다.
            특정 선수, 팀, 종목, 주식 종목 등에 대한 게시글을 찾을 때 사용합니다.
            category_slug는 선택사항이며 domestic_soccer, intl_soccer,
            domestic_baseball, intl_baseball, domestic_stock, intl_stock, crypto 중 하나입니다."""
            from sqlalchemy import select, and_, or_
            from app.database import AsyncSessionLocal
            from app.models.post import Post
            from app.models.user import User
            from app.models.category import Category as Cat

            try:
                async with AsyncSessionLocal() as db:
                    q = (
                        select(Post, User.username, Cat.name.label("cat_name"))
                        .join(User, Post.user_id == User.id)
                        .outerjoin(Cat, Post.category_id == Cat.id)
                        .where(and_(
                            Post.is_deleted == False,
                            or_(
                                Post.title.ilike(f"%{keyword}%"),
                                Post.content.ilike(f"%{keyword}%"),
                            ),
                        ))
                        .order_by(Post.created_at.desc())
                        .limit(5)
                    )
                    if category_slug:
                        q = q.where(Cat.slug == category_slug)

                    rows = (await db.execute(q)).all()

                if not rows:
                    return f"'{keyword}' 관련 게시글이 없습니다."

                lines = [f"'{keyword}' 검색 결과 {len(rows)}개:"]
                for post, username, cat_name in rows:
                    net = post.up_votes - post.down_votes
                    vote = f"+{net}" if net >= 0 else str(net)
                    lines.append(
                        f"- [{cat_name or '미분류'}] {post.title}"
                        f" (작성자: {username} / 조회 {post.view_count:,} / 추천 {vote})"
                    )
                return "\n".join(lines)
            except Exception as e:
                logger.exception("search_posts failed")
                return f"게시글 검색 중 오류가 발생했습니다: {e}"

        @tool
        async def get_popular_posts(
            category_slug: str = "", category_group: str = "", limit: int = 5
        ) -> str:
            """조회수 기준 인기 게시글을 조회합니다.
            '인기글', '많이 본 글', 'HOT 게시글' 등을 물어볼 때 사용합니다.
            category_slug: 특정 게시판 하나 (domestic_soccer, intl_soccer 등).
            category_group: 여러 게시판 묶음 — '축구'(국내+해외축구), '야구'(국내+해외야구),
              '스포츠'(모든 스포츠), '주식'(국내+해외주식), '투자'(주식+코인).
            limit: 반환할 개수 (기본 5)."""
            from sqlalchemy import select, and_
            from app.database import AsyncSessionLocal
            from app.models.post import Post
            from app.models.user import User
            from app.models.category import Category as Cat

            try:
                slugs = _CATEGORY_GROUPS.get(category_group, [])
                async with AsyncSessionLocal() as db:
                    q = (
                        select(Post, User.username, Cat.name.label("cat_name"))
                        .join(User, Post.user_id == User.id)
                        .outerjoin(Cat, Post.category_id == Cat.id)
                        .where(Post.is_deleted == False)
                        .order_by(Post.view_count.desc())
                        .limit(limit)
                    )
                    if slugs:
                        q = q.where(Cat.slug.in_(slugs))
                    elif category_slug:
                        q = q.where(Cat.slug == category_slug)

                    rows = (await db.execute(q)).all()

                if not rows:
                    return "게시글이 없습니다."

                label = category_group or category_slug or "전체"
                lines = [f"{label} 인기 게시글 TOP {len(rows)}:"]
                for i, (post, username, cat_name) in enumerate(rows, 1):
                    lines.append(
                        f"{i}. [{cat_name or '미분류'}] {post.title}"
                        f" (조회 {post.view_count:,} / 작성자: {username})"
                    )
                return "\n".join(lines)
            except Exception as e:
                logger.exception("get_popular_posts failed")
                return f"인기 게시글 조회 중 오류가 발생했습니다: {e}"

        @tool
        async def get_latest_posts(
            category_slug: str = "", category_group: str = "", limit: int = 5
        ) -> str:
            """최신 게시글을 조회합니다.
            '최근 글', '새 글', '방금 올라온 글' 등을 물어볼 때 사용합니다.
            category_slug: 특정 게시판 하나.
            category_group: 여러 게시판 묶음 — '축구', '야구', '스포츠', '주식', '투자'.
            limit: 반환할 개수 (기본 5)."""
            from sqlalchemy import select, and_
            from app.database import AsyncSessionLocal
            from app.models.post import Post
            from app.models.user import User
            from app.models.category import Category as Cat

            try:
                slugs = _CATEGORY_GROUPS.get(category_group, [])
                async with AsyncSessionLocal() as db:
                    q = (
                        select(Post, User.username, Cat.name.label("cat_name"))
                        .join(User, Post.user_id == User.id)
                        .outerjoin(Cat, Post.category_id == Cat.id)
                        .where(Post.is_deleted == False)
                        .order_by(Post.created_at.desc())
                        .limit(limit)
                    )
                    if slugs:
                        q = q.where(Cat.slug.in_(slugs))
                    elif category_slug:
                        q = q.where(Cat.slug == category_slug)

                    rows = (await db.execute(q)).all()

                if not rows:
                    return "게시글이 없습니다."

                label = category_group or category_slug or "전체"
                lines = [f"{label} 최신 게시글 {len(rows)}개:"]
                for post, username, cat_name in rows:
                    ts = post.created_at.strftime("%m/%d %H:%M")
                    lines.append(
                        f"- [{cat_name or '미분류'}] {post.title}"
                        f" (작성자: {username} / {ts})"
                    )
                return "\n".join(lines)
            except Exception as e:
                logger.exception("get_latest_posts failed")
                return f"최신 게시글 조회 중 오류가 발생했습니다: {e}"

        @tool
        async def get_board_stats() -> str:
            """게시판 전체 통계를 조회합니다.
            총 게시글 수, 총 회원 수, 카테고리별 게시글 현황을 알고 싶을 때 사용합니다."""
            from sqlalchemy import select, func, and_
            from app.database import AsyncSessionLocal
            from app.models.post import Post
            from app.models.user import User
            from app.models.category import Category as Cat

            try:
                async with AsyncSessionLocal() as db:
                    total_posts = await db.scalar(
                        select(func.count()).where(Post.is_deleted == False)
                    )
                    total_users = await db.scalar(
                        select(func.count()).select_from(User)
                    )
                    cat_rows = (await db.execute(
                        select(Cat.name, func.count(Post.id).label("cnt"))
                        .outerjoin(Post, and_(
                            Post.category_id == Cat.id,
                            Post.is_deleted == False,
                        ))
                        .group_by(Cat.name)
                        .order_by(func.count(Post.id).desc())
                    )).all()

                lines = [
                    f"총 게시글: {total_posts:,}개",
                    f"총 회원: {total_users:,}명",
                    "",
                    "카테고리별 게시글:",
                ]
                for name, cnt in cat_rows:
                    lines.append(f"  - {name}: {cnt:,}개")
                return "\n".join(lines)
            except Exception as e:
                logger.exception("get_board_stats failed")
                return f"통계 조회 중 오류가 발생했습니다: {e}"

        return [search_faq, search_posts, get_popular_posts, get_latest_posts, get_board_stats]

    # ── 질문 처리 ─────────────────────────────────────────────────────────────

    async def ask(self, question: str, session_id: str = "") -> str:
        if self._llm_with_tools is None:
            return "챗봇 서비스를 현재 이용할 수 없습니다. OPENAI_API_KEY 설정을 확인해 주세요."
        try:
            from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage

            # 이전 대화 히스토리 로드 (session_id가 있을 때만)
            history = self._sessions.get(session_id, []) if session_id else []

            messages = [
                SystemMessage("당신은 게시판 서비스의 AI 어시스턴트입니다. "
                              "사용자 질문에 맞는 도구를 선택해 답변하세요. "
                              "항상 한국어로 친절하고 간결하게 답변하세요."),
                *history,           # ← 이전 대화 내용 삽입
                HumanMessage(question),
            ]

            for _ in range(3):
                response = await self._llm_with_tools.ainvoke(messages)
                messages.append(response)

                if not response.tool_calls:
                    break

                for tool_call in response.tool_calls:
                    tool = self._tools.get(tool_call["name"])
                    result = (
                        await tool.ainvoke(tool_call["args"])
                        if tool else f"알 수 없는 tool: {tool_call['name']}"
                    )
                    messages.append(ToolMessage(
                        content=str(result),
                        tool_call_id=tool_call["id"],
                    ))

            # 대화 히스토리 저장 (SystemMessage 제외, 최대 20개 메시지 유지)
            if session_id:
                new_history = [m for m in messages if not isinstance(m, SystemMessage)]
                self._sessions[session_id] = new_history[-20:]

            return messages[-1].content
        except Exception:
            logger.exception("Chatbot ask failed")
            return "답변 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."


chatbot_service = ChatbotService()
