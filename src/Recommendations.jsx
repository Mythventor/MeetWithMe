import { useMemo, useState } from "react";
import { recommendTimes } from "./lib/recommendations";

const time = (slot) =>
  slot === 96
    ? "12:00 AM (next day)"
    : `${Math.floor(slot / 4) % 12 || 12}:${String((slot % 4) * 15).padStart(2, "0")} ${slot < 48 ? "AM" : "PM"}`;
const dateLabel = (date, mode) =>
  mode === "days"
    ? [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ][Number(date)]
    : new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
        timeZone: "UTC",
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
const messages = {
  invalid:
    "These event details are invalid. Create a new event to get recommendations.",
  "no-dates": "Select dates for this event to get recommendations.",
  "no-people":
    "Add a participant and mark availability to get recommendations.",
  "too-long":
    "This duration is longer than the event’s daily time range. Choose a shorter meeting.",
  "no-overlap":
    "No one has marked a continuous window this long. Try a shorter duration or add availability.",
};
export default function Recommendations({ event }) {
  const [duration, setDuration] = useState(60);
  const [expanded, setExpanded] = useState(false);
  const result = useMemo(
    () => recommendTimes(event, duration),
    [event, duration],
  );
  const bestCount = result.options[0]?.count;
  const ties = result.options.filter((o) => o.count === bestCount).length;
  const visible = expanded ? result.options : result.options.slice(0, 5);
  return (
    <section
      aria-labelledby="recommendations-heading"
      className="my-6 border border-[#aaa] bg-[#f7fff7] p-4 text-left text-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="recommendations-heading" className="text-lg">
          Best meeting times
        </h2>
        <label>
          Meeting duration:{" "}
          <select
            aria-label="Meeting duration"
            value={duration}
            onChange={(e) => {
              setDuration(Number(e.target.value));
              setExpanded(false);
            }}
          >
            {[15, 30, 45, 60, 90, 120, 180, 240].map((n) => (
              <option key={n} value={n}>
                {n} minutes
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-2 text-xs text-[#555]">
        Ranked by people available for the entire meeting. Ties use date, then
        start time. Unmarked time is not counted. All times are in {event.zone}.
      </p>
      <p role="status" aria-live="polite" className="my-3">
        {result.reason
          ? messages[result.reason]
          : `${bestCount} of ${result.totalPeople} can attend the strongest option${ties > 1 ? ` (${ties} equally strong start times)` : ""}.${bestCount < result.totalPeople ? " No time fits everyone for this duration." : ""}`}
      </p>
      {visible.length > 0 && (
        <ol className="space-y-2">
          {visible.map((o) => (
            <li
              key={`${o.date}:${o.start}`}
              className="border border-[#b5cbb5] bg-white p-3"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <strong>
                  {dateLabel(o.date, event.mode)} · {time(o.start)} –{" "}
                  {time(o.end)}
                </strong>
                <span>
                  {o.count === result.totalPeople
                    ? "Everyone available"
                    : `${o.count}/${result.totalPeople} available`}
                  {o.count === bestCount ? " · Best match" : ""}
                </span>
              </div>
              <p className="mt-1">
                Available: {o.attendees.map((p) => p.name).join(", ")}
              </p>
              {o.unavailable.length > 0 && (
                <p className="mt-1 text-xs text-[#555]">
                  Not marked available for the full meeting:{" "}
                  {o.unavailable.map((p) => p.name).join(", ")}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
      {result.options.length > 5 && (
        <button
          className="native-button mt-3"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded
            ? "Show top 5"
            : `Show all ${result.options.length} options`}
        </button>
      )}
    </section>
  );
}
