import { readFile } from "node:fs/promises";
import { before, after, beforeEach, test } from "node:test";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
let env;
const event = () => ({
  name: "Test",
  mode: "dates",
  dates: ["2026-10-20"],
  start: 36,
  end: 38,
  zone: "America/Chicago",
  owner: "alice",
  allowedSlots: ["2026-10-20:36", "2026-10-20:37"],
  createdAt: serverTimestamp(),
});
const response = () => ({
  name: "Alice",
  slots: ["2026-10-20:36"],
  updatedAt: serverTimestamp(),
});
const db = (uid) =>
  uid
    ? env.authenticatedContext(uid).firestore()
    : env.unauthenticatedContext().firestore();
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-meetwithme",
    firestore: {
      rules: await readFile("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});
beforeEach(async () => {
  await env.clearFirestore();
  await setDoc(doc(db("alice"), "events/test"), event());
});
after(async () => {
  await env?.cleanup();
});
test("authenticated link readers can get an event but cannot enumerate events", async () => {
  await assertSucceeds(getDoc(doc(db("bob"), "events/test")));
  await assertFails(getDoc(doc(db(), "events/test")));
  await assertFails(getDocs(collection(db("bob"), "events")));
});
test("event ownership, schema, timestamps and immutable metadata are enforced", async () => {
  await assertFails(setDoc(doc(db("bob"), "events/other"), event()));
  await assertFails(
    setDoc(doc(db("alice"), "events/other"), { ...event(), extra: true }),
  );
  await assertFails(
    setDoc(doc(db("alice"), "events/other"), { ...event(), end: 100 }),
  );
  await assertFails(
    setDoc(doc(db("alice"), "events/other"), {
      ...event(),
      createdAt: new Date(0),
    }),
  );
  await assertFails(
    updateDoc(doc(db("alice"), "events/test"), { name: "Changed" }),
  );
  await assertFails(deleteDoc(doc(db("bob"), "events/test")));
});
test("each participant can only write their own response", async () => {
  await assertSucceeds(
    setDoc(doc(db("alice"), "events/test/responses/alice"), response()),
  );
  await assertSucceeds(
    setDoc(doc(db("bob"), "events/test/responses/bob"), {
      ...response(),
      name: "Bob",
    }),
  );
  await assertFails(
    setDoc(doc(db("bob"), "events/test/responses/alice"), response()),
  );
  await assertFails(deleteDoc(doc(db("bob"), "events/test/responses/alice")));
  await assertSucceeds(getDocs(collection(db("bob"), "events/test/responses")));
  await assertFails(getDocs(collection(db(), "events/test/responses")));
});
test("empty availability is valid; malformed, duplicate, outside-event slots and extra fields are rejected", async () => {
  const ref = doc(db("alice"), "events/test/responses/alice");
  await assertSucceeds(setDoc(ref, { ...response(), slots: [] }));
  for (const override of [
    { name: "" },
    { name: " ".repeat(3) },
    { name: "a".repeat(61) },
    { slots: ["2026-10-20:39"] },
    { slots: ["2026-10-20:36", "2026-10-20:36"] },
    { slots: [1] },
    { extra: true },
    { updatedAt: new Date(0) },
  ])
    await assertFails(setDoc(ref, { ...response(), ...override }));
  await assertFails(
    setDoc(doc(db("alice"), "events/missing/responses/alice"), response()),
  );
});
