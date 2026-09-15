# 데이터 갱신 절차서 (T5)

- 작성일: 2026-09-15
- 대상: `data/schools.json`, `data/institutions.json`, `data/schools-directory-metadata.json`
- 원칙(D4, `upgrade-plan(2026-07-05).md`): 인천광역시교육청 홈페이지 공개 자료를 준용. 갱신은 공식 파일 갱신 시점을 추종하며, 기본 확인 시점은 연 2회(3.1./9.1. 학기 개시 직후)

## 0. 갱신 경로 2가지 — 변경 성격에 따라 선택

이 저장소에는 서로 다른 두 도구가 있고, **서로 대체하지 않는다**. 잘못 고르면 실패하거나(연락처 도구가 명단 불일치를 감지해 즉시 중단) 좌표 없이 학교가 추가되는 사고로 이어질 수 있다.

| 상황 | 도구 | 다루는 범위 | 다루지 않는 범위 |
| --- | --- | --- | --- |
| 신설·폐교·통합·교명 변경·학교급 변경 등 **학교 목록 자체가 바뀜** | `build_schools_json.py` (경로 A) | 원본 엑셀에서 전체 명단 재구축(초안) | 좌표 산출(수작업 확인 필요) |
| 주소·전화·홈페이지 등 **기존 학교의 연락처만 바뀜**, 목록은 그대로 | `tools/merge-school-directory.mjs` (경로 B) | 이름+주소가 정확히 일치하는 기존 학교의 연락처 갱신 | 신규/폐교 학교 추가·삭제(불일치 시 즉시 에러) |

어느 쪽인지 애매하면(예: 일부 신설 + 일부 연락처 변경이 섞인 공식 파일) 경로 A를 먼저 수행해 목록을 맞춘 뒤, 필요하면 경로 B로 연락처를 보강한다.

## 1. 공식 파일 확보

1. 인천광역시교육청 홈페이지에서 최신 학교 현황 공개 자료를 내려받는다.
2. **9.1. 학기 갱신 여부 확인 (미결 — 사용자 확인 필요)**: 2026-09-15 기준 저장소의 정본은 `2026-04-01` 자료다. 9월 학기 개시 이후 더 최신 공식 파일이 게시되었는지는 이 세션에서 확인할 수 없다. 확인 결과를 아래 표에 1행으로 기록한다.

| 확인일 | 확인자 | 결과 |
| --- | --- | --- |
| _(미기재)_ | | 9.1. 이후 신규 공식 파일 게시 여부 미확인 |

3. 현재 로컬에 존재가 확인된 원천 파일(참고용 위치, 저장소 밖):
   - 경로 A 원천(엑셀): `C:\Users\홍주형\OneDrive - 인천광역시교육청\바탕 화면\★2026.4.1.자 학교 현황.xlsx`
   - 경로 B 원천(CSV, `data/schools-directory-metadata.json`의 `sourceFilename`과 일치): `D:\Ai 산출물\학교현황_통합(홈페이지 추가)_2026-04-01.csv`
   - 새 공식 파일을 받으면 파일명에 발행일(`YYYY-MM-DD`)을 포함시켜 위 두 경로 규칙을 유지한다. `tools/merge-school-directory.mjs`는 파일명에서 `YYYY-MM-DD` 패턴을 정규식으로 추출해 `sourceDate`를 자동 기록하므로, 날짜가 없는 파일명을 쓰면 메타데이터의 기준일이 빈 문자열이 된다.

## 2. 경로 A — 학교 목록 자체가 바뀔 때

1. `build_schools_json.py` 상단의 `XLSX`(원천 파일 경로)와 `OUT`(출력 경로, 기본 `data/schools_new.json`)을 새 파일 경로로 수정한다. **이 스크립트는 절대경로가 하드코딩돼 있어 실행 전 반드시 확인·수정해야 한다.**
2. Python으로 실행한다(한글 경로 포함이므로 스크립트 파일 실행 권장, 인라인 `-c` 금지 — CLAUDE.md 섹션 6):
   ```bash
   python build_schools_json.py
   ```
3. 산출된 `data/schools_new.json`은 "검토용 초안"이다. **좌표를 포함하지 않는다.** 신규·주소 변경 행만 골라 네이버 지도 또는 카카오맵에서 위경도를 확인해 수작업으로 채운다(전체 967개교를 재지오코딩하지 않는다 — 변경분만).
4. 검토·좌표 보강이 끝나면 `data/schools_new.json`을 `data/schools.json`으로 교체하고, `data/institutions.json`에서 `type: "school"` 항목을 동일하게 교체한다(기존 비학교 기관 항목은 유지).
5. `data/schools-directory-metadata.json`을 원천 파일명·SHA-256(예: `sha256sum` 또는 Python `hashlib.sha256`)·건수 기준으로 수동 갱신한다(경로 A는 `tools/merge-school-directory.mjs`를 거치지 않으므로 메타데이터 자동 갱신이 없다).

## 3. 경로 B — 연락처만 바뀔 때

1. 공식 CSV가 아래 열 헤더를 정확히 포함하는지 확인한다: `학교명`, `학교급`, `담당교육지원청`, `주소`, `전화`, `URL`.
2. 실행한다:
   ```bash
   node tools/merge-school-directory.mjs "<원천CSV 경로>"
   ```
3. `학교명+주소` 조합이 `data/schools.json`의 기존 행과 정확히 일치하지 않으면 도구가 즉시 에러로 중단하고 불일치 목록(최대 10건)을 출력한다 — 이는 안전장치이며, 실패 시 원인(오탈자, 통합/개칭, 미등록 신설교)을 확인한 뒤 필요하면 경로 A로 전환한다.
4. 성공하면 `data/schools.json`, `data/institutions.json`, `data/schools-directory-metadata.json`이 자동으로 갱신된다.

## 4. 공통 후속 절차 (경로 A·B 공용)

1. 좌표·권역 검증:
   ```bash
   npm run validate:data
   ```
2. `data/schools-directory-metadata.json`의 `sourceDate`를 확인하고, 아래 2개 파일에 하드코딩된 고지 기준일 문자열을 동일한 값으로 갱신한다(정적 HTML은 JSON을 읽지 못하므로 자동 동기화가 없다 — 2곳 모두 수동 확인 필수. `schools.html`·`infrastructure.html`은 2026-09-15 T11부터 리다이렉트 스텁이라 기준일 문구가 없음 — 갱신 대상 아님):
   - `index.html` (`.deploy-note` "데이터 기준")
   - `unified-map.html` (`.um-disclaimer`)

   확인 명령(치환 후 재확인용):
   ```bash
   grep -n "2026.4.1. 기준" index.html unified-map.html
   ```
3. 전체 테스트·구문·민감파일 게이트:
   ```bash
   npm run check
   npm test
   node tools/check-sensitive.mjs
   ```
4. Sites worker를 함께 배포한다면 재빌드한다(하지 않으면 `dist/server/index.js`가 새 데이터와 어긋난다 — `tests/sites-worker-directions.test.mjs`의 동기화 테스트가 이를 잡아낸다):
   ```bash
   npm run build:sites
   npm test
   ```
5. 커밋 메시지에 원천 파일명과 기준일을 명시하고, `pre-deploy-checklist.md`의 실 키 스모크를 배포 전 1회 재수행한다.

## 5. 갱신 실적 기록 (연 2회 목표)

| 갱신일 | 원천 파일 | 기준일 | 경로(A/B) | 학교 수 변동 | 기록자 |
| --- | --- | --- | --- | --- | --- |
| 2026-07-17 | 학교 연락처 통합 CSV | 2026-04-01 | B | 967 (변동 없음, 연락처만) | (커밋 `90aa0bd` 기준 소급 기록) |
| _(다음 갱신 시 추가)_ | | | | | |
