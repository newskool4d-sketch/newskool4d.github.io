// 민감파일 게이트: 추적 파일에 비공개 파일·실키 패턴이 섞이면 실패시킨다.
// 사용: node tools/check-sensitive.mjs  (CI와 로컬 공용)
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// .gitignore와 이중 방어: 이 이름이 추적되면 즉시 실패
const BLOCKED_BASENAMES = new Set([
  "business.html",
  "private-local-map.html",
  "PRIVATE_LOCAL_APP_README.md",
  "build_schools_json.py",
  "fix-recommendations.md",
  "handoff.md",
  "pre-deploy-checklist.md",
  "ui-ux-ai-slop-audit.md",
]);

// 공개 저장소에 허용된 CSV만 통과 (업무용 CSV 유입 방지)
const ALLOWED_CSV = new Set([
  "data/institutions.sample.csv",
  "data/qa/synthetic-1000.csv",
]);

// 실키 패턴 (문서의 "KakaoAK ${...}" 같은 설명 문구는 매칭되지 않도록 32자 hex 요구)
const KEY_PATTERNS = [
  { name: "Kakao REST key (KakaoAK + 32-hex)", re: /KakaoAK\s+[0-9a-f]{32}/i },
  { name: "Kakao JS key (appkey= + 32-hex)", re: /appkey=[0-9a-f]{32}/i },
  { name: "KAKAO_REST_API_KEY 대입", re: /KAKAO_REST_API_KEY\s*[:=]\s*["']?[0-9a-f]{8,}/i },
];

const SCAN_EXTENSIONS = /\.(html|js|mjs|css|json|md|py|yml|yaml|txt|csv)$/i;
const SKIP_PREFIXES = ["vendor/"];

const trackedFiles = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const violations = [];

for (const file of trackedFiles) {
  const basename = file.split("/").pop();
  if (BLOCKED_BASENAMES.has(basename)) {
    violations.push(`${file}: 비공개 파일이 git 추적에 포함됨`);
    continue;
  }
  if (file.toLowerCase().endsWith(".csv") && !ALLOWED_CSV.has(file)) {
    violations.push(`${file}: 허용 목록에 없는 CSV (업무용 파일 여부 확인 필요)`);
    continue;
  }
  if (SKIP_PREFIXES.some((prefix) => file.startsWith(prefix))) continue;
  if (!SCAN_EXTENSIONS.test(file)) continue;

  const content = readFileSync(file, "utf8");
  for (const { name, re } of KEY_PATTERNS) {
    if (re.test(content)) violations.push(`${file}: ${name} 패턴 검출`);
  }
}

if (violations.length > 0) {
  console.error(`민감파일 게이트 실패: ${violations.length}건`);
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log(`민감파일 게이트 통과: 추적 파일 ${trackedFiles.length}개 검사, 위반 0건`);
