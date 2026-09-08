import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Flag,
} from 'lucide-react';
import { loadMock, formatDuration } from '../mocks/registry';
import { getMockAttempt, updateMockAttemptFlags } from '../mocks/mockService';
import { useStudyStore } from '../store/studyStore';
import { formatDate } from '../utils/dates';
import { Modal } from '../components/ui/Modal';
import type { MockAttempt, QuestionFilter, FlagReason } from '../mocks/types';

const FILTERS: { id: QuestionFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'correct', label: 'Correct' },
  { id: 'incorrect', label: 'Incorrect' },
  { id: 'unanswered', label: 'Unanswered' },
  { id: 'flagged', label: 'Flagged' },
];

const FLAG_REASONS: FlagReason[] = [
  'Wrong answer in source',
  'Ambiguous question',
  'Typo',
  'Other',
];

export default function MockResultPage() {
  const { mockId, attemptId } = useParams();
  const navigate = useNavigate();
  const { user } = useStudyStore();
  const uid = user?.uid || 'student_main';

  const def = useMemo(() => (mockId ? loadMock(mockId) : null), [mockId]);
  const [attempt, setAttempt] = useState<MockAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<QuestionFilter>('all');
  const [flagTarget, setFlagTarget] = useState<string | null>(null);
  const [pendingReason, setPendingReason] = useState<FlagReason>('Wrong answer in source');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (attemptId) {
        const a = await getMockAttempt(uid, attemptId);
        if (!cancelled) {
          setAttempt(a);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, attemptId]);

  const flaggedSet = useMemo(() => new Set(attempt?.flaggedQuestionIds || []), [attempt]);

  const reviewItems = useMemo(() => {
    if (!def || !attempt) return [];
    return def.questions
      .map(q => {
        const sel = attempt.selectedAnswers[q.id];
        const verdict: 'correct' | 'wrong' | 'unanswered' = !sel
          ? 'unanswered'
          : String(sel).toLowerCase() === String(q.correctOption).toLowerCase()
            ? 'correct'
            : 'wrong';
        return { q, sel, verdict, flagged: flaggedSet.has(q.id) };
      })
      .filter(item => {
        if (filter === 'all') return true;
        if (filter === 'flagged') return item.flagged;
        return item.verdict === filter;
      });
  }, [def, attempt, filter, flaggedSet]);

  const toggleFlag = async (questionId: string, reason?: string) => {
    if (!attempt || !attemptId) return;
    const next = new Set(flaggedSet);
    const reasons = { ...(attempt.flagReasons || {}) };
    if (next.has(questionId)) {
      next.delete(questionId);
      delete reasons[questionId];
    } else {
      next.add(questionId);
      reasons[questionId] = reason || 'Other';
    }
    const flaggedQuestionIds = [...next];
    setAttempt({ ...attempt, flaggedQuestionIds, flagReasons: reasons });
    await updateMockAttemptFlags(uid, attemptId, flaggedQuestionIds, reasons);
    toast.success(next.has(questionId) ? 'Question flagged' : 'Flag removed');
  };

  if (loading) {
    return <div className="py-16 text-center text-xs text-zinc-400">Loading result…</div>;
  }

  if (!def || !attempt) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-sm text-zinc-400">Result not found.</p>
        <button
          onClick={() => navigate('/mock-history')}
          className="text-xs font-semibold text-pink-600 hover:underline"
        >
          Back to History
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <button
        onClick={() => navigate('/mock-history')}
        className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Mock History
      </button>

      {/* Summary */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-200/80 shadow-xs space-y-4">
        <div>
          <div className="text-[11px] font-bold text-pink-600 uppercase tracking-wider">
            {def.category} · {formatDate(attempt.timestamp)}
          </div>
          <h1 className="text-xl font-bold text-zinc-900 mt-0.5">{attempt.mockTitle} — Result</h1>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-extrabold text-zinc-900 tracking-tight">
            {attempt.score}
          </span>
          <span className="text-xl font-semibold text-zinc-400">/ {attempt.totalQuestions}</span>
          <span className="ml-2 text-lg font-bold text-pink-600">{attempt.percentage}%</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
            <div className="text-base font-bold text-emerald-700">{attempt.correct}</div>
            <div className="text-[10px] text-emerald-600 font-medium">Correct</div>
          </div>
          <div className="bg-red-50/60 p-3 rounded-xl border border-red-100">
            <div className="text-base font-bold text-red-600">{attempt.incorrect}</div>
            <div className="text-[10px] text-red-500 font-medium">Incorrect</div>
          </div>
          <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
            <div className="text-base font-bold text-zinc-700">{attempt.unanswered}</div>
            <div className="text-[10px] text-zinc-500 font-medium">Unanswered</div>
          </div>
          <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-100">
            <div className="text-base font-bold text-amber-700">
              {attempt.flaggedQuestionIds.length}
            </div>
            <div className="text-[10px] text-amber-600 font-medium">Flagged</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-zinc-500">
          <span>
            Accuracy: <strong className="text-zinc-800">{attempt.accuracy}%</strong>
            <span className="text-zinc-400"> (correct ÷ attempted)</span>
          </span>
          <span>
            Time used: <strong className="text-zinc-800">{formatDuration(attempt.timeUsedSeconds)}</strong>
          </span>
          <span>
            Time left:{' '}
            <strong className="text-zinc-800">{formatDuration(attempt.timeRemainingSeconds)}</strong>
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={
              'px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ' +
              (filter === f.id
                ? 'bg-pink-500 text-white'
                : 'bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-300')
            }
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-zinc-400">
          Showing {reviewItems.length} of {def.questions.length}
        </span>
      </div>

      {/* Review list */}
      <div className="space-y-3">
        {reviewItems.length === 0 && (
          <div className="py-10 text-center text-xs text-zinc-400 bg-white rounded-2xl border border-zinc-200/80">
            Nothing in this category.
          </div>
        )}
        {reviewItems.map(({ q, sel, verdict, flagged }) => {
          const correctText = q.options.find(o => o.id === String(q.correctOption).toLowerCase())?.text;
          return (
            <div
              key={q.id}
              className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200/80 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {verdict === 'correct' && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                    </span>
                  )}
                  {verdict === 'wrong' && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                      <XCircle className="w-3.5 h-3.5" /> Wrong
                    </span>
                  )}
                  {verdict === 'unanswered' && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-zinc-500 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md">
                      <MinusCircle className="w-3.5 h-3.5" /> Unanswered
                    </span>
                  )}
                  {q.topic && (
                    <span className="text-[10px] text-zinc-400 truncate">{q.topic}</span>
                  )}
                </div>
                <button
                  onClick={() =>
                    flagged ? toggleFlag(q.id) : setFlagTarget(q.id)
                  }
                  className={
                    'flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border flex-shrink-0 ' +
                    (flagged
                      ? 'border-amber-300 bg-amber-50 text-amber-700'
                      : 'border-zinc-200 text-zinc-400 hover:text-amber-600 hover:border-amber-300')
                  }
                >
                  <Flag className="w-3 h-3" />
                  <span>{flagged ? 'Flagged' : 'Flag'}</span>
                </button>
              </div>

              <p className="text-xs sm:text-sm font-semibold text-zinc-900 leading-relaxed">
                <span className="text-zinc-400 mr-1.5">{q.id}.</span>
                {q.question}
              </p>

              <div className="space-y-1.5">
                {q.options.map((opt, oi) => {
                  const isCorrect = opt.id === String(q.correctOption).toLowerCase();
                  const isSelected = sel === opt.id;
                  return (
                    <div
                      key={opt.id}
                      className={
                        'flex items-start gap-2.5 px-3 py-2 rounded-xl border text-xs ' +
                        (isCorrect
                          ? 'border-emerald-300 bg-emerald-50/60'
                          : isSelected
                            ? 'border-red-300 bg-red-50/60'
                            : 'border-zinc-100 bg-zinc-50/50')
                      }
                    >
                      <span className="w-5 h-5 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-[10px] font-bold text-zinc-500 flex-shrink-0">
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <span className="flex-1 text-zinc-700">{opt.text}</span>
                      {isCorrect && (
                        <span className="text-[10px] font-bold text-emerald-700 flex-shrink-0">
                          ✓ Correct answer
                        </span>
                      )}
                      {isSelected && !isCorrect && (
                        <span className="text-[10px] font-bold text-red-600 flex-shrink-0">
                          ✗ Your answer
                        </span>
                      )}
                      {isSelected && isCorrect && (
                        <span className="text-[10px] font-bold text-emerald-700 flex-shrink-0">
                          ✓ Your answer
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {verdict === 'wrong' && (
                <div className="text-[11px] bg-red-50/70 border border-red-100 rounded-lg px-3 py-2 text-zinc-700">
                  Your answer:{' '}
                  <strong>
                    {q.options.find(o => o.id === sel)?.text || sel || '—'}
                  </strong>{' '}
                  · Correct answer: <strong>{correctText}</strong>
                </div>
              )}
              {verdict === 'unanswered' && (
                <div className="text-[11px] bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-2 text-zinc-600">
                  You did not attempt this. Correct answer: <strong>{correctText}</strong>
                </div>
              )}

              {q.explanation && (
                <div className="text-[11px] text-zinc-600 bg-blue-50/50 border border-blue-100 rounded-lg px-3 py-2 leading-relaxed">
                  <span className="font-bold">Explanation: </span>
                  {q.explanation}
                </div>
              )}

              {flagged && attempt.flagReasons?.[q.id] && (
                <div className="text-[10px] text-amber-700">
                  Flagged as: {attempt.flagReasons[q.id]}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Flag dialog during review */}
      <Modal isOpen={flagTarget !== null} onClose={() => setFlagTarget(null)} title="Flag question" size="sm">
        <div className="space-y-2">
          {FLAG_REASONS.map(r => (
            <label
              key={r}
              className={
                'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs cursor-pointer ' +
                (pendingReason === r
                  ? 'border-amber-400 bg-amber-50 font-medium'
                  : 'border-zinc-200 hover:bg-zinc-50')
              }
            >
              <input
                type="radio"
                name="review-flag-reason"
                checked={pendingReason === r}
                onChange={() => setPendingReason(r)}
                className="accent-amber-500"
              />
              <span>{r}</span>
            </label>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setFlagTarget(null)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (flagTarget) toggleFlag(flagTarget, pendingReason);
                setFlagTarget(null);
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-400 text-white hover:bg-amber-500"
            >
              Flag Question
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
