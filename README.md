# 깃허브 갤럭시 (GitHub Galaxy)

GitHub 오픈소스 저장소를 **3D 나선 은하**로 시각화하는 인터랙티브 웹 애플리케이션입니다.

별 하나 = 레포 하나. 언어별로 나선팔이 나뉘고, 활동 점수가 높을수록 은하 코어 근처에, 낮을수록 외곽으로 배치됩니다.  
별을 클릭하면 AI 분석, 점수 차트, 즐겨찾기가 담긴 사이드 패널이 열립니다.

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| **3D 나선 은하 시각화** | 저장소 하나 = 별 하나. 언어별 나선팔 배치, 활성도 → 반지름(내부=활발·외부=비활성), 별 크기 → 인기도 |
| **나선팔 물리 엔진** | 활성도 변화에 따라 별이 나선팔 위를 실시간 공전. Web Worker 기반 O(n) 처리 |
| **언어별 나선팔** | 14개 언어 각각 고정 팔 각도 (TypeScript 0°, JavaScript 26°, Python 52°…) |
| **블랙홀** | 건강도 < 2 → 나선팔을 따라 은하 중심으로 빨려드는 블랙홀로 분류 |
| **GalaxyCore** | 은하 핵 + 동심원 링 + 나선팔 가이드 렌더링 |
| **360° 카메라** | 구면 좌표계 기반 오비탈 카메라. 드래그·스크롤·터치 지원 |
| **2D/3D 뷰 전환** | ViewToggle로 2D 플랫 뷰 / 3D 은하 뷰 전환 |
| **검색** | 저장소명·언어 실시간 검색 |
| **별 상세 패널** | 점수 차트, AI RAG 분석, 즐겨찾기 (모바일: 바텀시트, 데스크톱: 사이드패널) |
| **GitHub OAuth** | GitHub 계정 로그인 · 즐겨찾기 DB 연동 |
| **HUD UI** | 사이버/우주 테마 인터페이스 (LandingPage 부트 시퀀스 포함) |
| **성능 모니터링** | Sentry 에러 추적 + Web Vitals 측정 |

---

## 기술 스택

### 코어

| 라이브러리 | 버전 | 역할 |
|-----------|------|------|
| **React** | 18.3 | UI 컴포넌트 (lazy/Suspense 코드 스플리팅) |
| **TypeScript** | 5.5 | 정적 타입 |
| **Vite** | 5.4 | 빌드 도구 |

### 3D 렌더링

| 라이브러리 | 버전 | 역할 |
|-----------|------|------|
| **Three.js** | 0.166 | WebGL 3D 엔진 |
| **@react-three/fiber** | 8.17 | React에서 Three.js 선언적 사용 |
| **@react-three/drei** | 9.109 | 유틸 컴포넌트 |

### 상태 관리 / 서버 통신

| 라이브러리 | 버전 | 역할 |
|-----------|------|------|
| **Zustand** | 4.5 | 전역 상태 (저장소 목록, 점수, UI) |
| **Axios** | 1.7 | REST API (`withCredentials: true`) |
| **@tanstack/react-query** | 5.51 | 서버 상태 캐싱 (staleTime 5분) |

> `physicsStore`는 Zustand가 아닌 **모듈 레벨 클래스 싱글톤**입니다.
> React 리렌더 없이 `THREE.Vector3`를 직접 수정해 매 프레임 위치를 업데이트합니다.

### 모니터링 / 스타일링

| 라이브러리 | 버전 | 역할 |
|-----------|------|------|
| **@sentry/react** | 10.53 | 에러 추적 + 성능 모니터링 |
| **web-vitals** | 5.2 | Core Web Vitals 측정 |
| **Tailwind CSS** | 3.4 | 유틸리티 CSS |

---

## 은하 수학 (핵심 개념)

별의 반지름은 활동 점수로 결정됩니다 (활발할수록 코어 근처):

```
activityToGalaxyRadius(score):
  r = GALAXY_R_OUTER - (GALAXY_R_OUTER - GALAXY_R_INNER) × (score / 100)

  GALAXY_R_INNER = 22   (코어 근처, 가장 활발한 레포)
  GALAXY_R_OUTER = 185  (외곽, 비활성 레포)
```

나선팔 위의 각도 (로그 나선):

```
spiralTheta(armAngle, r, orbitAngle):
  θ = armAngle + SPIRAL_K × ln(r / GALAXY_R_INNER + 1) + orbitAngle

  SPIRAL_K = 0.55   → 나선의 감김 강도
  armAngle = 언어별 고정 각도 (TypeScript 0°, JavaScript 26°, Python 52°…)
  orbitAngle = repoId 기반 결정론적 초기값, 시간에 따라 서서히 공전
```

최종 3D 좌표:

```
galaxyPosition(activityScore, armAngle, orbitAngle, time, noisePhase):
  r = activityToGalaxyRadius(activityScore)
  θ = spiralTheta(armAngle, r, orbitAngle)
  y = GALAXY_H_AMP × sin(time × 0.35 + noisePhase) × rNorm   (디스크 두께)
  → [r·cos θ, y, r·sin θ]

  GALAXY_H_AMP = 14   → 디스크 최대 두께 (내부일수록 두꺼움)
```

블랙홀 판정: `healthScore < 2`

---

## 아키텍처

```
백엔드 GET /repos (5분 폴링)
  → App.tsx: normalizeScores() — p5~p95 백분위 정규화
  → useGalaxyStore: repositories[] + scores{}
      → physicsStore (모듈 싱글톤): 언어·activityScore 기반 나선팔 엔트리 등록
      → InstancedStarField: InstancedMesh로 draw call 1회 처리
      → usePhysics (Web Worker): 매 프레임 orbitAngle·반지름 갱신 → physicsStore 업데이트
```

```
백엔드 REST API          GitHub OAuth
      │                      │
      ▼                      ▼
useGalaxyStore         useUIStore
(저장소·점수)          (패널·유저·즐겨찾기)
      │                      │
      └──────────┬───────────┘
                 ▼
           React 컴포넌트 (lazy 로드)
                 │
        ┌────────┴────────┐
        ▼                 ▼
   2D UI Layer        3D Canvas Layer
  (overlay/panel)     (R3F + Three.js)
                           │
                     physicsStore
                     (모듈 싱글톤 — orbitAngle·currentR)
                           │
                   physics.worker.ts
                  (Web Worker — zero-copy Float32Array)
                           │
                   InstancedStarField
                  (단일 InstancedMesh — draw call 1회)
```

---

## 디렉토리 구조

```
frontend/
├── src/
│   ├── api/
│   │   └── axios.ts                  # Axios 인스턴스 (baseURL, withCredentials)
│   │
│   ├── canvas/                       # ── 3D 레이어 ──────────────
│   │   ├── Scene.tsx                 # Canvas 래퍼 + 카메라 [280,60,0] fov 58
│   │   ├── controls/
│   │   │   └── SpaceControls.tsx     # 360° 구면 좌표 오비탈 카메라
│   │   ├── effects/
│   │   │   ├── BlackHoleSpiral.tsx   # 블랙홀 강착원반 파티클
│   │   │   ├── BlackHoleWrapper.tsx  # 블랙홀 래퍼
│   │   │   ├── FrameMonitor.tsx      # FPS 모니터 (DEV only)
│   │   │   └── MeteorEffect.tsx      # 유성 이펙트
│   │   └── objects/
│   │       ├── GalaxyCore.tsx        # 은하 중심 렌더링
│   │       ├── InfiniteGrid.tsx      # 무한 격자
│   │       ├── InstancedStarField.tsx # 별 전체 단일 InstancedMesh (MAX 2000)
│   │       ├── StarConnections.tsx   # 같은 언어 별 연결선
│   │       └── WormholeFunnel.tsx    # 은하 외곽 빛 고리 이펙트
│   │
│   ├── components/                   # ── 2D UI 레이어 ───────────
│   │   ├── common/
│   │   │   ├── ErrorBoundary.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   ├── overlay/
│   │   │   ├── FavoriteLoginModal.tsx # 비로그인 즐겨찾기 유도 모달
│   │   │   ├── GalaxyStats.tsx        # 은하 통계 (레포 수, 언어 등)
│   │   │   ├── HelpOverlay.tsx        # 카메라 조작 가이드 (우하단)
│   │   │   ├── Legend.tsx             # 언어 색상 범례
│   │   │   ├── LoginButton.tsx        # GitHub OAuth 버튼
│   │   │   ├── ProfileModal.tsx       # 프로필 + 즐겨찾기 모달
│   │   │   ├── SearchBar.tsx          # 저장소 실시간 검색
│   │   │   ├── ToastNotification.tsx  # 토스트 알림
│   │   │   ├── Tooltip.tsx            # 별 hover 미리보기
│   │   │   └── ViewToggle.tsx         # 2D/3D 뷰 전환 (우하단)
│   │   └── panel/
│   │       ├── SidePanel.tsx          # 상세 패널 (모바일: 바텀시트, 데스크톱: 사이드패널)
│   │       ├── ScoreChart.tsx         # 24시간 점수 스파크라인
│   │       └── RAGAnalysis.tsx        # AI RAG 분석
│   │
│   ├── hooks/
│   │   ├── 3d/
│   │   │   ├── usePhysics.ts          # 물리 루프 (Web Worker + 메인스레드 폴백)
│   │   │   └── useLerp.ts
│   │   └── queries/
│   │       ├── useRagAnalysis.ts
│   │       ├── useRepoDetail.ts
│   │       └── useScoreHistory.ts
│   │
│   ├── pages/
│   │   └── LandingPage.tsx            # 온보딩 (HUD/Cyber 테마, 부트 시퀀스)
│   │
│   ├── store/
│   │   ├── useGalaxyStore.ts          # 저장소 목록, 별 위치 초기값, 점수 맵
│   │   ├── useUIStore.ts              # 패널, 선택된 레포, 즐겨찾기, 유저, 필터, 토스트
│   │   └── physicsStore.ts            # 매 프레임 3D 위치 (React 외부 싱글톤)
│   │
│   ├── types/
│   │   ├── github.ts                  # Repository, RepoScore, UserInfo
│   │   ├── store.ts                   # GalaxyStore, UIStore 인터페이스
│   │   └── canvas.ts
│   │
│   ├── utils/
│   │   ├── physics.ts                 # 은하 수학 (galaxyPosition, spiralTheta, activityToGalaxyRadius)
│   │   ├── format.ts                  # 숫자·날짜 포맷
│   │   └── vitals.ts                  # Web Vitals 리포팅
│   │
│   ├── workers/
│   │   └── physics.worker.ts          # Web Worker (Float32Array zero-copy 전송)
│   │
│   ├── App.tsx                        # 최상위 레이아웃
│   ├── main.tsx                       # React 진입점 + Sentry 초기화
│   └── index.css                      # Tailwind + 커스텀 글로벌 스타일
│
├── vite.config.ts                     # 경로 별칭 @/ → src/, dev 프록시
├── tailwind.config.js
└── tsconfig.app.json
```

---

## 로컬 실행 방법

### 사전 요구사항
- Node.js 18 이상
- pnpm

```bash
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
```

### 3. 개발 서버 실행

```bash
# EC2 백엔드 (https://api.gitgalaxy.org) 로 프록시
pnpm dev

# 로컬 백엔드 사용 시
VITE_PROXY_TARGET=http://localhost:8080 pnpm dev
```

브라우저에서 `http://localhost:5173` 접속

### 4. 타입 체크 + 프로덕션 빌드

```bash
pnpm build
pnpm preview
```

### 5. 린트

```bash
pnpm lint
```

---

## 개발 서버 프록시 경로

`vite.config.ts`에서 아래 경로를 `VITE_PROXY_TARGET`으로 프록시합니다.

| 경로 접두사 | 설명 |
|------------|------|
| `/repos` | 저장소 목록·상세 |
| `/auth` | 로그인·로그아웃 |
| `/users`, `/user` | 사용자 정보 |
| `/oauth2`, `/login` | GitHub OAuth 플로우 |
| `/admin` | 관리자 API |

---

## 카메라 조작법

| 조작 | 동작 |
|------|------|
| **좌클릭 드래그** | 360° 오비트 (수평·수직 자유 회전) |
| **스크롤 휠** | 줌인 / 줌아웃 |
| **별 클릭** | 사이드 패널 오픈 |
| **빈 화면 클릭** | 사이드 패널 닫기 |
| **ESC** | 사이드 패널 닫기 |

---

## 백엔드 API 명세

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/repos` | 저장소 목록 (점수 포함) |
| GET | `/repos/{repoId}` | 저장소 상세 |
| GET | `/repos/{repoId}/scores` | 24시간 점수 이력 |
| POST | `/repos/rag` | RAG AI 분석 요청 |
| GET | `/oauth2/authorization/github` | GitHub OAuth 시작 |
| GET | `/auth/me` | 로그인 사용자 정보 |
| POST | `/auth/logout` | 로그아웃 |
| GET | `/users/favorites` | 즐겨찾기 목록 |
| POST | `/users/favorites/{repoId}` | 즐겨찾기 추가 |
| DELETE | `/users/favorites/{repoId}` | 즐겨찾기 삭제 |

---

## 개발 로드맵

| 주차 | 내용 | 상태 |
|------|------|------|
| 1~2주차 | 프로젝트 셋업, 3D 렌더링 기초 | ✅ 완료 |
| 3~4주차 | 물리 엔진, 점수 시각화 | ✅ 완료 |
| 5~6주차 | 카메라, 2D 오버레이, 사이드 패널 | ✅ 완료 |
| 7~8주차 | 블랙홀 이펙트, RAG AI 분석 | ✅ 완료 |
| 9~10주차 | GitHub OAuth, 즐겨찾기 DB 연동, Sentry 모니터링 | ✅ 완료 |
| 11~12주차 | 나선 은하 디스크 전환 (언어별 나선팔), HUD UI 리디자인, 성능 최적화 (lazy loading, InstancedMesh), GalaxyCore·ViewToggle 추가 | ✅ 완료 |

---

## 기여 방법

1. 이슈 생성 (`feat` / `fix` / `perf` / `refactor` 레이블)
2. `feat/{이슈번호}-{기능명}` 브랜치 생성
3. 커밋 메시지에 이슈 번호 포함 (`feat: 기능 설명 (#이슈번호)`)
4. PR 생성 → `Closes #이슈번호` 명시 → 리뷰 요청

---

## 라이선스

MIT License
