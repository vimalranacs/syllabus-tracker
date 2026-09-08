import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ClipboardList, Clock, History, Play } from 'lucide-react';
import { listMocks, formatMinutes } from '../mocks/registry';
import { listMockAttempts, clearMockAttempts } from '../mocks/mockService';
import { useStudyStore } from '../store/studyStore';
import type { MockAttempt } from '../mocks/types';

export default function MocksPage() {
  const navigate = useNavigate();
  const { user } = useStudyStore();
  const uid = user?.uid || 'student_main';
  const [attempts, setAttempts] = useState<MockAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  const mocks = useMemo(() => listMocks(), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await listMockAttempts(uid);
      if (!cancelled) {
        setAttempts(list);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const attemptsByMock = useMemo(() => {
    const map = new Map<string, MockAttempt[]>();
    for (const a of attempts) {
      const arr = map.get(a.mockId) || [];
      arr.push(a);
      map.set(a.mockId, arr);
    }
    return map;
  }, [attempts]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof mocks>();
    for (const m of mocks) {
      const arr = map.get(m.category) || [];
      arr.push(m);
      map.set(m.category, arr);
    }
    return [...map.entries()];
  }, [mocks]);

  const handleResetMock = async (mockId: string, title: string) => {
    if (!window.confirm(`Reset "${title}"? All its attempts will be deleted. You can then give it fresh.`)) return;
    try {
      await clearMockAttempts(uid, mockId);
      setAttempts(await listMockAttempts(uid));
      toast.success(`"${title}" reset — ready to attempt fresh`);
    } catch {
      toast.error('Failed to reset mock');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Mock Tests</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Exam-like practice with timer, palette, flagging and review
          </p>
        </div>
        <button
          onClick={() => navigate('/mock-history')}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
        >
          <History className="w-3.5 h-3.5" />
          <span>Mock History</span>
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-zinc-400">Loading available mocks…</div>
      ) : (
        grouped.map(([category, items]) => (
          <div key={category} className="space-y-3">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{category}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.map(m => {
                const mockAttempts = attemptsByMock.get(m.mockId) || [];
                const best = mockAttempts.reduce<number | null>(
                  (acc, a) => (acc === null || a.percentage > acc ? a.percentage : acc),
                  null
                );
                return (
                  <div
                    key={m.mockId}
                    className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs flex flex-col gap-3"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900">{m.title}</h3>
                      {m.description && (
                        <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                          {m.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-zinc-500">
                      <span className="flex items-center gap-1">
                        <ClipboardList className="w-3.5 h-3.5" />
                        {m.questionCount} Questions
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatMinutes(m.totalSeconds)}
                      </span>
                    </div>
                    {mockAttempts.length > 0 && (
                      <div className="text-[11px] text-zinc-500 bg-zinc-50 border border-zinc-100 rounded-lg px-2.5 py-1.5">
                        {mockAttempts.length} attempt{mockAttempts.length !== 1 ? 's' : ''}
                        {best !== null && (
                          <span className="font-semibold text-zinc-800"> · best {best}%</span>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => navigate('/mocks/' + m.mockId)}
                      className="mt-auto flex items-center justify-center gap-2 px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-xs font-semibold transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{mockAttempts.length > 0 ? 'Attempt Again' : 'Start Mock'}</span>
                    </button>
                    {mockAttempts.length > 0 && (
                      <button
                        onClick={() => handleResetMock(m.mockId, m.title)}
                        className="text-[11px] text-zinc-400 hover:text-red-600 font-medium transition-colors"
                      >
                        Reset — clear {mockAttempts.length} attempt{mockAttempts.length !== 1 ? 's' : ''} & start fresh
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
