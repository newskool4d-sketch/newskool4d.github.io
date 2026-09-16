# 기능 격차표 — 구형 페이지 → unified-map.html (T6, 2026-09-15)

> 3단계(단일화·디자인 완결) T6 산출물. `docs/improvement-plan-2026-09-15.md` 3장 3단계 표의 게이트: **"T6 격차표 승인 전 T9·T10 착수 금지"**.
> 대상: `schools.html`(1,307줄) · `infrastructure.html`(1,054줄) → `unified-map.html`(892줄) + `js/*.js`.
> 방법: 3개 병렬 서브에이전트가 각 파일을 전량 읽어 독립적으로 카탈로그를 작성한 뒤, file:line 기준으로 대조. 추정 금지 — unified-map 쪽 미확인 항목은 "확인 필요"로 별도 표기.

---

## 1. 선행 차단 요인 (T9·T10 착수 전 반드시 해소)

T9·T10은 `?view=schools`·`?view=infra` URL 프리셋으로 구형 기능을 이식하는 작업이다. 격차 이식 이전에 아래 3가지 구조적 결함이 먼저 해소되어야 하며, 해소 전 T9·T10 착수는 "구형 기능 누락 이식 → 실사용 기능 상실" 리스크(계획서 6장)를 그대로 실현한다.

### 1-1. 데이터 미병합 — `data/infra.json`(27건) 중 정확히 17건이 `data/institutions.json`에 없음 [심각]

`unified-map-app.js`는 `data/institutions.json` 1개 파일만 `fetch`한다(`js/unified-map-app.js:160-164`). `data/infra.json`·`data/schools.json`은 런타임에 아예 로드되지 않는다.

**전수 대조 결과** (Python 스크립트로 두 JSON을 직접 파싱해 이름 문자열 완전일치 기준 대조 — 근사치 아님):

| infra.json 카테고리 | 건수 | 이름일치(이미 병합) | 미병합 |
|---|---|---|---|
| `office`(본청·교육지원청) | 6 | **6** (본청 1 + 지원청 5, 전부 일치) | 0 |
| `direct`(직속기관) | 6 | 1 | 5 — 인천난정평화교육원, 제물포 AI융합교육센터, 학생안전체험관, 학생교육문화회관, 평생학습관 |
| `isec`(학생교육원·야영장) | 4 | 1 | 3 — 서사체험학습장, 흥왕체험학습장(마리관), 국화리학생야영장 |
| `partner`(연계체험처) | 3 | 1 | 2 — 강화 광성보, 강화 화문석문화관 |
| `library`(공공도서관) | 8 | 1 | 7 — 신트리·부평·주안·화도진·서구·계양·연수도서관 |
| **합계** | **27** | **10** | **17** |

`data/schools.json`(967건)은 `institutions.json`에 `type:"school"`로 전량 병합되어 있다(967=967, 확인됨). **인프라 쪽만 17건이 누락**이며, 특히 `office`(본청·지원청) 카테고리는 이미 100% 병합되어 있다 — §4의 `office`→`headquarters`/`support-office` 분리는 데이터 관점에서는 이미 반영이 끝난 상태이고, 남은 문제는 필터 UI가 이 분리를 다룰 수 있는가(§1-2)이다. `?view=infra` 프리셋을 아무리 잘 만들어도 도서관·체험학습장·직속기관 다수가 표시될 데이터 자체가 없다 — T9·T10보다 먼저 해결해야 하는 **최상위 차단 요인**.

*주: "이름 문자열 완전일치"는 근사 지표다. 표기가 달라 실제로는 이미 존재하는 레코드가 "미병합"으로 잘못 집계됐을 가능성을 배제할 수 없다 — T9 착수 전 17건을 1건씩 육안 대조해 확정할 것.*

**해소안(택1, 승인 필요)**: (a) 미병합 17건을 유형 매핑표(§4)에 따라 `institutions.json` 스키마로 변환해 병합, 또는 (b) `unified-map-app.js`가 `infra.json`도 함께 `fetch`해 런타임에 합치도록 수정. (a)가 단일 정본 유지 원칙에 부합.

### 1-2. `?view=` URL 프리셋 — 현재 0건 [심각]

전체 `js/` 트리·`unified-map.html`을 grep한 결과 `URLSearchParams`(Directions API 호출 1건 제외) · `location.search` · `location.hash` · `view=` 어디에도 프리셋 파싱 로직이 없다(`unified-map-app.js` 전체 확인). T9·T10이 전제하는 매커니즘 자체가 아직 존재하지 않으므로, 이식 작업의 절반은 "격차 이식"이 아니라 "프리셋 기능 신규 구현"이다.

**구조적 전제조건 — `#type-filter`는 단일선택이다.** `?view=infra`는 `headquarters`·`support-office`·`direct-agency`·`library`·`experience-site`·`partner` 6개 유형 코드를 동시에 켠 상태여야 한다(§4). 그런데 `unified-map.html:741-753`의 `#type-filter`는 `&lt;select&gt;` 단일선택 드롭다운이다. 즉 **다중선택 UI로의 전환은 I1의 부수 작업이 아니라, `?view=infra` 프리셋이 존재하기 위한 구조적 선행 조건**이다 — 단일선택 구조를 유지한 채로는 프리셋이 "쿼리 파라미터 파싱"만으로 끝나지 않는다.

**프리셋별 필터 기본값 (신규 설계, T9 착수 시 그대로 사용)**

| 프리셋 | office 기본값 | type 기본값 | level | region | 비고 |
|---|---|---|---|---|---|
| `?view=schools` | `all`(관할 6종 버튼은 별도 유지, §S1) | `school` 고정 | 9종 다중선택 UI 신설(§S2) | 해당없음 | 검색창 placeholder를 "학교명" 중심으로 축소할지는 T9에서 결정 |
| `?view=infra` | `all` | `headquarters, support-office, direct-agency, library, experience-site, partner` 6종 동시 ON(다중선택 UI 신설 필요) | 해당없음 | 3종 다중선택 UI 신설(§1-3, §I2) | `school`·`imported`는 기본 OFF |

### 1-3. `region`(권역: 강화도/영종도/인천시내) 필드 — 스키마·상수 어디에도 없음 [심각]

`infrastructure.html`의 3대 필터 중 하나인 권역 필터(`chk-reg-ganghwa`/`yeongjong`/`incheon-city`, `infrastructure.html:159-182`)는 `js/institution-schema.js`·`js/constants.js` 어디에도 대응 필드가 없다(`validateInstitution`에 `region` 검증 없음, `constants.js`에 `REGION_*` export 없음 — 직접 확인). `?view=infra` 이식 시 데이터 스키마 확장(신규 필드 + validator 추가)이 선행되어야 한다.

---

## 2. schools.html → unified-map.html 격차표

| # | 기능 | 구형 위치 | unified 대응 | 판정 | 우선순위 | 비고 |
|---|---|---|---|---|---|---|
| S1 | 관할(office) 단일선택 — 버튼 6종 | `schools.html:230-237` | `#office-filter` 드롭다운, 동일 7코드(+`unassigned`) (`unified-map.html:728-739`) | 부분이관 | 낮음 | UI만 버튼→드롭다운. 선택 시 학교급/검색 카드 잠금 해제하는 "가이드 워크플로" 연출은 unified에 없음(§S16 참조) |
| S2 | 학교급(9종: 유치원~학력인정평생) 다중선택 체크박스 | `schools.html:305-349` | **없음** — `institution-schema.js`는 `level` 필드를 검증하지 않고(§ validateInstitution), `filters.level`은 API엔 있으나(`institution-repository.js:214`) UI 미연결 | 미이관 | 심각 | `?view=schools` 필수 선행 작업. 9종 체크박스 UI 신설 + `institution-schema.js`에 level 검증 추가 필요 |
| S3 | 담당 장학사(supervisor) 지정 입력 + 단일선택 필터 | `schools.html:275-278, 697-760`, `localStorage: incheon_school_supervisors` | **완전히 없음** — supervisor 개념이 `js/` 어디에도 존재하지 않음(전량 grep 확인) | 미이관 | 심각 | 장학사 배정은 업무상 핵심 기능으로 추정됨 — 이식 여부(유지/폐기) 자체를 사용자 확인 필요(§6 질의사항) |
| S4 | 지정교유형(designation) 입력+저장 UI, datalist 7종 제안, 단일선택 필터 | `schools.html:281-296, 530-536, 697-730` | **표시(칩)만 존재**(`unified-map-app.js:124`) — 입력/저장 UI 없음(importer.js를 통한 벌크 업로드만 가능), 필터 select 없음 | 부분이관 | 심각 | importer.js는 이미 `designation` 별칭 인식(`js/importer.js:12,16-20`) — 개별 편집 UI + 필터 select 신설 필요 |
| S5 | 검색 — Places API 동적 키워드 검색, 결과를 자동으로 `customSchools`에 추가 | `schools.html:1230-1305` | 대체 있음: 다필드(name/address/office코드/type코드/level/designation/customFields) 실시간 substring 검색(`institution-repository.js:197-205`), 디바운스 없음 | 기능 대체(성격 상이) | 중간 | schools.html 검색=필터+신규학교추가 겸용, unified 검색=필터 전용. "검색해서 새 학교 추가" 서브기능은 벌크 임포트로 흡수 가능하나 단건 추가 UX 상실(§S7) |
| S6 | 연락처(전화/홈페이지) — 목록 행 + 팝업 양쪽 표시 | 목록 `schools.html:1120-1123`, 팝업 `schools.html:1181-1182` | 목록 행에는 있음(`unified-map-app.js:116-119`, `tel:` 링크 + `safeExternalUrl` 검증 홈페이지 링크) / **팝업에는 phone·website 미표시**(`map-layers.js` popupHtml, 필드 없음) | 부분이관 | 중간 | 팝업 템플릿(`js/map-layers.js:48-65`)에 phone/website 행 추가 필요 |
| S7 | 커스텀 학교 단건 추가(검색 결과 기반, 자동 id/office/level 산정) | `schools.html:1230-1305`, `localStorage: incheon_custom_schools`, 최대 200건 | **없음** — 벌크 CSV/XLSX 임포트만 가능(`js/importer.js`), 단건 추가 UI 없음 | 미이관 | 중간 | 현장에서 학교 1곳만 급히 추가해야 하는 사용 패턴이면 임포트 흐름이 더 번거로움 — 실사용 빈도 확인 필요 |
| S8 | 커스텀 학교 삭제 | 구형에도 **없음**(수동 localStorage 초기화만 가능) | 없음(기관 삭제 기능 자체 없음, connection 삭제만 가능) | 해당없음 | — | 양쪽 다 없는 기능이라 격차 아님 |
| S9 | Export/Import | 구형에는 **없음** | JSON 통합 export(`institutions+importedInstitutions+connections`), CSV/XLSX/CSV import, 샘플 템플릿 다운로드(`unified-map-app.js:259-266`, `institution-repository.js:223-234`) | unified 우월 | — | 순증 기능. 이관 이슈 없음 |
| S10 | `localStorage` 키 3종 — `incheon_school_supervisors`, `incheon_school_designations`, `incheon_custom_schools` | `schools.html:523,527,540` | 대응 키 없음. unified은 `incheon_institution_imports_v1` 단일 키(재임포트 시 덮어씀 — §U1 참고) | 미승계 | 중간 | 기존 사용자가 브라우저에 저장해 둔 장학사·지정교유형·커스텀학교 데이터를 승계할지(마이그레이션 스크립트) 결정 필요 |
| S11 | 지도 마커 — 본청(빨강)/지원청(별) 아이콘 구분, 학교 마커는 기본 아이콘 | `schools.html:783-792, 983-987` | 전부 기본 핀, 카테고리별 아이콘 없음(`CATEGORY_META.color`가 정의는 되어 있으나 실제 마커 렌더링에는 미사용 — 죽은 코드, `js/map-layers.js:3-12` vs `:113`) | 후퇴 | 중간 | 본청/지원청 구분 아이콘 상실. 학교 자체는 원래도 구분 없었으므로 그 부분은 영향 없음 |
| S12 | 전체보기(fit-to-bounds) 버튼, 최초 로드 시 자동 fit | 버튼 `schools.html:391`, 자동 fit `schools.html:815` | 버튼 대응 있음(`마커 범위 맞춤`, `unified-map-app.js:267-271`) / **최초 로드 자동 fit 없음**(`sync()` 호출 시 `{fit:true}` 미전달, `unified-map-app.js:104`) | 부분이관 | 낮음 | 최초 진입 시 인천 고정 중심(37.4563,126.7052)에서 시작, 수동 클릭 필요 |
| S13 | URL 상태 동기화 — office/학교급(일부)/장학사 → URL 쿼리, 새로고침 시 복원 | `schools.html:855-880` | **없음** — `js/` 전체에 URL 파싱 로직 0건 | 미이관 | 심각 | §1-2(`?view=` 프리셋 자체 부재)와 직결 — 프리셋 구현 시 함께 해결 가능 |
| S14 | 반응형 — 1040px 이하 사이드바 상단 스택+리사이저 숨김, 768/480px 터치타깃·그리드 조정 | `shared.css:851-1078` (schools.html 공용) | 유사 반응형 존재하나 브레이크포인트 상이(767px/1100px, `unified-map.html:630-699`) + `atlas-theme.css` 추가 오버라이드(`:659-742`, 두 스타일시트 간 `.um-map-area` 높이값 충돌 소지 있음, §T12에서 실측 필요) | 유사 대응(세부 불일치) | 중간 | T12(접근성 실측)에서 375/768px 정밀 검증 시 함께 처리 |
| S15 | 접근성 — 목록 행 키보드 활성화(Enter/Space) + 클릭 시 지도 이동·팝업 오픈 + 팝업 닫을 때 포커스 복귀 | `schools.html:616-627, 1204-1213` | **행 자체가 클릭 불가** — `openById()` 함수는 존재하나(`js/map-layers.js:140-147`) 어디서도 호출되지 않음(`unified-map-app.js` click 리스너 4건 중 목록 대상 0건, 확인 완료) | **후퇴(심각)** | 심각 | 사이드바 목록에서 항목을 클릭/키보드 활성화해도 지도가 반응하지 않는 실질적 기능 결손. schools.html/infrastructure.html 양쪽 모두 있던 핵심 상호작용이 unified에서 아예 끊겨 있음 |
| S16 | 3단계 가이드 워크플로 UI(①관할→②학교급/장학사→③목록) + 단계별 힌트 텍스트 + 본청 전용 안내 배너 | `schools.html:224-256, 819-895, 1077-1084` | 없음(툴바+필터만 존재, 단계별 안내 없음) | 미이관 | 낮음 | UX 연출 차이. 기능적 손실은 아니나 초심자 안내 효과 상실 |

---

## 3. infrastructure.html → unified-map.html 격차표

| # | 기능 | 구형 위치 | unified 대응 | 판정 | 우선순위 | 비고 |
|---|---|---|---|---|---|---|
| I1 | 기관유형 5종(isec/office/direct/library/partner) 체크박스 필터, 전부 기본 체크 | `infrastructure.html:130-156` | `#type-filter`에 대응 코드 있음(`headquarters/support-office/direct-agency/library/experience-site/partner`, `js/constants.js:31-40`). 단, `type-filter`는 **단일선택 드롭다운**(구형은 다중선택 체크박스) | 부분이관 + 코드 재매핑 필요 | 심각 | infra의 "office"(본청+교육지원청 통합 1개 체크박스)가 unified에서는 `headquarters`/`support-office` **2개 코드로 분리**되어 있음(별칭 확인: `constants.js:55-56`, `office`→"본청"은 headquarters 별칭, "교육지원청"은 support-office 별칭) — §4 매핑표 참조. 다중선택 체크박스 UI도 신설 필요 |
| I2 | 권역(강화도·영종도·인천시내) 3종 체크박스 필터 | `infrastructure.html:159-182` | **없음** — §1-3 참조 | 미이관 | 심각 | 데이터 스키마 확장 선행 필요(§1-3) |
| I3 | 검색 | 구형에는 **없음**(텍스트 입력 자체가 없음, 체크박스 필터만 존재) | 다필드 실시간 검색 존재 | unified 우월 | — | 순증. 이관 이슈 없음 |
| I4 | 목록 행 — 이름+유형배지+설명+주소만 표시(연락처·좌표상태 없음) | `infrastructure.html:923-950` | 이름+주소+연락처(있으면)+유형/관할/지정교유형/좌표상태 칩(`unified-map-app.js:109-129`) | unified 우월(정보량 많음) | — | 순증 |
| I5 | 팝업 — 이름/설명/주소/전화(조건부)/홈페이지 버튼 | `infrastructure.html:957-1038` | 이름/유형·관할·레벨 칩/주소/customFields 4건까지 — **전화·홈페이지·설명 미표시**(`map-layers.js:48-65`) | 부분이관 | 중간 | §S6과 동일한 팝업 템플릿 결손. `description` 필드도 팝업·목록 어디에도 노출 안 됨(스키마엔 존재, `data/schema.md`) |
| I6 | 마커 아이콘 3종 차별화 — isec 노랑, office(본청) 별(24×35, 축소), direct 빨강 / library·partner는 기본 아이콘(2종은 시각적으로 동일) | `infrastructure.html:718-756` | 전부 기본 핀 | 후퇴 | 중간 | S11과 동일 사안. library/partner는 원래도 구분 없었으므로 그 부분만 영향 없음 |
| I7 | 전체보기 버튼 + idle 이벤트 기반 뷰포트(lat/lng/z) URL 동기화(600ms 디바운스) | 버튼 `infrastructure.html:781`, URL 동기화 `infrastructure.html:783-786, 647-677` | 버튼만 대응, 뷰포트 URL 동기화 **없음** | 부분이관 | 심각 | §1-2·S13과 동일 — `?view=` 프리셋 구현 시 함께 처리 |
| I8 | 빈 결과 안내 메시지("선택한 조건에 부합하는 기관이 존재하지 않습니다") | `infrastructure.html:914-921` | 유사한 빈 상태 div 존재(`unified-map-app.js:139`, `tabindex=-1` 포커스 가능) — 정확한 문구 확인 필요 | 유사 대응(문구 미검증) | 낮음 | T9 실행 시 문구 확인만 하면 충분 |
| I9 | "목록 우선 표시" 동작 — 지도 API 키가 없어도 목록은 항상 렌더링, 지도만 로더 오버레이로 잠금 | `infrastructure.html:622-645` | 확인 필요 — unified 카탈로그에서 이 열화 동작을 명시적으로 확인하지 못함 | **확인 필요** | 중간 | T9 착수 전 실측 — 지도 키 없이 unified 목록이 정상 렌더링되는지 별도 검증 필요 |
| I10 | 커스텀 기관 추가/편집/삭제 | 구형에도 **없음** | 없음(임포트만 가능, 개별 편집·삭제 불가는 §S7·S8과 동일 사안) | 해당없음 | — | 양쪽 다 없음 |
| I11 | `data/infra.json` 로드 실패 시 인라인 30건 하드코딩 폴백(`FALLBACK_INFRA_DATA`) | `infrastructure.html:219-544` | `institutions.json` 로드 실패 시 폴백 로직 — unified 카탈로그에서 미확인 | 확인 필요 | 낮음 | 데이터 안전장치 유무 확인 필요 |
| I12 | 접근성 — 카드 키보드 활성화 + Escape 닫기 + 포커스 복귀 | `infrastructure.html:696-715, 1049-1052` | S15와 동일하게 **목록 행 클릭 자체가 unified에서 작동하지 않음** | **후퇴(심각)** | 심각 | S15와 동일 근본 원인(`openById` 미호출) — 1건 수정으로 양쪽 모두 해결 가능 |
| I13 | 접근성 — `fieldset`/`legend` 미사용(구형도 동일 결손), skip-link 미사용(구형도 동일) | `infrastructure.html:130-182` | 동일하게 없음 | 해당없음(양쪽 결손) | — | T12에서 신규로 개선하면 오히려 unified이 구형보다 나아지는 기회 |

---

## 4. 카테고리/필드 코드 매핑표 (`infrastructure.html` 5종 ↔ `unified-map` 8종)

`js/constants.js:53-62`(`INSTITUTION_TYPE_ALIASES`) 직접 확인 기준.

| infra.html 카테고리 | 구형 라벨 | unified 코드 | unified 라벨 | 비고 |
|---|---|---|---|---|
| `isec` | 학생교육원 및 4대 학습장/야영장 | `experience-site` | 체험학습장 | 별칭에 `"isec"`, `"학생교육원"`, `"야영장"` 명시 포함 — 매핑 확정 |
| `office` (본청 부분) | 시교육청 본청·교육지원청 | `headquarters` | 본청 | `office` 1개 체크박스가 2개 코드로 **분리**됨 |
| `office` (지원청 부분) | 〃 | `support-office` | 교육지원청 | 〃 |
| `direct` | 시교육청 직속 교육원 (난정 포함) | `direct-agency` | 직속기관 | 별칭에 `"직속"` 포함 — 매핑 확정 |
| `library` | 교육청 소속 공공도서관 | `library` | 도서관 | 코드명 동일 |
| `partner` | 학생교육원 연계·협업 체험처 | `partner` | 협력기관 | 코드명 동일 |
| (없음) | — | `school` | 학교 | infra.html 대상 외 |
| (없음) | — | `imported` | 가져온 행 | infra.html 대상 외 |

`region`(강화/영종/인천시내)은 unified 쪽에 대응 코드가 전혀 없음(§1-3) — 이 표에 포함 불가.

---

## 5. `localStorage` 키 승계 여부 요약

| 구형 키 | 출처 | unified 대응 키 | 승계 필요 여부 |
|---|---|---|---|
| `incheon_school_supervisors` | schools.html | 없음 | 사용자 결정 필요(§S3) |
| `incheon_school_designations` | schools.html | 없음(임포트 전용 별도 경로) | 사용자 결정 필요(§S4) |
| `incheon_custom_schools` | schools.html | 없음(`incheon_institution_imports_v1`과 구조 상이) | 마이그레이션 스크립트 필요 시 별도 작성 |
| `incheon_sidebar_width` | 공용(shared.js) | **없음** — `unified-map.html`에 `incheon_sidebar_width`·`initSidebarResizer` 문자열이 전혀 없음(grep 확인) | 승계 대상 아님(§G1 참조) |
| `incheon_map_provider`, `incheon_naver_map_client_id`, `incheon_kakao_js_key` | 공용(map-provider.js) | 동일 키 그대로 사용(unified도 동일 모듈 재사용) | 승계 불필요(이미 공유) |

참고: unified-map 자체의 `incheon_institution_imports_v1`은 재임포트 시 이전 임포트 내용을 **덮어쓴다**(추가가 아님, `institution-repository.js:143-169`) — T9·T10에서 구형 데이터를 이관할 때 이 방식대로 저장하면 향후 사용자의 추가 임포트가 이관분을 지워버릴 수 있음. 이관 데이터는 `institutions.json`(정본 데이터 파일) 쪽에 병합하는 것이 안전(§1-1 해소안 (a)와 동일 결론).

## 5-1. 공용(양쪽 페이지 공통) 기능 격차

| # | 기능 | 구형 위치 | unified 대응 | 판정 | 우선순위 | 비고 |
|---|---|---|---|---|---|---|
| G1 | 사이드바-지도 드래그 리사이저(320~650px, 위치를 `incheon_sidebar_width`에 저장) | `shared.js:475-558`, schools.html·infrastructure.html 양쪽에서 `initSidebarResizer()` 호출 | **없음** — `unified-map.html`에 리사이저 관련 코드·마크업 전무(grep 확인) | 미이관 | 낮음 | 좌우 폭 고정. 사용 빈도 낮은 부가 기능으로 판단되나 확정은 사용자 몫 |

---

## 6. 종합 판정 및 사용자 확인 필요 사항

### 6-1. 판정 분포

전체 항목 수 = S16 + I13 + G1 = **30건**. 아래 두 표는 서로 다른 기준(판정 / 우선순위)이므로 항목마다 각 표에 정확히 1회씩만 나타난다 — 합계는 두 표 모두 30건으로 일치해야 한다.

**판정 기준**

| 판정 | 건수 | 항목 |
|---|---|---|
| 미이관 | 7 | S2·S3·S7·S13·S16, I2, G1 |
| 부분이관 | 7 | S1·S4·S6·S12, I1·I5·I7 |
| 후퇴 | 4 | S11·S15, I6·I12 |
| 기능 대체(성격 상이) | 1 | S5 |
| 미승계(localStorage) | 1 | S10 |
| 유사 대응(세부 불일치/문구 미검증) | 2 | S14, I8 |
| unified 우월(순증) | 3 | S9, I3·I4 |
| 해당없음(양쪽 동일 결손) | 3 | S8, I10·I13 |
| 확인 필요(unified 쪽 미검증) | 2 | I9·I11 |
| **합계** | **30** | |

**우선순위 기준**

| 우선순위 | 건수 | 항목 |
|---|---|---|
| 심각(T9·T10 선행 필수) | 9 | S2·S3·S4·S13·S15, I1·I2·I7·I12 |
| 중간(이식 필요, 차단 아님) | 9 | S5·S6·S7·S10·S11·S14, I5·I6·I9 |
| 낮음(연출/문구 차이) | 6 | S1·S12·S16, I8·I11, G1 |
| 해당없음(우월/양쪽동일결손이라 우선순위 미부여) | 6 | S8·S9, I3·I4·I10·I13 |
| **합계** | **30** | |

### 6-2. 공통 근본 원인 1건이 심각 항목 2개를 동시에 해결(직접 재검증 완료)

S15·I12(목록 행 클릭 시 지도 무반응)는 원인이 동일하다. 서브에이전트 보고를 그대로 인용하지 않고 직접 재확인함:
- `grep openById js/*.js` → 정의(`js/map-layers.js:140`)와 모듈 export(`:164`) 2곳뿐, **호출부 0건**.
- `grep addEventListener js/unified-map-app.js` → 총 10건(입력 231, 변경 235·239·243·244·250, 키다운 245, 클릭 254·259·267) — `#institution-list`나 개별 행(`.um-row`)을 대상으로 한 리스너는 **0건**.

즉 `openById()`는 만들어졌지만 어디서도 호출되지 않는 죽은 코드이며, 사이드바 목록에 클릭 리스너 1개만 추가하면 S15·I12 두 격차 항목이 함께 해소된다. T9 착수 시 최우선 착수 항목으로 권고(단, 지금 이 게이트 안에서는 착수하지 않음).

### 6-3. 사용자 확인이 필요한 항목 (착수 전 판단 필요)

1. **장학사(S3) 이식 여부** — `git log -S "incheon_school_supervisors"` 확인 결과, 이 기능은 2026-06-14 커밋 `0f30b4c`("Update site: data corrections, UI improvements, gitignore") 한 건에 다른 잡다한 UI 개선과 함께 묶여 들어갔고, 이후 단 한 번도 별도로 수정되지 않았다. 대조군인 지정교유형(S4)은 커밋 `145e416`의 메시지가 "Add per-school 지정교유형 **that the officer can set and filter**"로, 담당자(장학사)의 명시적 요구를 직접 인용하는 어조다 — 장학사 배정 기능은 그런 전용 커밋이 없다. 이력만으로 실사용 여부를 단정할 수는 없으나, 지정교유형(S4)보다 근거가 약한 것은 사실이다. 유지/폐기 여부 확인 필요(폐기 시 심각 항목 1건 감소).
2. **커스텀 학교 단건 추가(S7) 대체 여부** — 벌크 임포트로 대체 가능한지, 현장에서 학교 1곳만 급히 추가하는 사용 빈도가 있는지.
3. **`localStorage` 데이터 승계(§5)** — 기존 배포본 사용자가 브라우저에 저장해 둔 장학사·지정교유형·커스텀학교 데이터가 있다면, 마이그레이션 스크립트 작성 여부.
4. **데이터 병합 방식(§1-1)** — `infra.json`을 `institutions.json`에 정적으로 병합할지(빌드 시 1회 변환), 런타임에 두 파일을 함께 `fetch`할지.

### 6-4. T9·T10 착수 조건 (계획서 원칙 준수)

이 격차표가 승인되기 전에는 T9·T10에 착수하지 않는다("격차표 없이 T9·T10 착수 금지"). 승인 시 착수 순서 권고:
1. §1-1 데이터 병합 + §1-3 `region` 필드 스키마 확장 (선행 차단 요인 해소)
2. §1-2 `?view=` 프리셋 매커니즘 구현 (S13·I7 동시 해결)
3. §6-2 목록 행 클릭 연결 (S15·I12 동시 해결)
4. 심각 등급 나머지 항목(S2·S4, I1) 순차 이식
5. 중간·낮음 등급 항목은 T9·T10 범위 내에서 일괄 처리

---

## 7. T9·T10 1차 이행 현황 (2026-09-15)

구현 계획서는 저장소에 포함하지 않고 작업자 로컬에만 보관(공개 배포 대상 아님). 브랜치 `t9-t10-view-presets` 커밋 `1565329`·`7c1c8c4`·`9d4547a`·`b56dfee`·`34facf5`·`ab9baeb`. 단위 테스트 80/80, 민감파일·좌표 검증 통과.

| 항목 | 상태 | 근거 |
|---|---|---|
| §1-1 infra 미병합 17건 | 해소 | `data/institutions.json` 1000건, `tests/infra-merge-data.test.mjs` |
| §1-2 `?view=` 프리셋 | 해소 | `js/view-state.js`, `tests/view-state.test.mjs` |
| §1-3 `region` 필드 | 해소 | `js/constants.js`, `js/institution-schema.js` |
| S2 학교급 9종 | 해소 | 체크박스 필터 |
| S3 담당 장학사 | 해소 | 선택 기관 패널, 구형 키 `incheon_school_supervisors` 공유 |
| S4 지정교유형 편집·필터 | 해소 | 구형 키 `incheon_school_designations` 공유 |
| S5 한글 라벨 검색 | 해소 | `matchesSearch`에 지원청·유형·학교급·권역 라벨 포함 |
| S6·I5 팝업 연락처·설명 | 해소 | `js/map-layers.js` |
| S10 localStorage 승계 | 부분 해소 | 장학사·지정교유형은 같은 키 사용. `incheon_custom_schools`는 S7과 함께 2차 |
| S12 최초 자동 맞춤 | 해소 | 주소에 지도 위치가 없을 때만 |
| S13·I7 URL 상태 | 해소 | 필터·지도 중심·축척 |
| S15·I12 목록 행 → 지도 | 해소 | 기관명 버튼 → `openById` + `panTo` |
| I1 유형 다중선택 | 해소 | 체크박스 |
| I2 권역 필터 | 해소 | 체크박스 |
| 화면 실측(I9 포함) | 확인(지도 키 불필요 항목) | 로컬 정적 서버에서 실측: 지도 키 없이 목록 1000건 표시(I9), `?view=infra` 32, 강화 권역 9, `?view=schools` 967, 고등학교 129, 검색 `서부교육지원청` 170, 주소 복원, 기관 선택 패널, 장학사·지정교유형 저장 후 지정교유형 필터 1건, `schools.html`에 같은 저장값 표시, 콘솔 오류 0건 |
| 지도 이동·팝업·자동 맞춤·주소 `lat`·`lng` 갱신 | 미확인 | 지도 공급자 키가 필요한 항목. 단위 테스트(`openById`·`panTo`, 팝업 HTML)로만 검증 |
| S1·S7·S11·S14·S16, I6·I8·I11, G1 | 2차 이월 | 계획서 "이월" 절 |

실데이터 기준 기대값(Node로 계산): 전체 1000, `?view=infra` 32, `?view=infra&regions=ganghwa` 9, `?view=infra&regions=yeongjong` 4, `?view=schools` 967, `?view=schools&levels=high` 129, `?q=서부교육지원청` 170.

위 "해소"는 기능 동작 기준이며 반응형 배치 확인을 포함하지 않는다. 1차 이행 뒤 남은 동작 사항:

| 사항 | 분류 | 처리 |
|---|---|---|
| 보기 전환 시 프리셋이 검색·지원청·지정교유형·담당 장학사 필터를 초기화 | 의도된 동작 | 유지(보기마다 깨끗한 시작 상태) |
| 보기 전환 뒤에도 선택 기관 패널이 이전 선택을 유지 | 결함 | 2차에서 수정 완료(§8) |
| 새 필터 행의 375px 배치 | 미확인(화면 캡처 실패) | T12 실측 |

## 8. 2차 이월 항목 처리 현황 (2026-09-15)

구현 계획서는 이번에도 저장소에 포함하지 않음(로컬 보관 원칙 유지). 단위 테스트 83/83, 민감파일·좌표 검증 통과.

| 항목 | 상태 | 근거 |
|---|---|---|
| 결함: 보기 전환 뒤 선택 기관 패널이 이전 선택을 유지 | 해소 | `updateView`가 보기 전환 시 `state.selectedId`를 초기화(`unified-map-app.js`). 추가로 `renderDetail`이 `state.filteredRows`(현재 필터 결과)에 없는 선택은 항상 숨기도록 가드 — 검색·필터 변경 전반에 동일 결함이 재발하지 않도록 일반화 |
| S11 / I6 마커 아이콘 유형 구분 | 해소 | `js/map-layers.js`에 `markerStyleFor`·`markerIconSpecFor` 추가 — 유형별 고유 글자(글리프)+색상 SVG 데이터 URI 아이콘(학교는 22×22 원형, 그 외는 30×40 하단 고정 핀형). 구형의 카카오 데모 CDN 핫링크(`marker_red.png` 등)는 이식하지 않음(§9 signal-chip 위반 + 네이버 기본 공급자와 불일치) — CSS 색상+모양 방식으로 대체(DESIGN.md §3 line 76 권고). `CATEGORY_META`·`.um-popup-chip.type-support-office`의 사용되지 않던 폐기 토큰(`#2a41b6`)도 함께 정리(T8-1 일부 흡수). `tests/map-layers.test.mjs`에 글리프 유일성·폐기 토큰 미사용·아이콘 치수 검증 테스트 3건 추가 |
| S1 지원청 선택 UI | 결정: 변경 없음 | 사용자 확인 결과 드롭다운 유지(버튼형 칩 미도입) |
| S7 학교 단건 추가 | 결정: 미이관 확정 | 사용자 확인 결과 제외 — 기존 CSV/XLSX 일괄 가져오기로 대체. `incheon_custom_schools` 마이그레이션도 함께 보류 |
| S16 가이드 워크플로 | 부분 해소(최소화) | 사용자 확인 결과 단계별 UI 전체는 제외, "고등학교·특수학교·대안학교는 본청 관할" 안내 문구만 `#office-scope-hint`로 추가(학교급 필터 노출 시에만 표시) |
| G1 사이드바 리사이저 | 결정: 미이관 확정 | 사용자 확인 결과 제외 — 고정 폭(340~380px) 유지 |
| I8 빈 결과 안내 문구 | 확인 완료(변경 없음) | 기존 문구("조건에 맞는 기관이 없습니다. 검색어와 필터를 조정해 주세요.")가 DESIGN.md §9의 "빈 상태는 실행 가능한 다음 동작을 명시해야 한다" 요건을 이미 충족 — 구형과 문구가 다를 뿐 기능적 결손 아님 |
| I11 데이터 로드 실패 폴백 | 결정: 폴백 없음 유지 | `js/unified-map-app.js`의 `readBuiltIns`는 실패 시 예외를 던지고 경고 목록에 기록할 뿐 인라인 하드코딩 폴백이 없음(구형 30건 폴백 미이식). `institutions.json`을 단일 진실 원천으로 유지하는 편이 안전하다고 판단해 폴백을 추가하지 않기로 가정하고 진행 — 이견 있으면 확인 요청 |
| S14 반응형 | 이월 유지 | T12 실측과 함께 처리(변경 없음) |

## 9. T11 구형 스텁화 — 1단계(2026-09-15) · 2단계 판단(2026-09-16)

**2단계(파일 완전 제거)는 하지 않기로 결정했다(2026-09-16).** `schools.html`·`infrastructure.html`은 공개 사이트에서 발행된 주소라 과거 공문·안내자료·즐겨찾기에 남아 있을 수 있고, 삭제하면 GitHub Pages 특성상 **영구 404**가 되어 되돌릴 수 없다. 계획서 원문의 "1배포 주기 뒤 제거"에서 실제 경과는 약 1일로 외부 유통 링크의 유예 기간으로 짧은 반면, 존치 비용은 29줄 × 2개에 유지보수가 없다. 따라서 두 스텁을 **영구 존치**하고, 3단계 종료 게이트의 "구형 공개 페이지 0건"을 **"구형 기능 페이지 0건(리다이렉트 스텁만 존치)"**로 재정의해 충족 처리한다(구형 기능 코드는 0줄).

판단 시점 실측(2026-09-16): 두 스텁 URL 모두 **HTTP 200**, `meta refresh` + `location.replace` 정상 동작. 삭제를 택했을 경우 함께 정리해야 했던 항목 — `tools/build-sites-worker.mjs:10-11`의 자산 2개(26 → 24), `README.md` 공개 배포 범위 행, `docs/data-update-guide.md`의 스텁 괄호 문구 — 은 존치 결정에 따라 **모두 현행 유지**한다. `tests/institution-overrides.test.mjs:23`의 `schools.html` 언급은 파일 참조가 아니라 legacy localStorage 키를 설명하는 테스트 이름이므로 애초에 정리 대상이 아니다.

| 항목 | 상태 | 근거 |
|---|---|---|
| `schools.html` 스텁 전환 | 완료 | 1,308줄 전체 기능 페이지 → 29줄 리다이렉트 스텁(`<meta http-equiv="refresh">` + `location.replace`로 `unified-map.html?view=schools`로 즉시 이동). 구형 쿼리 파라미터 변환은 하지 않음(무조건 리다이렉트) |
| `infrastructure.html` 스텁 전환 | 완료 | 1,055줄 → 29줄, `unified-map.html?view=infra`로 이동 |
| GNB 갱신 | 완료 | `index.html`의 헤더 링크·바로가기 타일 2개가 스텁을 거치지 않고 `unified-map.html?view=schools`/`?view=infra`를 직접 가리키도록 변경. `unified-map.html` 헤더의 "학교 지도"/"체험기관 지도" 링크는 삭제(같은 화면 툴바의 보기 전환 라디오와 완전 중복이었음) |
| 워커 자산 목록 갱신 | 완료 | `tools/build-sites-worker.mjs`의 `textAssets`에서 `shared.js`를 제외(스텁 전환으로 이 파일을 로드하는 추적 대상 공개 페이지가 0건이 됨 — 로컬 비공개 페이지 2종만 계속 사용, 파일 자체는 삭제하지 않음). `schools.html`·`infrastructure.html` 항목은 유지하되 내용이 스텁으로 교체되어, Sites worker 배포에서도 GitHub Pages와 동일하게 구형 URL이 리다이렉트됨(자산 목록의 "구형" 콘텐츠는 0건) |
| `README.md` 갱신 | 완료 | 공개 배포 범위 표에서 두 파일을 "화면"이 아닌 "스텁"으로 재분류, `shared.js` 행을 "공개 화면에서는 미사용"으로 별도 표기, 담당 장학사 공유 문장에서 `schools.html` 대신 구체적 localStorage 키를 명시 |
| `docs/data-update-guide.md` 갱신 | 완료 | 데이터 기준일 문구 확인 대상을 4개 파일 → 2개 파일(`index.html`, `unified-map.html`)로 축소(스텁에는 기준일 문구가 없음) |
| `tests/office-data.test.mjs` 삭제 | 완료(사용자 터미널에서 직접 실행 — 도구 정책상 자동 삭제 차단) | 검증하던 두 명제 중 "`schools.html` 하드코딩 사본이 `institutions.json`과 일치" 전제가 스텁 전환으로 소멸. "6개 office 레코드가 정확한 주소·좌표로 존재"는 `tests/infra-merge-data.test.mjs`가 27건 전량(6개 office 포함)을 이 테스트보다 더 엄격하게 이미 대조 중 — 커버리지 손실 없음 확인 |

## 10. T8-1 폐기 토큰 · T2-④ 이모지 라벨 (2026-09-16)

측정 기준: 추적 파일만(`git grep`·`git ls-files`), `vendor/`·`dist/` 제외.

### 10-1. 폐기 토큰 — 완료(grep 0건)

| 토큰 | 이전 | 이후 | 처리 |
|---|---|---|---|
| `#2a41b6` | 0건 | 0건 | 2차 이월분(§8) 마커 작업에서 이미 정리됨 |
| `#4262ff` | 0건 | 0건 | 〃 |
| `#0f172a` | 7건 | **0건** | `index.html` 1건은 **삭제**(같은 시트 뒤쪽 `.pin { color:#fff }`가 덮어써 렌더링에 도달하지 못하던 사문 선언 — 새 토큰으로 교체하면 죽은 코드에 새 토큰만 입히는 셈이라 제거). `shared.css` 6건 중 1건은 아래 죽은 위젯 블록과 함께 삭제, 나머지 5건은 ink 토큰 `#1c1c1e`로 교체(모두 밝은 그라디언트 위 `color:` 값이라 시각 차이 없음) |

### 10-2. 이모지 라벨 — UI 파일 0건

| 대상 | 결과 |
|---|---|
| `index.html`·`unified-map.html`·`schools.html`·`infrastructure.html`·`shared.css`·`atlas-theme.css`·`shared.js`·`js/*.js` | **0건** |
| `shared.css`의 `✓` 1건 | 제거 — `.checkbox-container`/`.custom-checkbox` 위젯 CSS 39줄 전체를 삭제. 이 위젯은 추적 파일은 물론 비추적 로컬 페이지(`business.html`·`private-local-map.html`)에서도 사용처 0건으로 확인된 죽은 코드. 복합 선택자 1건은 `.workflow-step-no`만 남기고 분리(해당 클래스는 `business.html`에서 여전히 사용) |
| `✕`·`💡`·`🌐` | T11 스텁화(§9)로 원본 페이지와 함께 이미 소멸 |
| `shared.js`의 과거 `❌`·`⏱️` | 현재 0건으로 실측 확인(`improvement-report(2026-07-05).md`의 "미이행" 기록은 그 사이 해소됨) |

유지 판정: 문서 산문의 화살표(`→`·`↔`), 실제 파일명에 포함된 `★`, CLI 스크립트(`tools/validate-coordinates.mjs`)의 `✖`, 목록 항목의 출발지→도착지 연결자(`js/connection-layer.js:185`)는 DESIGN.md §3이 금지하는 "가시적 라벨 대체물"이 아니므로 유지한다. 과업 설명문(`docs/improvement-plan-2026-09-15.md` T2-④ 행 등)에 인용된 금지 문자도 설명 자체가 목적이므로 유지.

### 10-3. `!important` 축소 — 부분 달성(42.2%, 목표 50% 미달)

| 파일 | 이전 | 이후 | 감소 |
|---|---|---|---|
| `atlas-theme.css` | 415건 / 742줄 | 240건 / 469줄 | **175건(42.2%)**, 죽은 규칙 71개 제거 |

판정 방법(CSS 의미 기준): `atlas-theme.css`를 읽는 페이지는 `index.html`·`unified-map.html` 2개뿐이다(T11 스텁 2종과 비추적 로컬 페이지 2종은 이 시트를 링크하지 않음 — 실측 확인). 따라서 생존 토큰 집합 = 두 HTML + `js/*.js`(런타임에 DOM을 생성하므로 포함)에 등장하는 토큰. 복합 선택자는 **모든** 클래스가 생존 집합에 있어야 live로 보고(`.a.b`는 둘 다 존재해야 매칭), 콤마 목록은 **모든** 선택자가 dead일 때만 삭제했다. 요소·id·속성 선택자는 보수적으로 유지. 제거된 71개는 대부분 `.gnb-*`(생성기 `injectSharedGNB`가 있는 `shared.js`를 로드하는 추적 페이지가 0건이 되어 사멸)와 `.school-card`·`.workflow-*`·`.supervisor-box` 등 구형 페이지 전용 클래스다.

잔여 240건은 대부분 `.um-*` 실사용 규칙으로, `unified-map.html`의 인라인 `<style>`을 덮기 위해 존재한다. 50% 목표를 채우려면 이 두 시트를 병합해야 하고 이는 화면 회귀 검증(스크린샷 전후 대조)을 동반하는 별도 변경이므로 **이월**한다.

---

## 11. T12 접근성 실측 (2026-09-16)

대상: `unified-map.html`, `atlas-theme.css`. 기준: DESIGN.md §9(터치 타깃 44px·색 단독 부호화 금지) + WCAG 2.1 SC 1.4.3(AA 4.5:1).

### 11-1. 파스텔 칩 대비 실측표 — 20쌍 전부 통과(최소 4.71:1)

상대휘도·대비비는 WCAG 2.1 공식으로 계산했다. 칩 글자는 11~12px이라 "큰 텍스트" 예외(18.66px 굵게 이상)에 해당하지 않으므로 전부 **4.5:1**을 적용했다.

| 조합 | 전경 | 배경 | 크기 | 대비 | 판정 |
|---|---|---|---|---|---|
| 팝업칩 기본 `.um-popup-chip` | `#6b6f7e` | `#f7f8fa` | 11px 700 | 4.71:1 | 통과 |
| 팝업칩 본청 `type-headquarters` | `#746019` | `#fff4c4` | 11px 700 | 5.54:1 | 통과 |
| 팝업칩 교육지원청 `type-support-office` | `#004c8c` | `#dde7ff` | 11px 700 | 7.03:1 | 통과 |
| 팝업칩 학교 `type-school` | `#7a2455` | `#fde0f0` | 11px 700 | 7.73:1 | 통과 |
| 팝업칩 도서관 `type-library` | `#187574` | `#c3faf5` | 11px 700 | 4.77:1 | 통과 |
| 팝업칩 체험학습장 `type-experience-site` | `#7a3d00` | `#ffe6cd` | 11px 700 | 6.99:1 | 통과 |
| 팝업칩 가져온행 `type-imported` | `#0060b0` | `#f5f3ff` | 11px 700 | 5.80:1 | 통과 |
| 목록칩 학교 | `#7a2455` | `#fde0f0` | 12px | 7.73:1 | 통과 |
| 목록칩 도서관 | `#187574` | `#c3faf5` | 12px | 4.77:1 | 통과 |
| 목록칩 체험처 | `#7a3d00` | `#ffe6cd` | 12px | 6.99:1 | 통과 |
| 목록칩 가져온행 | `#0060b0` | `#f5f3ff` | 12px | 5.80:1 | 통과 |
| 상태칩 정상 `.is-good`·`.is-ready` | `#007a55` | `#e5fbf3` | 12px | 4.96:1 | 통과 |
| 상태칩 경고 `.is-warn` | `#746019` | `#e6f0f9` | 12px | 5.31:1 | 통과 |
| 상태칩 지정교 `.is-designation` | `#92400e` | `#fef3c7` | 12px | 6.37:1 | 통과 |
| 칩 기본 배경 위 muted `.um-chip` | `#6b6f7e` | `#f7f8fa` | 12px | 4.71:1 | 통과 |
| 보조 텍스트 `.um-note` | `#6b6f7e` | `#ffffff` | 13px | 5.00:1 | 통과 |
| 빈 상태·푸터 `.um-empty`·`.um-foot` | `#6b6f7e` | `#ffffff` | 13px | 5.00:1 | 통과 |
| 목록 기관명 `.um-row-focus` | `#050038` | `#ffffff` | 15px 800 | 19.75:1 | 통과 |
| 본문 기본 `--um-ink` | `#1c1c1e` | `#ffffff` | 본문 | 17.01:1 | 통과 |
| 링크·포커스 `--um-blue` | `#0060b0` | `#ffffff` | 본문 | 6.36:1 | 통과 |

최저치는 4.71:1(`.um-popup-chip` 기본)로 AA 여유가 0.21뿐이다. 향후 이 두 토큰(`#6b6f7e`·`#f7f8fa`)을 조정할 때는 재측정이 필요하다.

### 11-2. 색 + 형태 이중 부호화 — 충족

| 대상 | 색 외 부호 |
|---|---|
| 지도 마커 | 유형별 글리프(학·본·청·직·도·체·협·가) + 모양(학교=원형 22px, 그 외=핀 30×40) — §8에서 이식 |
| 목록 칩·팝업 칩 | 모든 칩이 텍스트 라벨을 동반(`js/unified-map-app.js`의 `rowTemplate`·팝업 생성부) |

색만으로 의미를 전달하는 요소는 0건이다.

### 11-3. 터치 타깃 44px(`<768px`) — 결함 2종·5개 발견·수정

375×812에서 전 요소를 실측한 뒤 원본과 대조했다. 두 번에 걸쳐 확인했고, **1차 판정은 틀렸다**(경위는 11-4).

| 요소 | 개수 | 매칭된 최우선 규칙 | 결과 |
|---|---|---|---|
| `.um-button`·`.um-link-button`·`.um-file-label`·`.um-layer-toggle`·`.gnb-logo`·`.um-brand` | — | 767px 블록 `min-height: 44px !important` (0,1,0) | 44px 충족 |
| `.um-select`(`<select>`) | 8 | 위와 동일 — 경쟁 규칙 `select`가 (0,0,1)이라 패배 | 44px 충족 |
| 체크박스·라디오 | 26 | 감싸는 `<label class="um-layer-toggle">`가 타깃 | 44px 충족 |
| 파일 입력 | 2 | 시각적으로 숨김, `.um-file-label`이 타깃 | 44px 충족 |
| `.um-row-focus`(목록 기관명) | 1 | **해당 없음** — `atlas-theme.css`의 `button { min-height: 40px }`만 매칭 | **40px 미달** |
| `.um-search`(`<input type="search">`) | 1 | **`atlas-theme.css:99-103`의 `input[type="search"]`(0,1,1) `!important`** | **42px 미달** |
| `.um-input`(`<input type="text">`) | 4 | **같은 규칙의 `input[type="text"]`(0,1,1) `!important`** | **42px 미달** |

원인은 **선택자 특이성**이다. `atlas-theme.css:99-103`의 데스크톱 규칙

```css
input[type="text"], input[type="search"], select, textarea { min-height: 42px !important; }
```

에서 `<input>`이 매칭되는 선택자는 (0,1,1)이라 767px 블록의 `.um-search`·`.um-input`(0,1,0)을 **특이성으로 이긴다**(둘 다 `!important`라 순서로 가려지지 않음). 반면 `<select>`가 매칭되는 선택자는 `select`(0,0,1)이라 `.um-select`에 진다. 같은 목록에 있는 두 요소가 다른 값을 갖는 이유가 이것이다.

수정 2건:

| 파일 | 변경 | `!important` 영향 |
|---|---|---|
| `unified-map.html` 767px 블록 | `.um-row-focus { display:inline-flex; align-items:center; min-height:44px; }` 추가. 클래스(0,1,0)가 `button`(0,0,1)을 이겨 `!important` 불필요 | 없음 |
| `atlas-theme.css` 767px 블록 | 기존 44px 규칙의 **선택자 목록에만** `input[type="text"]`·`input[type="search"]`·`textarea` 추가. 데스크톱 규칙과 같은 (0,1,1)이지만 파일 뒤쪽이라 순서로 이긴다 | **없음**(선언 미변경, 240건 유지) |

`textarea`는 현재 0개지만, 데스크톱 규칙이 포함하고 있어 같은 형태를 유지했다(추가 시 동일 결함이 재발하지 않도록).

**적용 범위 확인**: 추가한 것이 클래스가 아니라 요소 선택자이므로 `atlas-theme.css`를 함께 읽는 `index.html`에도 적용된다. 다만 `index.html`에는 `<input>`·`<select>`·`<textarea>`가 **0개**여서 영향받는 요소가 없다(grep 실측). 영향 범위는 `unified-map.html`의 위 5개로 한정된다.

### 11-4. 1차 판정이 틀린 경위 — 기록

이 절은 되풀이하지 않기 위한 기록이다. 1차 실측에서 설명되지 않는 값 2개를 만났고, 둘을 같은 원인으로 묶어 **"계측 도구 결함"으로 오판**했다.

| 관측 | 1차 판정 | 최종 판정 |
|---|---|---|
| `.um-map-area`가 620px(767px 블록은 760px) | 도구 결함 | **재현되지 않음 — 원인 미확정**. 새 창에서 재측정하니 원본과 일치하는 760px. 620px이 정지된 값이었는지 그 세션 로드 고유의 문제였는지는 확인하지 못했다(작동하는 계측기로 620px을 재현해 보지 않았으므로 "도구 결함"으로 단정하지 않는다) |
| `.um-search` 42px인데 `.um-select` 44px | 도구 결함(같은 규칙인데 분기 = 불가능) | **측정이 옳았음** — 11-3의 특이성 차이로 완전히 설명됨 |
| 새 `<style>`로 `!important` 999px 주입 무반응 | 엔진 정지의 증거 | **판정 근거로 쓸 수 없음** — 정상 측정이 나오는 상태에서도 동일하게 무반응(이 창이 주입 스타일을 차단하는 것으로 보임) |

오판의 실질적 원인은 도구가 아니라 **"매칭 규칙 집합이 같으면 계산값도 같다"는 잘못된 전제**였다. 콤마 목록에서는 선택자마다 특이성이 따로 계산되므로, 같은 규칙에 매칭되더라도 요소별 승자가 다를 수 있다. 이 전제를 검증하지 않은 채 "정상 엔진에서 불가능"이라고 단정했고, 그 결론으로 정상 규칙(`min-height: 760px !important`)을 한 번 제거했다가 되돌렸다.

재발 방지: 계산값이 예상과 다르면 ① 창을 새로 열어 재측정하고 ② **요소별로 매칭 선택자의 특이성을 직접 계산**한 뒤에 도구를 의심한다. 주입 프로브는 이 창에서 신뢰할 수 없으므로 계측기 검증용으로 쓰지 않는다. 레이아웃 값(`getBoundingClientRect`·`offsetHeight`)은 폭 3000px 요소 주입에 정상 반응하므로 검증 가능하다(11-6에서 사용).

### 11-5. 잔여 — 이월

| 항목 | 상태 | 사유 |
|---|---|---|
| 200% 확대 시 가로 스크롤 없음 | **충족** | 11-6에서 실측 완료 |
| 모바일 `.um-map-area` 760px | 결함 아님 | DESIGN 하한 `48svh`(812px 화면 기준 390px)를 충족. 다만 화면의 93%를 지도가 차지해 목록이 첫 화면 밖으로 밀린다. 축소는 접근성 수정이 아니라 **디자인 변경**이라 사용자 판단으로 이월 |
| `atlas-theme.css` 죽은 규칙 잔존 | 이월 | `!important`가 없어 §10-3 제거 대상에서 빠진 `.gnb-logo`·`.workflow-panel`·`.workflow-step-card`·`.provider-modal-actions` 등. T8-1 잔여 패스에서 처리 |
| S14(§7 이월분) | **해소** | 이월 사유였던 "두 시트 간 `.um-map-area` 높이값 충돌 소지"(§7)는 판정 완료 — 767px 블록의 `min-height: 760px !important`가 전역 `620px !important`를 **파일 순서로** 이기고, 375×812 실측도 760px로 일치. 반응형 자체는 11-6에서 가로 넘침 0건 |

### 11-6. 확대 시 가로 스크롤 — 4개 조건 전부 충족

DESIGN.md §9의 "200% 확대 시 가로 스크롤 없음"은 브라우저 확대 200% ≡ **CSS 뷰포트 폭 절반**(1280px 기준 640px)이므로 폭 에뮬레이션으로 등가 검증했다. 320px는 WCAG 2.1 SC 1.4.10(리플로) 기준의 참고치다.

**계측기 검증 선행**: 매 측정마다 폭 3000px 요소를 주입해 `scrollWidth`가 3000으로 반응하고 제거 후 원값으로 복귀하는지 확인했다(4회 모두 통과). 11-4의 경위를 반복하지 않기 위한 절차다.

| 화면 | 폭 | `scrollWidth` / `clientWidth` | 우측 경계 초과 요소 | 판정 |
|---|---|---|---|---|
| `unified-map.html` | 640px (200%) | 640 / 640 | **0건** | 충족 |
| `index.html` | 640px (200%) | 640 / 640 | **0건** | 충족 |
| `unified-map.html` | 320px (400%) | 320 / 320 | **0건** | 충족 |
| `index.html` | 320px (400%) | 320 / 320 | **0건** | 충족 |

측정 시 `unified-map.html`은 목록 160행이 렌더링된 상태(요소 3,193개)였다.

**주의 — `scrollWidth` 단독 판정 금지**: `unified-map.html:57`에 전역 `body { overflow-x: hidden; }`이 있어, 내용이 넘쳐도 `scrollWidth`는 항상 `clientWidth`와 같아진다. 따라서 이 표의 실제 근거는 `scrollWidth`가 아니라 **전 요소의 `getBoundingClientRect().right` 스캔**이며(클리핑의 영향을 받지 않음), 네 조건 모두 초과 요소 0건이다. 이 저장소에서 가로 넘침 회귀를 점검할 때는 반드시 rect 스캔을 쓸 것.

---

## 12. T13 DESIGN 감사 (2026-09-16)

`DESIGN.md` §7·§8·§9의 **검증 가능한 규정**을 소스에서 전수 계측했다. 분위기·밀도 같은 주관 항목은 감사 대상이 아니다. 대상 파일은 공개 배포분(`index.html`·`unified-map.html`·`shared.css`·`atlas-theme.css`·`shared.js`·`js/*.js`)이며, 비추적 로컬 페이지는 §9 "수용된 부채"에 따라 제외했다.

### 12-0. 감사의 핵심 발견 — 이탈이 한 파일에 모여 있다

`unified-map.html`의 인라인 토큰은 DESIGN과 **정확히 일치**한다.

| 인라인 토큰 | 값 | DESIGN 규정 | 판정 |
|---|---|---|---|
| `--um-radius-sm` / `md` / `lg` | 8px / 12px / 16px | §7 입력 8px, 팝오버 12px, 큰 패널 16px | 일치 |
| `--um-pill` | 9999px | §7 pill 9999px | 일치 |
| `--um-raised` | `0 4px 12px rgba(5,0,56,0.06)` | §7 `raised` 동일 값 | 일치 |
| `--um-modal` | `0 16px 48px rgba(5,0,56,0.12)` | §7 `modal` 동일 값 | 일치 |

문제는 **`atlas-theme.css`가 두 페이지 모두에서 마지막에 로드되며**(`unified-map.html:760`, `index.html:489`) 이 값들을 `!important`로 덮어 DESIGN에서 **멀어지는 방향**으로 바꾼다는 점이다. 즉 T13의 이탈 항목과 T8-1의 `!important` 240건은 **같은 원인**이다. 처리 방침은 12-4에 적는다.

### 12-1. §7 Depth & Surface · 마이그레이션 체크리스트

| 항목 | 판정 | 근거 |
|---|---|---|
| 폐기 토큰 `#ffd02f`·`#fff8e0`·`#4262ff`·`#2a41b6`·`#00b473` | **이행** | 각 0건(§10-1에서 처리 완료) |
| 다크 페이지 배경 → 흰 캔버스 | **이행** | `atlas-theme.css:18-26`이 `body`에 `#f8fbff !important` 지정, 마지막 시트라 승리. `index.html:22`의 `#181716`은 렌더링에 도달하지 못하는 **사문 선언**(라이브 흰 화면 실측 일치) — 정리 대상이지 위반 아님 |
| 틸→블루 그라디언트 제거 | **이행** | `shared.css:13-14`의 `--teal-light`·`--blue-light`가 **이미 `#0060b0`(ice-blue)·`#00b0e0`(ice-sky)로 교체**됨. 변수 **이름만** 레거시로 남음 |
| 파란 CTA → 검정 pill | **이행** | `atlas-theme.css:113` `button { background: var(--atlas-navy) }` |
| 이모지 라벨 → 텍스트 | **이행** | 0건(§10-2) |
| `loader-icon` 이모지 → CSS 모션 | **이행** | 실제 사용은 `shared.js:408`의 `.loader-signal`(span 3개, CSS 애니메이션). `shared.css:522`의 `.loader-icon`(48px, bounce)은 추적 HTML·JS 사용처 **0건**인 죽은 CSS |
| 인라인 다크 모달 → 흰 모달 | **이행** | `.um-key-card`·`.um-modal` 계열 전부 흰 배경 |
| 공개/비공개 배포 범위 유지 | **이행** | `check-sensitive` 게이트 통과(추적 68개, 위반 0) |
| 라운딩 9999/8/12/16px | **이탈** | `atlas-theme.css`에 **16px 초과 선언 8종**(17·18·20·22·24·30px). pill용 `999px`/`9999px`는 규정 내 |
| 깊이 4단계(`flat`/`raised`/`modal`/`map-overlay`) | **이탈** | `atlas-theme.css`에 4단계 어디에도 매핑되지 않는 **임의 그림자 약 10종**(`0 14px 28px …`, `0 16px 34px …` 등). 인라인 `--um-raised`·`--um-modal`은 규정 일치 |

### 12-2. §8 인천교육 CI 사용 규정

| 항목 | 판정 | 근거 |
|---|---|---|
| CI 유래 색 토큰만 사용(마크 금지) | **이행** | `<img>` 0건, `url()` 이미지 참조 0건 — 심볼 이미지·SVG 재현 없음 |
| 비전 퍼플 `#401080` 미도입 | **이행** | 0건 |
| 브랜드 마크 = NEWSKOOL4D 텍스트 + 오렌지 점 | **이행** | 텍스트 마크만 존재 |
| CI 원본 자산 비커밋 | **이행** | 저장소에 EPS·JPG·TTF 0건 |
| 공급자 칩은 `NAVER`/`KAKAO` 텍스트, 로고 모방 금지 | **이행** | `js/map-provider.js:12,21` 텍스트 상수만 |

### 12-3. §9 Civic Atlas 계약

| 항목 | 판정 | 근거 |
|---|---|---|
| 추가 토큰 8종(`atlas-navy`~`atlas-grid`) | **이행** | `atlas-theme.css:2-9`에 전부 정의, 값 전부 일치(`rgba(0,96,176,.16)` 등 표기만 축약형) |
| `school-contact-row` 외부 링크 `noopener noreferrer` | **이행** | `js/map-layers.js:114`, `js/unified-map-app.js:133` 양쪽 모두 |
| `signal-chip` 텍스트 우선 | **이행** | 위 §12-2 |
| 클러스터 문구 정확성(거짓 `클러스터` 금지) | **이행** | `js/unified-map-app.js:120`은 `result.clusterer ? '클러스터 N개' : '마커 N개'` 삼항 — 클러스터러가 실제 있을 때만 주장한다. **재점검 시 오탐 주의** |
| 터치 타깃 44px | **이행** | §11-3, 라이브 128/128 |
| 200% 확대 가로 스크롤 없음 | **이행** | §11-6 |
| 색 단독 부호화 금지 | **이행** | §11-2 |
| `prefers-reduced-motion` | **이행** | `atlas-theme.css:470`, `shared.css:635` |
| `aria-live` 상태 안내 | **이행** | 9건 |
| `focus-visible` | **이행** | 18건 |
| `<768px` 헤더 가로 스크롤 스트립 | **이행** | `atlas-theme.css:428` `.um-header-actions { overflow-x: auto }` |
| `<768px` 지도 높이 `≥48svh` | **이행(표현 상이)** | 리터럴 `48svh`는 0건이지만 `min-height: 760px`가 적용되어(§11-3 실측) 어떤 휴대폰 높이에서도 48svh를 초과한다. 계약 문구대로 `svh`로 표현하지는 않음 |
| 브레이크포인트 `>=1180` / `768-1179` / `<768` | **이탈** | 실제는 **1100/1101px**(`atlas-theme.css`·`unified-map.html`)로 DESIGN의 1180px과 다름. 768 경계는 767/768로 일치. `shared.css`는 별도로 1040px 사용 |
| 모션 140ms(컨트롤) / **220ms(패널)** | **이탈** | 140ms는 존재(`atlas-theme.css`·`unified-map.html`). **220ms 패널 전환 선언 0건** |
| 공급자 계약(naver 기본, kakao 대체, 키 분리 저장) | **이행** | `tests/map-provider.test.mjs` 등 단위 테스트가 검증 중 |
| 수용된 부채 4건 | **해당** | 도로경로 Pages 미지원·Sites 미검증(R1·R2·T3)은 DESIGN이 명시적으로 수용한 항목 |

### 12-4. 이탈 4건과 처리 방침

| # | 이탈 | 성격 | 처리 |
|---|---|---|---|
| D1 | `atlas-theme.css` 라운딩 16px 초과 8종 | DESIGN §7 위반 | T8-1과 함께 처리(같은 파일, 같은 `!important` 층) |
| D2 | `atlas-theme.css` 임의 그림자 약 10종 | DESIGN §7 4단계 미매핑 | 〃 |
| D3 | 브레이크포인트 1100/1101 ≠ 1180 | DESIGN §9 계약 불일치 | **계약 문구와 구현 중 무엇을 맞출지 사용자 결정 필요** — 1180px으로 옮기면 1101~1179px 구간의 레이아웃이 바뀌므로 화면 회귀 검증 동반 |
| D4 | 패널 모션 220ms 부재 | DESIGN §9 미이행 | 저위험. `.um-panel`·모달 전환에 220ms 선언 추가로 해소 가능 |

정리 대상(위반 아님, T8-1 청소분): `index.html:22` 사문 다크 선언, `shared.css:522` 죽은 `.loader-icon`, `--teal-light`·`--blue-light` 변수명.

### 12-5. T8-1 잔여 접근안 — "병합"이 아니라 "불필요한 `!important` 제거"

계획서는 T8-1 잔여를 "두 시트 병합"으로 적었으나, 감사 결과 **더 단순하고 안전한 경로**가 있다.

`atlas-theme.css`는 두 페이지 모두에서 **가장 마지막에 로드된다**. 동일 특이성이면 뒤 선언이 이기므로, `!important`가 **실제로 필요한 경우는 앞선 시트(`unified-map.html` 인라인 `<style>`, `shared.css`)의 규칙이 같은 속성에 대해 특이성이 더 높을 때뿐**이다. 나머지는 전부 제거해도 계산값이 바뀌지 않는다.

따라서 보수적 정적 분석으로 제거 가능분을 식별할 수 있다 — atlas의 각 `!important` 선언에 대해, 앞선 시트에서 같은 속성을 지정하면서 선택자 특이성이 **엄격히 더 높은** 규칙이 하나도 없으면 제거 후보. §11-3에서 확인했듯 특이성 비교는 **선택자별로** 해야 한다(`input[type="text"]`(0,1,1) > `.um-input`(0,1,0)).

다만 이 변경의 유일한 실질 검증은 **화면 회귀 대조**이고, 이 세션에서는 로컬 서버를 띄울 수 없어 수행 불가다(주입 기반 CSSOM 검사도 이 창에서 무효 — §11-4). 따라서 T8-1 잔여는 **실행하지 않고 접근안만 확정**한다. 착수 조건: 사용자가 `npm run serve`를 실행해 수정 전후 화면을 대조할 수 있는 상태.

범위 주의: `shared.css`도 `!important` **69건**과 레거시 어두운 그림자(`rgba(0,0,0,0.5)` 등)를 갖고 있고 `index.html`이 이 시트를 로드하므로 **공개 화면에 살아 있다**. §10-3의 기록은 `atlas-theme.css`만 다뤘으므로, T8-1 잔여의 범위는 두 파일이다.
