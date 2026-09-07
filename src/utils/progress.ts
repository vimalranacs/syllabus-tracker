import type { SyllabusNode, ProgressEntry, ProgressStats } from '../types';

export function getLeafNodes(node: SyllabusNode): SyllabusNode[] {
  if (node.isLeaf && node.children.length === 0) return [node];
  if (node.children.length === 0) return [node];
  const leaves: SyllabusNode[] = [];
  for (const child of node.children) {
    leaves.push(...getLeafNodes(child));
  }
  return leaves;
}

export function calculateNodeStats(
  node: SyllabusNode,
  progressMap: Record<string, ProgressEntry>
): ProgressStats {
  const leaves = getLeafNodes(node);

  let completed = 0;
  let inProgress = 0;
  let outOfSyllabus = 0;

  for (const leaf of leaves) {
    const p = progressMap[leaf.id];
    const status = p?.status || 'not_started';
    if (status === 'completed') completed++;
    else if (status === 'in_progress') inProgress++;
    else if (status === 'out_of_syllabus') outOfSyllabus++;
  }

  const total = leaves.length;
  const active = Math.max(0, total - outOfSyllabus);
  const notStarted = Math.max(0, active - completed - inProgress);
  const percentage = active > 0 ? Math.round((completed / active) * 100) : 0;

  return { completed, inProgress, notStarted, outOfSyllabus, total, active, percentage };
}

export function calculateOverallStats(
  roots: SyllabusNode[],
  progressMap: Record<string, ProgressEntry>
): ProgressStats {
  let completed = 0;
  let inProgress = 0;
  let outOfSyllabus = 0;
  let total = 0;

  for (const root of roots) {
    const stats = calculateNodeStats(root, progressMap);
    completed += stats.completed;
    inProgress += stats.inProgress;
    outOfSyllabus += stats.outOfSyllabus;
    total += stats.total;
  }

  const active = Math.max(0, total - outOfSyllabus);
  const notStarted = Math.max(0, active - completed - inProgress);
  const percentage = active > 0 ? Math.round((completed / active) * 100) : 0;

  return { completed, inProgress, notStarted, outOfSyllabus, total, active, percentage };
}
