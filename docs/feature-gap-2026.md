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
| 보기 전환 뒤에도 선택 기관 패널이 이전 선택을 유지 | 결함 | 2차 수정 |
| 새 필터 행의 375px 배치 | 미확인(화면 캡처 실패) | T12 실측 |
