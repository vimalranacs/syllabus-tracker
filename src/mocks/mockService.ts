import {
  collection,
  doc,
  getDocs,
  setDoc,
  getDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import type { MockAttempt } from './types';

const LOCAL_PREFIX = 'ro_aro_mock_attempts_';

function getLocalAttempts(uid: string): MockAttempt[] {
  try {
    const raw = localStorage.getItem(LOCAL_PREFIX + uid);
    return raw ? (JSON.parse(raw) as MockAttempt[]) : [];
  } catch {
    return [];
  }
}

function setLocalAttempts(uid: string, attempts: MockAttempt[]): void {
  try {
    localStorage.setItem(LOCAL_PREFIX + uid, JSON.stringify(attempts));
  } catch {
    // quota / private mode — non-fatal
  }
}

function toAttempt(id: string, data: Record<string, unknown>): MockAttempt {
  return {
    id,
    mockId: String(data.mockId || ''),
    mockTitle: String(data.mockTitle || ''),
    timestamp:
      (data.timestamp as { toDate?: () => Date })?.toDate?.().toISOString?.() ||
      (typeof data.timestamp === 'string' ? data.timestamp : new Date().toISOString()),
    totalQuestions: Number(data.totalQuestions) || 0,
    score: Number(data.score) || 0,
    correct: Number(data.correct) || 0,
    incorrect: Number(data.incorrect) || 0,
    unanswered: Number(data.unanswered) || 0,
    percentage: Number(data.percentage) || 0,
    accuracy: Number(data.accuracy) || 0,
    timeUsedSeconds: Number(data.timeUsedSeconds) || 0,
    timeRemainingSeconds: Number(data.timeRemainingSeconds) || 0,
    flaggedQuestionIds: (data.flaggedQuestionIds as string[]) || [],
    flagReasons: (data.flagReasons as Record<string, string>) || {},
    selectedAnswers: (data.selectedAnswers as Record<string, string>) || {},
  };
}

/** Persist one attempt. Stores selected answers (for later review) but never duplicates the whole mock. */
export async function saveMockAttempt(
  uid: string,
  attempt: Omit<MockAttempt, 'id' | 'timestamp'> & { timestamp?: string }
): Promise<string> {
  const timestamp = attempt.timestamp || new Date().toISOString();

  if (!isFirebaseConfigured) {
    const id = 'attempt_' + Date.now();
    const full: MockAttempt = { ...attempt, id, timestamp };
    const existing = getLocalAttempts(uid);
    existing.unshift(full);
    setLocalAttempts(uid, existing.slice(0, 100));
    return id;
  }

  const ref = doc(collection(db, 'students', uid, 'mockAttempts'));
  await setDoc(ref, { ...attempt, timestamp: serverTimestamp() });
  return ref.id;
}

export async function listMockAttempts(uid: string): Promise<MockAttempt[]> {
  if (!isFirebaseConfigured) {
    return getLocalAttempts(uid).sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
  }
  try {
    const q = query(
      collection(db, 'students', uid, 'mockAttempts'),
      orderBy('timestamp', 'desc')
    );
    const snap = await getDocs(q);
    const out: MockAttempt[] = [];
    snap.forEach(d => out.push(toAttempt(d.id, d.data())));
    return out;
  } catch {
    return [];
  }
}

export async function getMockAttempt(uid: string, attemptId: string): Promise<MockAttempt | null> {  if (!isFirebaseConfigured) {
    return getLocalAttempts(uid).find(a => a.id === attemptId) || null;
  }
  try {
    const snap = await getDoc(doc(db, 'students', uid, 'mockAttempts', attemptId));
    if (!snap.exists()) return null;
    return toAttempt(snap.id, snap.data());
  } catch {
    return null;
  }
}

/** Update flags on a saved attempt (used when flagging during review). */
export async function updateMockAttemptFlags(
  uid: string,
  attemptId: string,
  flaggedQuestionIds: string[],
  flagReasons: Record<string, string>
): Promise<void> {
  if (!isFirebaseConfigured) {
    const existing = getLocalAttempts(uid);
    const idx = existing.findIndex(a => a.id === attemptId);
    if (idx >= 0) {
      existing[idx] = { ...existing[idx], flaggedQuestionIds, flagReasons };
      setLocalAttempts(uid, existing);
    }
    return;
  }
  try {
    await setDoc(
      doc(db, 'students', uid, 'mockAttempts', attemptId),
      { flaggedQuestionIds, flagReasons },
      { merge: true }
    );
  } catch {
    // non-critical
  }
}

/** Delete a single attempt (reset one entry from history). */
export async function deleteMockAttempt(uid: string, attemptId: string): Promise<void> {
  if (!isFirebaseConfigured) {
    setLocalAttempts(
      uid,
      getLocalAttempts(uid).filter(a => a.id !== attemptId)
    );
    return;
  }
  await deleteDoc(doc(db, 'students', uid, 'mockAttempts', attemptId));
}

/**
 * Reset mock history. Pass a mockId to reset only that mock,
 * omit it to clear every mock attempt.
 */
export async function clearMockAttempts(uid: string, mockId?: string): Promise<void> {
  if (!isFirebaseConfigured) {
    const remaining = mockId
      ? getLocalAttempts(uid).filter(a => a.mockId !== mockId)
      : [];
    setLocalAttempts(uid, remaining);
    return;
  }
  const snap = await getDocs(collection(db, 'students', uid, 'mockAttempts'));
  const targets = snap.docs.filter(d => !mockId || d.data().mockId === mockId);
  // Batch in chunks of 400 (Firestore limit is 500 per batch).
  for (let i = 0; i < targets.length; i += 400) {
    const batch = writeBatch(db);
    targets.slice(i, i + 400).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
}
