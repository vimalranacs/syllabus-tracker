import {
  doc,
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
  onSnapshot,
  query,
  type Unsubscribe
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import type {
  ProgressEntry,
  NoteEntry,
  RevisionEntry,
  ActivityEntry,
  CustomTopicEntry,
  OverrideEntry,
  ItemStatus,
  Priority
} from '../types';

const LOCAL_STORAGE_PREFIX = 'ro_aro_';

function getLocal<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(LOCAL_STORAGE_PREFIX + key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, val: T): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_PREFIX + key, JSON.stringify(val));
  } catch {
    // quota exceeded or private mode
  }
}

// Progress
export async function updateProgress(
  studentId: string,
  itemId: string,
  status: ItemStatus,
  priority: Priority = 'medium'
): Promise<void> {
  const now = new Date().toISOString();
  if (!isFirebaseConfigured) {
    const key = 'prog_' + studentId;
    const existing = getLocal<Record<string, ProgressEntry>>(key, {});
    existing[itemId] = { itemId, status, priority, updatedAt: now };
    setLocal(key, existing);
    return;
  }

  const ref = doc(db, 'students', studentId, 'progress', itemId);
  await setDoc(ref, {
    itemId,
    status,
    priority,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function getAllProgress(studentId: string): Promise<Record<string, ProgressEntry>> {
  if (!isFirebaseConfigured) {
    return getLocal<Record<string, ProgressEntry>>('prog_' + studentId, {});
  }

  try {
    const snap = await getDocs(collection(db, 'students', studentId, 'progress'));
    const result: Record<string, ProgressEntry> = {};
    snap.forEach(d => {
      const data = d.data();
      result[d.id] = {
        itemId: d.id,
        status: data.status,
        priority: data.priority || 'medium',
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt || null,
      };
    });
    return result;
  } catch (err) {
    console.error('Failed to get progress', err);
    return {};
  }
}

export function subscribeProgress(
  studentId: string,
  callback: (data: Record<string, ProgressEntry>) => void
): Unsubscribe {
  if (!isFirebaseConfigured) {
    const data = getLocal<Record<string, ProgressEntry>>('prog_' + studentId, {});
    callback(data);
    return () => {};
  }

  const q = query(collection(db, 'students', studentId, 'progress'));
  return onSnapshot(q, snap => {
    const result: Record<string, ProgressEntry> = {};
    snap.forEach(d => {
      const data = d.data();
      result[d.id] = {
        itemId: d.id,
        status: data.status,
        priority: data.priority || 'medium',
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt || null,
      };
    });
    callback(result);
  });
}

// Notes
export async function updateNote(studentId: string, itemId: string, content: string): Promise<void> {
  const now = new Date().toISOString();
  if (!isFirebaseConfigured) {
    const key = 'notes_' + studentId;
    const existing = getLocal<Record<string, NoteEntry>>(key, {});
    existing[itemId] = { itemId, content, updatedAt: now };
    setLocal(key, existing);
    return;
  }

  const ref = doc(db, 'students', studentId, 'notes', itemId);
  await setDoc(ref, { itemId, content, updatedAt: serverTimestamp() }, { merge: true });
}

export async function getAllNotes(studentId: string): Promise<Record<string, NoteEntry>> {
  if (!isFirebaseConfigured) {
    return getLocal<Record<string, NoteEntry>>('notes_' + studentId, {});
  }

  try {
    const snap = await getDocs(collection(db, 'students', studentId, 'notes'));
    const result: Record<string, NoteEntry> = {};
    snap.forEach(d => {
      const data = d.data();
      result[d.id] = {
        itemId: d.id,
        content: data.content || '',
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt || null,
      };
    });
    return result;
  } catch (err) {
    console.error('Failed to get notes', err);
    return {};
  }
}

// Revisions
export async function addRevision(studentId: string, itemId: string): Promise<void> {
  const now = new Date().toISOString();
  if (!isFirebaseConfigured) {
    const key = 'rev_' + studentId;
    const existing = getLocal<Record<string, RevisionEntry>>(key, {});
    const count = (existing[itemId]?.revisionCount || 0) + 1;
    existing[itemId] = {
      itemId,
      revisionCount: count,
      lastRevisedAt: now,
      revisionDates: [...(existing[itemId]?.revisionDates || []), now],
    };
    setLocal(key, existing);
    return;
  }

  const ref = doc(db, 'students', studentId, 'revisions', itemId);
  const snap = await getDocs(collection(db, 'students', studentId, 'revisions'));
  const existing = snap.docs.find(d => d.id === itemId);
  const count = existing ? (existing.data().revisionCount || 0) + 1 : 1;
  await setDoc(ref, {
    itemId,
    revisionCount: count,
    lastRevisedAt: serverTimestamp(),
  }, { merge: true });
}

export async function getAllRevisions(studentId: string): Promise<Record<string, RevisionEntry>> {
  if (!isFirebaseConfigured) {
    return getLocal<Record<string, RevisionEntry>>('rev_' + studentId, {});
  }

  try {
    const snap = await getDocs(collection(db, 'students', studentId, 'revisions'));
    const result: Record<string, RevisionEntry> = {};
    snap.forEach(d => {
      const data = d.data();
      result[d.id] = {
        itemId: d.id,
        revisionCount: data.revisionCount || 0,
        lastRevisedAt: data.lastRevisedAt?.toDate ? data.lastRevisedAt.toDate().toISOString() : data.lastRevisedAt || null,
        revisionDates: [],
      };
    });
    return result;
  } catch (err) {
    console.error('Failed to get revisions', err);
    return {};
  }
}

// Activity
export async function logActivity(
  studentId: string,
  entry: Omit<ActivityEntry, 'id' | 'timestamp'>
): Promise<void> {
  const now = new Date().toISOString();
  if (!isFirebaseConfigured) {
    const key = 'act_' + studentId;
    const existing = getLocal<ActivityEntry[]>(key, []);
    existing.unshift({
      ...entry,
      id: 'act_' + Date.now(),
      timestamp: now,
    });
    setLocal(key, existing.slice(0, 50));
    return;
  }

  try {
    const ref = doc(collection(db, 'students', studentId, 'activity'));
    await setDoc(ref, { ...entry, timestamp: serverTimestamp() });
  } catch {
    // non-critical
  }
}

export async function getRecentActivity(studentId: string, limit = 20): Promise<ActivityEntry[]> {
  if (!isFirebaseConfigured) {
    return getLocal<ActivityEntry[]>('act_' + studentId, []).slice(0, limit);
  }

  try {
    const snap = await getDocs(collection(db, 'students', studentId, 'activity'));
    const list: ActivityEntry[] = [];
    snap.forEach(d => {
      const data = d.data();
      list.push({
        id: d.id,
        type: data.type,
        itemId: data.itemId,
        itemTitle: data.itemTitle,
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : data.timestamp || new Date().toISOString(),
        metadata: data.metadata,
      });
    });
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
  } catch {
    return [];
  }
}

export function subscribeActivity(
  studentId: string,
  callback: (activities: ActivityEntry[]) => void
): Unsubscribe {
  if (!isFirebaseConfigured) {
    const list = getLocal<ActivityEntry[]>('act_' + studentId, []);
    callback(list.slice(0, 20));
    return () => {};
  }

  return onSnapshot(collection(db, 'students', studentId, 'activity'), snap => {
    const activities: ActivityEntry[] = [];
    snap.forEach(d => {
      const data = d.data();
      activities.push({
        id: d.id,
        type: data.type,
        itemId: data.itemId,
        itemTitle: data.itemTitle,
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : data.timestamp || new Date().toISOString(),
      });
    });
    callback(activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 20));
  });
}

// Custom Topics
export async function addCustomTopic(
  studentId: string,
  topic: Omit<CustomTopicEntry, 'id' | 'createdAt'>
): Promise<string> {
  const now = new Date().toISOString();
  if (!isFirebaseConfigured) {
    const key = 'custom_' + studentId;
    const existing = getLocal<CustomTopicEntry[]>(key, []);
    const id = 'cust_' + Date.now();
    existing.push({ ...topic, id, createdAt: now });
    setLocal(key, existing);
    return id;
  }

  const ref = doc(collection(db, 'students', studentId, 'customSyllabus'));
  await setDoc(ref, { ...topic, createdAt: serverTimestamp() });
  return ref.id;
}

export async function getAllCustomTopics(studentId: string): Promise<CustomTopicEntry[]> {
  if (!isFirebaseConfigured) {
    return getLocal<CustomTopicEntry[]>('custom_' + studentId, []);
  }

  try {
    const snap = await getDocs(collection(db, 'students', studentId, 'customSyllabus'));
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        title: data.title,
        parentId: data.parentId,
        stage: data.stage,
        paper: data.paper,
        subject: data.subject,
        path: data.path || [],
        priority: data.priority || 'medium',
        notes: data.notes,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || null,
      };
    });
  } catch {
    return [];
  }
}

export async function deleteCustomTopic(studentId: string, topicId: string): Promise<void> {
  if (!isFirebaseConfigured) {
    const key = 'custom_' + studentId;
    const existing = getLocal<CustomTopicEntry[]>(key, []);
    setLocal(key, existing.filter(t => t.id !== topicId));
    return;
  }
  await deleteDoc(doc(db, 'students', studentId, 'customSyllabus', topicId));
}

// Overrides (Renames)
export async function setOverride(
  studentId: string,
  itemId: string,
  originalTitle: string,
  newTitle: string
): Promise<void> {
  const now = new Date().toISOString();
  if (!isFirebaseConfigured) {
    const key = 'overrides_' + studentId;
    const existing = getLocal<Record<string, OverrideEntry>>(key, {});
    existing[itemId] = { itemId, originalTitle, newTitle, updatedAt: now };
    setLocal(key, existing);
    return;
  }

  const ref = doc(db, 'students', studentId, 'overrides', itemId);
  await setDoc(ref, { itemId, originalTitle, newTitle, updatedAt: serverTimestamp() }, { merge: true });
}

export async function removeOverride(studentId: string, itemId: string): Promise<void> {
  if (!isFirebaseConfigured) {
    const key = 'overrides_' + studentId;
    const existing = getLocal<Record<string, OverrideEntry>>(key, {});
    delete existing[itemId];
    setLocal(key, existing);
    return;
  }
  await deleteDoc(doc(db, 'students', studentId, 'overrides', itemId));
}

export async function getAllOverrides(studentId: string): Promise<Record<string, OverrideEntry>> {
  if (!isFirebaseConfigured) {
    return getLocal<Record<string, OverrideEntry>>('overrides_' + studentId, {});
  }

  try {
    const snap = await getDocs(collection(db, 'students', studentId, 'overrides'));
    const result: Record<string, OverrideEntry> = {};
    snap.forEach(d => {
      const data = d.data();
      result[d.id] = {
        itemId: d.id,
        originalTitle: data.originalTitle,
        newTitle: data.newTitle,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt || null,
      };
    });
    return result;
  } catch {
    return {};
  }
}

// Resets
export async function resetProgress(studentId: string): Promise<void> {
  if (!isFirebaseConfigured) {
    setLocal('prog_' + studentId, {});
    return;
  }
  const snap = await getDocs(collection(db, 'students', studentId, 'progress'));
  const batch = writeBatch(db);
  snap.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

export async function resetEverything(studentId: string): Promise<void> {
  if (!isFirebaseConfigured) {
    ['prog_', 'notes_', 'rev_', 'act_', 'custom_', 'overrides_'].forEach(p => {
      localStorage.removeItem(LOCAL_STORAGE_PREFIX + p + studentId);
    });
    return;
  }

  const collections = ['progress', 'notes', 'revisions', 'activity', 'customSyllabus', 'overrides'];
  for (const col of collections) {
    const snap = await getDocs(collection(db, 'students', studentId, col));
    if (snap.docs.length > 0) {
      const batch = writeBatch(db);
      snap.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  }
}
