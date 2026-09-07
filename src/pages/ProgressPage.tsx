import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudyStore } from '../store/studyStore';
import { calculateNodeStats, calculateOverallStats } from '../utils/progress';
import { ProgressBar } from '../components/ui/ProgressBar';
import { ChevronRight, ArrowRight } from 'lucide-react';

export default function ProgressPage() {
  const { syllabusTree, progress } = useStudyStore();
  const navigate = useNavigate();

  const overall = useMemo(() => {
    return calculateOverallStats(syllabusTree, progress);
  }, [syllabusTree, progress]);

  const treeHierarchyStats = useMemo(() => {
    return syllabusTree.map(stage => {
      const stageStats = calculateNodeStats(stage, progress);
      const papers = stage.children.map(paper => {
        const paperStats = calculateNodeStats(paper, progress);
        const subjects = paper.children.map(subj => ({
          node: subj,
          stats: calculateNodeStats(subj, progress),
        }));
        return { node: paper, stats: paperStats, subjects };
      });
      return { node: stage, stats: stageStats, papers };
    });
  }, [syllabusTree, progress]);

  return (
    <div className="space-y-7 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
          Comprehensive Progress Analytics
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Detailed breakdown by Stage, Paper, and Subject
        </p>
      </div>

      {/* Global Summary */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/80 shadow-xs space-y-5">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
            Total Syllabus Coverage
          </span>
          <span className="text-3xl font-extrabold text-zinc-900">
            {overall.percentage}%
          </span>
        </div>
        <ProgressBar value={overall.percentage} height="md" color="pink" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
            <div className="text-base font-bold text-emerald-700">{overall.completed}</div>
            <div className="text-[10px] text-emerald-600 font-medium">Completed</div>
          </div>
          <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-100">
            <div className="text-base font-bold text-amber-700">{overall.inProgress}</div>
            <div className="text-[10px] text-amber-600 font-medium">In Progress</div>
          </div>
          <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
            <div className="text-base font-bold text-zinc-700">{overall.notStarted}</div>
            <div className="text-[10px] text-zinc-500 font-medium">Not Started</div>
          </div>
          <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
            <div className="text-base font-bold text-zinc-400">{overall.outOfSyllabus}</div>
            <div className="text-[10px] text-zinc-400 font-medium">Excluded</div>
          </div>
        </div>
      </div>

      {/* Stages and Papers breakdown */}
      {treeHierarchyStats.map(({ node: stageNode, stats: stageStats, papers }) => (
        <div key={stageNode.id} className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-zinc-900">
                {stageNode.displayTitle}
              </h2>
              <span className="text-lg font-extrabold text-pink-600">
                {stageStats.percentage}%
              </span>
            </div>
            <ProgressBar value={stageStats.percentage} height="sm" />
            <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-2">
              <span>{stageStats.completed} of {stageStats.active} topics completed</span>
              <button
                onClick={() => navigate('/stage/' + stageNode.id)}
                className="text-pink-600 font-medium hover:underline flex items-center gap-1"
              >
                Explore Stage <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Papers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-0 sm:pl-4">
            {papers.map(({ node: paperNode, stats: paperStats }) => (
              <div
                key={paperNode.id}
                onClick={() => navigate('/node/' + paperNode.id)}
                className="bg-white rounded-2xl p-4 border border-zinc-200/80 hover:border-pink-300 hover:shadow-xs cursor-pointer transition-all space-y-2 group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-800 group-hover:text-pink-600 transition-colors">
                      {paperNode.displayTitle}
                    </h3>
                    <span className="text-[10px] text-zinc-400">
                      {paperStats.completed} / {paperStats.active} topics
                    </span>
                  </div>
                  <span className="text-sm font-bold text-zinc-900">
                    {paperStats.percentage}%
                  </span>
                </div>
                <ProgressBar value={paperStats.percentage} height="xs" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
