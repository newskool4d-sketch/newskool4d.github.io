# ice-eduinfo-map(인천교육 통합지도) 개선 계획 재수립

- 수립일: 2026-09-15
- 기준 커밋: `abedf1f` (main, 2026-07-17) — 로컬 main이 `origin/main`(`f99645c`, 2026-07-11)보다 12커밋 앞섬
- 선행 문서: `upgrade-plan(2026-07-05).md`, `docs/execution-plan-2026-07-07.md`, `docs/remaining-work-2026-07-07.md`, `.omo/evidence/ice-eduinfo-map-stable-code-security-gate-code-review.md`(2026-07-17)
- 성격: 실행 계획서. 본 문서 수립 시점에 코드 변경 없음
- 실측 방법: `git status/log/diff`, `npm run check`, `npm test`, 파일 grep, 운영 URL HTTP 확인, GitHub Actions 이력 조회

---

## 0. 결론

| 구분 | 판정 |
|---|---|
| 7월 계획 1단계(안정화) | 5과제 중 2과제 완료(T2 일부·T4). **고지 3종(T1)·갱신 절차서(T5)·실 키 스모크(T3) 미이행** |
| 7월 계획 2단계(단일화·디자인) | 베타 진입(T7)·CI 색 체계 일부만 이행. 기능 인벤토리(T6)·구형 흡수(T9~T11) 미착수 |
| 계획 밖 추가 변경 | 네이버 지도 기본 공급자·Civic Atlas UI·도로경로 프록시(Sites worker)·학교 연락처 967건 — **2개월째 미push, 운영 배포 미반영** |
| 최우선 | ① 미push 12커밋의 배포 반영과 배포 정본 결정 ② 고지 3종 ③ 문서를 현재 아키텍처(네이버·worker)에 맞춤 |

방향: 신규 기능 추가 없이 **"배포 동기화 → 고지·문서 현행화 → 도로경로 실증/동결 → 단일화"** 순으로 완결.

---

## 1. 실측 결과 (2026-09-15)

### 1-1. 검증 기준선

| 항목 | 결과 |
|---|---|
| `npm run check` | 통과, JavaScript 대상 34개 |
| `npm test` | 통과 69/69, 실패·건너뜀 0 |
| `npm run validate:data` | 통과 (7/17 리뷰 기준 3개 데이터셋 위반 0) |
| `node tools/check-sensitive.mjs` | 통과 (추적 파일 대상, 카카오 패턴만 검사) |
| Node 경고 | 0건 (`"type": "module"` 선언 완료) |

### 1-2. 저장소·배포 상태

| 항목 | 실측 |
|---|---|
| 로컬 main vs origin/main | 12커밋 앞섬 (30파일, +18,825/-2,414). 7/16~7/17 작업 전량 미push |
| 배포 대상 A: GitHub Pages | `https://newskool4d-sketch.github.io/newskool4d.github.io/` HTTP 200. **7/11 커밋(`f99645c`) 버전** = 카카오 단일·구형 디자인 |
| 배포 대상 B: Sites worker | 원격 `sites` = `d26bb21`(7/17 10:31). 네이버 공급자 병합(`fd17f78`) **이전** 버전 |
| GitHub Actions | 마지막 실행 7/11 성공. 7/9 실행 1건 실패(15분 타임아웃). 미push 12커밋은 CI 미검증 |
| 미추적 파일 | `.playwright-cli/`, `output/`, `vendor/xlsx.full.min.js.0.18.5.bak` — `.gitignore` 미등록 |
| 브랜치 | `feature/naver-map-adapter`, `feature/school-data-road-routing` 병합 완료(잔여 커밋 0) |
| 래퍼 구조 | `ice-eduinfo-map.io-main/ice-eduinfo-map.io-main/incheon-edu-map` 중첩 유지. 루트 빈 `tests/`·`.agents/` 잔존 |

### 1-3. 7월 계획 과제별 진척

| 과제 | 상태 | 근거 |
|---|---|---|
| T1 고지 3종 | **미이행** | 공개 HTML 4종·`js/` 전체에 "개인 제작 참고자료" 문구 0건 |
| T2 기술부채 | 부분 | ① `type: module` 완료 ② 중첩 폴더 잔존 ③ 루트 빈 폴더 잔존 ④ `shared.js` 이모지 0건, `schools.html`(✕💡)·`infrastructure.html`(✕🌐)·`shared.css`(✓) 잔존 ⑤ `fix-recommendations.md` 재감사 기록 없음 |
| T3 실 키 스모크 | 절차만 | `pre-deploy-checklist.md` 6절 기록표 "스모크는 미수행" |
| T4 CI | 완료 | `.github/workflows/ci.yml` 4단계(구문·테스트·민감파일·좌표) |
| T5 갱신 절차서 | **미이행** | `docs/data-update-guide.md` 없음. 단, `tools/merge-school-directory.mjs`·`data/schools-directory-metadata.json`(출처 파일명·SHA-256·기준일 2026-04-01)은 존재 |
| T6 기능 인벤토리 | 미착수 | 격차표 문서 없음 (2026-09-15 기준선 측정값 — 이후 진행 현황은 3단계 절 "3단계 진행 현황" 참조) |
| T7 베타 노출 | 완료 | GNB "통합 작업지도" 탭, `index.html` 진입 카드 |
| T8 index 허브 | 대체 이행 | `atlas-theme.css`가 `!important`로 흰 캔버스 덮어씀. 인라인 다크 CSS(`#181716`)는 사문화된 채 잔존 |
| T8-1 폐기 토큰 | 부분 | `unified-map.html` #2a41b6 1, `js/map-layers.js` #4262ff 2·#2a41b6 1, `shared.css` #0f172a 6 |
| T9~T11 구형 흡수·제거 | 미착수 | `schools.html`(1,307줄)·`infrastructure.html`(1,054줄) 여전히 정본 |
| T12 접근성·모바일 | 부분 | 7/17 clone-fidelity 리뷰에서 375/768/1280 캡처. 대비 실측표 없음 |
| T13 DESIGN 이행 감사 | 미이행 | — |
| T13-1 전용서체 | **순서 위반** | `assets/fonts/incheon-edu-himchan-display.woff2` 커밋됨(`5b91156`). 배포 라이선스 확인 기록 없음 |
| T14~T16 정착 | 미착수 | 9.1. 학기 갱신 시점 경과, 공식 파일 갱신 여부 미확인 |

### 1-4. 계획 밖 추가 변경 (7/16~7/17)

| 변경 | 내용 | 계획과의 관계 |
|---|---|---|
| 네이버 지도 공급자 | `js/map-provider.js` 어댑터, 기본 `naver`·대체 `kakao`, 공급자별 localStorage 키 분리 | 7월 계획·README·체크리스트 모두 카카오 전제 → 문서 전면 괴리 |
| Civic Atlas UI | `atlas-theme.css`(750줄) 오버레이, `DESIGN.md` §9 신설 | "구형 재도색 안 함" 원칙 대신 오버레이로 재도색. 단일화 긴급성은 낮아졌으나 `!important` 부채 발생 |
| 도로경로 프록시 | `tools/build-sites-worker.mjs` → `dist/server/index.js`. `/api/directions`가 네이버 Directions 5 호출. 동일 출처 검사·인천 권역 제한·8초 타임아웃·`DIRECTIONS_RATE_LIMITER` 바인딩 필수(없으면 503) | README 배포 항목에 0건. 실 자격증명·실 호스팅 미검증 |
| Sites 배포 | `.openai/hosting.json`, 원격 `sites` | 정적 GitHub Pages와 배포 대상 이원화 |
| 학교 연락처 | 967개교 전화·홈페이지, 출처 CSV SHA-256 고정 | 데이터 거버넌스 진전. 절차서(T5)에 반영 필요 |
| 즐겨찾기 제거 | 공개 화면에서 제거, `js/favorites.js`·테스트 2종은 고아 상태 | 삭제 결정 필요 |

### 1-5. 7/17 코드리뷰 잔여 사항

| ID | 내용 | 상태 |
|---|---|---|
| H1 | 인스턴스 로컬 요청 제한 | **해소** — 분산 `DIRECTIONS_RATE_LIMITER` 바인딩 필수화, 미설정 시 503 fail-closed(테스트 존재) |
| M1 | 취약 테스트 3종(삭제 토큰 스캔, 빌더 선실행, 자기참조 해시) | 잔존 |
| M2 | 8초 타임아웃 회귀 테스트 없음 | 잔존 |
| M3 | 250 LOC 초과 모듈 3개, 경로 정규화 중복(`connection-layer`↔`institution-schema`) | 잔존 |
| M4 | README 배포 문서 구형, `.gitignore` 누락, 민감파일 게이트가 추적 파일만 검사 | 잔존 |
| L1 | 테스트 주석 960교(실제 967) | 잔존 |
| L2 | CRLF 경고 16파일 | 잔존 |

### 1-5-1. 0단계 push 후 실측 발견 (2026-09-15)

- push(`ea32af6`) 후 CI(`verify`)·`pages build and deployment` 모두 success. 운영 URL이 네이버 공급자·Civic Atlas 버전으로 갱신됨을 확인(공급자 모달에 "네이버 지도 · 권장" 노출).
- **신규 발견**: 정적 GitHub Pages에는 `/api/directions` 라우트가 없어 GitHub Pages 자체의 404 HTML을 반환한다(`content-type: text/html`, JSON 아님). `js/directions-service.js`의 `fetchRoadRoute`는 `response.json().catch(() => ({}))`로 페이로드를 `{}`로 대체한 뒤 `!response.ok`이므로 `RoadRouteError(code: "directions_request_failed")`를 던진다. `DESIGN.md` §9가 명시한 `configuration-error` 상태가 아니라 일반 오류 문구로 노출됨 — N1(C안: Pages 정본) 채택 시 도로경로 UI 카피를 "미제공" 문구로 명시 교정 필요(2단계 R3에 편입, 정적 배포 자체의 결함은 아님).

### 1-6. 세션 도구 결함 (이전 시도 실패의 유력 원인, 추정)

- 앱 루트 `.claude/settings.json`의 PreToolUse·PostToolUse·Stop 훅이 `~/.claude/why-was-fable-banned/adapters/hooks/*.py`를 호출하나 **파일이 존재하지 않음** → `python3` 종료코드 2 실측 → 이 폴더에서 세션을 시작하면 Edit/Write 도구가 차단됨
- 본 계획 수립 세션은 상위 폴더(`ice-eduinfo-map.io-main`)에서 시작되어 해당 훅이 적용되지 않았음. 이전 실패가 이 훅 때문인지는 직접 확인하지 못함
- 조치: 훅 항목 삭제 또는 스크립트 복구(0단계 S1)

---

## 2. 전제 (유지·신규)

### 2-1. 유지 (2026-07-05 확정)

| # | 전제 |
|---|---|
| D1 | 개인 업무도구 유지. 화면 비공식 고지 |
| D2 | 단일화: `unified-map.html` 승격, 구형 공개 페이지 흡수 후 제거 |
| D3 | DESIGN.md 이행 |
| D4 | 교육청 홈페이지 공식 파일 준용(현행 2026-04-01) |
| D5 | CI 색상 차용 O, 심벌·로고 게재 X |

### 2-2. 신규 결정 필요 (사용자)

| # | 쟁점 | 선택지 | 권장 |
|---|---|---|---|
| N1 | **배포 정본** | A. GitHub Pages 단일(도로경로는 `configuration-error` 상태로 노출) / B. Sites worker 단일 / C. Pages=공개 정본, Sites=도로경로 실증용 보조 | **C** — 정적 배포를 기준선으로 두는 DESIGN.md §1과 일치. Sites의 `limit({key})` 바인딩 지원이 실증되기 전에는 정본으로 승격하지 않음 |
| N2 | 구형 페이지 처리 시점 | 즉시 흡수 착수 / Atlas 재도색 완료를 근거로 3단계 후순위 | 후순위(3단계). 기능 인벤토리(T6)는 선행 착수 |
| N3 | 전용서체 | 라이선스 확인 후 유지 / 확인 불가 시 woff2 삭제·Pretendard 700 복귀 | 확인 기록 없으면 삭제 |
| N4 | `js/favorites.js`·테스트 2종 | 삭제 / 보류 | 삭제(공개 화면 미사용, 삭제 토큰 테스트 M1 동시 해소) |
| N5 | 담당 장학사(S3) 이관 여부 (`docs/feature-gap-2026.md` §6-3-1) | 이관 / 폐기 / T9 시점 재확인 | **결정 완료(2026-09-15): 이관** — 실사용 중으로 간주, T9 범위 포함 |
| N6 | `infra.json` 미병합 17건 병합 방식 (동 문서 §1-1) | 정적 병합(institutions.json 흡수) / 런타임 병합(2파일 fetch) | **결정 완료(2026-09-15): 정적 병합** |

### 2-3. 확정 고지 문구 (유지)

> 본 지도는 개인 제작 참고자료로 공식 자료가 아닙니다.
> 학교 현황은 인천광역시교육청 홈페이지 공개 자료(2026.4.1. 기준)를 준용합니다.

---

## 3. 단계별 실행 계획

### 0단계 — 기준선 복구 (즉시, 0.5일)

| 과제 | 작업 | 대상 | 완료 기준 |
|---|---|---|---|
| S1. 세션 훅 복구 | 존재하지 않는 훅 4종 제거 또는 스크립트 복구 | `.claude/settings.json` | Edit/Write 도구가 차단 없이 동작 |
| S2. 무시 목록 보강 | `.playwright-cli/`, `output/`, `*.bak` 추가. `vendor/*.bak` 삭제는 사용자 승인 후 | `.gitignore` | `git status --short` 미추적 0건 |
| S3. 줄바꿈 정규화 | `.gitattributes`(`* text=auto eol=lf`) 추가 | 신규 | `git diff --check` CRLF 경고 0건 (L2) |
| S4. push·CI 확인 | push 전 태그 `pre-sync-2026-09` 생성 → 파일 목록 제시·확인 후 `origin/main` push → Actions 4단계 녹색 | main | Actions 최신 실행 success, Pages가 네이버 기본 버전으로 갱신 |

**게이트**: S4 녹색 + 운영 URL에서 공급자 모달(네이버·카카오) 노출 확인.

**0단계 완료 (2026-09-15)**: S1(훅 디렉터리 부재 확인 후 제거)·S2(`.gitignore` 보강)·S4(민감정보 리터럴 0건 확인 → 14커밋 push, CI·Pages 배포 success, 운영 URL 네이버 공급자 확인)·S3(어드바이저 권고에 따라 push 이후 순서로 이동 — `git add --renormalize` 결과 실제 콘텐츠 변경 0건, 저장된 git 객체는 이미 LF로 일관 저장되어 있었음이 판명됨. `.gitattributes`만 추가해 재발 방지) 전부 완료, 커밋 `423ff4d`까지 CI green. 부수 발견: 정적 Pages에서 `/api/directions`가 GitHub Pages 자체 404(HTML)를 반환 — §1-5-1 참조.

**S3 관련 후속 정정 (2026-09-15, 1단계 도중 발견)**: S3 당시 "`git add --renormalize` 결과 콘텐츠 변경 0건"은 **워킹 트리가 아직 편집되지 않은 시점**에서만 참이었다. 1단계에서 Edit 도구로 4개 HTML·`shared.css`를 수정한 뒤 `npm run build:sites`로 재빌드하자, Windows 워킹 트리의 CRLF(자동 체크아웃 시 `core.autocrlf=true`가 만들어낸 것 — git 객체 자체는 여전히 LF)가 그대로 worker 산출물에 임베드되어 커밋됐다. Linux 기반 GitHub Actions는 같은 `.gitattributes`(`eol=lf`)로 체크아웃하지만 LF로 정규화되므로, CI가 재빌드한 결과와 커밋된 `dist/server/index.js`가 어긋나 T1 push 직후 CI가 실패했다(신규 동기화 테스트가 정확히 의도대로 이를 잡아냄). `.gitattributes`만 추가하고 워킹 트리 자체를 새로고침(체크아웃)하지 않으면 이 문제가 재발한다 — 조치: 추적 파일 전체를 커밋된 blob 내용과 바이트 단위로 일치시켜 워킹 트리를 LF로 강제 정규화(콘텐츠 변경 없음, `git diff` 0건 확인 후 stat 캐시만 `git add -u`로 갱신), worker 재빌드 후 CI 재검증. 향후 Windows 세션에서 새로 clone하거나 오래 방치된 워킹 트리로 이 저장소를 다룰 때 동일 증상이 재발할 수 있음 — 증상: `dist/server/index.js` 관련 테스트만 로컬에서는 통과하나 CI에서만 실패.

### 1단계 — 안정화 잔여 완결 (1~2주)

| 과제 | 작업 | 대상 | 규모 | 완료 기준 |
|---|---|---|---|---|
| T1. 고지 3종 | §2-3 문구를 헤더 또는 푸터에 삽입. 기준일은 `data/schools-directory-metadata.json`의 `sourceDate`를 단일 출처로 사용 | `index.html`, `schools.html`, `infrastructure.html`, `unified-map.html` | 0.5일 | 4면 grep "개인 제작 참고자료" 각 1건 이상, 기준일 문자열이 메타데이터와 일치 |
| T5. 갱신 절차서 | 공식 CSV 확보 → `tools/merge-school-directory.mjs` → `npm run validate:data` → 메타데이터·고지 기준일 갱신 → `npm run build:sites` → 커밋. 9.1. 학기 갱신 여부 즉시 확인 항목 포함 | `docs/data-update-guide.md`(신규) | 0.5일 | 제3자가 절차서만으로 재현 가능. 2026-09 학기 확인 결과 1행 기록 |
| T3. 실 키 스모크 | 네이버 Client ID(기본)·카카오 JS 키(대체) 각 1회: 타일 → 마커 클릭 → 필터 → 공급자 전환(리로드) → 키 삭제 | `pre-deploy-checklist.md` 6절 | 0.5일 | 기록표에 공급자별 실측 행 2건 |
| D1. 문서 현행화 | README: 네이버 기본·카카오 대체, 공급자별 도메인 등록(NCP Web 서비스 URL / Kakao 사이트 도메인), 배포 대상 역할(N1), worker 환경변수(`NAVER_DIRECTIONS_CLIENT_ID`·`_SECRET`·`DIRECTIONS_RATE_LIMITER`), `npm run build:sites`. 체크리스트 1·4·6절 공급자 중립화 | `README.md`, `pre-deploy-checklist.md`, `PRIVATE_LOCAL_APP_README.md` | 1일 | README에 네이버 관련 서술 5곳 이상, 배포 절차에 worker 항목 존재, 죽은 경로 0건 |
| D2. 민감파일 게이트 확장 | NCP 실키 패턴(`x-ncp-apigw-api-key` 실값 대입, `NAVER_DIRECTIONS_CLIENT_SECRET` 실값 대입) 추가. 스테이징 파일도 검사하는 옵션 | `tools/check-sensitive.mjs` | 0.5일 | 가짜 NCP 시크릿 삽입 시 CI 실패 확인 |
| D3. 리뷰 잔여 정리 | M1(삭제 토큰 테스트→즐겨찾기 모듈 삭제로 대체, 빌더 선실행 분리, 출처 해시 독립 검증), M2(타임아웃 회귀 테스트), L1(주석 967) | `tests/`, `js/favorites.js` | 1일 | 69개 테스트 유지 또는 증가, `favorites` grep 0건(N4 승인 시) |
| D4. 서체 라이선스 | 인천교육힘찬 배포 라이선스 확인·기록. 미확인 시 woff2 제거 + `atlas-theme.css` `@font-face` 삭제 + worker 재빌드 | `DESIGN.md` §3·§8, `assets/fonts/` | 0.5일 | 라이선스 확인 기록 1행 또는 서체 파일 0건 |

**게이트**: T1·T5·T3·D1·D2 완료 + CI 녹색 → 2단계 착수.

**1단계 진행 현황 (2026-09-15)**: T1·D2·D1·D3·T5·D4·N4 완료(커밋 `c71be62`~`7f2539e`, push 완료, CI green, 운영 URL에서 고지 문구 확인). **T3만 미완료로 남음** — `pre-deploy-checklist.md`(비공개·untracked 문서) §6에 공급자 중립 절차와 빈 기록행을 작성했으나, 실제 네이버·카카오 실 키 스모크는 콘솔 로그인이 필요해 이 세션에서 대행 불가. 9.1. 학기 공식 파일 갱신 여부(`docs/data-update-guide.md` §1)도 사용자 확인 필요 항목으로 남아 있음. D3는 M1(빌더 선실행 분리)·M2(타임아웃 회귀)·L1(967 정정)만 처리했고, M1의 출처 해시 독립성·M3(LOC·경로 정규화 중복)는 2단계 R4로 이월.

### 2단계 — 도로경로 실증 또는 동결 (N1 결정 후 1주)

| 과제 | 작업 | 대상 | 완료 기준 |
|---|---|---|---|
| R1. Sites 동기화 | `npm run build:sites` 후 `sites/main`을 로컬 main과 일치 | `dist/server/index.js`, 원격 `sites` | `sites/main` = main HEAD |
| R2. 스테이징 스모크 | 실 자격증명·바인딩 설정 후 ① 동일 출처 200 ② 교차 출처 403 ③ 인천 권역 밖 400 ④ 13번째 요청 429 + `Retry-After: 60` ⑤ 바인딩 제거 시 503 | 운영 worker | 5항목 실측 기록(`docs/` 또는 `.omo/evidence/`) |
| R3. 동결 분기 | R2 실패·호스팅 미지원 시: UI `configuration-error` 상태 유지 확인, README에 "도로경로 미제공" 명시, `DESIGN.md` §1 문구 수정 | UI·문서 | 동결 사유·일자 기록 |
| R4. 리뷰 M3 | `connection-layer`↔`institution-schema` 경로 정규화 단일화 | `js/` | 중복 함수 0건, 테스트 통과 |

**게이트**: R2 기록 존재(성공 또는 동결 결정).

**2단계 진행 현황 (2026-09-15)**: R4 완료(`js/connection-layer.js`·`js/institution-schema.js`의 저장 경로 정규화 중복을 `js/directions-service.js`의 `hasStoredRouteData`·`extractStoredRouteFields`로 통합, 63/63 테스트 유지, 에러 형태 차이는 보존). R3는 **동결이 아니라 문서 정정**으로 처리 — Pages 정본에서 도로경로가 안 되는 것은 확인된 사실(0단계에서 실측)이지만, Sites worker 자체가 분산 요청 제한을 지원하는지는 **미확인**(반박 아님)이므로 "동결"이라고 쓰지 않음. `DESIGN.md` §1·§9에 이 구분을 명시. **R1·R2는 열린 채로 남음**.

**진단 정정 (같은 날 늦게 확인)**: 처음에는 `git ls-remote sites`가 5초 타임아웃돼 "원격 접근 불가"로 기록했으나, 백그라운드로 더 오래 실행한 `git fetch sites`가 나중에 완료되며 실제 원인이 드러났다 — `fatal: User cancelled dialog.` / `could not read Username for 'https://git.chatgpt-team.site'`. 즉 **원격 자체는 응답하지만 자격증명(HTTP Basic 인증 등) 프롬프트가 필요**하고, 이 비대화형 세션은 그 프롬프트에 응답할 방법이 없어 대기하다 취소된 것이다("네트워크 접근 불가"가 아니라 "이 세션에 자격증명 없음"). 로컬에 캐시된 `sites/main`은 여전히 `d26bb21`(2026-07-17)에 머물러 있으며 현재 main보다 21커밋 뒤처져 있다. 다음 세션에서 이어가려면: 사용자가 대화형 터미널에서 직접 `git fetch sites`·`git push sites main`을 실행하거나(자격증명 프롬프트에 응답 가능), 또는 이 host용 git 자격증명을 사전에 설정해 두면 비대화형 세션도 가능해진다. `sites`로는 이 세션에서 push하지 않음(origin 승인과 별개 사안이며, 애초에 인증 실패로 시도조차 못 함).

### 3단계 — 단일화·디자인 완결 (1~2개월)

| 과제 | 작업 | 대상 | 완료 기준 |
|---|---|---|---|
| T6. 기능 인벤토리 | 구형 2페이지 기능(필터·검색·팝업·지정교유형·연락처·내보내기·반응형) 목록화 → unified-map 격차표 | `docs/feature-gap-2026.md`(신규) | 격차표 승인 |
| T9·T10. 기능 흡수 | `?view=schools`·`?view=infra` 프리셋, 격차 항목 이식 | `unified-map.html`, `js/` | 격차표 전 항목 이식, 테스트 통과 |
| T11. 구형 스텁화 | 리다이렉트 스텁 1배포 주기 → 제거. GNB·README·worker 자산 목록·`check-sensitive` 동시 갱신 | 구형 2종, `shared.js`, `tools/build-sites-worker.mjs` | 구형 URL 정상 이동, worker 자산 목록에 구형 0건 |
| T8-1. 폐기 토큰 | `#2a41b6`·`#4262ff`·`#0f172a` 제거, `index.html` 사문 다크 CSS 삭제, `atlas-theme.css` `!important` 의존 축소(구형 제거 시 자연 해소분 우선) | `unified-map.html`, `js/map-layers.js`, `shared.css`, `index.html` | 폐기 토큰 grep 0건, `!important` 건수 50% 이상 감소 |
| T2-④. 이모지 라벨 | ✕💡🌐✓ 텍스트·아이콘 대체 | `schools.html`, `infrastructure.html`, `shared.css` | 공개 파일 이모지 0건 |
| T12. 접근성 실측 | 파스텔 칩 대비(AA 4.5:1) 실측표, 색+형태 이중 부호화, 375px 터치 타깃 44px | `unified-map.html`, `atlas-theme.css` | 실측표 작성, 체크리스트 3절 통과 |
| T13. DESIGN 감사 | §7 체크리스트 + §8 CI 규정 + §9 Atlas 계약 전 항목 대조 | 전체 | 전 항목 "이행 완료" 표기 |
| T2-②③. 구조 정리 | 중첩 폴더 평탄화(`git mv`, 태그 선행, OneDrive 동기화 중지), 루트 빈 폴더 제거 | 래퍼 구조 | 저장소 루트 = 앱 루트 |

**게이트**: 구형 공개 페이지 0건 + DESIGN.md 전 항목 이행 + CI 녹색 + 실 키 스모크 재수행.

**3단계 진행 현황 (T6, 2026-09-15)**: `docs/feature-gap-2026.md` 작성·**승인 완료**(`39f653e`, push·CI green). 3개 서브에이전트가 `schools.html`·`infrastructure.html`·`unified-map.html`+`js/*` 전량을 각각 카탈로그화한 뒤 대조했고, 핵심 주장(죽은 코드 `openById()`, `institutions.json`/`infra.json` 레코드 수)은 직접 grep·Python 대조로 재검증했다. T9·T10 착수 전 반드시 해소해야 하는 선행 차단 요인 3건을 식별: ① `data/infra.json`(27건) 중 정확히 17건이 `institutions.json`에 미병합(이름 완전일치 기준 전수 대조) ② `?view=` URL 프리셋 매커니즘이 현재 0건(구현 전무) ③ `region`(강화·영종·인천시내) 필드가 데이터 스키마·상수 어디에도 없음. 사용자 결정 4건 확정: (1) 격차표 승인 (2) 담당 장학사(S3) 기능 — **이관(실사용 중으로 간주)**, T9 범위 포함 (3) infra.json 미병합 17건 — **정적 병합**(institutions.json에 흡수, 런타임 fetch 방식 아님) (4) push 승인. 커스텀 학교 단건 추가(S7) 대체 여부·구버전 `localStorage` 데이터 승계 여부는 T9 착수 시점에 재확인하기로 보류. **다음 착수 순서(격차표 §6-4)**: 데이터 병합(§1-1)+`region` 스키마 확장(§1-3) → `?view=` 프리셋 구현(S13·I7) → 사이드바 행 클릭→지도 연결(S15·I12, `openById()` 미호출 수정 1건으로 동시 해결) → 나머지 심각 등급(S2·S4, I1) → 중간·낮음 등급 일괄 처리. **T9·T10은 이 세션에서 착수하지 않음**(게이트 준수).

**3단계 진행 현황 (T9·T10 1차, 2026-09-15)**: 격차표 심각 9건 전부와 중간 일부(S5·S6·I5·S10 일부·S12) 이식. 세부는 `docs/feature-gap-2026.md` §7. 2차 이월 9건은 같은 절 마지막 행. T11(구형 스텁화)은 2차 이월분 처리 뒤 착수.

**3단계 진행 현황 (2차 이월분, 2026-09-15)**: 2차 이월 9건 처리 완료. 세부는 `docs/feature-gap-2026.md` §8. 결함(보기 전환 뒤 선택 패널 잔존) 수정, S11/I6 마커 유형별 아이콘(모양+색상, DESIGN.md §9 준수, 폐기 토큰 정리 포함), S16 본청 관할 안내 문구 추가. 사용자 확인 결과 S1(드롭다운 유지)·S7(일괄 가져오기로 대체, 미이관 확정)·G1(고정 폭 유지, 미이관 확정)은 변경하지 않기로 확정. I8은 기존 문구가 요건을 충족해 변경 없음. I11은 폴백 없음 유지로 가정하고 진행(단일 진실 원천 원칙). S14는 T12로 계속 이월. 단위 테스트 83/83.

**3단계 진행 현황 (T11 1단계, 2026-09-15)**: `schools.html`·`infrastructure.html`을 리다이렉트 스텁으로 전환(각 1,308·1,055줄 → 29줄), GNB·README·워커 자산 목록·`docs/data-update-guide.md`를 함께 갱신. 세부는 `docs/feature-gap-2026.md` §9. `tests/office-data.test.mjs`는 커버리지 손실 없음을 확인 후 삭제(harness 자동 모드 분류기가 삭제 명령을 차단해 사용자가 터미널에서 직접 실행). **3단계 종료 게이트("구형 공개 페이지 0건")는 아직 미충족** — 이번은 스텁 전환(1단계)만이며, 파일 완전 제거(2단계)는 1배포 주기 경과 확인 후 별도 승인을 받아 진행한다.

**3단계 진행 현황 (T8-1·T2-④, 2026-09-16)**: 폐기 토큰 `#2a41b6`·`#4262ff`·`#0f172a` 추적 파일 **grep 0건 달성**(`#0f172a` 7건 처리 — `index.html` 사문 선언 1건 삭제, `shared.css` 5건 ink `#1c1c1e` 교체, 1건은 죽은 위젯 블록과 함께 삭제). 이모지는 UI 파일(HTML·CSS·JS) **0건 달성**(`shared.css`의 죽은 체크박스 위젯 39줄 제거로 `✓` 소멸, `✕`·`💡`·`🌐`는 T11 스텁화로 이미 소멸, `shared.js`의 과거 `❌`·`⏱️`는 현재 0건 실측). `atlas-theme.css` `!important`는 415 → 240건(**175건, 42.2% 감소**, 죽은 규칙 71개 제거, 742 → 469줄)으로 **완료 기준 50% 미달** — 잔여는 대부분 `unified-map.html` 인라인 스타일을 덮는 실사용 `.um-*` 규칙이라, 두 시트 병합과 화면 회귀 검증을 동반하는 별도 변경으로 이월한다. 측정 방법과 판정 근거는 `docs/feature-gap-2026.md` §10.

**3단계 진행 현황 (T12 접근성 실측, 2026-09-16)**: 완료 기준 3절 전부 통과. ① 파스텔 칩 대비 **20쌍 전부 AA 통과**(최소 4.71:1, `.um-popup-chip` 기본) ② 색+형태 이중 부호화 충족(마커 글리프·모양, 모든 칩에 텍스트 라벨 동반) ③ 375px 터치 타깃 **결함 2종·5개 발견·수정** — `.um-row-focus` 40px(44px 목록 누락)과 `.um-search`·`.um-input` 42px(`atlas-theme.css:99-103`의 `input[type=...]`이 (0,1,1)로 767px 블록의 클래스 선택자 (0,1,0)을 **특이성으로** 이기던 것). `atlas-theme.css` 수정은 기존 44px 규칙의 **선택자 목록만 확장**해 `!important`는 240건 그대로다 ④ **200% 확대(640px)·400% 확대(320px) 모두 가로 스크롤 0건**(두 화면 × 두 폭, 우측 경계 초과 요소 0건). 실측표는 `docs/feature-gap-2026.md` §11. S14(반응형 이월분)도 `.um-map-area` 높이 충돌 소지가 판정돼 **해소**했다.

측정 경위에 정정이 있다(§11-4에 기록). 1차에서 설명되지 않는 값 2개를 함께 "계측 도구 결함"으로 오판해 정상 규칙 `min-height: 760px !important`를 제거했다가 되돌렸다. 실제로는 `.um-map-area` 620px만 도구 문제였고, `.um-search` 42px은 **측정이 옳았으며 선택자 특이성으로 완전히 설명되는 실제 결함**이었다. 오판의 원인은 "매칭 규칙 집합이 같으면 계산값도 같다"는 잘못된 전제였다.

**3단계 종료 게이트 점검 (2026-09-16 기준)**: 4개 조건 중 1개 충족.

| 조건 | 상태 | 근거 |
|---|---|---|
| 구형 공개 페이지 0건 | 미충족 | 스텁 파일 2개 존재 — T11 2단계(완전 제거) 대기 |
| DESIGN.md 전 항목 이행 | 미충족 | T13 감사 미실시. T8-1 `!important` 42.2%(목표 50%). **T12는 완료**(§11 — 대비·이중 부호화·터치 타깃·200% 확대 4항 전부 통과) |
| CI 녹색 | 충족 | 최근 push(`0a1a70b`) CI·Pages 모두 success |
| 실 키 스모크 재수행 | 미충족 | 지도 키 의존 동작(마커·팝업·자동 맞춤·주소 좌표 갱신) 미검증, R1·R2·T3 미해결 |

### 4단계 — 정착 (반복)

| 과제 | 주기 | 완료 기준 |
|---|---|---|
| T14. 데이터 갱신 | 3.1./9.1. 직후 | 갱신 실적 기록, 메타데이터·고지·화면 기준일 일치 |
| T15. 로컬 전용 페이지 | 단일화 후 1회 | `business.html`·`private-local-map.html` 이관 또는 동결 결정 기록(카카오 전용 상태 유지 여부 포함) |
| T16. Phase 2 트리거 | 갱신 시마다 | 좌표 없는 신규 주소 50건 이상 시 별도 계획 |
| P3-4. 배포 근거 보존 | 배포마다 | 테스트·스모크·스크린샷 릴리스 단위 보존 위치 명시 |

---

## 4. 일정 총괄

| 단계 | 상대 일정 | 순작업 | 게이트 |
|---|---|---|---|
| 0단계 기준선 복구 | 착수 즉시 | 0.5일 | push 후 Actions 녹색 |
| 1단계 안정화 완결 | 1~2주차 | 약 4.5일 | 고지·절차서·스모크·문서 현행화 완료 |
| 2단계 도로경로 실증/동결 | 3주차 | 약 1.5일 | 스테이징 스모크 5항목 기록 |
| 3단계 단일화·디자인 | 4주차~2개월 | 약 8~10일 | 구형 페이지 0건, DESIGN 전 항목 |
| 4단계 정착 | 이후 반복 | 갱신 1회 0.5일 | 연 2회 실적 |

순작업 합계 약 15~16.5일. 달력 일정은 게이트 통과 기준으로 관리(날짜 고정 아님).

---

## 5. 검증 체계

| 검증 | 명령·방법 | 시점 |
|---|---|---|
| 구문 | `npm run check` | 매 커밋(CI) |
| 단위테스트 | `npm test` | 매 커밋(CI) |
| 좌표·권역 | `npm run validate:data` | 매 커밋(CI) |
| 민감파일 | `node tools/check-sensitive.mjs` (D2 확장 후 NCP 패턴 포함) | 매 커밋(CI) |
| worker 동기 | `npm run build:sites` 후 `dist/server/index.js` SHA-256 비교 | 배포 전 |
| 브라우저 QA | fake 공급자 통합 QA(`run-integrated-static-qa.mjs`) — 네이버 facade 대응 여부 확인 후 사용 | 단계 게이트 |
| 실 키 스모크 | 체크리스트 6절(공급자별) | 배포 직후 매회 |
| 도로경로 스모크 | 2단계 R2 5항목 | worker 배포 시 |

---

## 6. 리스크·대응

| 리스크 | 영향 | 대응 |
|---|---|---|
| 미push 상태 장기화 | 로컬 단일 사본 유실, 배포 2종 모두 구버전 | 0단계 S4를 첫 작업으로 고정. push 전 태그 |
| 배포 이원화 방치 | 어느 URL이 정본인지 불명, 문서 괴리 재발 | N1 결정 후 README에 대상별 역할 1표로 명시 |
| worker 호스팅의 `limit()` 바인딩 미지원 | 도로경로 영구 503 | R3 동결 분기 사전 정의. 정적 기능은 무영향 |
| 훅 결함 재발 | 세션 도구 차단, 작업 반복 실패 | S1에서 제거·복구. 유사 훅 추가 시 스크립트 존재 검증 |
| 서체 라이선스 미확인 배포 | 저작권 문제 | D4에서 확인 불가 시 즉시 제거 |
| 구형 기능 누락 이식 | 실사용 기능 상실 | T6 격차표 승인 전 T9·T10 착수 금지(7월 원칙 유지) |
| 9.1. 학기 데이터 미갱신 | 폐교·이전 미반영 오안내 | T5 절차서에 즉시 확인 항목 포함, 결과 기록 |
| 중첩 폴더 평탄화 중 이력 훼손 | git 추적 곤란 | 3단계 말미로 후순위. 태그·`git mv`·OneDrive 중지 |
| 교육청 CI 오용 | 공식 채널 오인 | D5 유지. T13 감사 항목 |

---

## 7. 산출물·성공 기준

| 산출물 | 단계 | 확인 방법 |
|---|---|---|
| `.gitignore`·`.gitattributes` 갱신, 태그 `pre-sync-2026-09`, Actions 녹색 | 0 | `git status` 미추적 0건, Actions success |
| 고지 3종 반영 화면 4면 | 1 | grep 4면 각 1건 이상 |
| `docs/data-update-guide.md` | 1 | 절차 6단계 + 2026-09 확인 기록 |
| 체크리스트 6절 실측 행 2건(네이버·카카오) | 1 | 기록표 |
| README·체크리스트 현행화 | 1 | 네이버·worker·배포 역할 기재, 죽은 경로 0 |
| `check-sensitive.mjs` NCP 패턴 | 1 | 위반 샘플 실패 확인 |
| 서체 라이선스 기록 또는 파일 제거 | 1 | DESIGN.md §3 기록 |
| 도로경로 스테이징 스모크 5항목 기록 또는 동결 기록 | 2 | 문서 |
| `docs/feature-gap-2026.md` | 3 | 승인 |
| 폐기 토큰·이모지 0건, 구형 공개 페이지 0건, DESIGN 감사 완료 | 3 | grep·감사표 |
| 데이터 갱신 실적 | 4 | 연 2회 기록 |

1차 완료 판정: 0~2단계 산출물 전부 존재 + CI 녹색 + 운영 URL이 로컬 main과 동일 버전.

---

## 8. 착수 조건·사용자 결정 요청

- 착수 즉시 가능: 0단계 S1(훅 제거)·S2(`.gitignore`)·S3(`.gitattributes`) — 단, `vendor/*.bak` 삭제와 push(S4)는 파일 목록 제시 후 승인
- 결정 요청(핵심 1건): **N1 배포 정본** — 권장 C(Pages 정본 + Sites 실증용). 응답 전까지는 Pages 정본 가정으로 1단계 문서 작업 진행
- 부수 결정: N3 서체(확인 불가 시 제거), N4 즐겨찾기 모듈(삭제) — 이의 없으면 권장안 적용
