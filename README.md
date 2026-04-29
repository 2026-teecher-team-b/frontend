# 🌌 GitHub Universe — 오픈소스 생태계 Wormhole 시각화

GitHub의 오픈소스 저장소 1000개를 **우주 웜홀(깔때기) 형태**로 시각화하는 인터랙티브 3D 웹 애플리케이션입니다.

활성도가 높은 저장소는 깔때기 위쪽 넓은 면에 떠 있고, 활성도가 낮은 저장소는 점점 아래 좁은 목으로 빨려들어 갑니다.  
별을 클릭하면 24시간 점수 차트, AI 분석, 즐겨찾기 기능이 담긴 사이드 패널이 열립니다.

---

## ✨ 주요 기능

| 기능 | 설명 |
|------|------|
| **3D 웜홀 시각화** | 저장소 하나 = 별 하나. 활성도 → Y 위치(높이), 건강도 → 밝기로 매핑 |
| **깔때기 물리** | 활성도 변화에 따라 별이 실시간으로 위아래 이동. O(n) 성능 (1000개 가능) |
| **별 반짝임** | 활성도 높을수록 빠르고 밝게, 낮을수록 느리고 어둡게 맥동 |
| **별 연결선** | 같은 언어 근접 별 사이 투명 선 연결 (뭉칠수록 선이 빛남) |
| **블랙홀** | 건강도 < 10 → 검은 별 + 빠른 나선 회전 + 강착원반 파티클 |
| **실시간 갱신** | WebSocket(STOMP)으로 점수 수신 → 별이 실시간으로 이동 |
| **360° 카메라** | 구면 좌표계 기반 오비탈 카메라. 좌클릭·우클릭·스크롤·터치 지원 |
| **별 클릭** | 사이드 패널 오픈 (카메라 중심은 항상 원점 유지) |
| **저장소 상세 패널** | 24시간 점수 스파크라인, AI RAG 분석, 즐겨찾기 |
| **GitHub OAuth** | 백엔드 OAuth2 연동 (9~10주차 예정) |

---

## 🛠 기술 스택

### 코어

| 라이브러리 | 버전 | 역할 |
|-----------|------|------|
| **React** | 18.3 | UI 컴포넌트 |
| **TypeScript** | 5.5 | 정적 타입 |
| **Vite** | 5.4 | 빌드 도구 |

### 3D 렌더링

| 라이브러리 | 버전 | 역할 |
|-----------|------|------|
| **Three.js** | 0.166 | WebGL 3D 엔진 |
| **@react-three/fiber** | 8.17 | React에서 Three.js를 선언적으로 사용 |
| **@react-three/drei** | 9.109 | Stars, Sparkles 등 유틸 컴포넌트 |

### 상태 관리

| 라이브러리 | 버전 | 역할 |
|-----------|------|------|
| **Zustand** | 4.5 | 전역 상태 (저장소 목록, 점수, UI) |

> `physicsStore`는 Zustand가 아닌 **모듈 레벨 클래스 싱글톤**입니다.  
> Three.js Object3D에 위치를 직접 바꿔야 하므로 React 리렌더를 완전히 배제합니다.

### 서버 통신

| 라이브러리 | 버전 | 역할 |
|-----------|------|------|
| **Axios** | 1.7 | REST API 클라이언트 |
| **@tanstack/react-query** | 5.51 | 서버 상태 캐싱 |
| **@stomp/stompjs** | 7.0 | WebSocket STOMP (실시간 점수) |

### 스타일링

| 라이브러리 | 버전 | 역할 |
|-----------|------|------|
| **Tailwind CSS** | 3.4 | 유틸리티 CSS |

---

## 🌀 웜홀 수학 (핵심 개념)

별의 Y좌표(높이)는 다음 공식으로 계산됩니다:

```
y = THROAT_Y + (RIM_Y - THROAT_Y) × (activityScore / 100)

  THROAT_Y = -160  (깔때기 목, 블랙홀 구역)
  RIM_Y    =  120  (깔때기 입구, 트렌딩 구역)
```

해당 Y에서의 깔때기 반지름:

```
r(y) = THROAT_R + (RIM_R - THROAT_R) × t^EXPONENT
  t = (y - THROAT_Y) / (RIM_Y - THROAT_Y)   (0 ~ 1)
  EXPONENT = 0.52  → 목은 좁고 입구는 급격히 넓어지는 형태
```

별은 이 깔때기 표면 위에서 수평으로 회전하며, 점수가 바뀌면 lerp로 부드럽게 위아래로 이동합니다.

---

## 🏗 아키텍처

```
WebSocket (STOMP)         REST API
      │                      │
      ▼                      ▼
useGalaxyStore         React Query
(Zustand)             (캐시·동기화)
      │                      │
      └──────────┬───────────┘
                 ▼
           React 컴포넌트
                 │
        ┌────────┴────────┐
        ▼                 ▼
   2D UI Layer        3D Canvas Layer
  (오버레이/패널)      (R3F + Three.js)
                           │
                     physicsStore
                     (모듈 싱글톤)
                           │
                     usePhysics
                  (깔때기 물리 — O(n))
                           │
                   Object3D.position
                  (React 외부 직접 변경)
```

### 핵심 설계: "3D 레이어는 React를 우회한다"

1000개 별이 매 프레임 위치를 바꿔야 합니다.  
Zustand setState를 쓰면 매 프레임 1000번 리렌더가 발생해 프레임 드랍이 생깁니다.  
그래서 `physicsStore`(싱글톤)가 `THREE.Vector3` 위치를 직접 수정하고,  
`usePhysics`가 `useFrame` 안에서 `object.position.copy()`로 Three.js 오브젝트에만 적용합니다.  
React는 전혀 개입하지 않습니다.

---

## 📁 디렉토리 구조

```
frontend/
├── public/
│   └── favicon.svg                   # 별 모양 파비콘
│
├── src/
│   ├── api/
│   │   ├── axios.ts                  # Axios 인스턴스 (baseURL, 인터셉터)
│   │   ├── websocket.ts              # STOMP WebSocket 연결/구독
│   │   └── mockWebSocket.ts          # DEV용 목 WebSocket
│   │
│   ├── canvas/                       # ── 3D 레이어 ──────────────
│   │   ├── Scene.tsx                 # Canvas 래퍼 + GalaxyScene 조립
│   │   ├── controls/
│   │   │   └── SpaceControls.tsx     # 360° 구면 좌표 오비탈 카메라
│   │   ├── effects/
│   │   │   ├── BlackHoleSpiral.tsx   # 블랙홀 강착원반 파티클
│   │   │   ├── FrameMonitor.tsx      # FPS 모니터 (DEV only)
│   │   │   └── MeteorEffect.tsx      # 유성 이펙트
│   │   └── objects/
│   │       ├── Star.tsx              # 저장소 별 (★ 형상 + 반짝임)
│   │       ├── WormholeFunnel.tsx    # 깔때기 격자 + 빛 고리  ★NEW
│   │       └── StarConnections.tsx   # 별 사이 연결선           ★NEW
│   │
│   ├── components/                   # ── 2D UI 레이어 ───────────
│   │   ├── common/
│   │   │   └── LoadingSpinner.tsx
│   │   ├── overlay/
│   │   │   ├── Tooltip.tsx           # 별 hover 미리보기
│   │   │   ├── Legend.tsx            # 언어 색상 범례
│   │   │   ├── HelpOverlay.tsx       # 카메라 조작 가이드
│   │   │   └── LoginButton.tsx       # GitHub OAuth 버튼
│   │   └── panel/
│   │       ├── SidePanel.tsx         # 우측 상세 패널 (리사이즈 가능)
│   │       ├── ScoreChart.tsx        # 24시간 점수 스파크라인
│   │       └── RAGAnalysis.tsx       # AI 분석
│   │
│   ├── data/
│   │   └── dummy.ts                  # DEV용 더미 데이터 1000개
│   │
│   ├── hooks/
│   │   ├── 3d/
│   │   │   ├── usePhysics.ts         # 깔때기 물리 루프 (O(n))
│   │   │   └── useLerp.ts            # Lerp 유틸 훅
│   │   └── queries/
│   │       ├── useRepoDetail.ts
│   │       ├── useScoreHistory.ts
│   │       └── useRagAnalysis.ts
│   │
│   ├── store/
│   │   ├── useGalaxyStore.ts         # 저장소 목록·점수·WebSocket 상태
│   │   ├── useUIStore.ts             # 선택·hover·패널·즐겨찾기
│   │   └── physicsStore.ts           # 물리 싱글톤 (theta, currentY 포함)
│   │
│   ├── types/
│   │   ├── github.ts                 # Repository, RepoScore, UserInfo
│   │   ├── store.ts                  # GalaxyStore, UIStore 인터페이스
│   │   └── canvas.ts                 # StarProps 등
│   │
│   ├── utils/
│   │   ├── physics.ts                # 깔때기 수학 + 레거시 N-body 상수
│   │   └── format.ts                 # 숫자 포맷, 날짜 경과
│   │
│   ├── App.tsx                       # 최상위 레이아웃
│   ├── main.tsx                      # React 진입점
│   └── index.css                     # Tailwind 설정
│
├── .env.local                        # 환경 변수
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.app.json
```

---

## ⚙️ 환경 변수

`.env.local` 파일을 루트에 생성하세요.

```env
# 백엔드 REST API 주소
VITE_API_BASE_URL=http://localhost:8080

# 백엔드 WebSocket 주소
VITE_WS_URL=ws://localhost:8080/ws
```

> 백엔드가 없어도 실행됩니다.  
> DEV 환경에서는 더미 데이터(1000개)와 목 WebSocket이 자동 활성화됩니다.

---

## 🚀 로컬 실행 방법

### 사전 요구사항
- Node.js 18 이상
- pnpm (또는 npm / yarn)

```bash
# pnpm 없으면 설치
npm install -g pnpm
```

### 1. 저장소 클론

```bash
git clone https://github.com/2026-teecher-team-b/frontend.git
cd frontend
```

### 2. 의존성 설치

```bash
pnpm install
# 또는
npm install
```

### 3. 환경 변수 설정

```bash
cp .env.local.example .env.local
# 파일 열어서 백엔드 주소 수정
```

### 4. 개발 서버 실행

```bash
pnpm dev
```

브라우저에서 `http://localhost:5173` 접속

### 5. 프로덕션 빌드

```bash
pnpm build
pnpm preview
```

---

## 🎮 카메라 조작법

| 조작 | 동작 |
|------|------|
| **좌클릭 드래그** | 360° 오비트 (수평·수직 자유 회전) |
| **우클릭 드래그** | 카메라 기준점 팬 이동 |
| **스크롤 휠** | 줌인 / 줌아웃 |
| **별 클릭** | 사이드 패널 오픈 (카메라는 그대로) |
| **빈 화면 클릭** | 사이드 패널 닫기 |
| **ESC** | 사이드 패널 닫기 |

---

## 🗺 개발 로드맵

| 주차 | 내용 | 상태 |
|------|------|------|
| 1~2주차 | 프로젝트 셋업, 더미 데이터 3D 렌더링 | ✅ 완료 |
| 3~4주차 | 물리 엔진, 점수 시각화, WebSocket | ✅ 완료 |
| 5~6주차 | 카메라 개선, 2D 오버레이, 사이드 패널 | ✅ 완료 |
| 7~8주차 | 블랙홀 이펙트, RAG AI 분석, 웜홀 디자인 | ✅ 완료 |
| 9~10주차 | GitHub OAuth 로그인, My Galaxy 필터 | 🔲 예정 |
| 11~12주차 | 성능 최적화, 배포 (Vercel / Netlify) | 🔲 예정 |

---

## 🔌 백엔드 API 명세

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/api/repos` | 저장소 목록 조회 |
| GET | `/api/repos/{repoId}` | 저장소 상세 조회 |
| GET | `/api/repos/{repoId}/scores` | 24시간 점수 이력 |
| POST | `/api/rag/analyze` | RAG AI 분석 요청 |
| WS | `/ws` (STOMP) | 실시간 점수 업데이트 |
| GET | `/oauth2/authorization/github` | GitHub OAuth 시작 |
| GET | `/api/users/me` | 로그인 사용자 정보 |

---

## 🤝 기여 방법

1. 이슈 생성 (`feat` / `fix` / `refactor` 레이블)
2. `feat/{이슈번호}-{기능명}` 브랜치 생성
3. 작업 후 커밋 메시지에 이슈 번호 포함 (`feat: 기능 설명 (#이슈번호)`)
4. PR 생성 → `Closes #이슈번호` 명시 → 리뷰 요청

---

## 📄 라이선스

MIT License
