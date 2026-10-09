import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Public client configuration; access is enforced by Firestore rules, not this key.
export const firebaseConfig = {
  projectId: "meetwithme-20260930",
  appId: "1:107602535107:web:52a81b23df9596ac22f876",
  apiKey: "AIzaSyBu8biM9PZZRL9gLLOSZSwGkDlkU9ek5O0",
  authDomain: "meetwithme-20260930.firebaseapp.com",
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
let signingIn;
export async function anonymousUser() {
  await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser;
  if (!signingIn)
    signingIn = signInAnonymously(auth)
      .then((r) => r.user)
      .finally(() => {
        signingIn = null;
      });
  return signingIn;
}
