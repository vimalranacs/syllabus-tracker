import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudyStore } from '../store/studyStore';
import { calculateNodeStats, calculateOverallStats } from '../utils/progress';
import { ProgressBar } from '../components/ui/ProgressBar';
import { formatRelativeTime } from '../utils/dates';
import {
  ArrowRight,
  BookOpen,
  Sparkles,
  CheckCircle2,
  Clock,
  RotateCcw,
  Compass
} from 'lucide-react';

export default function Dashboard() {
  const {
    syllabusTree,
    progress,
    activity,
    revisions,
    user,
    loadSyllabus,
    syllabusLoading
  } = useStudyStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadSyllabus();
  }, [loadSyllabus]);

  const overallStats = useMemo(() => {
    return calculateOverallStats(syllabusTree, progress);
  }, [syllabusTree, progress]);

  const stageCards = useMemo(() => {
    return syllabusTree.map(stageNode => ({
      node: stageNode,
      stats: calculateNodeStats(stageNode, progress),
    }));
  }, [syllabusTree, progress]);

  // Key subjects list
  const subjectsBreakdown = useMemo(() => {
    const list: { node: typeof syllabusTree[0]; stats: ReturnType<typeof calculateNodeStats> }[] = [];
    for (const stage of syllabusTree) {
      for (const paper of stage.children) {
        for (const subject of paper.children) {
          list.push({
            node: subject,
            stats: calculateNodeStats(subject, progress),
          });
        }
      }
    }
    return list;
  }, [syllabusTree, progress]);

  // Last active or in-progress topics
  const continueStudying = useMemo(() => {
    const inProgIds = Object.keys(progress).filter(id => progress[id]?.status === 'in_progress');
    if (inProgIds.length > 0) {
      const flat = useStudyStore.getState().syllabusFlat;
      return inProgIds
        .map(id => flat.find(n => n.id === id))
        .filter((n): n is NonNullable<typeof n> => Boolean(n))
        .slice(0, 3);
    }
    return [];
  }, [progress]);

  if (syllabusLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-zinc-400">Loading syllabus database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* Top Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
            Study Dashboard
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            UPPSC Review Officer / Assistant Review Officer Preparation
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400 self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Online Progress Sync</span>
        </div>
      </div>

      {/* Hero Progress Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/80 shadow-xs relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-pink-600 bg-pink-50 px-2.5 py-1 rounded-full border border-pink-100">
              Overall Completion
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl sm:text-6xl font-extrabold text-zinc-900 tracking-tight">
                {overallStats.percentage}
              </span>
              <span className="text-2xl font-semibold text-zinc-400">%</span>
            </div>
            <p className="text-xs text-zinc-500">
              {overallStats.completed} completed of {overallStats.active} active topics ({overallStats.outOfSyllabus} excluded)
            </p>
          </div>

          {/* Quick Metrics Columns */}
          <div className="grid grid-cols-3 gap-3 sm:gap-6 bg-zinc-50/80 p-4 rounded-2xl border border-zinc-100 min-w-[280px]">
            <div>
              <div className="text-lg font-bold text-zinc-900">{overallStats.completed}</div>
              <div className="text-[11px] text-zinc-400 font-medium">Completed</div>
            </div>
            <div>
              <div className="text-lg font-bold text-amber-600">{overallStats.inProgress}</div>
              <div className="text-[11px] text-zinc-400 font-medium">In Progress</div>
            </div>
            <div>
              <div className="text-lg font-bold text-zinc-400">{overallStats.notStarted}</div>
              <div className="text-[11px] text-zinc-400 font-medium">Remaining</div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <ProgressBar value={overallStats.percentage} height="md" color="pink" />
        </div>
      </div>

      {/* Continue Studying Banner if items exist */}
      {continueStudying.length > 0 && (
        <div className="bg-pink-50/50 rounded-2xl p-5 border border-pink-100/80 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-pink-700 uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5" />
            <span>Continue Studying</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {continueStudying.map(item => (
              <button
                key={item.id}
                onClick={() => navigate('/topic/' + item.id)}
                className="bg-white p-3 rounded-xl border border-pink-100 hover:border-pink-300 text-left transition-all group"
              >
                <div className="text-xs font-semibold text-zinc-800 truncate group-hover:text-pink-600">
                  {item.displayTitle}
                </div>
                <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                  {item.subject.replace(/_/g, ' ')}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stage Cards (Prelims, Mains) */}
      <div>
        <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-wider mb-3">
          Examination Stages
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stageCards.map(({ node, stats }) => (
            <div
              key={node.id}
              onClick={() => navigate('/stage/' + node.id)}
              className="bg-white rounded-2xl p-5 border border-zinc-200/80 hover:border-pink-300 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 group-hover:text-pink-600 transition-colors">
                    {node.displayTitle}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {node.children.length} papers · {stats.active} topics
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-extrabold text-zinc-900">
                    {stats.percentage}%
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <ProgressBar value={stats.percentage} height="sm" />
                <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                  <span>{stats.completed} of {stats.active} done</span>
                  <span className="text-pink-500 font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    Enter Stage <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Subjects Progress list */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">
            Subject Progress
          </h2>
          <span className="text-xs text-zinc-400 font-medium">
            {subjectsBreakdown.length} Subjects
          </span>
        </div>
        <div className="divide-y divide-zinc-50">
          {subjectsBreakdown.map(({ node, stats }) => (
            <div
              key={node.id}
              onClick={() => navigate('/node/' + node.id)}
              className="px-5 py-3.5 hover:bg-zinc-50/70 transition-colors cursor-pointer flex items-center gap-4 group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-zinc-800 truncate group-hover:text-pink-600 transition-colors">
                    {node.displayTitle}
                  </span>
                  <span className="text-xs font-bold text-zinc-700 ml-2">
                    {stats.percentage}%
                  </span>
                </div>
                <ProgressBar value={stats.percentage} height="xs" />
              </div>
              <div className="text-[11px] text-zinc-400 font-medium hidden sm:block whitespace-nowrap">
                {stats.completed} / {stats.active}
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-pink-500 group-hover:translate-x-0.5 transition-all" />
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity stream */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">
            Recent Activity
          </h2>
        </div>
        {activity.length === 0 ? (
          <div className="py-10 text-center text-xs text-zinc-400">
            No study actions recorded yet. Your progress updates will show here.
          </div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {activity.slice(0, 7).map(act => (
              <div key={act.id} className="px-5 py-3 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={'w-2 h-2 rounded-full flex-shrink-0 ' + (act.type === 'completed' ? 'bg-pink-500' : act.type === 'revised' ? 'bg-blue-500' : act.type === 'excluded' ? 'bg-zinc-400' : 'bg-amber-400')} />
                  <span className="font-medium text-zinc-800 truncate">
                    {act.itemTitle}
                  </span>
                  <span className="text-zinc-400 text-[11px] capitalize">
                    · {act.type.replace('_', ' ')}
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400 whitespace-nowrap">
                  {formatRelativeTime(act.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
