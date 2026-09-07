import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStudyStore } from '../store/studyStore';
import { findNodeById } from '../data/syllabusNormalizer';
import { calculateNodeStats } from '../utils/progress';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Breadcrumbs } from '../components/navigation/Breadcrumbs';
import { ChevronRight, ArrowRight } from 'lucide-react';

export default function StagePage() {
  const { stageId } = useParams();
  const navigate = useNavigate();
  const { syllabusTree, progress, getDisplayTitle } = useStudyStore();

  const stageNode = useMemo(() => {
    if (!stageId) return null;
    return findNodeById(syllabusTree, stageId);
  }, [syllabusTree, stageId]);

  const stageStats = useMemo(() => {
    return stageNode ? calculateNodeStats(stageNode, progress) : null;
  }, [stageNode, progress]);

  if (!stageNode) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-sm text-zinc-400">Exam stage not found.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-xs font-semibold text-pink-600 hover:underline"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Breadcrumbs items={[{ label: stageNode.displayTitle }]} />

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
              {getDisplayTitle(stageNode)} Stage
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Official Papers & Syllabus Categories
            </p>
          </div>
          {stageStats && (
            <div className="text-right">
              <span className="text-3xl font-extrabold text-zinc-900">
                {stageStats.percentage}%
              </span>
              <span className="text-xs text-zinc-400 block">completed</span>
            </div>
          )}
        </div>

        {stageStats && (
          <div className="space-y-2 pt-2 border-t border-zinc-100">
            <ProgressBar value={stageStats.percentage} height="sm" color="pink" />
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>{stageStats.completed} completed of {stageStats.active} topics</span>
              {stageStats.outOfSyllabus > 0 && <span>{stageStats.outOfSyllabus} excluded</span>}
            </div>
          </div>
        )}
      </div>

      {/* Papers Grid / List */}
      <div className="space-y-4">
        {stageNode.children.map(paper => {
          const pStats = calculateNodeStats(paper, progress);

          return (
            <div
              key={paper.id}
              className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-xs"
            >
              <div
                onClick={() => navigate('/node/' + paper.id)}
                className="px-5 py-4 bg-zinc-50/50 hover:bg-zinc-50 border-b border-zinc-100 flex items-center justify-between cursor-pointer transition-colors group"
              >
                <div>
                  <h2 className="text-sm font-bold text-zinc-900 group-hover:text-pink-600 transition-colors">
                    {paper.displayTitle}
                  </h2>
                  <span className="text-[11px] text-zinc-400">
                    {paper.children.length} subjects · {pStats.completed} of {pStats.active} completed
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-extrabold text-zinc-800">
                    {pStats.percentage}%
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-pink-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>

              {/* Subjects inside paper */}
              <div className="divide-y divide-zinc-50">
                {paper.children.map(subj => {
                  const sStats = calculateNodeStats(subj, progress);

                  return (
                    <div
                      key={subj.id}
                      onClick={() => navigate('/node/' + subj.id)}
                      className="px-5 py-3 hover:bg-zinc-50/60 cursor-pointer flex items-center gap-4 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-zinc-800 truncate group-hover:text-pink-600 transition-colors">
                            {subj.displayTitle}
                          </span>
                          <span className="text-xs font-bold text-zinc-600 ml-2">
                            {sStats.percentage}%
                          </span>
                        </div>
                        <ProgressBar value={sStats.percentage} height="xs" />
                      </div>
                      <span className="text-[10px] text-zinc-400 font-medium hidden sm:block whitespace-nowrap">
                        {sStats.completed}/{sStats.active}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-pink-500 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
