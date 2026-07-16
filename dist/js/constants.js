export const OFFICE_CODES = Object.freeze([
  "main",
  "ganghwa",
  "south",
  "north",
  "east",
  "west",
  "unassigned",
]);

export const OFFICE_LABELS = Object.freeze({
  main: "인천광역시교육청 본청",
  ganghwa: "강화교육지원청",
  south: "남부교육지원청",
  north: "북부교육지원청",
  east: "동부교육지원청",
  west: "서부교육지원청",
  unassigned: "미지정",
});

export const OFFICE_ALIASES = Object.freeze({
  main: ["main", "본청", "시교육청", "교육청", "인천광역시교육청", "office-main"],
  ganghwa: ["ganghwa", "강화", "강화교육지원청", "인천광역시강화교육지원청", "office-ganghwa"],
  south: ["south", "남부", "남부교육지원청", "인천광역시남부교육지원청", "office-south"],
  north: ["north", "북부", "북부교육지원청", "인천광역시북부교육지원청", "office-north"],
  east: ["east", "동부", "동부교육지원청", "인천광역시동부교육지원청", "office-east"],
  west: ["west", "서부", "서부교육지원청", "인천광역시서부교육지원청", "office-west"],
  unassigned: ["", "unassigned", "미지정", "없음", "알수없음", "알 수 없음", "unknown"],
});

export const INSTITUTION_TYPE_CODES = Object.freeze([
  "school",
  "headquarters",
  "support-office",
  "direct-agency",
  "library",
  "experience-site",
  "partner",
  "imported",
]);

export const INSTITUTION_TYPE_LABELS = Object.freeze({
  school: "학교",
  headquarters: "본청",
  "support-office": "교육지원청",
  "direct-agency": "직속기관",
  library: "도서관",
  "experience-site": "체험학습장",
  partner: "협력기관",
  imported: "가져온 행",
});

export const INSTITUTION_TYPE_ALIASES = Object.freeze({
  school: ["school", "학교", "유치원", "초등학교", "중학교", "고등학교", "특수학교", "대안학교"],
  headquarters: ["headquarters", "본청", "시교육청", "인천광역시교육청", "office-main"],
  "support-office": ["support-office", "support office", "교육지원청", "지원청", "regional-office"],
  "direct-agency": ["direct-agency", "direct", "직속기관", "직속", "교육원", "평생학습관"],
  library: ["library", "도서관"],
  "experience-site": ["experience-site", "experience", "체험학습장", "체험교육", "야영장", "학생교육원", "isec"],
  partner: ["partner", "협력기관", "협력처", "연계기관", "partner-site"],
  imported: ["imported", "업로드", "가져오기", "가져온행", "사용자입력"],
});

export const OFFICE_SOURCE_CODES = Object.freeze([
  "explicit",
  "inferred",
  "default",
  "imported",
]);

export const CONNECTION_COLOR_CODES = Object.freeze([
  "red",
  "blue",
  "yellow",
  "green",
  "black",
]);

export const CONNECTION_COLOR_VALUES = Object.freeze({
  red: "#ef4444",
  blue: "#2563eb",
  yellow: "#facc15",
  green: "#16a34a",
  black: "#111827",
});

export const CONNECTION_STROKE_STYLES = Object.freeze([
  "solid",
  "dashed",
  "dotted",
]);
