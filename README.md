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
3. 배포 후 `https://newskool4d-sketch.github.io/newskool4d.github.io/`에 접속합니다.

전체 개발 폴더를 그대로 업로드하지 마세요. `business.html`, `private-local-map.html`, 업무용 CSV, 민감정보 파일은 공개 저장소에 포함하지 않습니다.

## 카카오 지도 API 설정

카카오 Developers에서 Web 플랫폼 사이트 도메인에 아래 주소를 등록합니다.

```text
https://newskool4d-sketch.github.io
```

지도 화면에서 사용하는 키는 Kakao Maps JavaScript 키입니다. JavaScript 키는 브라우저에서 보일 수 있으므로, 공개 저장소에는 가능하면 하드코딩하지 않고 카카오 Developers에서 Web 플랫폼 사이트 도메인을 위 주소로 제한해 운영합니다.

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
