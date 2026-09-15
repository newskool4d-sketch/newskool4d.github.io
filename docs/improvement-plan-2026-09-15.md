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
| T6 기능 인벤토리 | 미착수 | 격차표 문서 없음 |
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

### 2단계 — 도로경로 실증 또는 동결 (N1 결정 후 1주)

| 과제 | 작업 | 대상 | 완료 기준 |
|---|---|---|---|
| R1. Sites 동기화 | `npm run build:sites` 후 `sites/main`을 로컬 main과 일치 | `dist/server/index.js`, 원격 `sites` | `sites/main` = main HEAD |
| R2. 스테이징 스모크 | 실 자격증명·바인딩 설정 후 ① 동일 출처 200 ② 교차 출처 403 ③ 인천 권역 밖 400 ④ 13번째 요청 429 + `Retry-After: 60` ⑤ 바인딩 제거 시 503 | 운영 worker | 5항목 실측 기록(`docs/` 또는 `.omo/evidence/`) |
| R3. 동결 분기 | R2 실패·호스팅 미지원 시: UI `configuration-error` 상태 유지 확인, README에 "도로경로 미제공" 명시, `DESIGN.md` §1 문구 수정 | UI·문서 | 동결 사유·일자 기록 |
| R4. 리뷰 M3 | `connection-layer`↔`institution-schema` 경로 정규화 단일화 | `js/` | 중복 함수 0건, 테스트 통과 |

**게이트**: R2 기록 존재(성공 또는 동결 결정).

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
