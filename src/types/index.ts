export type ItemStatus = 'not_started' | 'in_progress' | 'completed' | 'out_of_syllabus';
export type UserRole = 'student' | 'admin';
export type Priority = 'low' | 'medium' | 'high';

export interface RawSyllabusRecord {
  id: number;
  exam: string;
  stage: string;
  paper: string;
  subject: string;
  level_1?: string;
  level_2?: string;
  level_3?: string;
  level_4?: string;
  level_5?: string;
  level_6?: string;
  is_state_specific: boolean;
  state: string;
}

export interface SyllabusNode {
  id: string;
  originalId?: number;
  title: string;
  displayTitle: string;
  stage: string;
  paper: string;
  subject: string;
  path: string[];
  depth: number;
  isLeaf: boolean;
  children: SyllabusNode[];
  isStateSpecific: boolean;
  state: string;
  createdBy?: 'system' | 'user';
  parentId?: string;
}

export interface ProgressEntry {
  itemId: string;
  status: ItemStatus;
  priority: Priority;
  updatedAt: string | null;
}

export interface NoteEntry {
  itemId: string;
  content: string;
  updatedAt: string | null;
}

export interface RevisionEntry {
  itemId: string;
  revisionCount: number;
  lastRevisedAt: string | null;
  revisionDates?: string[];
}

export interface ActivityEntry {
  id: string;
  type: 'completed' | 'in_progress' | 'excluded' | 'restored' | 'revised' | 'note_updated' | 'custom_added' | 'renamed';
  itemId: string;
  itemTitle: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface CustomTopicEntry {
  id: string;
  title: string;
  parentId: string;
  stage: string;
  paper: string;
  subject: string;
  path: string[];
  priority: Priority;
  notes?: string;
  createdAt: string | null;
}

export interface OverrideEntry {
  itemId: string;
  originalTitle: string;
  newTitle: string;
  updatedAt: string | null;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  createdAt: string | null;
  lastActiveAt: string | null;
}

export interface ProgressStats {
  completed: number;
  inProgress: number;
  notStarted: number;
  outOfSyllabus: number;
  total: number;
  active: number;
  percentage: number;
}
