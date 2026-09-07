import { signInAnonymously } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "../lib/firebase";
import type { UserProfile } from "../types";

export const MASTER_ACCESS_CODE = "8052607542";
const ACCESS_STORAGE_KEY = "ro_aro_access_granted";
export const SHARED_STUDENT_ID = "student_main";

export function isAccessGranted(): boolean {
  return localStorage.getItem(ACCESS_STORAGE_KEY) === "true";
}

export function revokeAccess(): void {
  localStorage.removeItem(ACCESS_STORAGE_KEY);
}

export async function verifyAndUnlock(code: string): Promise<boolean> {
  if (code.trim() !== MASTER_ACCESS_CODE) {
    return false;
  }

  localStorage.setItem(ACCESS_STORAGE_KEY, "true");

  if (isFirebaseConfigured) {
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      const userRef = doc(db, "users", SHARED_STUDENT_ID);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, {
          uid: SHARED_STUDENT_ID,
          displayName: "UPPSC Aspirant",
          createdAt: serverTimestamp(),
          lastActiveAt: serverTimestamp(),
        });
      } else {
        await updateDoc(userRef, {
          lastActiveAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.warn("Background Firebase session notice:", err);
    }
  }

  return true;
}

export async function getActiveProfile(): Promise<UserProfile | null> {
  if (!isAccessGranted()) return null;

  return {
    uid: SHARED_STUDENT_ID,
    displayName: "UPPSC Aspirant",
    email: "student@cloud.tracker",
    role: "student",
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  };
}

export async function updateLastActive(): Promise<void> {
  if (!isFirebaseConfigured) return;
  try {
    const userRef = doc(db, "users", SHARED_STUDENT_ID);
    await updateDoc(userRef, { lastActiveAt: serverTimestamp() });
  } catch {
    // non-critical
  }
}
