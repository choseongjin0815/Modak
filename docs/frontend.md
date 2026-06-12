# 프론트엔드

`frontend/src/` — Next.js 14 (App Router), TypeScript, TanStack Query v5, Tailwind CSS.

## 핵심 모듈

- **`lib/api.ts`** — axios 인스턴스. 요청 인터셉터(Bearer 토큰), 응답 인터셉터(401 → `/login` 리다이렉트, 단 `/auth/` 경로 제외).
- **`lib/auth.ts`** — localStorage(`board_access_token`) 토큰 관리. `setToken()`·`removeToken()` 호출 시 `auth-change` 커스텀 이벤트 dispatch → Navbar·NotificationBell이 즉시 상태 갱신.
- **`lib/queryClient.ts`** — `queryKeys` 상수 중앙 관리. staleTime 1분, gcTime 5분.
- **`hooks/useCategories.ts`** — `useSortedCategoryGroups()`: `/categories/group-stats` API로 그룹별 게시글 수를 받아 기타 → 게시글 수 적은 순 정렬 반환 (Navbar 반응형 숨김 순서 결정).

## 주요 컴포넌트

- **`components/ui/AuthorBadge.tsx`** — role="ADMIN"이면 빨간 "관리자", isMod=true이면 초록 "운영자" 뱃지.
- **`components/ui/BanModal.tsx`** — 운영자 차단 모달. 기간 선택(1h/6h/24h/7d/30d/영구) 후 `moderationApi.ban()` 호출.
- **`components/ui/MessageModal.tsx`** — 쪽지 작성 모달. `defaultReceiver`로 수신자 사전 설정 가능.
- **`components/layout/Navbar.tsx`** — 카테고리 드롭다운. click-outside(`useRef` + `mousedown`)로 닫힘.
- **`components/layout/NotificationBell.tsx`** — SSE 연결(`EventSource`), 실시간 알림 수신. `auth-change` 이벤트 감지해 재연결/해제. 드롭다운에서 읽음 처리·이동. 재연결 `setTimeout`은 `reconnectRef`로 추적해 언마운트 시 취소.

## 라우트

```
/posts                → 목록 (검색·정렬·페이지네이션)
/posts/new            → 작성 (multipart/form-data)
/posts/[id]           → 상세 + 댓글 + 대댓글
/posts/[id]/edit      → 수정
/login, /register
/me                   → 마이페이지 (프로필·내 게시글·차단목록·운영 게시판)
/messages             → 쪽지함 (받은쪽지·보낸쪽지)
/notifications        → 전체 알림 목록
/admin/users          → 관리자 회원 관리
/admin/posts          → 관리자 게시글 관리
/admin/reports        → 관리자 신고 관리
/admin/moderators     → 관리자 운영자 지정·해제
```

## 주의사항 (버그 예방)

- **SSR:** `isAuthenticated()` 등 localStorage 접근은 반드시 `useEffect` + `mounted` 상태 확인 후 호출.
- **Navbar 드롭다운:** `onBlur` 방식 사용 금지 (열림 직후 닫히는 버그). click-outside 패턴 사용.
- **Navbar 반응형 breakpoint:** `NAV_BREAKPOINTS`의 클래스 문자열(`hidden min-[Xpx]:block`)은 Tailwind JIT 감지를 위해 반드시 소스 내 **정적 문자열**로 선언. 동적 조합 금지.
- **파일 다운로드 링크:** `posts/[id]/page.tsx`에서 `${NEXT_PUBLIC_API_URL}/files/${file.id}` 직접 생성. 헬퍼 함수를 새로 만들지 말 것 (과거 `filesApi.getFileUrl()`이 잘못된 경로를 반환해 제거됨).
- **카테고리:** DB 기반 동적. 프론트에서 slug 하드코딩 금지. `useSortedCategoryGroups()` 또는 `useCategoryGroups()` 훅 사용.

## CSS

`globals.css`에 커스텀 Tailwind 클래스 — `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.input-field`, `.card`, `.error-message`.
