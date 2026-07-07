import assert from "node:assert/strict";
import test from "node:test";

import { createGeocodeCache, normalizeGeocodeAddress } from "../js/geocode-cache.js";
import { createKakaoGeocodeQueue } from "../js/geocode-queue.js";

const kakaoStatus = {
  OK: "OK",
  ZERO_RESULT: "ZERO_RESULT",
  ERROR: "ERROR",
};

const resultAt = (lat, lng, addressName = "인천광역시 남동구 정각로 9") => [{
  y: String(lat),
  x: String(lng),
  address: { address_name: addressName },
}];

const createFakeGeocoder = (responsesByQuery) => {
  const calls = [];
  const state = {
    active: 0,
    maxActive: 0,
  };

  return {
    calls,
    state,
    geocoder: {
      addressSearch(query, callback) {
        calls.push(query);
        state.active += 1;
        state.maxActive = Math.max(state.maxActive, state.active);
        const responses = responsesByQuery.get(query) ?? [];
        const response = responses.shift() ?? {
          status: kakaoStatus.OK,
          results: resultAt(37.5, 126.7, query),
        };
        setTimeout(() => {
          state.active -= 1;
          callback(response.results, response.status);
        }, response.delayMs ?? 0);
      },
    },
  };
};

test("normalizes address cache keys when whitespace and case differ", () => {
  // Given: address variants that should share one geocode cache key.
  const first = "  Incheon\tNamdong-gu   Jeonggak-ro 9  ";
  const second = "incheon namdong-gu jeonggak-ro 9";
  const cache = createGeocodeCache();

  // When: a result is cached with the first address and read with the second.
  cache.set(first, { lat: 37.456, lng: 126.705, addressName: "normalized" });

  // Then: the normalized key is stable and resolves the cached result.
  assert.equal(normalizeGeocodeAddress(first), second);
  assert.deepEqual(cache.get(second), { lat: 37.456, lng: 126.705, addressName: "normalized" });
});

test("limits geocoder concurrency to three when many rows need geocoding", async () => {
  // Given: six address rows and a fake Kakao geocoder with delayed callbacks.
  const responses = new Map();
  const rows = Array.from({ length: 6 }, (_, index) => {
    const address = `인천광역시 테스트로 ${index + 1}`;
    responses.set(address, [{ status: kakaoStatus.OK, results: resultAt(37 + index, 126 + index), delayMs: 5 }]);
    return { id: `row-${index + 1}`, name: `비공개명 ${index + 1}`, address };
  });
  const fake = createFakeGeocoder(responses);
  const queue = createKakaoGeocodeQueue({
    geocoder: fake.geocoder,
    status: kakaoStatus,
    concurrency: 3,
    chunkDelayMs: 0,
  });

  // When: the queue runs to completion.
  const summary = await queue.start(rows);

  // Then: all rows are geocoded without exceeding the configured concurrency.
  assert.equal(summary.succeeded, 6);
  assert.equal(summary.failures.length, 0);
  assert.equal(fake.state.maxActive, 3);
  assert.equal(summary.mappableRows.length, 6);
});

test("retries empty and 429-like failures before returning successful coordinates", async () => {
  // Given: rows that first receive empty and throttled responses.
  const emptyThenOk = "인천광역시 남동구 빈결과로 1";
  const throttledThenOk = "인천광역시 남동구 제한로 2";
  const responses = new Map([
    [emptyThenOk, [
      { status: kakaoStatus.OK, results: [] },
      { status: kakaoStatus.OK, results: resultAt(37.45, 126.7) },
    ]],
    [throttledThenOk, [
      { status: "429", results: [] },
      { status: kakaoStatus.OK, results: resultAt(37.46, 126.71) },
    ]],
  ]);
  const fake = createFakeGeocoder(responses);
  const queue = createKakaoGeocodeQueue({
    geocoder: fake.geocoder,
    status: kakaoStatus,
    concurrency: 2,
    chunkDelayMs: 0,
    retryDelayMs: 0,
    maxRetries: 1,
  });

  // When: the queue processes retryable failures.
  const summary = await queue.start([
    { id: "empty", name: "빈 결과", address: emptyThenOk },
    { id: "throttle", name: "제한 결과", address: throttledThenOk },
  ]);

  // Then: both rows become mappable and the fake service was retried.
  assert.equal(summary.succeeded, 2);
  assert.equal(summary.failures.length, 0);
  assert.equal(fake.calls.filter((query) => query === emptyThenOk).length, 2);
  assert.equal(fake.calls.filter((query) => query === throttledThenOk).length, 2);
});

test("cancels before starting later rows when cancel is requested from progress", async () => {
  // Given: a serial queue with three rows.
  const responses = new Map([
    ["인천광역시 취소로 1", [{ status: kakaoStatus.OK, results: resultAt(37.1, 126.1) }]],
    ["인천광역시 취소로 2", [{ status: kakaoStatus.OK, results: resultAt(37.2, 126.2) }]],
    ["인천광역시 취소로 3", [{ status: kakaoStatus.OK, results: resultAt(37.3, 126.3) }]],
  ]);
  const fake = createFakeGeocoder(responses);
  const progressEvents = [];
  const queue = createKakaoGeocodeQueue({
    geocoder: fake.geocoder,
    status: kakaoStatus,
    concurrency: 1,
    chunkDelayMs: 0,
    onProgress(event) {
      progressEvents.push(event);
      if (event.completed === 1) {
        queue.cancel();
      }
    },
  });

  // When: progress cancels the queue after the first completed row.
  const summary = await queue.start([
    { id: "cancel-1", address: "인천광역시 취소로 1" },
    { id: "cancel-2", address: "인천광역시 취소로 2" },
    { id: "cancel-3", address: "인천광역시 취소로 3" },
  ]);

  // Then: no later rows are sent to Kakao and the summary reports cancellation.
  assert.equal(summary.cancelled, true);
  assert.equal(summary.completed, 1);
  assert.deepEqual(fake.calls, ["인천광역시 취소로 1"]);
  assert.deepEqual(progressEvents.map((event) => event.status), ["success"]);
});

test("reports cache hits without calling Kakao for duplicate normalized addresses", async () => {
  // Given: two rows with equivalent addresses and a serial queue.
  const normalizedAddress = "인천광역시 남동구 정각로 9";
  const responses = new Map([
    [normalizedAddress, [{ status: kakaoStatus.OK, results: resultAt(37.456, 126.705) }]],
  ]);
  const fake = createFakeGeocoder(responses);
  const progressEvents = [];
  const queue = createKakaoGeocodeQueue({
    geocoder: fake.geocoder,
    status: kakaoStatus,
    concurrency: 1,
    chunkDelayMs: 0,
    onProgress(event) {
      progressEvents.push(event);
    },
  });

  // When: both rows are geocoded.
  const summary = await queue.start([
    { id: "cache-1", address: " 인천광역시   남동구 정각로 9 " },
    { id: "cache-2", address: "인천광역시 남동구 정각로 9" },
  ]);

  // Then: the second row is served from cache and no second Kakao call is made.
  assert.equal(summary.succeeded, 2);
  assert.equal(summary.cacheHits, 1);
  assert.deepEqual(fake.calls, [normalizedAddress]);
  assert.deepEqual(progressEvents.map((event) => event.cacheHit), [false, true]);
});

test("returns failure rows without marker-worthy coordinates when geocoding stays empty", async () => {
  // Given: a fake geocoder that never returns a coordinate.
  const address = "인천광역시 남동구 실패로 404";
  const fake = createFakeGeocoder(new Map([
    [address, [
      { status: kakaoStatus.ZERO_RESULT, results: [] },
      { status: kakaoStatus.ZERO_RESULT, results: [] },
    ]],
  ]));
  const queue = createKakaoGeocodeQueue({
    geocoder: fake.geocoder,
    status: kakaoStatus,
    concurrency: 1,
    chunkDelayMs: 0,
    retryDelayMs: 0,
    maxRetries: 1,
  });

  // When: the queue exhausts retries.
  const summary = await queue.start([{ id: "fail-1", name: "실패 행", address }]);

  // Then: the failure is explicit and no result can be rendered as a marker.
  assert.equal(summary.failed, 1);
  assert.equal(summary.mappableRows.length, 0);
  assert.equal(summary.failures[0].reason, "zero_result");
  assert.equal(Object.hasOwn(summary.failures[0], "lat"), false);
  assert.equal(Object.hasOwn(summary.failures[0], "lng"), false);
});

test("sends only the normalized address string to Kakao geocoder methods", async () => {
  // Given: a row with private and uploaded fields that must stay local.
  const privateRow = {
    id: "private-1",
    name: "비밀 기관명",
    address: "  인천광역시   남동구 정각로 9  ",
    memo: "민감 메모",
    phone: "010-0000-0000",
    customFields: { 비공개: "외부 전송 금지" },
    extras: { internalCode: "EXTRAS-PRIVATE-001", note: "extras 비공개값" },
    uploadedExtraColumn: "원본 추가값",
  };
  const fake = createFakeGeocoder(new Map([
    ["인천광역시 남동구 정각로 9", [{ status: kakaoStatus.OK, results: resultAt(37.456, 126.705) }]],
  ]));
  const queue = createKakaoGeocodeQueue({
    geocoder: fake.geocoder,
    status: kakaoStatus,
    concurrency: 1,
    chunkDelayMs: 0,
  });

  // When: the row is geocoded.
  const summary = await queue.start([privateRow]);

  // Then: Kakao receives only the normalized address and no private row fields.
  assert.equal(summary.succeeded, 1);
  assert.deepEqual(fake.calls, ["인천광역시 남동구 정각로 9"]);
  assert.ok(fake.calls.every((query) => !query.includes("비밀")));
  assert.ok(fake.calls.every((query) => !query.includes("민감")));
  assert.ok(fake.calls.every((query) => !query.includes("010")));
  assert.ok(fake.calls.every((query) => !query.includes("외부 전송")));
  assert.ok(fake.calls.every((query) => !query.includes("EXTRAS-PRIVATE-001")));
  assert.ok(fake.calls.every((query) => !query.includes("extras 비공개값")));
  assert.ok(fake.calls.every((query) => !query.includes("원본 추가값")));
});

test("skips valid coordinates and fails blank addresses or invalid coordinate-only rows", async () => {
  // Given: malformed and already geocoded rows.
  const fake = createFakeGeocoder(new Map());
  const queue = createKakaoGeocodeQueue({
    geocoder: fake.geocoder,
    status: kakaoStatus,
    concurrency: 3,
    chunkDelayMs: 0,
  });

  // When: rows are processed.
  const summary = await queue.start([
    { id: "ready", address: "", lat: "37.456", lng: "126.705" },
    { id: "blank", address: "   " },
    { id: "invalid-coordinate", lat: "north", lng: "east" },
  ]);

  // Then: valid coordinates are not geocoded, malformed rows fail locally, and Kakao is not called.
  assert.equal(summary.skipped, 1);
  assert.equal(summary.failed, 2);
  assert.equal(summary.mappableRows.length, 1);
  assert.deepEqual(summary.failures.map((failure) => failure.reason), ["missing_address", "missing_address"]);
  assert.deepEqual(fake.calls, []);
});
