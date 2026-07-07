# newskool4d.github.io 인천교육 공개지도

관내학교 디렉토리와 체험교육기관 안내처럼 공개 가능한 정보만 제공하는 GitHub Pages용 정적 지도 사이트입니다.

## 공개 배포 범위

| 파일 | 공개 배포 여부 | 용도 |
| --- | --- | --- |
| `index.html` | 포함 | 공개 지도 첫 화면 |
| `schools.html` | 포함 | 관내학교 디렉토리 지도 |
| `infrastructure.html` | 포함 | 체험교육기관 및 연계 체험처 지도 |
| `shared.css`, `shared.js` | 포함 | 공개 지도 공통 디자인과 카카오 지도 로더 |
| `data/schools.json` | 포함 | 공개 가능한 학교 기본 데이터 |
| `data/infra.json` | 포함 | 공개 가능한 체험교육기관 기본 데이터 |
| `business.html` | 제외 | 로컬 비공개 앱에서만 사용 |
| `private-local-map.html` | 제외 | 로컬 비공개 앱에서만 사용 |

## 배포 방법

1. `public-site` 폴더의 내용만 `newskool4d.github.io` 저장소 루트에 업로드합니다.
2. GitHub 저장소의 `Settings > Pages`에서 Branch를 `main` 루트로 지정합니다.
3. 배포 후 `https://newskool4d.github.io/`에 접속합니다.

전체 개발 폴더를 그대로 업로드하지 마세요. `business.html`, `private-local-map.html`, 업무용 CSV, 민감정보 파일은 공개 저장소에 포함하지 않습니다.

## 카카오 지도 API 설정

카카오 공식 문서는 지도 표시와 주소 지오코딩을 서로 다른 키/실행 위치로 구분합니다.

- Maps JavaScript API는 Kakao Developers의 JavaScript 키를 `appkey`로 사용하며, JavaScript SDK를 실행할 Web 플랫폼 도메인을 등록해야 합니다.
- Local REST API 주소 검색/좌표 변환은 REST API이며 `Authorization: KakaoAK ${REST_API_KEY}` 헤더를 사용합니다.
- 따라서 REST 키는 서버 전용입니다. `KAKAO_REST_API_KEY` 또는 REST 키 값을 브라우저 코드, HTML, 공개 정적 파일, GitHub Pages 저장소에 넣지 않습니다.

### 배포/키 모드 매트릭스

| 모드 | 호스팅/실행 위치 | 필요한 키 | 브라우저 저장 | 사용 범위 | 금지 사항 |
| --- | --- | --- | --- | --- | --- |
| no-key/reference mode | GitHub Pages 또는 로컬 정적 서버 | 없음 | 가져오기/연결선 데이터가 이 브라우저의 localStorage에 저장될 수 있음 | README, 샘플 데이터, 검색/필터, CSV/XLSX 미리보기, JSON 내보내기, 좌표 보유 행 검토 | 실제 카카오 지도 타일 렌더링을 검증했다고 주장하지 않음 |
| public static Kakao JavaScript key mode | GitHub Pages 또는 정적 서버 | Kakao JavaScript 키 | 사용자가 입력한 JavaScript 키가 이 브라우저의 localStorage에 저장됨 | 도메인 제한된 공개 정적 지도 표시, 마커/클러스터/연결선 표시 | 실제 키를 커밋하거나 공개 JS/HTML에 하드코딩하지 않음 |
| local browser import mode | 사용자 PC 브라우저와 로컬 정적 서버 | 지도 표시가 필요할 때만 JavaScript 키 | 업로드 행, 연결선, JavaScript 키가 해당 브라우저 localStorage에 저장됨 | 업무용 CSV/XLSX를 서버 전송 없이 미리보기/병합/내보내기. 좌표가 이미 있는 행은 지도 마커 후보가 됨 | 민감 파일을 공개 저장소에 포함하거나 REST 키를 브라우저에 입력하지 않음 |
| Phase 2 Vercel/REST server geocode mode | 향후 Vercel 서버 라우트 등 비공개 서버 | 서버 환경변수의 REST API 키 | 브라우저에는 REST 키 저장 없음 | 서버가 주소만 받아 Kakao Local REST API로 좌표 변환 후 결과 반환 | 현재 정적 앱의 전제 조건으로 삼지 않음. REST 키를 public env, 클라이언트 번들, 정적 파일에 노출하지 않음 |

### JavaScript 키 운영

Kakao Developers에서 Web 플랫폼 사이트 도메인에 운영 주소를 등록합니다.

```text
https://newskool4d.github.io
http://localhost:8080
```

지도 화면에서 사용하는 키는 Kakao Maps JavaScript 키입니다. 브라우저 JavaScript 키는 네트워크 요청과 개발자 도구에서 보일 수 있으므로 비밀값으로 취급하지 않습니다. 대신 Kakao Developers에서 허용 도메인을 제한하고, 실제 키는 커밋하지 않습니다. 이 앱은 사용자가 입력한 JavaScript 키를 해당 브라우저의 localStorage에 저장해 다시 사용합니다. localStorage는 로컬 브라우저 저장소일 뿐 암호화 저장소가 아니며, 브라우저 데이터 삭제 또는 앱의 JSON 내보내기/초기화 절차로 정리할 수 있습니다.

### REST 키와 Phase 2 서버 옵션

주소를 좌표로 바꾸는 Kakao Local API는 REST 전용입니다. REST 키는 서버에서만 `Authorization: KakaoAK ...` 헤더로 사용해야 하며, 정적 HTML/JS나 public 환경변수에 두면 안 됩니다.

Phase 2에서 대량 주소 지오코딩이 필요하면 Vercel 같은 서버 라우트를 별도로 둡니다. 서버는 `KAKAO_REST_API_KEY`를 비공개 환경변수로 읽고, 브라우저는 주소와 행 식별자처럼 필요한 최소 데이터만 서버에 보냅니다. 업로드 파일의 사용자정의 열 전체나 민감 필드는 REST API로 전달하지 않습니다. 이 Phase 2 서버는 아직 현재 정적 배포의 필수 구성요소가 아닙니다.

## 로컬 비공개 앱

업무용 커스텀 디렉토리와 민감정보 학교명 자동 매칭 도구는 `private-local-app` 폴더에서만 별도로 실행합니다.

비공개 앱 운영 원칙:

- 공개 GitHub Pages에 업로드하지 않음
- 업무용 CSV와 민감정보 파일을 저장소에 포함하지 않음
- 필요한 파일은 사용자 PC에서 직접 불러옴
- 실행 전 관리자 코드 또는 내부 안내를 별도로 전달함

## 로컬 확인

정적 서버를 실행한 뒤 확인합니다.

```bash
python -m http.server 8080
```

브라우저에서 `http://localhost:8080/`으로 접속합니다.

## Vendored browser libraries

| File | Source | Version | License |
| --- | --- | --- | --- |
| `vendor/xlsx.full.min.js` | `https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js` | SheetJS `xlsx@0.18.5` | Apache-2.0, see `vendor/xlsx.LICENSE.txt` |

The spreadsheet importer uses this local browser asset so CSV/XLS/XLSX preview can run in the static app without a bundler or runtime CDN dependency.
