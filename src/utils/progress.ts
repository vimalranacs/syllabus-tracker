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

/**
 * Single-pass bottom-up stats for every node id in the subtree.
 * Used by the expandable explorer so each row is an O(1) lookup
 * instead of re-walking leaves per node.
 */
export function buildStatsMap(
  root: SyllabusNode,
  progressMap: Record<string, ProgressEntry>
): Map<string, ProgressStats> {
  const map = new Map<string, ProgressStats>();

  function visit(node: SyllabusNode): ProgressStats {
    if (node.children.length === 0) {
      const status = progressMap[node.id]?.status || 'not_started';
      const completed = status === 'completed' ? 1 : 0;
      const inProgress = status === 'in_progress' ? 1 : 0;
      const outOfSyllabus = status === 'out_of_syllabus' ? 1 : 0;
      const total = 1;
      const active = outOfSyllabus > 0 ? 0 : 1;
      const notStarted = active - completed - inProgress;
      const stats: ProgressStats = {
        completed,
        inProgress,
        notStarted: Math.max(0, notStarted),
        outOfSyllabus,
        total,
        active,
        percentage: active > 0 ? Math.round((completed / active) * 100) : 0,
      };
      map.set(node.id, stats);
      return stats;
    }

    let completed = 0;
    let inProgress = 0;
    let outOfSyllabus = 0;
    let total = 0;
    for (const child of node.children) {
      const s = visit(child);
      completed += s.completed;
      inProgress += s.inProgress;
      outOfSyllabus += s.outOfSyllabus;
      total += s.total;
    }
    const active = Math.max(0, total - outOfSyllabus);
    const notStarted = Math.max(0, active - completed - inProgress);
    const stats: ProgressStats = {
      completed,
      inProgress,
      notStarted,
      outOfSyllabus,
      total,
      active,
      percentage: active > 0 ? Math.round((completed / active) * 100) : 0,
    };
    map.set(node.id, stats);
    return stats;
  }

  visit(root);
  return map;
}
