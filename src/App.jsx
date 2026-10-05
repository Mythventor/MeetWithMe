import Recommendations from "./Recommendations";
import { useEffect, useRef, useState } from "react";

const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const keyFor = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const dateFor = (key) => new Date(`${key}T12:00:00`);
const timeLabel = (quarter) =>
  `${Math.floor(quarter / 4) % 12 || 12}:${quarter % 4 ? String((quarter % 4) * 15).padStart(2, "0") : "00"} ${quarter % 96 < 48 ? "AM" : "PM"}`;
const today = () => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
};
const zones = [
  ...new Set([
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    "UTC",
    ...Intl.supportedValuesOf("timeZone"),
  ]),
];
const storageKey = "meetwithme-events-v1";
function readEvents() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || [];
  } catch {
    return [];
  }
}

function Calendar({ mode, selected, setSelected }) {
  const [start, setStart] = useState(today);
  const drag = useRef(null);
  const dates = Array.from({ length: mode === "dates" ? 35 : 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
  const keys = dates.map((d) =>
    mode === "dates" ? keyFor(d) : String(d.getDay()),
  );
  const apply = (index) => {
    const { anchor, base, add } = drag.current;
    const next = new Set(base);
    for (let i = Math.min(anchor, index); i <= Math.max(anchor, index); i++) {
      if (add) next.add(keys[i]);
      else next.delete(keys[i]);
    }
    setSelected([...next]);
  };
  const shift = (weeks) =>
    setStart((old) => {
      const d = new Date(old);
      d.setDate(d.getDate() + weeks * 7);
      return d;
    });
  return (
    <>
      <div
        className="mx-auto mt-2 w-fit touch-none select-none"
        onPointerMove={(e) => {
          if (!drag.current) return;
          const cell = document
            .elementFromPoint(e.clientX, e.clientY)
            ?.closest("[data-date-index]");
          if (cell) apply(Number(cell.dataset.dateIndex));
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <div className="grid grid-cols-[60px_repeat(7,25px)_42px] text-center text-[14px] leading-[22px]">
          <span />
          {days.map((d) => (
            <span key={d}>{d[0]}</span>
          ))}
          <span />
          {Array.from({ length: mode === "dates" ? 5 : 1 }, (_, row) => {
            const first = dates[row * 7],
              last = dates[row * 7 + 6];
            const month =
              first.toLocaleDateString("en-US", { month: "short" }) +
              (first.getMonth() !== last.getMonth()
                ? "/" + last.toLocaleDateString("en-US", { month: "short" })
                : "");
            return (
              <div className="contents" key={row}>
                <button
                  type="button"
                  className="pr-1 text-right hover:underline"
                  aria-label={`Show earlier dates, ${month}`}
                  onClick={() => shift(-1)}
                >
                  {mode === "dates" ? month : ""}
                </button>
                {dates.slice(row * 7, row * 7 + 7).map((d, col) => {
                  const i = row * 7 + col;
                  return (
                    <button
                      type="button"
                      data-date-index={i}
                      key={keys[i]}
                      aria-label={
                        mode === "dates"
                          ? d.toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })
                          : days[col]
                      }
                      aria-pressed={selected.includes(keys[i])}
                      className={`m-px h-[23px] border border-black leading-5 ${selected.includes(keys[i]) ? "bg-[#88ee88]" : "bg-[#f8dddd]"} hover:brightness-95 focus-visible:outline-2 focus-visible:outline-blue-700`}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.currentTarget.parentElement.parentElement.setPointerCapture(
                          e.pointerId,
                        );
                        drag.current = {
                          anchor: i,
                          base: selected,
                          add: !selected.includes(keys[i]),
                        };
                        apply(i);
                      }}
                      onClick={(e) => {
                        if (e.detail === 0)
                          setSelected(
                            selected.includes(keys[i])
                              ? selected.filter((k) => k !== keys[i])
                              : [...selected, keys[i]],
                          );
                      }}
                    >
                      {mode === "dates"
                        ? d.getDate()
                        : d
                            .toLocaleDateString("en-US", { weekday: "short" })
                            .slice(0, 2)}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="pl-1 text-left hover:underline"
                  aria-label="Show later dates"
                  onClick={() => shift(1)}
                >
                  {mode === "dates" ? first.getFullYear() : ""}
                </button>
              </div>
            );
          })}
        </div>
      </div>
      {mode === "dates" && (
        <div className="mt-1 flex justify-center gap-2">
          <button
            type="button"
            className="native-button"
            aria-label="Previous week"
            onClick={() => shift(-1)}
          >
            ‹
          </button>
          <button
            type="button"
            className="native-button"
            onClick={() => setStart(today())}
          >
            Today
          </button>
          <button
            type="button"
            className="native-button"
            aria-label="Next week"
            onClick={() => shift(1)}
          >
            ›
          </button>
        </div>
      )}
    </>
  );
}

function CreateEvent({ onCreate }) {
  const [name, setName] = useState("");
  const [mode, setMode] = useState("dates");
  const [selected, setSelected] = useState([]);
  const [start, setStart] = useState(36);
  const [end, setEnd] = useState(68);
  const [zone, setZone] = useState(zones[0]);
  const [error, setError] = useState("");
  return (
    <form
      className="mx-auto max-w-[900px] px-3 pb-12 pt-[30px]"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return setError("Please enter an event name.");
        if (!selected.length)
          return setError("Please select at least one date.");
        if (end <= start)
          return setError("The end time must be later than the start time.");
        onCreate({
          id: crypto.randomUUID(),
          name: name.trim(),
          mode,
          dates: selected.sort(),
          start,
          end,
          zone,
          people: [],
        });
      }}
    >
      <div className="text-center">
        <input
          aria-label="New Event Name"
          placeholder="New Event Name"
          className="event-name w-[238px] max-w-full text-center text-[23px] leading-7"
          value={name}
          maxLength={120}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="mt-[17px] grid gap-8 sm:grid-cols-2 sm:gap-0">
        <section className="text-center">
          <h1 className="mb-[10px] text-base">What dates might work?</h1>
          <p className="text-[13px] leading-[18px]">
            Click and drag dates to choose possibilities.
            <br />
            Click arrows or labels to shift the calendar.
          </p>
          <label className="text-[13px]">
            Survey using:{" "}
            <select
              value={mode}
              onChange={(e) => {
                setMode(e.target.value);
                setSelected([]);
              }}
            >
              <option value="dates">Specific Dates</option>
              <option value="days">Days of the Week</option>
            </select>
          </label>
          <Calendar mode={mode} selected={selected} setSelected={setSelected} />
        </section>
        <section className="flex flex-col items-center text-center">
          <h2 className="text-base">What times might work?</h2>
          <div className="mt-[35px] space-y-[10px] text-[13px]">
            <div>
              <label>
                No earlier than:{" "}
                <select
                  aria-label="No earlier than"
                  value={start}
                  onChange={(e) => setStart(Number(e.target.value))}
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h * 4}>
                      {timeLabel(h * 4)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div>
              <label>
                No later than:{" "}
                <select
                  aria-label="No later than"
                  value={end}
                  onChange={(e) => setEnd(Number(e.target.value))}
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={(h + 1) * 4}>
                      {timeLabel((h + 1) * 4)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div>
              <label>
                Time Zone:{" "}
                <select
                  aria-label="Time Zone"
                  className="max-w-[230px]"
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                >
                  {zones.map((z) => (
                    <option key={z}>{z}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <div className="mt-12 sm:mt-auto sm:pt-8">
            Ready?{" "}
            <button className="native-button" type="submit">
              Create Event
            </button>
          </div>
        </section>
      </div>
      <p role="alert" className="mt-3 text-center text-[13px] text-red-700">
        {error}
      </p>
    </form>
  );
}

function Availability({ event, update }) {
  const [person, setPerson] = useState("");
  const [active, setActive] = useState(null);
  const [hover, setHover] = useState(null);
  const drag = useRef(null);
  const slots = Array.from(
    { length: event.end - event.start },
    (_, i) => event.start + i,
  );
  const current = event.people.find((p) => p.id === active);
  const label = (d) =>
    event.mode === "days"
      ? days[Number(d)].slice(0, 3)
      : dateFor(d).toLocaleDateString("en-US", {
          weekday: "short",
          month: "numeric",
          day: "numeric",
        });
  const paint = (col, row) => {
    if (!drag.current || !current) return;
    const { c, r, base, add } = drag.current;
    const next = new Set(base);
    for (let x = Math.min(c, col); x <= Math.max(c, col); x++)
      for (let y = Math.min(r, row); y <= Math.max(r, row); y++) {
        const key = `${event.dates[x]}:${y}`;
        if (add) next.add(key);
        else next.delete(key);
      }
    update({
      ...event,
      people: event.people.map((p) =>
        p.id === active ? { ...p, slots: [...next] } : p,
      ),
    });
  };
  return (
    <main className="mx-auto max-w-[1050px] px-4 pb-12 pt-6 text-center">
      <h1 className="text-2xl">{event.name}</h1>
      <p className="mt-2 text-xs">Time zone: {event.zone}</p>
      <p className="mt-2 text-xs text-[#555]">
        Responses are saved on this browser only.
      </p>
      <form
        className="my-5 flex flex-wrap items-center justify-center gap-2 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          if (!person.trim()) return;
          const existing = event.people.find(
            (p) => p.name.toLowerCase() === person.trim().toLowerCase(),
          );
          if (existing) setActive(existing.id);
          else {
            const p = {
              id: crypto.randomUUID(),
              name: person.trim(),
              slots: [],
            };
            update({ ...event, people: [...event.people, p] });
            setActive(p.id);
          }
          setPerson("");
        }}
      >
        <label>
          Your name:{" "}
          <input
            aria-label="Your name"
            maxLength={60}
            required
            value={person}
            onChange={(e) => setPerson(e.target.value)}
            className="w-36"
          />
        </label>
        <button className="native-button">Add / Sign In</button>
        {current && (
          <span>
            Editing: <b>{current.name}</b>
          </span>
        )}
      </form>
      <div className="grid gap-8 md:grid-cols-2">
        {["Your Availability", "Group Availability"].map((title, grid) => (
          <section key={title}>
            <h2 className="text-lg">{title}</h2>
            <p className="mb-4 mt-1 text-xs">
              {grid
                ? "Hover over a time to see who is available."
                : current
                  ? "Click and drag to mark the times you are available."
                  : "Enter your name above to mark your availability."}
            </p>
            <div className="overflow-x-auto pb-3">
              <div
                className="grid min-w-max touch-none select-none text-[11px]"
                style={{
                  gridTemplateColumns: `62px repeat(${event.dates.length}, minmax(48px, 1fr))`,
                }}
                onPointerMove={(e) => {
                  const cell = document
                    .elementFromPoint(e.clientX, e.clientY)
                    ?.closest("[data-slot]");
                  if (!cell || cell.dataset.grid !== String(grid)) return;
                  if (grid) setHover(cell.dataset.slot);
                  else
                    paint(Number(cell.dataset.col), Number(cell.dataset.row));
                }}
                onPointerUp={() => {
                  drag.current = null;
                }}
                onPointerCancel={() => {
                  drag.current = null;
                }}
              >
                <span />
                {event.dates.map((d) => (
                  <span key={d} className="pb-2">
                    {label(d)}
                  </span>
                ))}
                {slots.map((slot) => (
                  <div className="contents" key={slot}>
                    <span className="relative -top-2 h-3 pr-2 text-right leading-3">
                      {slot % 4 === 0 ? timeLabel(slot) : ""}
                    </span>
                    {event.dates.map((d, col) => {
                      const key = `${d}:${slot}`;
                      const count = event.people.filter((p) =>
                        p.slots.includes(key),
                      ).length;
                      const selected = current?.slots.includes(key);
                      return (
                        <button
                          type="button"
                          key={d}
                          data-slot={key}
                          data-col={col}
                          data-row={slot}
                          data-grid={grid}
                          disabled={!grid && !current}
                          aria-label={`${label(d)} ${timeLabel(slot)}, ${grid ? `${count} available` : selected ? "available" : "unavailable"}`}
                          aria-pressed={grid ? undefined : !!selected}
                          title={`${label(d)} ${timeLabel(slot)}: ${count} of ${event.people.length} available`}
                          className={`h-[12px] border-r border-b border-[#aaa] ${slot % 4 === 0 ? "border-t border-t-black" : ""} focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-blue-600`}
                          style={{
                            background: grid
                              ? count
                                ? `rgb(${220 - Math.round((count / event.people.length) * 170)}, ${240 - Math.round((count / event.people.length) * 55)}, ${220 - Math.round((count / event.people.length) * 170)})`
                                : "#eee"
                              : selected
                                ? "#88ee88"
                                : "#f8dddd",
                          }}
                          onFocus={() => grid && setHover(key)}
                          onPointerDown={(e) => {
                            if (grid || !current) return;
                            e.preventDefault();
                            e.currentTarget.parentElement.parentElement.setPointerCapture(
                              e.pointerId,
                            );
                            drag.current = {
                              c: col,
                              r: slot,
                              base: current.slots,
                              add: !selected,
                            };
                            paint(col, slot);
                          }}
                          onClick={(e) => {
                            if (!grid && current && e.detail === 0) {
                              drag.current = {
                                c: col,
                                r: slot,
                                base: current.slots,
                                add: !selected,
                              };
                              paint(col, slot);
                              drag.current = null;
                            }
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
                <span className="pr-2 text-right">{timeLabel(event.end)}</span>
              </div>
            </div>
            {grid === 1 && (
              <div className="mt-3 text-xs">
                <div className="flex items-center justify-center gap-2">
                  <span>0 available</span>
                  <span className="h-3 w-24 border border-gray-400 bg-gradient-to-r from-[#eee] to-[#32b932]" />
                  <span>{event.people.length} available</span>
                </div>
                <p className="mt-3 min-h-4">
                  {hover
                    ? `Available: ${
                        event.people
                          .filter((p) => p.slots.includes(hover))
                          .map((p) => p.name)
                          .join(", ") || "No one"
                      }`
                    : "Move over the grid to compare availability."}
                </p>
              </div>
            )}
          </section>
        ))}
      </div>
      <Recommendations event={event} />
      <div className="mt-5 text-sm">
        {event.people.length > 0 && (
          <p className="mb-2">Participants — select a name to edit:</p>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          {event.people.map((p) => (
            <button
              key={p.id}
              className={`native-button ${p.id === active ? "font-bold" : ""}`}
              onClick={() => setActive(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function App() {
  const [events, setEvents] = useState(readEvents);
  const [id, setId] = useState(location.hash.slice(1));
  const [about, setAbout] = useState(false);
  const [saveError, setSaveError] = useState("");
  useEffect(() => {
    const change = () => setId(location.hash.slice(1));
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  const event = events.find((e) => e.id === id);
  const save = (next) => {
    setEvents(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setSaveError("");
    } catch {
      setSaveError(
        "Your browser could not save these responses. Keep this page open to avoid losing them.",
      );
    }
  };
  return (
    <div className="min-h-screen bg-black text-black">
      <nav
        className="flex h-[30px] items-stretch bg-black px-[10px] text-[16px] text-[#ddd]"
        aria-label="Main navigation"
      >
        <button
          onClick={() => setAbout(!about)}
          className={`border-t-4 px-[10px] leading-[26px] hover:text-white ${about ? "border-[#88ee88]" : "border-transparent"}`}
        >
          About MeetWithMe
        </button>
        <a
          href="#"
          onClick={() => setAbout(false)}
          className={`border-t-4 px-[10px] leading-[26px] hover:text-white ${!about ? "border-[#88ee88]" : "border-transparent"}`}
        >
          Plan a New Event
        </a>
      </nav>
      <div className="bg-white">
        {about ? (
          <section className="mx-auto max-w-xl px-6 py-10 text-sm leading-6">
            <h1 className="mb-4 text-2xl">About MeetWithMe</h1>
            <p>
              Find a time that works for everyone. Choose possible dates, set a
              time range, and mark availability by dragging across the grid.
            </p>
            <p className="mt-4">
              This is an independent recreation inspired by When2meet. Events
              and responses are stored in this browser. Live sharing across
              devices is not connected yet.
            </p>
            <button
              className="native-button mt-5"
              onClick={() => setAbout(false)}
            >
              Plan an event
            </button>
          </section>
        ) : event ? (
          <Availability
            key={event.id}
            event={event}
            update={(updated) =>
              save(events.map((e) => (e.id === updated.id ? updated : e)))
            }
          />
        ) : (
          <>
            <CreateEvent
              onCreate={(e) => {
                save([...events, e]);
                location.hash = e.id;
              }}
            />
            {events.length > 0 && (
              <section className="mx-auto max-w-[900px] px-4 pb-6 text-center text-xs">
                <h2 className="mb-2">Your saved events</h2>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                  {events.map((e) => (
                    <a
                      className="text-blue-800 underline"
                      key={e.id}
                      href={`#${e.id}`}
                    >
                      {e.name}
                    </a>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
        {saveError && (
          <p role="alert" className="p-3 text-center text-sm text-red-700">
            {saveError}
          </p>
        )}
      </div>
      <footer className="px-4 pt-3 text-center text-xs leading-[19px] text-white">
        <p>MeetWithMe is a free scheduling tool. No account required.</p>
        <p className="mt-1 text-[#999]">
          Inspired by{" "}
          <a
            className="underline hover:text-white"
            href="https://www.when2meet.com/"
            target="_blank"
            rel="noreferrer"
          >
            When2meet
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
