# Canonical Institution Schema

This static app stores institutions as JSON objects and accepts matching CSV/XLSX rows in later import work. New runtime modules are ES modules for the future `unified-map.html` page only; legacy global scripts keep their current behavior.

## Canonical Codes

Office codes:

| Code | Korean label |
| --- | --- |
| `main` | 인천광역시교육청 본청 |
| `ganghwa` | 강화교육지원청 |
| `south` | 남부교육지원청 |
| `north` | 북부교육지원청 |
| `east` | 동부교육지원청 |
| `west` | 서부교육지원청 |
| `unassigned` | 미지정 |

Institution type codes:

| Code | Korean label |
| --- | --- |
| `school` | 학교 |
| `headquarters` | 본청 |
| `support-office` | 교육지원청 |
| `direct-agency` | 직속기관 |
| `library` | 도서관 |
| `experience-site` | 체험학습장 |
| `partner` | 협력기관 |
| `imported` | 가져온 행 |

## Required Columns

| Field | CSV header example | Rule | Geocoded | Persisted | Exported | Displayed |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | 식별자 | Stable unique row id. | No | Yes | Yes | No |
| `name` | 기관명, 학교명, 시설명 | Nonempty display name. | No | Yes | Yes | Yes |
| `type` | 기관유형 | Canonical institution type or known alias. | No | Yes | Yes | Yes |
| `office` | 관할지원청 | Canonical office or known alias; unknown values normalize to `unassigned` with a warning. | No | Yes | Yes | Yes |
| `officeSource` | 관할출처 | One of `explicit`, `inferred`, `default`, `imported`. | No | Yes | Yes | No |
| `address` or `lat` plus `lng` | 주소, 위도, 경도 | Each row needs a nonempty address or a finite coordinate pair. | Address only | Yes | Yes | Address: yes |

## Optional Columns

| Field | CSV header example | Rule | Geocoded | Persisted | Exported | Displayed |
| --- | --- | --- | --- | --- | --- | --- |
| `lat` | 위도 | Finite number; must be paired with `lng`. | No | Yes | Yes | Map only |
| `lng` | 경도 | Finite number; must be paired with `lat`. | No | Yes | Yes | Map only |
| `level` | 학교급 | School level such as `kinder`, `elem`, `mid`, `high`, `special`, `alt`. | No | Yes | Yes | Yes |
| `phone` | 전화 | Public institution phone number. | No | Yes | Yes | Yes |
| `url` | URL | Public website URL. | No | Yes | Yes | Yes |
| `description` | 설명 | Short public description. | No | Yes | Yes | Yes |
| `tags` | 태그 | Comma-separated or array-like labels for filtering. | No | Yes | Yes | Yes |

## Custom Columns

Any uploaded column that is not mapped to a canonical field is stored under `customFields` for local filtering/export. Custom fields are persisted and exported by the browser app, but they are not geocoded and must never be sent to Kakao or any external endpoint.

Examples:

| Uploaded header | Stored location | Geocoded | Persisted | Exported | Displayed |
| --- | --- | --- | --- | --- | --- |
| 원본분류 | `customFields["원본분류"]` | No | Yes | Yes | Optional detail panel |
| 사용자정의_메모 | `customFields["사용자정의_메모"]` | No | Yes | Yes | Optional detail panel |

## Connection Template

`data/connections.json` is versioned:

```json
{
  "version": 1,
  "connections": []
}
```

Future connection rows use `{ id, fromId, toId, color, strokeStyle, label, createdAt }`. Red and blue are first-class color options; ordinary schema failures return row-level errors.
