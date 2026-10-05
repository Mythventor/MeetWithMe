import test from "node:test";
import assert from "node:assert/strict";
import { recommendTimes } from "./recommendations.js";
const date = "2026-10-05";
const person = (id, slots, day = date) => ({
  id,
  name: id,
  slots: slots.map((s) => `${day}:${s}`),
});
const event = (people = [], extra = {}) => ({
  mode: "dates",
  dates: [date],
  start: 36,
  end: 40,
  people,
  ...extra,
});

test("empty events, no responses, and durations that cannot fit have distinct states", () => {
  assert.equal(recommendTimes(event()).reason, "no-people");
  assert.equal(recommendTimes(event([], { dates: [] })).reason, "no-dates");
  assert.equal(recommendTimes(event([person("A", [])])).reason, "no-overlap");
  assert.equal(
    recommendTimes(event([person("A", [36])]), 90).reason,
    "too-long",
  );
});
test("counts only people available throughout the entire half-open window", () => {
  const e = event([person("A", [36, 37]), person("B", [38, 39])]);
  assert.equal(recommendTimes(e, 60).reason, "no-overlap");
  const r = recommendTimes(e, 30).options;
  assert.deepEqual(
    r.map((o) => [o.start, o.count]),
    [
      [36, 1],
      [38, 1],
    ],
  );
  assert.deepEqual(r[0].unavailable, [{ id: "B", name: "B" }]);
});
test("maximum attendance beats earlier starts; tied starts are stable", () => {
  const e = event([
    person("A", [36, 37, 38, 39]),
    person("B", [38, 39]),
    person("C", []),
  ]);
  const r = recommendTimes(e, 15);
  assert.deepEqual(
    r.options.map((o) => [o.start, o.count]),
    [
      [38, 2],
      [39, 2],
      [36, 1],
      [37, 1],
    ],
  );
  assert.equal(r.totalPeople, 3);
});
test("gaps invalidate a whole meeting and unmarked people remain in denominator", () => {
  const r = recommendTimes(
    event([person("A", [36, 37, 39]), person("B", [])]),
    30,
  );
  assert.equal(r.options.length, 1);
  assert.equal(r.options[0].count, 1);
  assert.equal(r.totalPeople, 2);
});
test("duplicates and out-of-range slot values cannot inflate attendance", () => {
  const p = person("A", [36, 36, 36, 100]);
  p.slots.push("bad", `${date}:36.0`, "2026-10-06:37", null);
  assert.equal(
    recommendTimes(event([p], { dates: [date, date] }), 15).options.length,
    1,
  );
  assert.equal(recommendTimes(event([p]), 30).reason, "no-overlap");
});
test("does not bridge dates and handles the final quarter and midnight exactly", () => {
  const e = event(
    [{ id: "A", name: "A", slots: [`${date}:95`, "2026-10-06:0"] }],
    { dates: [date, "2026-10-06"], start: 0, end: 96 },
  );
  assert.equal(recommendTimes(e, 30).reason, "no-overlap");
  const r = recommendTimes(e, 15).options;
  assert.equal(r[0].end, 96);
  assert.equal(r[1].start, 0);
});
test("calendar and weekly ties use sorted dates, independent of input order", () => {
  const e = event([{ id: "A", name: "A", slots: ["6:36", "0:36"] }], {
    mode: "days",
    dates: ["6", "0"],
  });
  assert.deepEqual(
    recommendTimes(e, 15).options.map((o) => o.date),
    ["0", "6"],
  );
  const d = event(
    [{ id: "A", name: "A", slots: ["2027-01-01:36", "2026-12-31:36"] }],
    { dates: ["2027-01-01", "2026-12-31"] },
  );
  assert.deepEqual(
    recommendTimes(d, 15).options.map((o) => o.date),
    ["2026-12-31", "2027-01-01"],
  );
});
test("validates malformed data and rejects non-quarter durations and duplicate identities", () => {
  for (const duration of [0, -15, 1, 16, NaN, Infinity, "60", null])
    assert.equal(recommendTimes(event(), duration).reason, "invalid");
  for (const e of [
    null,
    {},
    event([], { start: -1 }),
    event([], { end: 97 }),
    event([], { start: 36.5 }),
    event([], { end: 36 }),
    event([], { mode: "other" }),
    event([], { dates: ["2026-02-30"] }),
    event([], { dates: ["2025-02-29"] }),
    event([], { dates: [null] }),
    event([], { people: [{}] }),
    event([person("A", []), person("A", [])]),
  ])
    assert.equal(recommendTimes(e).reason, "invalid");
  assert.equal(
    recommendTimes(event([], { dates: ["2028-02-29"] })).reason,
    "no-people",
  );
});
test("same-name participants with distinct IDs are counted separately; inputs remain unchanged", () => {
  const e = event([person("A", [36]), { ...person("B", [36]), name: "A" }]);
  const before = structuredClone(e);
  assert.equal(recommendTimes(e, 15).options[0].count, 2);
  assert.deepEqual(e, before);
});
test("recommendations immediately reflect added and removed availability", () => {
  const e = event([person("A", [36])]);
  assert.equal(recommendTimes(e, 15).options.length, 1);
  e.people[0].slots = [];
  assert.equal(recommendTimes(e, 15).options.length, 0);
});
test("DST transition dates preserve event wall-clock labels without host-zone conversion", () => {
  const e = event([person("A", [4, 5, 6, 7], "2026-11-01")], {
    dates: ["2026-11-01"],
    start: 4,
    end: 8,
    zone: "America/Chicago",
  });
  assert.equal(recommendTimes(e).options[0].start, 4);
});
test("500 deterministic randomized polls match an independent exhaustive oracle", () => {
  let seed = 12345;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  for (let trial = 0; trial < 500; trial++) {
    const start = Math.floor(random() * 80),
      end = start + 1 + Math.floor(random() * 16);
    const dates = ["2026-10-05", "2026-10-06"];
    const people = Array.from(
      { length: 1 + Math.floor(random() * 12) },
      (_, i) => ({
        id: String(i),
        name: String(i),
        slots: dates.flatMap((d) =>
          Array.from({ length: end - start }, (_, k) => start + k)
            .filter(() => random() < 0.7)
            .map((k) => `${d}:${k}`),
        ),
      }),
    );
    const duration = 1 + Math.floor(random() * 8);
    const e = event(people, { dates, start, end });
    const expected = [];
    for (const d of dates)
      for (let s = start; s + duration <= end; s++) {
        const ids = people
          .filter((p) =>
            Array.from({ length: duration }, (_, k) => `${d}:${s + k}`).every(
              (k) => p.slots.includes(k),
            ),
          )
          .map((p) => p.id);
        if (ids.length)
          expected.push({ date: d, start: s, count: ids.length, ids });
      }
    expected.sort(
      (a, b) =>
        b.count - a.count || a.date.localeCompare(b.date) || a.start - b.start,
    );
    assert.deepEqual(
      recommendTimes(e, duration * 15).options.map((o) => ({
        date: o.date,
        start: o.start,
        count: o.count,
        ids: o.attendees.map((p) => p.id),
      })),
      expected,
      `trial ${trial}`,
    );
  }
});
