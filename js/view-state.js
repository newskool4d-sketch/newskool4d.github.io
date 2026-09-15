import { INSTITUTION_TYPE_CODES, OFFICE_CODES, REGION_CODES, SCHOOL_LEVEL_CODES } from "./constants.js";

export const VIEW_CODES = Object.freeze(["all", "schools", "infra"]);

export const INFRA_TYPE_CODES = Object.freeze([
  "headquarters",
  "support-office",
  "direct-agency",
  "library",
  "experience-site",
  "partner",
]);

const TYPES_FOR_VIEW = Object.freeze({
  all: INSTITUTION_TYPE_CODES,
  schools: ["school"],
  infra: INFRA_TYPE_CODES,
});

const LIST_PARAMS = Object.freeze({
  types: INSTITUTION_TYPE_CODES,
  levels: SCHOOL_LEVEL_CODES,
  regions: REGION_CODES,
});

const finiteParam = (value) => {
  if (value === null || value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const sameList = (left, right) => left.length === right.length && left.every((value) => right.includes(value));

export const presetFor = (view) => {
  const code = VIEW_CODES.includes(view) ? view : "all";
  return {
    view: code,
    search: "",
    office: "all",
    types: [...TYPES_FOR_VIEW[code]],
    levels: [...SCHOOL_LEVEL_CODES],
    regions: [...REGION_CODES],
    designation: "",
    supervisor: "",
    viewport: null,
  };
};

export const parseViewState = (search = "") => {
  const params = new URLSearchParams(search);
  const state = presetFor(params.get("view"));
  state.search = params.get("q") ?? "";
  if (OFFICE_CODES.includes(params.get("office"))) state.office = params.get("office");
  for (const [name, allowed] of Object.entries(LIST_PARAMS)) {
    if (params.has(name)) {
      state[name] = params.get(name).split(",").map((value) => value.trim()).filter((value) => allowed.includes(value));
    }
  }
  state.designation = (params.get("designation") ?? "").trim();
  state.supervisor = (params.get("supervisor") ?? "").trim();
  const lat = finiteParam(params.get("lat"));
  const lng = finiteParam(params.get("lng"));
  if (lat !== null && lng !== null) {
    state.viewport = { lat, lng, level: finiteParam(params.get("z")) ?? 8 };
  }
  return state;
};

export const serializeViewState = (state) => {
  const preset = presetFor(state.view);
  const params = new URLSearchParams();
  if (preset.view !== "all") params.set("view", preset.view);
  if (state.search) params.set("q", state.search);
  if (state.office && state.office !== "all") params.set("office", state.office);
  for (const name of Object.keys(LIST_PARAMS)) {
    if (!sameList(state[name], preset[name])) params.set(name, state[name].join(","));
  }
  if (state.designation) params.set("designation", state.designation);
  if (state.supervisor) params.set("supervisor", state.supervisor);
  if (state.viewport) {
    params.set("lat", state.viewport.lat.toFixed(4));
    params.set("lng", state.viewport.lng.toFixed(4));
    params.set("z", String(state.viewport.level));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
};

export const toRepositoryFilters = (state) => ({
  search: state.search,
  office: state.office,
  types: state.types,
  levels: state.levels,
  regions: state.regions,
  designation: state.designation,
  supervisor: state.supervisor,
});
