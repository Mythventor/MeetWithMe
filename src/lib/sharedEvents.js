export const SHARED_PREFIX = "event/";
export const sharedId = (hash) =>
  hash.startsWith(SHARED_PREFIX) ? hash.slice(SHARED_PREFIX.length) : null;
export const validId = (id) =>
  typeof id === "string" && /^[a-zA-Z0-9_-]{20,64}$/.test(id);
export function eventData(event, owner) {
  if (
    !event ||
    typeof event.name !== "string" ||
    !event.name.trim() ||
    event.name.trim().length > 120 ||
    !["dates", "days"].includes(event.mode) ||
    !Array.isArray(event.dates) ||
    !event.dates.length ||
    event.dates.length > 60 ||
    !Number.isInteger(event.start) ||
    !Number.isInteger(event.end) ||
    event.start < 0 ||
    event.end > 96 ||
    event.start >= event.end
  )
    throw new Error("Invalid event. Select 1–60 dates and a valid time range.");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: event.zone }).format();
  } catch {
    throw new Error("Invalid event time zone.");
  }
  const dates = [...new Set(event.dates)].sort();
  for (const d of dates) {
    if (
      typeof d !== "string" ||
      (event.mode === "days"
        ? !/^[0-6]$/.test(d)
        : !/^\d{4}-\d{2}-\d{2}$/.test(d) ||
          Number.isNaN(Date.parse(d + "T12:00:00Z")) ||
          new Date(d + "T12:00:00Z").toISOString().slice(0, 10) !== d)
    )
      throw new Error("Invalid event date.");
  }
  return {
    name: event.name.trim(),
    mode: event.mode,
    dates,
    start: event.start,
    end: event.end,
    zone: event.zone,
    owner,
    allowedSlots: dates.flatMap((d) =>
      Array.from(
        { length: event.end - event.start },
        (_, i) => `${d}:${event.start + i}`,
      ),
    ),
  };
}
export function responseData(person, allowedSlots) {
  if (
    !person ||
    typeof person.name !== "string" ||
    !person.name.trim() ||
    person.name.trim().length > 60 ||
    !Array.isArray(person.slots)
  )
    throw new Error("Enter a name of 1–60 characters.");
  const allowed = new Set(allowedSlots);
  return {
    name: person.name.trim(),
    slots: [...new Set(person.slots)].filter((s) => allowed.has(s)).sort(),
  };
}
