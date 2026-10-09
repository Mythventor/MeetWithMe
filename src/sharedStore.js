import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { anonymousUser, db } from "./firebase";
import { eventData } from "./lib/sharedEvents";
export async function createSharedEvent(event) {
  const user = await anonymousUser();
  const ref = doc(collection(db, "events"));
  await setDoc(ref, {
    ...eventData(event, user.uid),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
export function watchEvent(id, onEvent, onPeople, onError) {
  const stopEvent = onSnapshot(
    doc(db, "events", id),
    { includeMetadataChanges: true },
    (snap) => {
      // An offline cache miss cannot establish that a shared link is invalid.
      if (!snap.exists() && snap.metadata.fromCache) return;
      if (!snap.exists()) {
        onEvent(null);
        return;
      }
      try {
        const data = snap.data();
        eventData(data, data.owner);
        onEvent({ ...data, id });
      } catch {
        onError(new Error("This event contains invalid data."));
      }
    },
    onError,
  );
  const stopPeople = onSnapshot(
    collection(db, "events", id, "responses"),
    { includeMetadataChanges: true },
    (snap) => {
      onPeople(
        snap.docs.map((d) => ({ ...d.data(), id: d.id })),
        snap.metadata,
      );
    },
    onError,
  );
  return () => {
    stopEvent();
    stopPeople();
  };
}
