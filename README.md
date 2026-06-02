# 모닥 🔥

관심사로 모이는 종합 커뮤니티 플랫폼.

## 기술 스택

| 영역 | 기술 |
|------|------|
| Backend | Python 3.13, FastAPI, SQLAlchemy 2.0 (async), PostgreSQL, Alembic |
| Frontend | Next.js 14 (App Router), TypeScript, TanStack Query v5, Tailwind CSS |
| AI | LangChain, ChromaDB, OpenAI GPT-4o-mini |
| 실시간 | SSE (Server-Sent Events) |
| 모니터링 | LangSmith |

## 주요 기능

**게시판**
- 게시글 작성·수정·삭제, 파일 첨부, 카테고리 분류
- 검색·정렬(최신·조회수·추천순)·페이지네이션
- 댓글·대댓글(1단계), 추천/비추천
- 순추천 100+ 시 HOT 게시글 표시
- 북마크, 신고, 유저 차단

**소통**
- 쪽지 — 유저 간 1:1 메시지, 받은쪽지·보낸쪽지함
- 실시간 알림 — SSE 기반. 댓글·답글·쪽지 수신 즉시 Navbar 벨 표시

**포인트 & 활동**
- 게시글 작성·댓글·추천 수신·출석체크 시 포인트 적립
- 누적 포인트 기반 레벨 배지

**운영·관리**
- 로그인 5회 실패 시 1일 계정 잠금
- 카테고리별 운영자 지정 — 담당 게시판 글·댓글 삭제, 유저 기간 차단(1h~영구)
- 관리자 — 회원·게시글·신고 관리, 운영자 지정·해제

**기타**
- FAQ + DB 연동 AI 챗봇 (인기글·최신글·통계 검색)
- 오늘/총 방문자 수 하단 표시 (계정 단위 집계, 10분 체류마다 카운트)

## 카테고리

총 33개, 7개 대분류 + 자유게시판.

| 대분류 | 카테고리 |
|--------|---------|
| 스포츠 | KBO 야구, MLB 야구, K리그, 해외축구, KBL 농구, NBA 농구, V리그 배구, 골프, 기타스포츠 |
| 투자·경제 | 국내주식, 미국주식, 코인, 부동산 |
| 연예·문화 | K-POP, 드라마, 영화, 예능, 웹툰·소설 |
| 게임 | 리그오브레전드, FC온라인, 메이플스토리 |
| IT·테크 | 스마트폰, 노트북 |
| 라이프 | 맛집·카페, 여행, 패션·뷰티, 헬스·다이어트, 자동차 |
| 시사·뉴스 | 국내이슈, 해외이슈, 정치·사회, 경제뉴스 |
| — | 자유게시판 |

## 시작하기

### 사전 요구사항

- Python 3.13+
- Node.js 18+
- PostgreSQL

### Backend

```powershell
cd backend

# 가상환경 생성 및 활성화
python -m venv venv
.\venv\Scripts\Activate.ps1

# 패키지 설치
pip install -r requirements.txt

# 환경변수 설정
cp .env.example .env

# DB 마이그레이션
alembic upgrade head

# 시드 데이터 삽입 (admin + user01~user100 + 게시글 20,000개)
$env:PYTHONIOENCODING="utf-8"; python seed.py

# 서버 실행
uvicorn app.main:app --reload --port 8000
```

API 문서: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

서비스: http://localhost:3000

### 환경변수 (`.env`)

```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/dbname
SECRET_KEY=your-secret-key-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=3600
UPLOAD_DIR=uploads

# 챗봇 (선택 — 없으면 챗봇만 비활성화, 서버는 정상 기동)
OPENAI_API_KEY=sk-...

# LangSmith 모니터링 (선택)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=lsv2_...
LANGCHAIN_PROJECT=modak
```

## 테스트 계정

시드 데이터 실행 후 사용 가능.

| 계정 | 비밀번호 | 권한 |
|------|---------|------|
| `admin` | `Admin1234!` | 관리자 |
| `user01` ~ `user100` | `Test1234!` | 일반 |
