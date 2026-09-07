import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudyStore } from '../store/studyStore';
import { formatDate } from '../utils/dates';
import { RefreshCw, ChevronRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

type RevFilter = 'all' | 'zero' | 'once' | 'multiple' | 'needs_attention';

export default function RevisionPage() {
  const { syllabusFlat, revisions, progress, getDisplayTitle, markRevised } = useStudyStore();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<RevFilter>('all');

  const leafTopics = useMemo(() => {
    return syllabusFlat.filter(n => n.isLeaf && n.children.length === 0);
  }, [syllabusFlat]);

  const filteredTopics = useMemo(() => {
    return leafTopics.filter(node => {
      const p = progress[node.id];
      if (p?.status === 'out_of_syllabus') return false;

      const r = revisions[node.id];
      const count = r?.revisionCount || 0;

      if (activeFilter === 'zero') return count === 0;
      if (activeFilter === 'once') return count === 1;
      if (activeFilter === 'multiple') return count > 1;
      if (activeFilter === 'needs_attention') {
        return p?.status === 'completed' && count === 0;
      }
      return true;
    }).slice(0, 100);
  }, [leafTopics, revisions, progress, activeFilter]);

  const filters = [
    { id: 'all', label: 'All Active Topics' },
    { id: 'needs_attention', label: 'Completed (No Revisions Yet)' },
    { id: 'zero', label: '0 Revisions' },
    { id: 'once', label: 'Revised Once' },
    { id: 'multiple', label: 'Multiple Revisions' },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
          Revision Tracker
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Log and monitor revision iterations for high retention
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id as RevFilter)}
            className={'px-3 py-1.5 rounded-xl text-xs font-medium transition-all ' + (activeFilter === f.id ? 'bg-pink-500 text-white shadow-xs' : 'bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-300')}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-xs">
        <div className="px-5 py-2.5 bg-zinc-50/80 border-b border-zinc-100 flex items-center justify-between text-xs text-zinc-400">
          <span>Showing {filteredTopics.length} topics</span>
        </div>

        {filteredTopics.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-400 space-y-2">
            <RefreshCw className="w-6 h-6 text-zinc-300 mx-auto" />
            <p>No topics matching current revision category.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {filteredTopics.map(node => {
              const rev = revisions[node.id];
              const p = progress[node.id];
              const count = rev?.revisionCount || 0;

              return (
                <div
                  key={node.id}
                  onClick={() => navigate('/topic/' + node.id)}
                  className="px-5 py-3 hover:bg-zinc-50 cursor-pointer flex items-center justify-between gap-4 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-zinc-800 truncate group-hover:text-pink-600 transition-colors">
                      {getDisplayTitle(node)}
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                      {node.path.slice(0, 3).map(pt => pt.replace(/_/g, ' ')).join(' › ')}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs font-bold text-zinc-900 block">
                        {count} rev{count !== 1 ? 's' : ''}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {rev?.lastRevisedAt ? formatDate(rev.lastRevisedAt) : 'Never'}
                      </span>
                    </div>

                    <button
                      onClick={async e => {
                        e.stopPropagation();
                        await markRevised(node.id, node.displayTitle);
                        toast.success('Revision recorded');
                      }}
                      className="p-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-600 transition-colors"
                      title="Quick log revision"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>

                    <ChevronRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-pink-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
