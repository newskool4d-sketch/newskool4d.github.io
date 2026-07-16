// 관심 기관(즐겨찾기) 저장소.
// 저장 형식: { version: 1, ids: string[] } — schools.html의 비모듈 스크립트도 같은 키·형식을 읽는다.
export const FAVORITES_STORAGE_KEY = "incheon_edu_favorites_v1";

const isValidId = (id) => typeof id === "string" && id.trim().length > 0;

const readIds = (storage) => {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(FAVORITES_STORAGE_KEY) ?? "null");
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.ids)) return [];
    return parsed.ids.filter(isValidId);
  } catch {
    return [];
  }
};

export const createFavoritesStore = ({ storage = globalThis.localStorage ?? null } = {}) => {
  const ids = new Set(readIds(storage));

  const persist = () => {
    if (!storage) return;
    try {
      storage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify({ version: 1, ids: [...ids] }));
    } catch {
      // 저장 실패(용량 초과 등) 시에도 세션 내 동작은 유지한다.
    }
  };

  return {
    has: (id) => ids.has(id),
    list: () => [...ids],
    toggle(id) {
      if (!isValidId(id)) return false;
      const nowFavorite = !ids.has(id);
      if (nowFavorite) ids.add(id);
      else ids.delete(id);
      persist();
      return nowFavorite;
    },
    clear() {
      ids.clear();
      persist();
    },
    exportJson: () => JSON.stringify({ version: 1, ids: [...ids] }, null, 2),
    importJson(text) {
      try {
        const parsed = JSON.parse(text);
        if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.ids)) {
          return { ok: false, added: 0 };
        }
        let added = 0;
        for (const id of parsed.ids.filter(isValidId)) {
          if (!ids.has(id)) {
            ids.add(id);
            added += 1;
          }
        }
        persist();
        return { ok: true, added };
      } catch {
        return { ok: false, added: 0 };
      }
    },
  };
};
