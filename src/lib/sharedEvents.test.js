import test from "node:test";
import assert from "node:assert/strict";
import { eventData, responseData, sharedId, validId } from "./sharedEvents.js";
const event = {
  name: " Meeting ",
  mode: "dates",
  dates: ["2026-10-20"],
  start: 36,
  end: 38,
  zone: "America/Chicago",
};
test("shared route parsing cannot become a nested database path", () => {
  assert.equal(sharedId("local-event"), null);
  assert.equal(sharedId("event/abc"), "abc");
  for (const s of [
    "",
    "abc",
    "a".repeat(20) + "/responses",
    "%2F",
    "a".repeat(65),
  ])
    assert.equal(validId(s), false);
  assert.equal(validId("a".repeat(20)), true);
});
test("event schema strips local participants and creates exact slot allowlist", () => {
  const result = eventData(
    { ...event, people: [{ name: "Private" }] },
    "owner",
  );
  assert.equal(result.name, "Meeting");
  assert.equal(result.people, undefined);
  assert.deepEqual(result.allowedSlots, ["2026-10-20:36", "2026-10-20:37"]);
  for (const extra of [
    { dates: [] },
    { dates: ["2026-02-30"] },
    { dates: Array(61).fill("2026-10-20") },
    { start: -1 },
    { end: 97 },
    { zone: "invalid" },
    { name: "" },
    { mode: "other" },
  ])
    assert.throws(() => eventData({ ...event, ...extra }, "owner"));
});
test("response schema trims names, filters slots and deduplicates without mutating input", () => {
  const p = {
    name: " Alice ",
    slots: ["2026-10-20:36", "2026-10-20:36", "other"],
    id: "untrusted",
  };
  assert.deepEqual(responseData(p, eventData(event, "owner").allowedSlots), {
    name: "Alice",
    slots: ["2026-10-20:36"],
  });
  assert.equal(p.slots.length, 3);
  assert.throws(() => responseData({ name: " ", slots: [] }, []));
});
