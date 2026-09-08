import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowRight, Trash2 } from 'lucide-react';
import { listMockAttempts, deleteMockAttempt, clearMockAttempts } from '../mocks/mockService';
import { useStudyStore } from '../store/studyStore';
import { formatDate } from '../utils/dates';
import { formatDuration } from '../mocks/registry';
import { Modal } from '../components/ui/Modal';
import type { MockAttempt } from '../mocks/types';

export default function MockHistoryPage() {
  const navigate = useNavigate();
  const { user } = useStudyStore();
  const uid = user?.uid || 'student_main';
  const [attempts, setAttempts] = useState<MockAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    setAttempts(await listMockAttempts(uid));
  };

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

  const handleDeleteOne = async (attemptId: string) => {
    if (!window.confirm('Delete this attempt? This cannot be undone.')) return;
    setBusy(true);
    try {
      await deleteMockAttempt(uid, attemptId);
      await reload();
      toast.success('Attempt deleted');
    } catch {
      toast.error('Failed to delete attempt');
    } finally {
      setBusy(false);
    }
  };

  const handleClearAll = async () => {
    setBusy(true);
    try {
      await clearMockAttempts(uid);
      await reload();
      setConfirmClear(false);
      toast.success('Mock history cleared — you can start fresh');
    } catch {
      toast.error('Failed to clear history');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Mock History</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Previous attempts sync across devices · click an attempt to review
          </p>
        </div>
        {attempts.length > 0 && (
          <button
            onClick={() => setConfirmClear(true)}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-zinc-200 bg-white text-zinc-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset All Mocks</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-zinc-400">Loading history…</div>
      ) : attempts.length === 0 ? (
        <div className="py-16 text-center text-xs text-zinc-400 bg-white rounded-2xl border border-zinc-200/80">
          No mock attempts yet.
          <div>
            <button
              onClick={() => navigate('/mocks')}
              className="text-pink-600 font-medium hover:underline mt-1"
            >
              Browse mocks
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-xs">
          <div className="divide-y divide-zinc-50">
            {attempts.map((a, idx) => (
              <div
                key={a.id}
                className="w-full px-5 py-3.5 hover:bg-zinc-50 transition-colors flex items-center gap-3 text-left group"
              >
                <button
                  onClick={() => navigate(`/mocks/${a.mockId}/result/${a.id}`)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="text-xs font-semibold text-zinc-800 truncate group-hover:text-pink-600">
                    {a.mockTitle}
                    <span className="ml-2 font-normal text-zinc-400">
                      Attempt {attempts.length - idx}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    {formatDate(a.timestamp)} · {a.score}/{a.totalQuestions} ·{' '}
                    {formatDuration(a.timeUsedSeconds)} used
                    {a.flaggedQuestionIds.length > 0 &&
                      ` · ${a.flaggedQuestionIds.length} flagged`}
                  </div>
                </button>
                <button
                  onClick={() => navigate(`/mocks/${a.mockId}/result/${a.id}`)}
                  className="text-base font-extrabold text-zinc-900 flex-shrink-0"
                >
                  {a.percentage}%
                </button>
                <button
                  onClick={() => handleDeleteOne(a.id)}
                  disabled={busy}
                  title="Delete this attempt"
                  aria-label="Delete this attempt"
                  className="p-1.5 rounded-lg text-zinc-300 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0 disabled:opacity-40"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-pink-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal isOpen={confirmClear} onClose={() => setConfirmClear(false)} title="Reset all mocks?" size="sm">
        <div className="space-y-3">
          <p className="text-xs text-zinc-600 leading-relaxed">
            This permanently deletes all {attempts.length} mock attempt
            {attempts.length !== 1 ? 's' : ''} from history. Your syllabus progress, notes and
            revisions are not affected.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmClear(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              onClick={handleClearAll}
              disabled={busy}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
            >
              {busy ? 'Resetting…' : 'Delete All Attempts'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
