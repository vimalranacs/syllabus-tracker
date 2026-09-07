import { create } from 'zustand';
import type {
  SyllabusNode,
  ProgressEntry,
  NoteEntry,
  RevisionEntry,
  ActivityEntry,
  CustomTopicEntry,
  OverrideEntry,
  UserProfile,
  ItemStatus,
  Priority
} from '../types';
import { loadSyllabusData } from '../data/syllabusLoader';
import { normalizeSyllabus, flattenNodes } from '../data/syllabusNormalizer';
import {
  getAllProgress,
  getAllNotes,
  getAllRevisions,
  getAllCustomTopics,
  getAllOverrides,
  updateProgress,
  updateNote,
  addRevision,
  logActivity,
  subscribeProgress,
  subscribeActivity,
  setOverride,
  removeOverride,
  addCustomTopic as addCustomTopicService,
  deleteCustomTopic as deleteCustomTopicService
} from '../services/progressService';
import { updateLastActive } from '../services/authService';
import type { Unsubscribe } from 'firebase/firestore';

interface StudyState {
  user: UserProfile | null;
  authLoading: boolean;

  syllabusTree: SyllabusNode[];
  syllabusFlat: SyllabusNode[];
  syllabusLoading: boolean;
  syllabusError: string | null;

  progress: Record<string, ProgressEntry>;
  notes: Record<string, NoteEntry>;
  revisions: Record<string, RevisionEntry>;
  activity: ActivityEntry[];
  customTopics: CustomTopicEntry[];
  overrides: Record<string, OverrideEntry>;
  studentDataLoading: boolean;

  _unsubscribers: Unsubscribe[];

  setUser: (user: UserProfile | null) => void;
  setAuthLoading: (loading: boolean) => void;
  loadSyllabus: () => Promise<void>;
  loadStudentData: (uid: string) => Promise<void>;
  subscribeToStudentData: (uid: string) => void;
  unsubscribeAll: () => void;

  updateItemStatus: (itemId: string, status: ItemStatus, itemTitle: string) => Promise<void>;
  updateItemPriority: (itemId: string, priority: Priority) => Promise<void>;
  saveNote: (itemId: string, content: string) => Promise<void>;
  markRevised: (itemId: string, itemTitle: string) => Promise<void>;
  addCustomTopic: (topic: Omit<CustomTopicEntry, 'id' | 'createdAt'>) => Promise<void>;
  deleteCustomTopic: (topicId: string) => Promise<void>;
  renameItem: (itemId: string, originalTitle: string, newTitle: string) => Promise<void>;
  restoreItemName: (itemId: string) => Promise<void>;

  getDisplayTitle: (node: SyllabusNode) => string;
}

export const useStudyStore = create<StudyState>((set, get) => ({
  user: null,
  authLoading: true,
  syllabusTree: [],
  syllabusFlat: [],
  syllabusLoading: false,
  syllabusError: null,
  progress: {},
  notes: {},
  revisions: {},
  activity: [],
  customTopics: [],
  overrides: {},
  studentDataLoading: false,
  _unsubscribers: [],

  setUser: (user) => set({ user }),
  setAuthLoading: (loading) => set({ authLoading: loading }),

  loadSyllabus: async () => {
    if (get().syllabusTree.length > 0) return;
    set({ syllabusLoading: true, syllabusError: null });
    try {
      const raw = await loadSyllabusData();
      const tree = normalizeSyllabus(raw);
      const flat = flattenNodes(tree);
      set({ syllabusTree: tree, syllabusFlat: flat, syllabusLoading: false });
    } catch (err) {
      set({ syllabusError: String(err), syllabusLoading: false });
    }
  },

  loadStudentData: async (uid: string) => {
    set({ studentDataLoading: true });
    try {
      const [progress, notes, revisions, customTopics, overrides] = await Promise.all([
        getAllProgress(uid),
        getAllNotes(uid),
        getAllRevisions(uid),
        getAllCustomTopics(uid),
        getAllOverrides(uid),
      ]);
      set({ progress, notes, revisions, customTopics, overrides, studentDataLoading: false });
    } catch {
      set({ studentDataLoading: false });
    }
  },

  subscribeToStudentData: (uid: string) => {
    get().unsubscribeAll();
    const unsubs: Unsubscribe[] = [];

    unsubs.push(subscribeProgress(uid, (progress) => set({ progress })));
    unsubs.push(subscribeActivity(uid, (activity) => set({ activity })));

    set({ _unsubscribers: unsubs });
  },

  unsubscribeAll: () => {
    get()._unsubscribers.forEach(u => u());
    set({ _unsubscribers: [] });
  },

  updateItemStatus: async (itemId, status, itemTitle) => {
    const uid = get().user?.uid;
    if (!uid) return;
    const currentProgress = get().progress[itemId];
    const priority = currentProgress?.priority || 'medium';
    await updateProgress(uid, itemId, status, priority);
    set(state => ({
      progress: {
        ...state.progress,
        [itemId]: { itemId, status, priority, updatedAt: new Date().toISOString() }
      }
    }));
    await logActivity(uid, {
      type: status === 'completed' ? 'completed' : status === 'out_of_syllabus' ? 'excluded' : 'in_progress',
      itemId,
      itemTitle
    });
    await updateLastActive(uid);
  },

  updateItemPriority: async (itemId, priority) => {
    const uid = get().user?.uid;
    if (!uid) return;
    const currentProgress = get().progress[itemId];
    const status = currentProgress?.status || 'not_started';
    await updateProgress(uid, itemId, status, priority);
    set(state => ({
      progress: {
        ...state.progress,
        [itemId]: {
          ...(state.progress[itemId] || { itemId, status: 'not_started' as ItemStatus, updatedAt: null }),
          priority
        }
      }
    }));
  },

  saveNote: async (itemId, content) => {
    const uid = get().user?.uid;
    if (!uid) return;
    await updateNote(uid, itemId, content);
    set(state => ({
      notes: { ...state.notes, [itemId]: { itemId, content, updatedAt: new Date().toISOString() } }
    }));
    await logActivity(uid, { type: 'note_updated', itemId, itemTitle: itemId });
  },

  markRevised: async (itemId, itemTitle) => {
    const uid = get().user?.uid;
    if (!uid) return;
    await addRevision(uid, itemId);
    const current = get().revisions[itemId];
    const count = (current?.revisionCount || 0) + 1;
    set(state => ({
      revisions: {
        ...state.revisions,
        [itemId]: {
          itemId,
          revisionCount: count,
          lastRevisedAt: new Date().toISOString(),
          revisionDates: []
        }
      }
    }));
    await logActivity(uid, { type: 'revised', itemId, itemTitle });
  },

  addCustomTopic: async (topic) => {
    const uid = get().user?.uid;
    if (!uid) return;
    const id = await addCustomTopicService(uid, topic);
    set(state => ({
      customTopics: [...state.customTopics, { ...topic, id, createdAt: new Date().toISOString() }]
    }));
    await logActivity(uid, { type: 'custom_added', itemId: id, itemTitle: topic.title });
  },

  deleteCustomTopic: async (topicId) => {
    const uid = get().user?.uid;
    if (!uid) return;
    await deleteCustomTopicService(uid, topicId);
    set(state => ({ customTopics: state.customTopics.filter(t => t.id !== topicId) }));
  },

  renameItem: async (itemId, originalTitle, newTitle) => {
    const uid = get().user?.uid;
    if (!uid) return;
    await setOverride(uid, itemId, originalTitle, newTitle);
    set(state => ({
      overrides: {
        ...state.overrides,
        [itemId]: { itemId, originalTitle, newTitle, updatedAt: new Date().toISOString() }
      }
    }));
    await logActivity(uid, { type: 'renamed', itemId, itemTitle: newTitle });
  },

  restoreItemName: async (itemId) => {
    const uid = get().user?.uid;
    if (!uid) return;
    await removeOverride(uid, itemId);
    set(state => {
      const overrides = { ...state.overrides };
      delete overrides[itemId];
      return { overrides };
    });
  },

  getDisplayTitle: (node: SyllabusNode) => {
    const override = get().overrides[node.id];
    return override ? override.newTitle : node.displayTitle;
  },
}));
