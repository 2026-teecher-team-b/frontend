# 🌌 GitHub Universe — 오픈소스 생태계 3D 시각화

GitHub의 오픈소스 저장소들을 **3D 별자리 은하**로 시각화하는 인터랙티브 웹 애플리케이션입니다.  
저장소의 활동 점수·건강 점수에 따라 별의 크기와 밝기가 실시간으로 변하고,  
같은 언어로 작성된 별들끼리 N-body 물리 법칙에 따라 성단을 이루며 움직입니다.

---

## ✨ 주요 기능

| 기능 | 설명 |
|------|------|
| **3D 은하 시각화** | 저장소 하나 = 별 하나. 활동 점수 → 별 크기, 건강 점수 → 밝기로 매핑 |
| **N-body 물리 시뮬레이션** | 같은 언어 별끼리 인력, 모든 별 사이 척력으로 자연스러운 성단 형성 |
| **실시간 점수 갱신** | WebSocket(STOMP)으로 점수 변화를 수신 → 별 크기·밝기 Lerp 애니메이션 |
| **360° 오비탈 카메라** | 구면 좌표계 기반, 어느 방향이든 자유 회전·팬·줌 |
| **별 클릭 추적** | 클릭한 별로 카메라 줌인, 별이 이동하는 대로 실시간 추적 |
| **블랙홀 이펙트** | 건강 점수 < 10인 저장소 → 강착원반 파티클 이펙트 |
| **밀도 반응 glow** | 별이 뭉칠수록 성단 배경 성운이 밝아짐 |
| **저장소 상세 패널** | 24시간 점수 차트, AI RAG 분석, My Galaxy 즐겨찾기 |
| **GitHub OAuth 로그인** | 백엔드 OAuth2 연동 (9~10주차 준비) |

---

## 🛠 기술 스택

### 코어 프레임워크
| 라이브러리 | 버전 | 역할 |
|-----------|------|------|
| **React** | 18.3 | UI 컴포넌트 트리 |
| **TypeScript** | 5.5 | 정적 타입 |
| **Vite** | 5.4 | 빌드 툴 및 개발 서버 |

### 3D 렌더링
| 라이브러리 | 버전 | 역할 |
|-----------|------|------|
| **Three.js** | 0.166 | WebGL 3D 엔진 |
| **@react-three/fiber** | 8.17 | React에서 Three.js를 선언적으로 사용 (R3F) |
| **@react-three/drei** | 9.109 | R3F 유틸 컴포넌트 (Stars, Sparkles, Billboard, Text) |

### 상태 관리
| 라이브러리 | 버전 | 역할 |
|-----------|------|------|
| **Zustand** | 4.5 | 전역 상태 (저장소 목록, 점수, UI 상태) |

> **physicsStore**는 Zustand가 아닌 모듈 레벨 클래스 싱글톤으로 관리합니다.  
> Three.js Object3D에 직접 위치를 적용해야 하므로 React 리렌더를 완전히 배제합니다.

### 서버 통신
| 라이브러리 | 버전 | 역할 |
|-----------|------|------|
| **Axios** | 1.7 | REST API HTTP 클라이언트 |
| **@tanstack/react-query** | 5.51 | 서버 상태 캐싱·동기화 (useQuery, useMutation) |
| **@stomp/stompjs** | 7.0 | WebSocket 위의 STOMP 프로토콜 (실시간 점수 수신) |

### 스타일링
| 라이브러리 | 버전 | 역할 |
|-----------|------|------|
| **Tailwind CSS** | 3.4 | 유틸리티 퍼스트 CSS |

---

## 🏗 아키텍처 개요

```
WebSocket (STOMP)          REST API
      │                       │
      ▼                       ▼
useGalaxyStore          React Query
(Zustand)               (캐시·동기화)
      │                       │
      └──────────┬────────────┘
                 ▼
           React 컴포넌트
         (리렌더 최소화)
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
                    (useFrame N-body)
                          │
                    Object3D.position
                    (React 외부 직접 변경)
```

### 핵심 설계 원칙: "3D 레이어는 React를 우회한다"

별 50개가 매 프레임 위치를 업데이트해야 하는데, Zustand setState를 쓰면 매 프레임 50번 리렌더가 발생합니다. 이를 피하기 위해 `physicsStore`(모듈 싱글톤)가 `THREE.Vector3` 위치를 직접 수정하고, `usePhysics`가 `useFrame` 안에서 `object.position.copy()`로 Three.js 오브젝트에 적용합니다. React는 전혀 개입하지 않습니다.

---

## 📁 디렉토리 구조

```
frontend/
├── public/
│   └── favicon.svg               # 별 모양 파비콘
│
├── src/
│   ├── api/
│   │   ├── axios.ts              # Axios 인스턴스 (baseURL, 인터셉터)
│   │   ├── websocket.ts          # STOMP WebSocket 연결/구독
│   │   └── mockWebSocket.ts      # DEV용 목 WebSocket (점수 랜덤 변화)
│   │
│   ├── canvas/                   # ── 3D 레이어 ──────────────────────
│   │   ├── Scene.tsx             # Canvas 래퍼 + GalaxyScene 조립
│   │   ├── controls/
│   │   │   └── SpaceControls.tsx # 360° 구면 좌표계 오비탈 카메라
│   │   ├── effects/
│   │   │   ├── BlackHoleSpiral.tsx  # 블랙홀 강착원반 파티클
│   │   │   ├── FrameMonitor.tsx     # FPS 모니터 (DEV only)
│   │   │   └── MeteorEffect.tsx     # 유성 이펙트
│   │   └── objects/
│   │       ├── Star.tsx          # 저장소 별 (5각별 + 물리 + 점수 시각화)
│   │       └── Cluster.tsx       # 언어별 성단 (glow + Sparkles + 라벨)
│   │
│   ├── components/               # ── 2D UI 레이어 ────────────────────
│   │   ├── common/
│   │   │   └── LoadingSpinner.tsx
│   │   ├── overlay/
│   │   │   ├── Tooltip.tsx       # 별 hover 미리보기
│   │   │   ├── Legend.tsx        # 언어 색상 범례
│   │   │   ├── HelpOverlay.tsx   # 카메라 조작 가이드
│   │   │   └── LoginButton.tsx   # GitHub OAuth 버튼
│   │   └── panel/
│   │       ├── SidePanel.tsx     # 우측 상세 패널 (리사이즈 가능)
│   │       ├── ScoreChart.tsx    # 24시간 점수 SVG 스파크라인
│   │       └── RAGAnalysis.tsx   # AI "왜 트렌딩?" 분석
│   │
│   ├── data/
│   │   └── dummy.ts              # DEV용 더미 저장소·점수 데이터
│   │
│   ├── hooks/
│   │   ├── 3d/
│   │   │   ├── usePhysics.ts     # N-body 물리 루프 (useFrame)
│   │   │   └── useLerp.ts        # Lerp 유틸 훅
│   │   └── queries/
│   │       ├── useRepoDetail.ts  # GET /api/repos/{id}
│   │       ├── useScoreHistory.ts # GET /api/repos/{id}/scores
│   │       └── useRagAnalysis.ts # POST /api/rag/analyze
│   │
│   ├── store/
│   │   ├── useGalaxyStore.ts     # 저장소 목록·점수·WebSocket 연결 상태
│   │   ├── useUIStore.ts         # 선택·hover·패널·즐겨찾기·카메라 추적
│   │   └── physicsStore.ts       # 물리 싱글톤 (React 외부, 리렌더 없음)
│   │
│   ├── types/
│   │   ├── github.ts             # Repository, RepoScore, UserInfo 등
│   │   ├── store.ts              # GalaxyStore, UIStore 인터페이스
│   │   └── canvas.ts             # StarProps 등 3D 컴포넌트 Props 타입
│   │
│   ├── utils/
│   │   ├── physics.ts            # N-body 상수, 힘 계산, 클러스터 좌표
│   │   └── format.ts             # 숫자 포맷, 날짜 경과 시간
│   │
│   ├── App.tsx                   # 최상위 레이아웃 (Canvas + 2D 오버레이)
│   ├── main.tsx                  # React 진입점, QueryClient 설정
│   └── index.css                 # Tailwind 기본 설정
│
├── .env.local                    # 환경 변수 (아래 참고)
├── vite.config.ts                # Vite 설정 (@/ 경로 alias)
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

> 백엔드가 준비되지 않은 경우 환경 변수 없이도 실행됩니다.  
> DEV 환경에서는 더미 데이터와 목 WebSocket이 자동으로 활성화됩니다.

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
git clone https://github.com/{your-org}/{repo-name}.git
cd {repo-name}/frontend
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
# .env.local 파일을 열어 백엔드 주소 수정
```

### 4. 개발 서버 실행

```bash
pnpm dev
# 또는
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

### 5. 프로덕션 빌드

```bash
pnpm build
pnpm preview   # 빌드 결과물 로컬 미리보기
```

---

## 🎮 카메라 조작법

| 조작 | 동작 |
|------|------|
| **좌클릭 드래그** | 360° 오비트 (수평·수직 자유 회전) |
| **우클릭 드래그** | 카메라 기준점 팬 이동 |
| **스크롤 휠** | 줌인 / 줌아웃 |
| **별 클릭** | 해당 별로 줌인 + 실시간 추적 |
| **빈 화면 클릭** | 추적 해제 → 전체 뷰로 줌아웃 |
| **ESC** | 사이드 패널 닫기 |

---

## 🗺 개발 로드맵

| 주차 | 내용 | 상태 |
|------|------|------|
| 1~2주차 | 프로젝트 셋업, 더미 데이터 3D 렌더링 | ✅ 완료 |
| 3~4주차 | N-body 물리, 점수 시각화, WebSocket | ✅ 완료 |
| 5~6주차 | 카메라 개선, 2D 오버레이, 사이드 패널 | ✅ 완료 |
| 7~8주차 | 블랙홀 이펙트, RAG AI 분석, 별 디자인 | ✅ 완료 |
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
| WS | `/ws` (STOMP) | 실시간 점수 업데이트 구독 |
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
