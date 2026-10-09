import { useEffect, useRef, useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { anonymousUser, db } from "./firebase";
import { watchEvent } from "./sharedStore";
import { responseData, validId } from "./lib/sharedEvents";

export default function SharedEvent({ id, Availability }) {
  const [event, setEvent] = useState(null);
  const [people, setPeople] = useState([]);
  const [uid, setUid] = useState(null);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState(false);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [cached, setCached] = useState(true);
  const [draft, setDraft] = useState(null);
  const [copied, setCopied] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const timer = useRef();
  const flush = useRef(null);
  const latest = useRef(null);
  const version = useRef(0);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    let stop = () => {},
      cancelled = false;
    const waiting = setTimeout(() => {
      if (!cancelled)
        setError(
          "Still connecting. Check your internet connection, then retry.",
        );
    }, 15000);
    if (!validId(id)) {
      clearTimeout(waiting);
      return;
    }
    anonymousUser()
      .then((user) => {
        if (cancelled) return;
        setUid(user.uid);
        stop = watchEvent(
          id,
          (data) => {
            clearTimeout(waiting);
            setEvent(data);
            setMissing(!data);
          },
          (rows, metadata) => {
            setPeople(rows);
            setReady(true);
            setCached(metadata.fromCache);
          },
          (err) => {
            clearTimeout(waiting);
            setError(
              `Unable to load this event: ${err.code || err.message}. Check your connection and retry.`,
            );
          },
        );
      })
      .catch(() => {
        clearTimeout(waiting);
        if (!cancelled)
          setError(
            "Unable to start your anonymous session. Check your connection and allow browser storage, then retry.",
          );
      });
    const leave = (e) => {
      if (latest.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", leave);
    return () => {
      cancelled = true;
      alive.current = false;
      clearTimeout(waiting);
      clearTimeout(timer.current);
      flush.current?.();
      flush.current = null;
      stop();
      window.removeEventListener("beforeunload", leave);
    };
  }, [id, attempt]);
  const persist = async (person, revision) => {
    try {
      await setDoc(doc(db, "events", id, "responses", uid), {
        ...responseData(person, event.allowedSlots),
        updatedAt: serverTimestamp(),
      });
      if (alive.current && revision === version.current) {
        latest.current = null;
        flush.current = null;
        setDraft(null);
        setPending(false);
        setError("");
      }
    } catch {
      if (alive.current && revision === version.current) {
        setPending(false);
        setError(
          "Your response could not be saved. Your edits are still here. Check your connection and retry saving.",
        );
      }
    }
  };
  const update = (next) => {
    const mine = next.people.find((p) => p.id === uid);
    if (!mine) return;
    setDraft(mine);
    latest.current = mine;
    setPending(true);
    setError("");
    const revision = ++version.current;
    clearTimeout(timer.current);
    flush.current = () => persist(mine, revision);
    timer.current = setTimeout(() => { flush.current = null; persist(mine, revision); }, 350);
  };
  const shareUrl = `https://meetwithme-20260930.web.app/#event/${id}`;
  if (missing || !validId(id))
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl">Event not found</h1>
        <p className="my-3">
          This link is invalid or the event is no longer available.
        </p>
        <a href="#" className="underline">
          Create a new event
        </a>
      </div>
    );
  if (!event || !uid || !ready)
    return (
      <div className="p-8 text-center">
        <p role="status">{error || "Loading shared event…"}</p>
        {error && (
          <button
            className="native-button mt-3"
            onClick={() => {
              setError("");
              setAttempt((n) => n + 1);
            }}
          >
            Retry connection
          </button>
        )}
        <p className="mt-3">
          <a href="#" className="underline">
            Back to home
          </a>
        </p>
      </div>
    );
  const displayed = draft
    ? [...people.filter((p) => p.id !== uid), draft]
    : people;
  return (
    <>
      <section
        className="mx-auto max-w-[1050px] px-4 pt-5 text-center text-sm"
        aria-label="Share event"
      >
        <label>
          Share this event{" "}
          <input
            aria-label="Share link"
            className="mx-2 w-full max-w-lg"
            readOnly
            value={shareUrl}
            onFocus={(e) => e.target.select()}
          />
        </label>
        <button
          className="native-button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(shareUrl);
              setCopied(true);
            } catch {
              setCopied(false);
              setError("Copy is unavailable. Select and copy the link above.");
            }
          }}
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
        <p className="mt-2 text-xs">
          Anyone with this link can view names and availability. You can edit
          only your own response in this browser.
        </p>
        <p role="status" className="mt-2">
          {pending
            ? "Saving changes… Keep this page open until saved."
            : error ? "Connection or save needs attention" : cached
              ? "Connecting to live updates…"
              : "Connected · Changes save automatically"}
        </p>
        {error && (
          <div role="alert" className="mt-2 text-red-700">
            {error}{" "}
            <button
              className="native-button"
              onClick={() => {
                if (latest.current) {
                  setPending(true);
                  persist(latest.current, version.current);
                } else setAttempt((n) => n + 1);
              }}
            >
              Retry
            </button>
          </div>
        )}
      </section>
      <Availability
        event={{ ...event, people: displayed }}
        update={update}
        sharedUid={uid}
      />
    </>
  );
}
