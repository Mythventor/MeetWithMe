/**
 * Rank same-day, half-open meeting windows in the event's wall-clock time zone.
 * A person counts only when every 15-minute slot is marked available.
 * Unmarked slots are unknown/unavailable, never inferred as available.
 * Equal attendance is ordered by date (Sunday first for weekly polls), then time.
 * No Date/UTC conversion: the existing poll model cannot distinguish repeated
 * daylight-saving hours. Results are poll options, not absolute timestamps.
 */
export function recommendTimes(event, durationMinutes = 60) {
  const empty = (reason) => ({
    options: [],
    reason,
    totalPeople: event?.people?.length ?? 0,
  });
  if (
    !event ||
    !["dates", "days"].includes(event.mode) ||
    !Number.isInteger(event.start) ||
    !Number.isInteger(event.end) ||
    event.start < 0 ||
    event.end > 96 ||
    event.start >= event.end ||
    !Array.isArray(event.dates) ||
    !Array.isArray(event.people) ||
    !Number.isInteger(durationMinutes) ||
    durationMinutes <= 0 ||
    durationMinutes % 15 !== 0
  ) {
    return empty("invalid");
  }
  const validDate = (value) => {
    if (typeof value !== "string") return false;
    if (event.mode === "days") return /^[0-6]$/.test(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T12:00:00Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  };
  if (
    event.dates.some((d) => !validDate(d)) ||
    event.people.some(
      (p) =>
        !p ||
        typeof p.id !== "string" ||
        !p.id ||
        typeof p.name !== "string" ||
        !Array.isArray(p.slots),
    ) ||
    new Set(event.people.map((p) => p.id)).size !== event.people.length
  )
    return empty("invalid");
  const dates = [...new Set(event.dates)].sort();
  if (!dates.length) return empty("no-dates");
  if (!event.people.length) return empty("no-people");
  const length = durationMinutes / 15;
  if (length > event.end - event.start) return empty("too-long");
  const people = event.people.map((p) => ({
    ...p,
    available: new Set(p.slots),
  }));
  const options = [];
  for (const date of dates) {
    // Prefix sums make full-window checks O(1) per person and candidate.
    const missing = people.map((p) => {
      const prefix = [0];
      for (let slot = event.start; slot < event.end; slot++) {
        prefix.push(
          prefix.at(-1) + (p.available.has(`${date}:${slot}`) ? 0 : 1),
        );
      }
      return prefix;
    });
    for (let start = event.start; start + length <= event.end; start++) {
      const attendees = [],
        unavailable = [];
      people.forEach((p, i) => {
        const from = start - event.start;
        const participant = { id: p.id, name: p.name };
        (missing[i][from + length] === missing[i][from]
          ? attendees
          : unavailable
        ).push(participant);
      });
      if (attendees.length)
        options.push({
          date,
          start,
          end: start + length,
          attendees,
          unavailable,
          count: attendees.length,
        });
    }
  }
  options.sort(
    (a, b) =>
      b.count - a.count || a.date.localeCompare(b.date) || a.start - b.start,
  );
  return {
    options,
    reason: options.length ? null : "no-overlap",
    totalPeople: people.length,
  };
}
