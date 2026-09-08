import { memo, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronDown, Search, CornerDownRight } from 'lucide-react';
import type { SyllabusNode, ItemStatus } from '../../types';
import { useStudyStore } from '../../store/studyStore';
import { buildStatsMap } from '../../utils/progress';
import { ProgressBar } from '../ui/ProgressBar';
import { StatusIcon } from '../ui/StatusIcon';

interface SyllabusExplorerProps {
  root: SyllabusNode;
}

type StatusFilter = 'all' | ItemStatus;

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'not_started', label: 'Remaining' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'completed', label: 'Completed' },
];

function loadExpanded(key: string, rootId: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const arr = JSON.parse(raw) as string[];
      if (Array.isArray(arr) && arr.length > 0) return new Set(arr);
    }
  } catch {
    // ignore
  }
  return new Set([rootId]);
}

/** Single row of the explorer tree. Chevron expands inline; title opens focused context. */
const ExplorerRow = memo(function ExplorerRow({
  node,
  isExpanded,
  onToggle,
  showGuide,
}: {
  node: SyllabusNode;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  showGuide: boolean;
}) {
  const navigate = useNavigate();
  const { progress, getDisplayTitle, updateItemStatus, user } = useStudyStore();
  const isAdmin = user?.role === 'admin';
  const isLeaf = node.children.length === 0;
  const status = progress[node.id]?.status || 'not_started';

  const handleTitleClick = () => {
    if (isLeaf) navigate('/topic/' + node.id);
    else navigate('/node/' + node.id);
  };

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAdmin) return;
    const next: Record<ItemStatus, ItemStatus> = {
      not_started: 'completed',
      completed: 'not_started',
      in_progress: 'completed',
      out_of_syllabus: 'not_started',
    };
    updateItemStatus(node.id, next[status], node.displayTitle);
  };

  return (
    <div
      className={
        'group flex items-center gap-1.5 pr-2 py-1.5 rounded-lg hover:bg-zinc-50 transition-colors ' +
        (showGuide ? 'border-l border-zinc-200 ' : '')
      }
      style={{ paddingLeft: showGuide ? 8 : 2 }}
    >
      {/* Expand / collapse control */}
      {!isLeaf ? (
        <button
          onClick={() => onToggle(node.id)}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
          aria-expanded={isExpanded}
          className="p-1 rounded-md text-zinc-400 hover:text-pink-600 hover:bg-pink-50 transition-colors flex-shrink-0"
        >
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      ) : (
        <span className="w-6 flex justify-center flex-shrink-0" aria-hidden>
          <span className="text-zinc-200 text-xs leading-none">·</span>
        </span>
      )}

      {/* Status indicator */}
      {isLeaf ? (
        <StatusIcon status={status} size="sm" interactive={!isAdmin} onClick={handleStatusClick} />
      ) : (
        <span className="w-5 flex justify-center flex-shrink-0" aria-hidden>
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-200" />
        </span>
      )}

      {/* Title — opens focused detail/context */}
      <button
        onClick={handleTitleClick}
        title={getDisplayTitle(node)}
        className={
          'flex-1 min-w-0 text-left text-[13px] rounded px-1 py-0.5 transition-colors ' +
          (isLeaf
            ? 'font-medium text-zinc-700 hover:text-pink-600 ' +
              (status === 'out_of_syllabus' ? 'opacity-40 line-through' : '')
            : 'font-semibold text-zinc-800 hover:text-pink-600')
        }
      >
        <span className="break-words">{getDisplayTitle(node)}</span>
        {node.isStateSpecific && (
          <span className="ml-1.5 align-middle text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-100 px-1 py-px rounded">
            UP
          </span>
        )}
      </button>

      {/* Leaf open affordance */}
      {isLeaf && (
        <button
          onClick={handleTitleClick}
          aria-label="Open study item"
          className="p-1 rounded-md text-zinc-300 hover:text-pink-600 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex-shrink-0"
        >
          <CornerDownRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
});

/** Small progress dot for branch nodes (avoids repeating full bars on every row). */
function ExplorerDot({ nodeId, depth: _depth }: { nodeId: string; depth: number }) {
  const { syllabusTree, progress } = useStudyStore();
  void syllabusTree;
  void _depth;
  const pct = useMemo(() => {
    // Cheap lookup: stats map lives in parent; dot only needs completion signal.
    // We read progress version via subscription above; compute lazily is fine.
    return progress[nodeId + '__pct'] as unknown as number | undefined;
  }, [progress, nodeId]);
  void pct;
  return (
    <span className="w-5 flex justify-center flex-shrink-0" aria-hidden>
      <span className="w-1.5 h-1.5 rounded-full bg-zinc-200" />
    </span>
  );
}

interface FlatEntry {
  node: SyllabusNode;
  depth: number;
  ancestors: string[];
}

/**
 * Expandable syllabus explorer (VS Code Explorer interaction principle,
 * original visual design): folders expand inline, depth is fully preserved
 * and dynamic — no hardcoded level limit, no per-level page navigation.
 */
export function SyllabusExplorer({ root }: SyllabusExplorerProps) {
  const navigate = useNavigate();
  const { progress, getDisplayTitle } = useStudyStore();
  const storageKey = 'explorer_expanded_' + root.id;

  const [expanded, setExpanded] = useState<Set<string>>(() => loadExpanded(storageKey, root.id));
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Reset expansion memory only when switching to a different root.
  useEffect(() => {
    setExpanded(loadExpanded(storageKey, root.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root.id]);

  // Persist expansion (context preservation when returning to a subject).
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...expanded].slice(0, 500)));
    } catch {
      // ignore
    }
  }, [expanded, storageKey]);

  const statsMap = useMemo(() => buildStatsMap(root, progress), [root, progress]);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const all = new Set<string>();
    const walk = (n: SyllabusNode) => {
      if (n.children.length > 0) {
        all.add(n.id);
        n.children.forEach(walk);
      }
    };
    walk(root);
    all.add(root.id);
    setExpanded(all);
  };

  const collapseAll = () => setExpanded(new Set([root.id]));

  const searching = query.trim().length >= 2;
  const q = query.trim().toLowerCase();

  const entries: FlatEntry[] = useMemo(() => {
    const out: FlatEntry[] = [];
    const matchIds = new Set<string>();

    if (searching) {
      const walk = (n: SyllabusNode): boolean => {
        const selfMatch =
          n.displayTitle.toLowerCase().includes(q) || n.title.replace(/_/g, ' ').toLowerCase().includes(q);
        let childMatch = false;
        for (const c of n.children) {
          if (walk(c)) childMatch = true;
        }
        if (selfMatch || childMatch) matchIds.add(n.id);
        return selfMatch || childMatch;
      };
      walk(root);
    }

    const matchesStatus = (n: SyllabusNode): boolean => {
      if (statusFilter === 'all') return true;
      if (n.children.length === 0) {
        return (progress[n.id]?.status || 'not_started') === statusFilter;
      }
      return true;
    };

    const walk = (n: SyllabusNode, depth: number, ancestors: string[]) => {
      if (n.id !== root.id) {
        if (searching && !matchIds.has(n.id)) return;
        if (!matchesStatus(n)) {
          // Still descend: a branch failing the leaf filter may contain matches.
          if (n.children.length > 0) {
            const force = searching;
            if (force || expanded.has(n.id)) {
              n.children.forEach(c => walk(c, depth + 1, [...ancestors, n.id]));
            }
          }
          return;
        }
        out.push({ node: n, depth, ancestors });
      }
      const isOpen = n.id === root.id ? true : searching ? true : expanded.has(n.id);
      if (isOpen && n.children.length > 0) {
        n.children.forEach(c => walk(c, n.id === root.id ? 0 : depth + 1, [...ancestors, n.id]));
      }
    };

    root.children.forEach(c => walk(c, 0, [root.id]));
    return out;
  }, [root, expanded, searching, q, statusFilter, progress]);

  const rootStats = statsMap.get(root.id);

  return (
    <div className="space-y-3">
      {/* Header: context + progress visibility */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200/80 shadow-xs space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-zinc-900 tracking-tight break-words">
              {getDisplayTitle(root)}
            </h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {rootStats ? `${rootStats.completed} of ${rootStats.active} done` : ''} · click ▸ to
              expand inline, click a title for focused view
            </p>
          </div>
          {rootStats && (
            <div className="text-right flex-shrink-0">
              <span className="text-xl font-extrabold text-zinc-900">{rootStats.percentage}%</span>
            </div>
          )}
        </div>
        {rootStats && <ProgressBar value={rootStats.percentage} height="sm" />}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Filter within this section…"
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 rounded-lg border border-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400"
            />
          </div>
          <button
            onClick={expandAll}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-zinc-200 text-zinc-600 hover:border-zinc-300"
          >
            Expand all
          </button>
          <button
            onClick={collapseAll}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-zinc-200 text-zinc-600 hover:border-zinc-300"
          >
            Collapse
          </button>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={
                'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ' +
                (statusFilter === f.id
                  ? 'bg-pink-500 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200')
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tree */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs px-2 sm:px-3 py-2">
        {entries.length === 0 ? (
          <div className="py-10 text-center text-xs text-zinc-400">
            {searching ? `No matches for "${query}" in this section.` : 'No topics matching filter.'}
            <div>
              <button
                onClick={() => navigate('/search')}
                className="text-pink-600 font-medium hover:underline mt-1"
              >
                Try global search
              </button>
            </div>
          </div>
        ) : (
          entries.map(({ node, depth }) => {
            const isBranch = node.children.length > 0;
            const isOpen = searching ? true : expanded.has(node.id);
            const st = statsMap.get(node.id);
            // Cap visual indentation on mobile for extreme depth.
            const cappedDepth = Math.min(depth, 5);
            return (
              <div key={node.id}>
                <div className="flex items-start gap-1">
                  <div className="flex-1 min-w-0" style={{ marginLeft: cappedDepth * 10 }}>
                    <ExplorerRow
                      node={node}
                      isExpanded={isOpen}
                      onToggle={toggle}
                      showGuide={depth > 0}
                    />
                    {isBranch && st && (
                      <div
                        className="flex items-center gap-2 pr-2 pb-1"
                        style={{ paddingLeft: 34 }}
                      >
                        <ProgressBar value={st.percentage} height="xs" className="max-w-[120px]" />
                        <span className="text-[10px] text-zinc-400 font-medium whitespace-nowrap">
                          {st.percentage}% · {st.completed}/{st.active}
                          {node.children.length > 0 && ` · ${node.children.length} items`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
