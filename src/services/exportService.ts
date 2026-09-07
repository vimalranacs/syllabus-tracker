import {
  getAllProgress,
  getAllNotes,
  getAllRevisions,
  getAllCustomTopics,
  getAllOverrides
} from './progressService';

const APP_VERSION = '1.0.0';
const DB_VERSION = '1.0';

export async function exportJSON(studentId: string, displayName: string): Promise<void> {
  const [progress, notes, revisions, customTopics, overrides] = await Promise.all([
    getAllProgress(studentId),
    getAllNotes(studentId),
    getAllRevisions(studentId),
    getAllCustomTopics(studentId),
    getAllOverrides(studentId),
  ]);

  const backup = {
    metadata: {
      studentId,
      displayName,
      exportedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      dbVersion: DB_VERSION,
    },
    progress,
    notes,
    revisions,
    customTopics,
    overrides,
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "uppsc-ro-aro-backup.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportCSV(
  studentId: string,
  syllabusFlat: Array<{ id: string; displayTitle: string; stage: string; paper: string; subject: string; path: string[]; isLeaf: boolean }>
): Promise<void> {
  const [progress, revisions, notes] = await Promise.all([
    getAllProgress(studentId),
    getAllRevisions(studentId),
    getAllNotes(studentId),
  ]);

  const leaves = syllabusFlat.filter(n => n.isLeaf);
  const rows = [
    ['ID', 'Stage', 'Paper', 'Subject', 'Hierarchy', 'Topic', 'Status', 'Priority', 'Revisions', 'Last Revised', 'Notes']
  ];

  for (const node of leaves) {
    const prog = progress[node.id];
    const rev = revisions[node.id];
    const note = notes[node.id];

    rows.push([
      node.id,
      node.stage,
      node.paper,
      node.subject,
      node.path.join(' > '),
      node.displayTitle,
      prog?.status || 'not_started',
      prog?.priority || 'medium',
      String(rev?.revisionCount || 0),
      rev?.lastRevisedAt ? new Date(rev.lastRevisedAt).toLocaleDateString() : '',
      (note?.content || '').replace(/[\r\n]+/g, ' '),
    ]);
  }

  const csv = rows
    .map(row => row.map(cell => "").join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "uppsc-ro-aro-progress.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function validateImportFile(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return Boolean(d.progress && typeof d.progress === 'object');
}
