import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../lib/firebase';
import type { UserProfile } from '../types';

export const MASTER_ACCESS_CODE = '8052607542';
const ACCESS_STORAGE_KEY = 'ro_aro_access_granted';
const USER_ROLE_KEY = 'ro_aro_active_role'; // 'student' | 'admin'

export function isAccessGranted(): boolean {
  return localStorage.getItem(ACCESS_STORAGE_KEY) === 'true';
}

export function revokeAccess(): void {
  localStorage.removeItem(ACCESS_STORAGE_KEY);
}

export async function verifyAndUnlock(code: string, role: 'student' | 'admin' = 'student'): Promise<boolean> {
  if (code.trim() !== MASTER_ACCESS_CODE) {
    return false;
  }

  localStorage.setItem(ACCESS_STORAGE_KEY, 'true');
  localStorage.setItem(USER_ROLE_KEY, role);

  if (isFirebaseConfigured) {
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      const uid = auth.currentUser?.uid || 'student_main';
      const ref = doc(db, 'users', uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          uid,
          displayName: role === 'admin' ? 'Admin Monitor' : 'Student',
          role,
          createdAt: serverTimestamp(),
          lastActiveAt: serverTimestamp(),
        });
      } else {
        await updateDoc(ref, {
          lastActiveAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.warn('Anonymous Firebase auth notice (running local cloud fallback):', err);
    }
  }

  return true;
}

export async function getActiveProfile(): Promise<UserProfile | null> {
  if (!isAccessGranted()) return null;

  const role = (localStorage.getItem(USER_ROLE_KEY) as 'student' | 'admin') || 'student';
  const uid = auth.currentUser?.uid || 'student_main';

  return {
    uid,
    displayName: role === 'admin' ? 'Admin Monitor' : 'Student Aspirant',
    email: 'ro-aro@aspirant.local',
    role,
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  };
}

export async function updateLastActive(uid: string): Promise<void> {
  if (!isFirebaseConfigured || !auth.currentUser) return;
  try {
    const ref = doc(db, 'users', uid);
    await updateDoc(ref, { lastActiveAt: serverTimestamp() });
  } catch {
    // non-critical
  }
}
