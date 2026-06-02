"""
시드 데이터 스크립트
  - 관리자 계정 1개 (admin / Admin1234!)
  - 일반 사용자 100명 (user01 ~ user100, 비밀번호: Test1234!)
  - 각 사용자 게시글 200개 (총 20,000개)
  - 조회수·추천수·카테고리·날짜 다양하게 분산

실행: python seed.py
"""

import asyncio
import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, text

from app.security.password import get_password_hash
from app.database import AsyncSessionLocal
from app.models.category import Category as CategoryModel
from app.models.post import Post
from app.models.user import User, UserRole

# ── 설정 ─────────────────────────────────────────────────────────────────────

PASSWORD = "Test1234!"
USER_COUNT = 100
POSTS_PER_USER = 200
SEED = 42

random.seed(SEED)

# ── 카테고리별 제목 풀 ────────────────────────────────────────────────────────

TITLES: dict[str, list[str]] = {
    "kbo": [
        "LG 트윈스 연속 우승 가능할까",
        "KBO 리그 오늘 경기 하이라이트",
        "이정후 MLB 첫 풀시즌 중간 성적표",
        "삼성 라이온즈 투수진 분석",
        "KBO 유망주 드래프트 리뷰",
        "롯데 자이언츠 팬심 언제 보답받나",
        "SSG 랜더스 우승 반지 재도전",
        "두산 베어스 리빌딩 진행 상황",
        "KBO 역대 최고 타자 순위",
        "한화 이글스 꼴찌 탈출 가능한가",
        "NC 다이노스 외국인 선수 교체 이슈",
        "KBO 올스타전 투표 현황",
        "야구 입문자를 위한 KBO 팀 가이드",
        "KT 위즈 이번 시즌 ERA 분석",
        "KBO 규정 변경사항 총정리 2025",
    ],
    "mlb": [
        "MLB 월드시리즈 우승 후보 분석",
        "오타니 쇼헤이 2025 성적 현황",
        "류현진 복귀 소식 정리",
        "MLB 피칭 클락 도입 이후 변화",
        "메이저리그 한국 선수 총출동 현황",
        "뉴욕 양키스 전력 분석",
        "LA 다저스 올해 우승할까",
        "MLB 드래프트 역대급 유망주들",
        "MLB 연봉 인플레이션 문제점",
        "WBC 2026 한국 대표팀 전망",
        "NPB vs KBO 수준 비교 논쟁",
        "마이너리그 한국인 선수 로스터",
        "홈런 증가 트렌드 공의 비밀",
        "아메리칸리그 vs 내셔널리그 전통",
        "MLB 역대 최고 타자 순위 매겨봤다",
    ],
    "kleague": [
        "K리그 이번 라운드 하이라이트",
        "전북 현대 vs 울산 HD 프리뷰",
        "K리그 순위표 분석 및 우승 전망",
        "수원 삼성 강등 위기 탈출할 수 있을까",
        "포항 스틸러스 ACL 진출 가능성",
        "K리그 외국인 선수 베스트 XI",
        "FC서울 홈경기 직관 후기",
        "K리그 VAR 판정 논란 총정리",
        "이번 시즌 K리그 MVP는 누가 될까",
        "K리그 흥행을 위한 제언",
        "국내 유망주 이번 시즌 주목할 선수",
        "대전 시티즌 시즌 중간 결산",
        "K리그 중계권 문제 심각성",
        "한국 축구 유소년 육성 시스템",
        "김민재 이후 한국 수비수 계보",
    ],
    "intl_soccer": [
        "챔피언스리그 8강 대진표 예상",
        "프리미어리그 이번 주 베스트 골",
        "레알 마드리드 엠바페 한 시즌 평가",
        "분데스리가 바이에른 독주 체제 언제까지",
        "라리가 바르셀로나 재건 프로젝트",
        "EPL 이번 겨울 이적시장 핫딜",
        "이강인 PSG 활약 분석",
        "손흥민 토트넘 마지막 시즌이 될까",
        "월드컵 2026 미국 개최 의미",
        "챔피언스리그 포맷 변경 소감",
        "메시 vs 호날두 레거시 논쟁 2025",
        "세리에A 인테르밀란 우승 가능성",
        "아프리카 축구 스타들의 유럽 점령",
        "UEFA 유로 2025 예선 현황",
        "프랑스 대표팀 새 황금세대 등장",
    ],
    "kbl": [
        "KBL 플레이오프 진출권 경쟁 현황",
        "원주 DB 프로미 우승 전망",
        "KBL 외국인 선수 베스트 픽",
        "서울 SK 나이츠 이번 시즌 핵심 전력",
        "KBL 역대 최고의 한국 선수는",
        "안양 KGC 인삼공사 리빌딩 현황",
        "KBL 흥행 어떻게 올릴까",
        "국내 농구 유망주 TOP 5",
        "KBL 외국인 쿼터 제도 개선 필요",
        "KBL 챔피언십 관전 포인트",
    ],
    "nba": [
        "NBA 파이널 우승 후보 분석",
        "르브론 제임스 은퇴 시기는 언제",
        "스테픈 커리 올 시즌 폼 점검",
        "NBA 드래프트 유망주 순위",
        "골든스테이트 워리어스 세대교체",
        "보스턴 셀틱스 왕조 가능한가",
        "덴버 너기츠 요키치 MVP 재도전",
        "NBA 슈퍼팀 시대 끝났나",
        "올스타위크엔드 베스트 순간들",
        "NBA 한국 선수 진출 가능성",
    ],
    "kovo": [
        "V리그 여자부 순위 경쟁 치열",
        "흥국생명 vs GS칼텍스 라이벌전",
        "V리그 차세대 국가대표 주자",
        "한국 여자배구 세계 랭킹 현황",
        "현대캐피탈 남자부 우승 전망",
        "V리그 외국인 선수 임팩트",
        "배구 입문자를 위한 V리그 가이드",
        "올 시즌 V리그 MVP 후보는",
        "V리그 흥행 비결 분석",
        "배구 국가대표팀 올림픽 준비 현황",
    ],
    "golf": [
        "PGA 투어 이번 대회 우승 예측",
        "임성재 시즌 성적 중간 점검",
        "김주형 세계 랭킹 상승세 분석",
        "KLPGA 고진영 통산 우승 기록",
        "US 오픈 코스 분석",
        "마스터스 최종 라운드 하이라이트",
        "골프 입문자 장비 선택 가이드",
        "한국 골프가 세계 최강인 이유",
        "PGA 한국 선수들 성적 총정리",
        "박성현 복귀 후 현황",
    ],
    "sports_etc": [
        "UFC 다음 대회 주요 매치 분석",
        "2026 아시안게임 한국 금메달 전망",
        "테니스 4대 메이저 시즌 전망",
        "F1 그랑프리 최신 순위",
        "빙상 국가대표 훈련 현황",
        "수영 올림픽 메달 기대주",
        "육상 마라톤 세계 기록 경신",
        "체조 국가대표 신인 등장",
        "e스포츠 올림픽 정식 종목 추진",
        "이종격투기 국내 흥행 가능성",
    ],
    "domestic_stock": [
        "삼성전자 주가 바닥 다졌나 분석",
        "코스피 3000 재탈환 시나리오",
        "국내 반도체주 하반기 전망",
        "현대차·기아 전기차 전환 투자 가치",
        "카카오 주가 회복 언제 오나",
        "네이버 AI 사업 본격화 수혜주는",
        "국내 바이오주 임상 결과 모음",
        "코스닥 중소형주 발굴 방법론",
        "배당주 포트폴리오 구성 방법",
        "PER PBR ROE 쉽게 이해하기",
        "개인투자자 공매도 재개 대응 전략",
        "국내 리츠 투자 입문 가이드",
        "환율과 국내 주식의 상관관계",
        "2025년 국내 주식 세금 변화 정리",
        "KODEX 레버리지 ETF 투자 주의사항",
    ],
    "us_stock": [
        "엔비디아 AI 랠리 지속 가능성 분석",
        "S&P500 고점 경신 이후 전략",
        "미국 금리 인하 시나리오별 투자법",
        "테슬라 주가 변동성 대응 방법",
        "애플 신제품 사이클과 주가 관계",
        "마이크로소프트 클라우드 성장 지속성",
        "구글 반독점 이슈 투자에 미치는 영향",
        "아마존 물류 혁신과 주가 전망",
        "나스닥 지수 ETF 장기투자 방법",
        "버크셔 해서웨이 포트폴리오 따라하기",
        "미국 리세션 우려 현재 상황 점검",
        "IPO 투자 시 주의사항과 체크리스트",
        "메타 메타버스 실패 이후 재평가",
        "미국 빅테크 vs 중국 빅테크 비교",
        "달러 강세 시 유리한 미국 ETF",
    ],
    "crypto": [
        "비트코인 반감기 이후 가격 시나리오",
        "이더리움 2.0 업그레이드 결과 평가",
        "알트코인 시즌 오는가 - 신호 분석",
        "솔라나 vs 이더리움 생태계 비교",
        "비트코인 ETF 승인 이후 기관자금 유입",
        "크립토 세금 신고 방법 총정리",
        "DeFi 프로토콜 이자농사 현황",
        "한국 코인 규제 현황과 향후 전망",
        "밈코인 투자 합리적인가 현실적 분석",
        "코인 포트폴리오 분산 투자 전략",
        "USDT vs USDC 스테이블코인 비교",
        "Layer2 솔루션 현황 ARB OP MATIC",
        "코인 고래 지갑 추적으로 보는 시장",
        "NFT 시장 부활 가능성 있나",
        "코인 거래소 해킹 사고 역사 정리",
    ],
    "realestate": [
        "서울 아파트 가격 하반기 전망",
        "금리 인하와 부동산 시장 관계",
        "갭투자 지금도 유효한가",
        "재개발·재건축 투자 체크리스트",
        "경기도 신도시 아파트 투자 분석",
        "오피스텔 수익률 현실적 계산",
        "부동산 세금 총정리 2025",
        "임장 처음 가는 분들을 위한 가이드",
        "전세 vs 월세 무엇이 유리한가",
        "지방 부동산 저평가 지역 분석",
    ],
    "kpop": [
        "BLACKPINK 컴백 소식 총정리",
        "BTS 군입대 이후 활동 전망",
        "NewJeans 음악적 색깔 분석",
        "아이브 vs 르세라핌 1위 경쟁",
        "K-POP 4세대 아이돌 현황",
        "SM JYP YG HYBE 기획사 비교",
        "K-POP 음방 점수 산정 방식",
        "솔로 데뷔 성공한 아이돌 분석",
        "K-POP 해외 팬덤 규모 현황",
        "올해 최고의 K-POP 앨범은",
    ],
    "drama": [
        "이번 분기 드라마 순위 정리",
        "넷플릭스 한국 드라마 추천 리스트",
        "최근 본 드라마 솔직 후기",
        "역대 최고의 한국 드라마 TOP10",
        "KBS MBC SBS 드라마 비교",
        "한국 드라마 해외 반응 정리",
        "이번 주 드라마 결말 예측",
        "연기 잘하는 배우 TOP 5",
        "드라마 OST 명곡 모음",
        "웹드라마 vs 공중파 퀄리티 차이",
    ],
    "movie": [
        "이번 주 개봉작 추천",
        "한국 영화 역대 흥행 순위",
        "마블 새 시즌 예고편 분석",
        "칸 영화제 수상작 리뷰",
        "OTT 신작 영화 추천",
        "한국 감독들의 할리우드 진출 현황",
        "2025 아카데미 수상 예측",
        "공포 영화 추천 리스트",
        "독립영화 숨은 명작 추천",
        "애니메이션 어른도 봐도 되는 작품들",
    ],
    "entertainment": [
        "런닝맨 최신 에피소드 하이라이트",
        "나 혼자 산다 이번 주 게스트",
        "유퀴즈 온더블록 인상 깊은 편",
        "2025 연예대상 수상 예측",
        "요즘 핫한 유튜브 채널 추천",
        "1박2일 vs 무한도전 레전드 비교",
        "요즘 뜨는 예능인 신인 분석",
        "지상파 예능 위기론 현실인가",
        "신서유기 다음 시즌 나올까",
        "예능 PD가 만드는 OTT 예능 현황",
    ],
    "webtoon": [
        "이번 주 네이버웹툰 추천",
        "카카오페이지 완결 웹툰 추천",
        "웹소설에서 웹툰으로 성공한 작품",
        "현재 연재 중 웹툰 순위",
        "웹툰 원작 드라마 비교",
        "판타지 웹툰 추천 리스트",
        "로맨스 웹툰 명작 모음",
        "해외에서 인기 많은 한국 웹툰",
        "무료로 볼 수 있는 웹툰 플랫폼",
        "올해 완결 예정 웹툰 목록",
    ],
    "lol": [
        "T1 롤드컵 우승 가능한가",
        "LCK 서머 시즌 순위 분석",
        "페이커 현 시즌 폼 점검",
        "롤 패치 14.x 변경사항 정리",
        "원딜 메타 변화 분석",
        "솔랭 골드 탈출 전략",
        "프로씬 최근 트렌드 분석",
        "LCK vs LPL 수준 비교",
        "리그오브레전드 입문 가이드",
        "KDA 높은 챔피언 픽 추천",
    ],
    "fc_online": [
        "FC온라인 최강 팀 구성법",
        "이번 달 강화 이벤트 정리",
        "FC온라인 실버볼 꿀팁",
        "최근 패치 변경사항 총정리",
        "FC온라인 포메이션 추천",
        "슈퍼스타 선수 카드 가성비 분석",
        "FC온라인 챔피언십 대회 후기",
        "구단주 레벨업 효율적 방법",
        "FC온라인 거래소 시세 분석",
        "FC온라인 vs FIFA 비교",
    ],
    "maplestory": [
        "메이플스토리 보스 공략 총정리",
        "신규 직업 출시 분석",
        "메이플 이벤트 효율 정리",
        "스타포스 최적 단계 계산",
        "메이플 메소 벌기 꿀팁",
        "보스 주간 숙제 루틴 공유",
        "메이플 복귀자 가이드",
        "유니온 효율적 배치 방법",
        "메이플 신규 캐릭터 육성기",
        "메이플 vs 로스트아크 비교",
    ],
    "smartphone": [
        "아이폰 17 출시 소식 총정리",
        "갤럭시 S25 울트라 한달 사용기",
        "최신 스마트폰 카메라 비교",
        "저가폰 가성비 추천 2025",
        "아이폰 vs 갤럭시 배터리 비교",
        "폴더블폰 실사용 후기",
        "스마트폰 액정 수리 비용 정리",
        "중고폰 구매 체크리스트",
        "최신 스마트폰 벤치마크 결과",
        "통신사 요금제 비교 분석",
    ],
    "laptop": [
        "맥북 프로 M4 성능 리뷰",
        "삼성 갤럭시북 vs LG 그램 비교",
        "게이밍 노트북 가성비 추천",
        "대학생 노트북 추천 2025",
        "노트북 SSD 업그레이드 가이드",
        "윈도우 vs 맥 생산성 비교",
        "씽크패드 업무용 최강 노트북",
        "노트북 발열 해결 방법",
        "15인치 vs 16인치 무엇이 좋나",
        "OLED 노트북 장단점 분석",
    ],
    "food": [
        "서울 숨은 맛집 탐방기",
        "이번 주 다녀온 카페 리뷰",
        "가성비 맛집 TOP10",
        "인스타 감성 카페 추천",
        "혼밥하기 좋은 식당 추천",
        "자취생을 위한 간단 레시피",
        "부산 여행 필수 맛집",
        "오마카세 처음 가는 분 가이드",
        "배달 음식 추천 조합",
        "주말 브런치 카페 추천",
    ],
    "travel": [
        "일본 여행 최신 코스 추천",
        "유럽 한달살기 현실 후기",
        "동남아 배낭여행 예산 정리",
        "제주도 숨은 명소 소개",
        "미국 여행 처음 가는 분 가이드",
        "국내 당일치기 여행지 추천",
        "해외여행 항공권 싸게 사는 법",
        "여행 짐싸기 체크리스트",
        "비수기 여행지 추천",
        "혼여행 안전하게 즐기는 법",
    ],
    "fashion": [
        "이번 시즌 트렌드 아이템",
        "남자 기본 코디 추천",
        "스킨케어 루틴 공유",
        "가성비 브랜드 추천",
        "계절별 레이어링 방법",
        "올해 유행하는 헤어스타일",
        "다이소 뷰티 숨은 명품 추천",
        "옷 잘 입는 사람들의 공통점",
        "향수 처음 구매하는 분들께",
        "패션 유튜버 추천 리스트",
    ],
    "health": [
        "헬스 초보 3대 운동 루틴",
        "다이어트 식단 현실적 정리",
        "홈트레이닝 추천 동작",
        "단백질 보충제 추천 비교",
        "러닝 입문자 가이드",
        "필라테스 vs 요가 무엇이 좋나",
        "자취생 건강 식단 만들기",
        "체중 감량 성공 후기 공유",
        "수면의 질 높이는 방법",
        "직장인 점심시간 운동 방법",
    ],
    "car": [
        "전기차 실사용 1년 후기",
        "현대 아이오닉 6 장기 리뷰",
        "자동차 구매 완전 가이드",
        "중고차 시세 분석 2025",
        "국산차 vs 수입차 가성비 비교",
        "블랙박스 추천 순위",
        "자동차 보험 싸게 가입하는 법",
        "전기차 충전 인프라 현황",
        "SUV vs 세단 무엇이 나에게 맞나",
        "자동차 정기점검 체크리스트",
    ],
    "domestic_news": [
        "최근 국내 화제 이슈 정리",
        "이번 주 국내 뉴스 하이라이트",
        "사회 현안 찬반 토론",
        "국내 경제 지표 분석",
        "국내 복지 정책 변화 정리",
        "최근 논란 사건 팩트체크",
        "국내 부동산 정책 변화",
        "MZ세대 트렌드 분석",
        "국내 취업 시장 현황",
        "국내 출생률 저하 대책 논쟁",
    ],
    "intl_news": [
        "미국 대선 이후 세계 정세",
        "중동 분쟁 현황 정리",
        "이번 주 해외 주요 뉴스",
        "중국 경제 침체 얼마나 심각한가",
        "우크라이나 전쟁 현황 업데이트",
        "일본 경제 회복세 분석",
        "AI 기술 전쟁 미중 갈등",
        "유럽 에너지 위기 현황",
        "글로벌 인플레이션 어디까지",
        "BRICS 확대 의미 분석",
    ],
    "politics": [
        "이번 선거 쟁점 정리",
        "정치 뉴스 팩트체크",
        "국회 법안 통과 현황",
        "여야 갈등 이번 주 이슈",
        "정부 경제 정책 평가",
        "지방자치 현안 분석",
        "정치인 발언 논란 정리",
        "국민 여론조사 결과 분석",
        "민주주의 지수 한국 현황",
        "정치 입문자를 위한 기초 지식",
    ],
    "economy_news": [
        "이번 주 경제 뉴스 정리",
        "금리 인상 종료 신호 분석",
        "물가 상승률 최신 현황",
        "고용 지표 해석 방법",
        "한국 GDP 성장률 전망",
        "달러 환율 전망 분석",
        "글로벌 공급망 위기 현황",
        "중앙은행 통화 정책 변화",
        "경기침체 우려 얼마나 현실적",
        "소비자 심리지수 분석",
    ],
    "free": [
        "오늘 하루 어떻게 보내셨나요",
        "추천 받고 싶은 게 있어요",
        "요즘 제일 재밌는 취미",
        "주말에 뭐하세요",
        "오늘의 TMI 공유",
        "살면서 가장 잘한 선택",
        "요즘 행복한 이유",
        "같이 공부하는 분 있나요",
        "이거 여기에 물어봐도 되나요",
        "요즘 가장 궁금한 것",
    ],
}

# slug별 가중치 (높을수록 해당 카테고리 게시글 많이 생성)
WEIGHTS: dict[str, int] = {
    "kbo": 5, "mlb": 4, "kleague": 4, "intl_soccer": 5,
    "kbl": 3, "nba": 4, "kovo": 2, "golf": 2, "sports_etc": 2,
    "domestic_stock": 5, "us_stock": 5, "crypto": 4, "realestate": 3,
    "kpop": 4, "drama": 4, "movie": 3, "entertainment": 3, "webtoon": 3,
    "lol": 4, "fc_online": 3, "maplestory": 3,
    "smartphone": 3, "laptop": 3,
    "food": 3, "travel": 3, "fashion": 2, "health": 3, "car": 3,
    "domestic_news": 3, "intl_news": 2, "politics": 2, "economy_news": 3,
    "free": 3,
}

CONTENT_TEMPLATES = [
    "{title}에 대해 분석해봤습니다.\n\n최근 동향을 살펴보면 여러 가지 흥미로운 점이 눈에 띕니다. 특히 이번 시즌/분기에는 예상치 못한 변수들이 많이 등장했는데요.\n\n전문가들의 의견도 엇갈리고 있지만, 데이터를 기반으로 냉정하게 분석해보면 답이 보이는 것 같습니다.\n\n여러분의 생각은 어떤가요? 댓글로 의견 나눠봐요.",
    "오늘 {title} 관련 소식을 정리해드립니다.\n\n핵심 내용:\n1. 최근 변화된 상황 정리\n2. 주요 플레이어/종목 동향\n3. 앞으로의 전망\n\n개인적으로는 긍정적으로 보고 있습니다만, 항상 리스크 관리는 필수입니다.",
    "직접 경험하고 느낀 {title} 후기입니다.\n\n솔직히 처음에는 반신반의했는데, 실제로 접해보니 생각보다 훨씬 흥미로웠습니다.\n\n특히 인상 깊었던 부분은 세부적인 디테일이었어요. 디테일이 전체 퀄리티를 좌우한다는 걸 다시 한번 느꼈습니다.\n\n관심 있으신 분들께 추천드립니다.",
    "{title}에 대한 커뮤니티 반응이 뜨겁네요.\n\n찬성 측 주요 논점:\n- 합리적인 근거 제시\n- 데이터 기반 분석\n- 장기적 관점\n\n반대 측 주요 논점:\n- 단기 리스크\n- 불확실성\n- 대안 제시\n\n개인적으로는 양쪽 다 일리가 있다고 봅니다.",
    "정말 {title} 때문에 요즘 잠을 못 자고 있습니다 ㅋㅋ\n\n농담이고요, 진지하게 정리해봤습니다.\n\n결론부터 말씀드리면: 단기보다 장기로 보는 게 맞는 것 같아요.\n\n세부 내용은 본문에서 계속...\n\n끝까지 읽어주셔서 감사합니다. 유용한 정보였으면 합니다!",
]


# ── 유틸리티 함수 ──────────────────────────────────────────────────────────────

def random_created_at() -> datetime:
    """최근 6개월 내 랜덤 datetime 반환"""
    days_ago = random.randint(0, 180)
    hours_ago = random.randint(0, 23)
    minutes_ago = random.randint(0, 59)
    return datetime.now(timezone.utc) - timedelta(
        days=days_ago, hours=hours_ago, minutes=minutes_ago
    )


def random_view_count() -> int:
    r = random.random()
    if r < 0.60:
        return random.randint(0, 200)
    elif r < 0.85:
        return random.randint(200, 2_000)
    elif r < 0.95:
        return random.randint(2_000, 10_000)
    else:
        return random.randint(10_000, 50_000)


def random_votes() -> tuple[int, int]:
    r = random.random()
    if r < 0.25:
        up = random.randint(30, 300)
        down = random.randint(0, max(1, up // 10))
    elif r < 0.55:
        up = random.randint(5, 50)
        down = random.randint(0, up // 3)
    elif r < 0.85:
        up = random.randint(0, 15)
        down = random.randint(0, 5)
    else:
        up = random.randint(0, 20)
        down = random.randint(5, 40)
    return up, down


def make_title(slug: str, post_num: int) -> str:
    base = random.choice(TITLES[slug])
    if random.random() < 0.3:
        return f"{base} ({post_num})"
    return base


def make_content(title: str) -> str:
    template = random.choice(CONTENT_TEMPLATES)
    return template.format(title=title)


# ── 메인 시드 함수 ─────────────────────────────────────────────────────────────

async def seed() -> None:
    async with AsyncSessionLocal() as db:
        # 기존 데이터 초기화
        print("🗑️  기존 데이터 초기화 중...")
        await db.execute(text(
            "TRUNCATE TABLE attendances, bookmarks, blacklists, reports, "
            "post_votes, comment_votes, point_transactions, files, comments, posts, users, category_moderators, moderator_bans, messages, notifications "
            "RESTART IDENTITY CASCADE"
        ))
        await db.commit()
        print("✅ 초기화 완료")

        # DB에서 카테고리 로드
        cat_result = await db.execute(
            select(CategoryModel).order_by(CategoryModel.sort_order)
        )
        categories: list[CategoryModel] = list(cat_result.scalars().all())
        if not categories:
            print("❌ categories 테이블이 비어 있습니다. 마이그레이션을 먼저 실행하세요.")
            return

        cat_by_slug = {c.slug: c for c in categories}
        slug_list = [s for s in cat_by_slug.keys() if s in TITLES]
        weights = [WEIGHTS.get(s, 3) for s in slug_list]

        # admin 계정 생성
        print("👤 admin 계정 생성 중...")
        admin_pw = get_password_hash("Admin1234!")
        admin = User(
            username="admin",
            email="admin@modak.dev",
            hashed_password=admin_pw,
            is_active=True,
            role=UserRole.ADMIN,
            points=0,
        )
        db.add(admin)
        await db.commit()
        print("   아이디: admin / 비밀번호: Admin1234!")

        # 기존 유저 로드 (user01~user100)
        existing_users_result = await db.execute(
            select(User)
            .where(User.username.like("user%"))
            .order_by(User.username)
        )
        existing_users = {u.username: u for u in existing_users_result.scalars().all()}

        print("👤 사용자 생성/로드 중...")
        hashed_pw = get_password_hash(PASSWORD)
        users: list[User] = []

        new_users: list[User] = []
        for i in range(1, USER_COUNT + 1):
            username = f"user{i:02d}"
            if username in existing_users:
                users.append(existing_users[username])
            else:
                user = User(
                    username=username,
                    email=f"{username}@board.dev",
                    hashed_password=hashed_pw,
                    is_active=True,
                    points=random.randint(0, 10_000),
                )
                db.add(user)
                new_users.append(user)
                users.append(user)

        if new_users:
            await db.commit()
            for user in new_users:
                await db.refresh(user)
            print(f"✅ 신규 사용자 {len(new_users)}명 생성")
        else:
            print(f"✅ 기존 사용자 {len(users)}명 로드")
        print(f"   아이디: user01 ~ user{USER_COUNT:02d} / 비밀번호: {PASSWORD}")

        print(f"\n📝 게시글 {USER_COUNT * POSTS_PER_USER:,}개 생성 중...")

        total = 0
        for user_idx, user in enumerate(users, 1):
            posts: list[Post] = []
            for j in range(1, POSTS_PER_USER + 1):
                slug = random.choices(slug_list, weights=weights, k=1)[0]
                category_obj = cat_by_slug[slug]
                title = make_title(slug, j)
                content = make_content(title)
                up_votes, down_votes = random_votes()
                created_at = random_created_at()

                post = Post(
                    title=title,
                    content=content,
                    user_id=user.id,
                    category_id=category_obj.id,
                    view_count=random_view_count(),
                    up_votes=up_votes,
                    down_votes=down_votes,
                    created_at=created_at,
                    updated_at=created_at,
                )
                posts.append(post)
                db.add(post)

            await db.commit()
            total += len(posts)
            print(f"   user{user_idx:02d}: {len(posts)}개 완료 (누적 {total:,}개)")

        print(f"\n✅ 완료! 총 {total:,}개 게시글 생성")

        # 통계 출력
        result = await db.execute(text("""
            SELECT
                c.name,
                COUNT(p.id) AS cnt,
                ROUND(AVG(p.view_count)) AS avg_view,
                ROUND(AVG(p.up_votes - p.down_votes), 1) AS avg_net_votes,
                SUM(CASE WHEN p.up_votes - p.down_votes >= 30 THEN 1 ELSE 0 END) AS hot_count
            FROM posts p
            LEFT JOIN categories c ON p.category_id = c.id
            GROUP BY c.name
            ORDER BY cnt DESC
        """))
        rows = result.fetchall()

        print("\n📊 카테고리별 통계")
        print(f"{'카테고리':<15} {'게시글':>6} {'평균조회수':>10} {'평균순추천':>10} {'인기글':>6}")
        print("-" * 55)
        for row in rows:
            print(f"{str(row[0] or '미분류'):<15} {row[1]:>6,} {row[2]:>10,} {row[3]:>10} {row[4]:>6,}")

        result = await db.execute(text(
            "SELECT COUNT(*) FROM posts WHERE up_votes - down_votes >= 30"
        ))
        hot_total = result.scalar_one()
        print(f"\n🔥 인기글 (추천 순 30+): {hot_total:,}개 / 전체 {total:,}개 ({hot_total/total*100:.1f}%)")


if __name__ == "__main__":
    asyncio.run(seed())
