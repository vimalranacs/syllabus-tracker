import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { useStudyStore } from '../store/studyStore';
import { calculateNodeStats, calculateOverallStats } from '../utils/progress';
import { ProgressBar } from '../components/ui/ProgressBar';
import { formatRelativeTime, formatDate } from '../utils/dates';
import { listMockAttempts } from '../mocks/mockService';
import { formatDuration } from '../mocks/registry';
import type { ProgressEntry, ActivityEntry } from '../types';
import type { MockAttempt } from '../mocks/types';
import { Shield, Eye, AlertTriangle, ArrowRight, ClipboardList } from 'lucide-react';

const STUDENT_UID = 'student_main';

export default function AdminDashboard({ initialTab = 'overview' }: { initialTab?: 'overview' | 'mocks' }) {
  const { syllabusTree, loadSyllabus } = useStudyStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'overview' | 'mocks'>(initialTab);
  const [studentProgress, setStudentProgress] = useState<Record<string, ProgressEntry>>({});
  const [studentActivity, setStudentActivity] = useState<ActivityEntry[]>([]);
  const [mockAttempts, setMockAttempts] = useState<MockAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    loadSyllabus();
  }, [loadSyllabus]);

  useEffect(() => {
    const studentUid = STUDENT_UID;

    if (!isFirebaseConfigured) {
      try {
        const local = localStorage.getItem('ro_aro_prog_' + studentUid);
        if (local) setStudentProgress(JSON.parse(local));
        const act = localStorage.getItem('ro_aro_act_' + studentUid);
        if (act) setStudentActivity(JSON.parse(act));
      } catch {}
      listMockAttempts(studentUid).then(setMockAttempts);
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

    const unsubMocks = onSnapshot(collection(db, 'students', studentUid, 'mockAttempts'), snap => {
      const list: MockAttempt[] = [];
      snap.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          mockId: String(data.mockId || ''),
          mockTitle: String(data.mockTitle || ''),
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : String(data.timestamp || new Date().toISOString()),
          totalQuestions: Number(data.totalQuestions) || 0,
          score: Number(data.score) || 0,
          correct: Number(data.correct) || 0,
          incorrect: Number(data.incorrect) || 0,
          unanswered: Number(data.unanswered) || 0,
          percentage: Number(data.percentage) || 0,
          accuracy: Number(data.accuracy) || 0,
          timeUsedSeconds: Number(data.timeUsedSeconds) || 0,
          timeRemainingSeconds: Number(data.timeRemainingSeconds) || 0,
          flaggedQuestionIds: (data.flaggedQuestionIds as string[]) || [],
          flagReasons: (data.flagReasons as Record<string, string>) || {},
          selectedAnswers: (data.selectedAnswers as Record<string, string>) || {},
        });
      });
      setMockAttempts(list.sort((x, y) => +new Date(y.timestamp) - +new Date(x.timestamp)));
    }, () => {
      // Fallback: one-time fetch if live listener fails.
      getDocs(collection(db, 'students', studentUid, 'mockAttempts')).then(() => {});
      listMockAttempts(studentUid).then(setMockAttempts);
    });

    return () => {
      unsubProg();
      unsubAct();
      unsubMocks();
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

  const mockSummary = useMemo(() => {
    if (mockAttempts.length === 0) return null;
    const best = Math.max(...mockAttempts.map(a => a.percentage));
    const avg = mockAttempts.reduce((s, a) => s + a.percentage, 0) / mockAttempts.length;
    const totalFlagged = mockAttempts.reduce((s, a) => s + a.flaggedQuestionIds.length, 0);
    return { count: mockAttempts.length, best, avg: Math.round(avg * 100) / 100, totalFlagged };
  }, [mockAttempts]);

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

        {/* Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100/80 rounded-2xl pt-1 mt-3">
          <button
            onClick={() => setActiveTab('overview')}
            className={'flex-1 py-2 rounded-xl text-xs font-semibold transition-all ' + (activeTab === 'overview' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-800')}
          >
            Student Progress
          </button>
          <button
            onClick={() => setActiveTab('mocks')}
            className={'flex-1 py-2 rounded-xl text-xs font-semibold transition-all ' + (activeTab === 'mocks' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-800')}
          >
            Mock Performance ({mockAttempts.length})
          </button>
        </div>
      </div>

      {activeTab === 'mocks' ? (
        <div className="space-y-4">
          {mockSummary && (
            <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-zinc-50 p-3 rounded-xl">
                <div className="text-base font-bold text-zinc-900">{mockSummary.count}</div>
                <div className="text-[10px] text-zinc-400 font-medium">Attempts</div>
              </div>
              <div className="bg-emerald-50/50 p-3 rounded-xl">
                <div className="text-base font-bold text-emerald-700">{mockSummary.best}%</div>
                <div className="text-[10px] text-emerald-600 font-medium">Best Score</div>
              </div>
              <div className="bg-zinc-50 p-3 rounded-xl">
                <div className="text-base font-bold text-zinc-700">{mockSummary.avg}%</div>
                <div className="text-[10px] text-zinc-400 font-medium">Average</div>
              </div>
              <div className="bg-amber-50/50 p-3 rounded-xl">
                <div className="text-base font-bold text-amber-700">{mockSummary.totalFlagged}</div>
                <div className="text-[10px] text-amber-600 font-medium">Flagged Qs</div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-pink-500" />
              <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">
                Mock Attempts
              </h2>
            </div>
            {loading ? (
              <div className="py-10 text-center text-xs text-zinc-400">Loading attempts…</div>
            ) : mockAttempts.length === 0 ? (
              <div className="py-10 text-center text-xs text-zinc-400">
                No mock attempts recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-zinc-50">
                {mockAttempts.map(a => (
                  <button
                    key={a.id}
                    onClick={() => navigate(`/mocks/${a.mockId}/result/${a.id}`)}
                    className="w-full px-5 py-3.5 hover:bg-zinc-50 transition-colors flex items-center gap-4 text-left group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-zinc-800 truncate group-hover:text-pink-600">
                        {a.mockTitle}
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        {a.score}/{a.totalQuestions} · {formatDate(a.timestamp)} ·{' '}
                        {formatDuration(a.timeUsedSeconds)} used · {a.flaggedQuestionIds.length} flagged
                      </div>
                    </div>
                    <span className="text-base font-extrabold text-zinc-900">{a.percentage}%</span>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-pink-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
