# newskool4d.github.io 인천교육 공개지도

관내학교 디렉토리와 체험교육기관 안내처럼 공개 가능한 정보만 제공하는, 개인 제작 참고자료 지도 사이트입니다. 공식 자료가 아니며, 학교 현황은 인천광역시교육청 홈페이지 공개 자료(2026.4.1. 기준)를 준용합니다.

## 배포 대상 2종과 정본

이 저장소는 두 곳에 배포됩니다. **정본은 GitHub Pages(정적)** 이며, 두 번째 대상은 도로경로(Directions) 기능 실증을 위한 보조 배포입니다.

| 배포 대상 | 호스팅 | 제공 기능 | 상태 |
| --- | --- | --- | --- |
| GitHub Pages (정본) | `https://newskool4d-sketch.github.io/newskool4d.github.io/` | 검색·필터·지도 타일·마커·업로드/내보내기. **도로경로(`/api/directions`)는 정적 호스팅 특성상 제공되지 않음** — 요청 시 GitHub Pages 자체의 404가 반환되어 "도로경로 요청 실패"로 표시됨(설정 미비 안내가 아님, 알려진 제약) | 운영 중 |
| Sites worker (도로경로 실증용 보조) | 별도 서버 런타임(`tools/build-sites-worker.mjs`로 생성한 `dist/server/index.js`) | Pages와 동일한 정적 자산 + `/api/directions`(네이버 Directions 5 프록시) | 실증 단계 — 정본 승격 전 |

리포지토리 루트 자체가 GitHub Pages의 서빙 대상입니다. 별도 `public-site` 폴더로 파일을 옮겨 담는 절차는 없습니다. `Settings > Pages`에서 `main` 브랜치 루트를 배포 소스로 지정하면 push 즉시 반영됩니다.

## 공개 배포 범위

| 파일·폴더 | 공개 배포 여부 | 용도 |
| --- | --- | --- |
| `index.html`, `unified-map.html` | 포함 | 공개 지도 화면 2개 |
| `schools.html`, `infrastructure.html` | 포함 | 리다이렉트 스텁 — `unified-map.html?view=schools`/`?view=infra`로 즉시 이동. 과거 공문·안내자료에 남아 있을 수 있는 주소를 살려 두기 위해 **영구 존치**한다(2026-09-16 결정, 삭제 시 영구 404) |
| `shared.css`, `atlas-theme.css` | 포함 | 공개 지도 공통 디자인·지도 SDK 로더 |
| `shared.js` | 포함(공개 화면에서는 미사용) | 과거 `schools.html`·`infrastructure.html`의 GNB 렌더링 함수. 스텁 전환으로 두 파일 모두 더는 로드하지 않으며, 로컬 비공개 도구에서만 계속 사용 |
| `js/*.js` | 포함 | `unified-map.html` ES 모듈(공급자 어댑터, 가져오기, 스키마, 도로경로 클라이언트 등) |
| `data/schools.json`, `data/infra.json`, `data/institutions.json`, `data/connections.json`, `data/schools-directory-metadata.json` | 포함 | 공개 가능한 학교·기관 데이터와 출처 메타데이터 |
| `data/institutions.sample.csv`, `data/qa/synthetic-1000.csv` | 포함 | 가져오기 템플릿·QA 픽스처(허용 목록, `tools/check-sensitive.mjs` 참조) |
| `dist/server/index.js` | Sites worker 배포에만 사용, GitHub Pages에는 무영향 | `npm run build:sites` 생성물 |
| `business.html`, `private-local-map.html`, `PRIVATE_LOCAL_APP_README.md`, 업무용 CSV | 제외 | 로컬 비공개 앱에서만 사용(`.gitignore`·`tools/check-sensitive.mjs`가 이중 차단) |

전체 개발 폴더를 그대로 업로드하지 마세요. `business.html`, `private-local-map.html`, 업무용 CSV, 민감정보 파일은 공개 저장소에 포함하지 않습니다.

## 통합지도 보기 주소

| 주소 | 보기 |
| --- | --- |
| `unified-map.html` | 전체 |
| `unified-map.html?view=schools` | 학교(학교급·지정교유형·담당 장학사 필터) |
| `unified-map.html?view=infra` | 교육기관·체험처(유형·권역 필터) |

필터와 지도 위치는 주소에 저장되어 새로고침·공유 시 그대로 복원됩니다. 담당 장학사·지정교유형은 이 브라우저에만 저장되며, 과거 `schools.html`이 쓰던 저장값(`incheon_school_supervisors`, `incheon_school_designations`)과 같은 키를 그대로 읽고 씁니다.

## 지도 공급자 설정 (네이버 기본 · 카카오 대체)

`js/map-provider.js`가 두 지도 공급자를 같은 인터페이스로 감쌉니다. 기본값은 네이버 지도이며, GNB의 지도 연결 설정 모달에서 카카오로 전환할 수 있습니다(전환 시 페이지가 새로고침되어 한 번에 한 SDK만 지도 캔버스를 소유합니다).

| 공급자 | 필요한 키 | 발급처 | 도메인 등록 위치 | 브라우저 저장 키 |
| --- | --- | --- | --- | --- |
| 네이버 지도(기본) | Maps JavaScript **Client ID** | Naver Cloud Platform(NCP) 콘솔 | NCP 콘솔 > Application > Web 서비스 URL | `incheon_naver_map_client_id` |
| 카카오 지도(대체) | JavaScript 키(`appkey`) | Kakao Developers | Kakao Developers > 내 애플리케이션 > 플랫폼 > Web 사이트 도메인 | `incheon_kakao_js_key` |

등록할 운영 주소:

```text
https://newskool4d-sketch.github.io
http://localhost:8080
```

두 키 모두 브라우저 JavaScript 키/Client ID이며, 네트워크 요청과 개발자 도구에서 보일 수 있으므로 비밀값으로 취급하지 않습니다. 대신 콘솔에서 허용 도메인을 제한하고 실제 값은 커밋하지 않습니다. 앱은 사용자가 입력한 값을 공급자별 storage key로 브라우저 `localStorage`에 저장해 재사용합니다. localStorage는 암호화 저장소가 아니며, 브라우저 데이터 삭제 또는 앱의 초기화 절차로 지울 수 있습니다.

REST 방식 좌표 검색(Kakao Local REST API, `Authorization: KakaoAK ...`)은 여전히 서버 전용입니다. `KAKAO_REST_API_KEY` 값을 브라우저 코드, HTML, 공개 정적 파일에 넣지 않습니다.

## 도로경로(Directions) 서버 — Sites worker 전용, 정본 배포에는 없음

`unified-map.html`의 연결선 기능은 도로 경로 계산을 지원하지만, 이 계산은 **정적 GitHub Pages가 아니라 별도 Sites worker에서만** 동작합니다.

- 클라이언트: `js/directions-service.js` → 동일 출처 `GET /api/directions?start=lng,lat&goal=lng,lat` 호출만 수행. 자격증명은 클라이언트에 전혀 없음.
- 서버: `tools/build-sites-worker.mjs`가 정적 자산 전부(HTML·CSS·JS·데이터·서체)와 `/api/directions` 핸들러를 `dist/server/index.js` 한 파일로 번들링. 변경 시 반드시 `npm run build:sites`로 재생성 후 커밋합니다(그렇지 않으면 배포된 worker가 소스와 어긋납니다).
- 필요한 환경변수(worker 호스팅 쪽에만 설정, 저장소에는 절대 커밋하지 않음):
  - `NAVER_DIRECTIONS_CLIENT_ID`, `NAVER_DIRECTIONS_CLIENT_SECRET` — 네이버 Directions 5 자격증명(NCP 콘솔에서 별도 발급, 지도 표시용 Client ID와는 다른 자격증명)
  - `DIRECTIONS_RATE_LIMITER` — `limit({ key })`를 지원하는 분산 요청 제한기 바인딩(분당 12회). 없으면 worker는 503으로 fail-closed하며, 인스턴스별 카운터로 대체하지 않습니다.
- 안전장치: 동일 출처만 허용(교차 출처 403), 인천 권역 좌표만 허용(권역 밖 400), 업스트림 8초 타임아웃, 자격증명 미설정 시 503.
- **정적 Pages에서의 동작(2026-09-15 확인)**: `https://newskool4d-sketch.github.io/...`에서 지도 경로 저장을 시도하면 `/api/directions`가 GitHub Pages 자체 404(HTML)를 반환합니다. `fetchRoadRoute`는 이를 `directions_request_failed`로 표시합니다 — 이는 서버 설정 오류가 아니라 정적 호스팅의 구조적 제약이며, 정본(Pages) 배포에서는 도로경로 기능이 제공되지 않는다는 뜻입니다. Sites worker 쪽 배포로 접속해야 이 기능을 확인할 수 있습니다.

## 로컬 비공개 앱

업무용 커스텀 디렉토리와 민감정보 학교명 자동 매칭 도구(`business.html`, `private-local-map.html`)는 이 저장소 루트에 파일로 존재하지만 `.gitignore`와 `tools/check-sensitive.mjs`로 이중 차단되어 있어 공개 배포에 포함되지 않습니다. 별도 폴더로 분리돼 있지는 않습니다 — 로컬 PC에서 저장소를 통째로 클론한 뒤 이 두 HTML 파일만 직접 열어 실행합니다. 실행 방법과 카카오 키 등록은 `PRIVATE_LOCAL_APP_README.md`(비공개 문서, 저장소 내 위치)를 따릅니다.

비공개 앱 운영 원칙:

- 공개 GitHub Pages·Sites worker에 업로드하지 않음(둘 다 정적 자산 목록에서 두 파일을 제외)
- 업무용 CSV와 민감정보 파일을 저장소에 포함하지 않음
- 필요한 파일은 사용자 PC에서 직접 불러옴
- 실행 전 관리자 코드 또는 내부 안내를 별도로 전달함
- 카카오 지도만 사용 — `js/map-provider.js`의 네이버/카카오 어댑터를 쓰지 않고 독립된 Kakao SDK 로더를 그대로 유지합니다(공개 지도의 네이버 전환과 무관, 2026-07 이관 대상 여부는 미결 — 계획 문서 T15)

## 로컬 확인

`package.json`의 스크립트로 검증한 뒤 정적 서버를 띄웁니다.

```bash
npm run check        # 구문검사 (tools/check-syntax.mjs)
npm test             # 단위테스트 (tests/*.test.mjs)
npm run validate:data
npm run serve        # 기본 127.0.0.1:8011, 사용 중이면 8020까지 자동 폴백
```

브라우저에서 안내된 주소(기본 `http://127.0.0.1:8011/`)로 접속합니다. Sites worker 배포 전에는 `npm run build:sites`로 `dist/server/index.js`를 최신 소스와 동기화합니다.

## Vendored browser libraries

| File | Source | Version | License |
| --- | --- | --- | --- |
| `vendor/xlsx.full.min.js` | SheetJS `xlsx` (원본 `https://unpkg.com/xlsx@0.18.5/...`에서 도입 후 보안 패치 적용) | `0.20.3`(프로토타입 오염·ReDoS 패치, 2026-07-11 갱신) | Apache-2.0, see `vendor/xlsx.LICENSE.txt` |

The spreadsheet importer uses this local browser asset so CSV/XLS/XLSX preview can run in the static app without a bundler or runtime CDN dependency.
