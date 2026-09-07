import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStudyStore } from '../store/studyStore';
import { findNodeById } from '../data/syllabusNormalizer';
import { calculateNodeStats } from '../utils/progress';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Breadcrumbs } from '../components/navigation/Breadcrumbs';
import { StatusIcon } from '../components/ui/StatusIcon';
import { ChevronRight, Filter, Eye } from 'lucide-react';
import type { ItemStatus } from '../types';

export default function SyllabusNodePage() {
  const { nodeId } = useParams();
  const navigate = useNavigate();
  const {
    syllabusTree,
    progress,
    getDisplayTitle,
    updateItemStatus,
    user
  } = useStudyStore();
  const isAdmin = user?.role === 'admin';

  const [statusFilter, setStatusFilter] = useState<'all' | ItemStatus>('all');
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [nodeId]);

  const node = useMemo(() => {
    if (!nodeId) return null;
    return findNodeById(syllabusTree, nodeId);
  }, [syllabusTree, nodeId]);

  const nodeStats = useMemo(() => {
    return node ? calculateNodeStats(node, progress) : null;
  }, [node, progress]);

  // Build breadcrumb items
  const breadcrumbItems = useMemo(() => {
    if (!node) return [];
    return node.path.map((segment, idx) => ({
      label: segment.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      path: idx < node.path.length - 1 ? undefined : undefined,
    }));
  }, [node]);

  // Filtered children
  const filteredChildren = useMemo(() => {
    if (!node) return [];
    return node.children.filter(child => {
      if (statusFilter === 'all') return true;
      if (child.isLeaf) {
        const s = progress[child.id]?.status || 'not_started';
        return s === statusFilter;
      }
      return true;
    });
  }, [node, statusFilter, progress]);

  if (!node) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-sm text-zinc-400">Section or topic not found.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-xs font-semibold text-pink-600 hover:underline"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // If node is already a single leaf, redirect to its detail view
  if (node.isLeaf && node.children.length === 0) {
    navigate('/topic/' + node.id, { replace: true });
    return null;
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={breadcrumbItems} />

      {/* Header with Title & Stats */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
                {getDisplayTitle(node)}
              </h1>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-pink-600 bg-pink-50 border border-pink-100 px-2 py-0.5 rounded-md">
                  <Eye className="w-3 h-3" /> Monitor Mode
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {node.children.length} subsections · {nodeStats?.active || 0} study topics
            </p>
          </div>

          <button
            onClick={() => setShowFilter(!showFilter)}
            className={'self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ' + (showFilter || statusFilter !== 'all' ? 'border-pink-300 bg-pink-50 text-pink-600' : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300')}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Topics</span>
          </button>
        </div>

        {nodeStats && (
          <div className="space-y-2 pt-2 border-t border-zinc-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500 font-medium">Completion Rate</span>
              <span className="font-bold text-zinc-900">{nodeStats.percentage}%</span>
            </div>
            <ProgressBar value={nodeStats.percentage} height="sm" color="pink" />
            <div className="flex items-center gap-3 text-[11px] text-zinc-400 pt-1">
              <span className="text-emerald-600 font-medium">{nodeStats.completed} done</span>
              <span>·</span>
              <span className="text-amber-600 font-medium">{nodeStats.inProgress} in progress</span>
              <span>·</span>
              <span>{nodeStats.notStarted} remaining</span>
              {nodeStats.outOfSyllabus > 0 && (
                <>
                  <span>·</span>
                  <span className="text-zinc-400">{nodeStats.outOfSyllabus} excluded</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Filter Pills */}
        {showFilter && (
          <div className="flex items-center gap-1.5 pt-2 flex-wrap border-t border-zinc-100">
            {(['all', 'not_started', 'in_progress', 'completed', 'out_of_syllabus'] as const).map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={'px-3 py-1 rounded-lg text-xs font-medium transition-all ' + (statusFilter === f ? 'bg-pink-500 text-white shadow-xs' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200')}
              >
                {f === 'all' ? 'All' : f.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Children List */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-xs">
        {filteredChildren.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-400">
            No topics matching filter.
          </div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {filteredChildren.map(child => {
              const childStats = calculateNodeStats(child, progress);
              const childStatus = progress[child.id]?.status || 'not_started';
              const isExcluded = childStatus === 'out_of_syllabus';

              return (
                <div
                  key={child.id}
                  onClick={() => {
                    if (child.isLeaf && child.children.length === 0) {
                      navigate('/topic/' + child.id);
                    } else {
                      navigate('/node/' + child.id);
                    }
                  }}
                  className={'px-4 sm:px-5 py-3.5 hover:bg-zinc-50/70 transition-colors cursor-pointer flex items-center gap-3.5 group ' + (isExcluded ? 'opacity-40' : '')}
                >
                  {/* Status icon or progress dot */}
                  {child.isLeaf ? (
                    <StatusIcon
                      status={childStatus}
                      size="sm"
                      interactive={!isAdmin}
                      onClick={e => {
                        e.stopPropagation();
                        if (isAdmin) return;
                        const nextStatus: Record<ItemStatus, ItemStatus> = {
                          not_started: 'completed',
                          completed: 'not_started',
                          in_progress: 'completed',
                          out_of_syllabus: 'not_started',
                        };
                        updateItemStatus(child.id, nextStatus[childStatus], child.displayTitle);
                      }}
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-zinc-200 flex items-center justify-center flex-shrink-0 text-[10px] text-zinc-400 font-bold bg-zinc-50">
                      {childStats.percentage > 0 ? (
                        <div
                          className="rounded-full bg-pink-500"
                          style={{
                            width: Math.max(4, Math.round(childStats.percentage * 0.12)) + 'px',
                            height: Math.max(4, Math.round(childStats.percentage * 0.12)) + 'px',
                          }}
                        />
                      ) : (
                        '·'
                      )}
                    </div>
                  )}

                  {/* Title & Metadata */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={'ext-xs font-semibold truncate group-hover:text-pink-600 transition-colors'}>
                        {getDisplayTitle(child)}
                      </span>
                      {child.isStateSpecific && (
                        <span className="text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.2 rounded">
                          UP
                        </span>
                      )}
                    </div>

                    {!child.isLeaf && (
                      <div className="flex items-center gap-2 mt-1">
                        <ProgressBar value={childStats.percentage} height="xs" className="max-w-[70px]" />
                        <span className="text-[10px] text-zinc-400 font-medium">
                          {childStats.percentage}% · {childStats.completed}/{childStats.active}
                        </span>
                      </div>
                    )}
                  </div>

                  {!child.isLeaf && (
                    <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-pink-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
