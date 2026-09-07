import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { useStudyStore } from '../store/studyStore';
import { calculateNodeStats, calculateOverallStats } from '../utils/progress';
import { ProgressBar } from '../components/ui/ProgressBar';
import { formatRelativeTime } from '../utils/dates';
import type { ProgressEntry, ActivityEntry } from '../types';
import { Shield, Eye, Clock, AlertTriangle, ArrowRight } from 'lucide-react';

export default function AdminDashboard() {
  const { syllabusTree, loadSyllabus } = useStudyStore();
  const navigate = useNavigate();

  const [studentProgress, setStudentProgress] = useState<Record<string, ProgressEntry>>({});
  const [studentActivity, setStudentActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSyllabus();
  }, [loadSyllabus]);

  useEffect(() => {
    // Default student document ID
    const studentUid = 'student_main';

    if (!isFirebaseConfigured) {
      try {
        const local = localStorage.getItem('ro_aro_prog_' + studentUid);
        if (local) setStudentProgress(JSON.parse(local));
        const act = localStorage.getItem('ro_aro_act_' + studentUid);
        if (act) setStudentActivity(JSON.parse(act));
      } catch {}
      setLoading(false);
      return;
    }

    const unsubProg = onSnapshot(collection(db, 'students', studentUid, 'progress'), snap => {
      const p: Record<string, ProgressEntry> = {};
      snap.forEach(d => {
        const data = d.data();
        p[d.id] = {
          itemId: d.id,
          status: data.status,
          priority: data.priority || 'medium',
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt || null,
        };
      });
      setStudentProgress(p);
      setLoading(false);
    });

    const unsubAct = onSnapshot(collection(db, 'students', studentUid, 'activity'), snap => {
      const a: ActivityEntry[] = [];
      snap.forEach(d => {
        const data = d.data();
        a.push({
          id: d.id,
          type: data.type,
          itemId: data.itemId,
          itemTitle: data.itemTitle,
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : data.timestamp || new Date().toISOString(),
        });
      });
      setStudentActivity(a.sort((x, y) => new Date(y.timestamp).getTime() - new Date(x.timestamp).getTime()).slice(0, 10));
    });

    return () => {
      unsubProg();
      unsubAct();
    };
  }, []);

  const overall = useMemo(() => {
    return calculateOverallStats(syllabusTree, studentProgress);
  }, [syllabusTree, studentProgress]);

  const subjectStats = useMemo(() => {
    const list: { stage: string; subjects: { node: typeof syllabusTree[0]; stats: ReturnType<typeof calculateNodeStats> }[] }[] = [];
    for (const stage of syllabusTree) {
      const subs: { node: typeof syllabusTree[0]; stats: ReturnType<typeof calculateNodeStats> }[] = [];
      for (const paper of stage.children) {
        for (const subject of paper.children) {
          subs.push({
            node: subject,
            stats: calculateNodeStats(subject, studentProgress),
          });
        }
      }
      list.push({ stage: stage.displayTitle, subjects: subs });
    }
    return list;
  }, [syllabusTree, studentProgress]);

  // Low progress subjects
  const attentionSubjects = useMemo(() => {
    return subjectStats
      .flatMap(s => s.subjects)
      .filter(s => s.stats.percentage < 40 && s.stats.active > 0)
      .slice(0, 4);
  }, [subjectStats]);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Read Only Admin Header */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-pink-500" />
            <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
              Admin Progress Monitor
            </h1>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-pink-600 bg-pink-50 border border-pink-100 px-3 py-1 rounded-full">
            <Eye className="w-3.5 h-3.5" /> Read-Only Remote Observation
          </span>
        </div>
        <p className="text-xs text-zinc-400">
          Live stream of student candidate preparation metrics and syllabus completion.
        </p>
      </div>

      {/* Global Progress Metrics */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Student Overall Coverage
            </div>
            <div className="text-4xl sm:text-5xl font-extrabold text-zinc-900 mt-1">
              {overall.percentage}%
            </div>
          </div>
          <div className="text-right text-xs text-zinc-400">
            <span className="font-bold text-zinc-800 text-sm">{overall.completed}</span> / {overall.active} topics
          </div>
        </div>

        <ProgressBar value={overall.percentage} height="md" color="pink" />

        <div className="grid grid-cols-4 gap-3 pt-2 text-center">
          <div className="bg-emerald-50/50 p-3 rounded-xl">
            <div className="text-base font-bold text-emerald-700">{overall.completed}</div>
            <div className="text-[10px] text-emerald-600 font-medium">Completed</div>
          </div>
          <div className="bg-amber-50/50 p-3 rounded-xl">
            <div className="text-base font-bold text-amber-700">{overall.inProgress}</div>
            <div className="text-[10px] text-amber-600 font-medium">In Progress</div>
          </div>
          <div className="bg-zinc-50 p-3 rounded-xl">
            <div className="text-base font-bold text-zinc-700">{overall.notStarted}</div>
            <div className="text-[10px] text-zinc-400 font-medium">Remaining</div>
          </div>
          <div className="bg-zinc-50 p-3 rounded-xl">
            <div className="text-base font-bold text-zinc-400">{overall.outOfSyllabus}</div>
            <div className="text-[10px] text-zinc-400 font-medium">Excluded</div>
          </div>
        </div>
      </div>

      {/* Needs Attention warning if any */}
      {attentionSubjects.length > 0 && (
        <div className="bg-amber-50/70 rounded-2xl p-5 border border-amber-200/80 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            <span>Low Progress Subject Areas (Under 40%)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {attentionSubjects.map(s => (
              <div key={s.node.id} className="bg-white p-3 rounded-xl border border-amber-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-800 truncate">{s.node.displayTitle}</span>
                <span className="text-xs font-bold text-red-500">{s.stats.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subjects list */}
      {subjectStats.map(({ stage, subjects }) => (
        <div key={stage} className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">
              {stage} — Subject Overview
            </h2>
          </div>
          <div className="divide-y divide-zinc-50">
            {subjects.map(({ node, stats }) => (
              <div
                key={node.id}
                onClick={() => navigate('/node/' + node.id)}
                className="px-5 py-3 hover:bg-zinc-50 cursor-pointer flex items-center gap-4 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-zinc-800 group-hover:text-pink-600 transition-colors truncate">
                      {node.displayTitle}
                    </span>
                    <span className="text-xs font-bold text-zinc-700 ml-2">{stats.percentage}%</span>
                  </div>
                  <ProgressBar value={stats.percentage} height="xs" />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-pink-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Student Activity Stream */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">
            Live Activity Feed
          </h2>
        </div>
        {studentActivity.length === 0 ? (
          <div className="py-10 text-center text-xs text-zinc-400">
            No live study events detected.
          </div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {studentActivity.map(act => (
              <div key={act.id} className="px-5 py-3 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                  <span className="font-semibold text-zinc-800 truncate">{act.itemTitle}</span>
                  <span className="text-[11px] text-zinc-400 capitalize">· {act.type.replace('_', ' ')}</span>
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
