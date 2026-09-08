import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  ArrowRight,
  Flag,
  Grid3X3,
  Play,
  Timer,
} from 'lucide-react';
import { loadMock, formatDuration } from '../mocks/registry';
import { gradeAttempt } from '../mocks/mockUtils';
import { saveMockAttempt } from '../mocks/mockService';
import { useStudyStore } from '../store/studyStore';
import { Modal } from '../components/ui/Modal';
import type { FlagReason } from '../mocks/types';

const FLAG_REASONS: FlagReason[] = [
  'Wrong answer in source',
  'Ambiguous question',
  'Typo',
  'Other',
];

export default function MockRunnerPage() {
  const { mockId } = useParams();
  const navigate = useNavigate();
  const { user } = useStudyStore();
  const uid = user?.uid || 'student_main';

  const def = useMemo(() => (mockId ? loadMock(mockId) : null), [mockId]);
  const totalSeconds = def ? def.questions.length * def.secondsPerQuestion : 0;

  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [visited, setVisited] = useState<Set<string>>(() => new Set());
  const [flagged, setFlagged] = useState<Set<string>>(() => new Set());
  const [flagReasons, setFlagReasons] = useState<Record<string, string>>({});
  const [remaining, setRemaining] = useState(totalSeconds);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showFlagDialog, setShowFlagDialog] = useState(false);
  const [pendingReason, setPendingReason] = useState<FlagReason>('Wrong answer in source');
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    setRemaining(totalSeconds);
  }, [totalSeconds]);

  // Mark first question visited on start.
  useEffect(() => {
    if (started && def && def.questions.length > 0) {
      startTimeRef.current = Date.now();
      setVisited(new Set([def.questions[0].id]));
    }
  }, [started, def]);

  const doSubmit = async () => {
    if (!def || submittedRef.current || submitting) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const summary = gradeAttempt(def, answers);
      const elapsed = Math.min(
        totalSeconds,
        Math.max(0, Math.round((Date.now() - (startTimeRef.current || Date.now())) / 1000))
      );
      const attemptId = await saveMockAttempt(uid, {
        mockId: def.mockId,
        mockTitle: def.title,
        totalQuestions: summary.total,
        score: summary.score,
        correct: summary.correct,
        incorrect: summary.incorrect,
        unanswered: summary.unanswered,
        percentage: summary.percentage,
        accuracy: summary.accuracy,
        timeUsedSeconds: started ? elapsed : 0,
        timeRemainingSeconds: Math.max(0, remaining),
        flaggedQuestionIds: [...flagged],
        flagReasons,
        selectedAnswers: answers,
      });
      navigate(`/mocks/${def.mockId}/result/${attemptId}`);
    } catch {
      submittedRef.current = false;
      setSubmitting(false);
      toast.error('Failed to submit. Please try again.');
    }
  };

  const submitRef = useRef(doSubmit);
  submitRef.current = doSubmit;

  // Countdown + auto-submit at zero.
  useEffect(() => {
    if (!started || submittedRef.current) return;
    if (remaining <= 0) {
      toast('Time over — submitting automatically');
      submitRef.current();
      return;
    }
    const t = setTimeout(() => setRemaining(r => Math.max(0, r - 1)), 1000);
    return () => clearTimeout(t);
  }, [started, remaining]);

  // Warn on accidental tab close mid-attempt.
  useEffect(() => {
    if (!started) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (!submittedRef.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [started]);

  const counts = useMemo(() => {
    if (!def) return { answered: 0, unanswered: 0, flagged: flagged.size };
    const answered = def.questions.filter(q => answers[q.id]).length;
    return { answered, unanswered: def.questions.length - answered, flagged: flagged.size };
  }, [def, answers, flagged]);

  if (!def) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-sm text-zinc-400">Mock test not found.</p>
        <button
          onClick={() => navigate('/mocks')}
          className="text-xs font-semibold text-pink-600 hover:underline"
        >
          Back to Mocks
        </button>
      </div>
    );
  }

  // Pre-start screen (timer begins only after explicit Start).
  if (!started) {
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <button
          onClick={() => navigate('/mocks')}
          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> All mocks
        </button>
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-zinc-200/80 shadow-xs space-y-4">
          <div>
            <div className="text-[11px] font-bold text-pink-600 uppercase tracking-wider">
              {def.category}
            </div>
            <h1 className="text-xl font-bold text-zinc-900 mt-1">{def.title}</h1>
            {def.description && (
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{def.description}</p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-zinc-50 rounded-xl p-3">
              <div className="text-lg font-bold text-zinc-900">{def.questions.length}</div>
              <div className="text-[10px] text-zinc-400 font-medium">Questions</div>
            </div>
            <div className="bg-zinc-50 rounded-xl p-3">
              <div className="text-lg font-bold text-zinc-900">
                {formatDuration(totalSeconds)}
              </div>
              <div className="text-[10px] text-zinc-400 font-medium">Total time</div>
            </div>
            <div className="bg-zinc-50 rounded-xl p-3">
              <div className="text-lg font-bold text-zinc-900">{def.secondsPerQuestion}s</div>
              <div className="text-[10px] text-zinc-400 font-medium">Per question</div>
            </div>
          </div>
          <ul className="text-[11px] text-zinc-500 space-y-1 list-disc pl-4">
            <li>One question at a time. Use Previous / Next or the palette to jump.</li>
            <li>Flag any question you think may be wrong — review it after submission.</li>
            <li>The test auto-submits when the timer reaches zero.</li>
          </ul>
          <button
            onClick={() => setStarted(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            <Play className="w-4 h-4" /> Start Mock
          </button>
        </div>
      </div>
    );
  }

  const q = def.questions[currentIndex];
  const selected = answers[q.id];
  const isFlagged = flagged.has(q.id);

  const goto = (idx: number) => {
    if (idx < 0 || idx >= def.questions.length) return;
    setCurrentIndex(idx);
    setVisited(prev => new Set(prev).add(def.questions[idx].id));
  };

  const toggleFlag = () => {
    if (isFlagged) {
      setFlagged(prev => {
        const next = new Set(prev);
        next.delete(q.id);
        return next;
      });
      setFlagReasons(prev => {
        const next = { ...prev };
        delete next[q.id];
        return next;
      });
    } else {
      setShowFlagDialog(true);
    }
  };

  const confirmFlag = () => {
    setFlagged(prev => new Set(prev).add(q.id));
    setFlagReasons(prev => ({ ...prev, [q.id]: pendingReason }));
    setShowFlagDialog(false);
  };

  const lowTime = remaining <= 300;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Top bar */}
      <div className="bg-white rounded-2xl px-4 py-3 border border-zinc-200/80 shadow-xs flex items-center justify-between gap-3 sticky top-2 z-20">
        <div className="min-w-0">
          <div className="text-xs font-bold text-zinc-900 truncate">{def.title}</div>
          <div className="text-[11px] text-zinc-400">
            Question {currentIndex + 1} / {def.questions.length} · {counts.answered} answered
          </div>
        </div>
        <div
          className={
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold tabular-nums ' +
            (lowTime ? 'bg-red-50 text-red-600' : 'bg-zinc-50 text-zinc-800')
          }
          role="timer"
          aria-label="Time remaining"
        >
          <Timer className="w-4 h-4" />
          <span>{formatDuration(remaining)}</span>
        </div>
        <button
          onClick={() => setShowPalette(s => !s)}
          className="lg:hidden p-2 rounded-lg border border-zinc-200 text-zinc-600"
          aria-label="Toggle question palette"
        >
          <Grid3X3 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4 items-start">
        {/* Question card */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-zinc-200/80 shadow-xs space-y-4">
          {q.topic && (
            <span className="inline-block text-[10px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
              {q.topic}
            </span>
          )}
          <h2 className="text-sm sm:text-base font-semibold text-zinc-900 leading-relaxed">
            <span className="text-zinc-400 font-bold mr-2">Q{currentIndex + 1}.</span>
            {q.question}
          </h2>

          <div className="space-y-2">
            {q.options.map((opt, oi) => {
              const active = selected === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() =>
                    setAnswers(prev => ({ ...prev, [q.id]: opt.id }))
                  }
                  className={
                    'w-full flex items-start gap-3 px-3.5 py-2.5 rounded-xl border text-left text-xs sm:text-sm transition-colors ' +
                    (active
                      ? 'border-pink-500 bg-pink-50/60 text-zinc-900 font-medium'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50')
                  }
                  aria-pressed={active}
                >
                  <span
                    className={
                      'w-6 h-6 rounded-full border flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-px ' +
                      (active ? 'border-pink-500 bg-pink-500 text-white' : 'border-zinc-300 text-zinc-500')
                    }
                  >
                    {String.fromCharCode(65 + oi)}
                  </span>
                  <span className="flex-1">{opt.text}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100">
            <div className="flex items-center gap-2">
              <button
                onClick={() => goto(currentIndex - 1)}
                disabled={currentIndex === 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <button
                onClick={() => goto(currentIndex + 1)}
                disabled={currentIndex === def.questions.length - 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
              >
                Next <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              onClick={toggleFlag}
              className={
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ' +
                (isFlagged
                  ? 'border-amber-300 bg-amber-50 text-amber-700'
                  : 'border-zinc-200 text-zinc-500 hover:border-amber-300 hover:text-amber-600')
              }
              title="Flag: I think this question/answer may be wrong"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>{isFlagged ? 'Flagged' : 'Flag'}</span>
            </button>
          </div>

          <button
            onClick={() => setShowConfirm(true)}
            className="w-full px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white transition-colors"
          >
            Submit Test
          </button>
        </div>

        {/* Palette */}
        <div
          className={
            'bg-white rounded-2xl p-4 border border-zinc-200/80 shadow-xs space-y-3 ' +
            (showPalette ? 'block' : 'hidden lg:block')
          }
        >
          <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
            Question Palette
          </div>
          <div className="grid grid-cols-5 lg:grid-cols-4 gap-1.5">
            {def.questions.map((item, idx) => {
              const ans = answers[item.id];
              const fl = flagged.has(item.id);
              const vis = visited.has(item.id);
              const isCurrent = idx === currentIndex;
              let cls = 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200';
              let label: string = 'Unvisited';
              if (ans) {
                cls = 'bg-emerald-500 text-white';
                label = 'Answered';
              } else if (vis) {
                cls = 'bg-red-100 text-red-600 border border-red-200';
                label = 'Not answered';
              }
              return (
                <button
                  key={item.id}
                  onClick={() => goto(idx)}
                  title={`Q${idx + 1}: ${fl ? 'Flagged, ' : ''}${label}`}
                  aria-label={`Go to question ${idx + 1}, ${label}${fl ? ', flagged' : ''}`}
                  className={
                    'relative h-8 rounded-lg text-[11px] font-bold transition-colors ' +
                    cls +
                    (isCurrent ? ' ring-2 ring-pink-500 ring-offset-1' : '')
                  }
                >
                  {idx + 1}
                  {fl && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 text-white flex items-center justify-center">
                      <Flag className="w-2 h-2" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-1 text-[10px] text-zinc-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" /> Answered
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-red-100 border border-red-200 inline-block" /> Not answered
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-zinc-100 inline-block" /> Unvisited
            </span>
            <span className="flex items-center gap-1">
              <Flag className="w-2.5 h-2.5 text-amber-500" /> Flagged
            </span>
          </div>
        </div>
      </div>

      {/* Submit confirmation */}
      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Submit test?">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-emerald-50 rounded-xl p-3">
              <div className="text-lg font-bold text-emerald-700">{counts.answered}</div>
              <div className="text-[10px] text-emerald-600 font-medium">Answered</div>
            </div>
            <div className="bg-zinc-50 rounded-xl p-3">
              <div className="text-lg font-bold text-zinc-700">{counts.unanswered}</div>
              <div className="text-[10px] text-zinc-500 font-medium">Unanswered</div>
            </div>
            <div className="bg-amber-50 rounded-xl p-3">
              <div className="text-lg font-bold text-amber-700">{counts.flagged}</div>
              <div className="text-[10px] text-amber-600 font-medium">Flagged</div>
            </div>
          </div>
          <p className="text-xs text-zinc-500">
            Time remaining: {formatDuration(remaining)}. You cannot change answers after submitting.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowConfirm(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setShowConfirm(false);
                doSubmit();
              }}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-pink-500 text-white hover:bg-pink-600 disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Flag reason dialog */}
      <Modal isOpen={showFlagDialog} onClose={() => setShowFlagDialog(false)} title="Flag question" size="sm">
        <div className="space-y-2">
          <p className="text-xs text-zinc-500">
            Why are you flagging Q{currentIndex + 1}? (optional, helps review)
          </p>
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
                name="flag-reason"
                checked={pendingReason === r}
                onChange={() => setPendingReason(r)}
                className="accent-amber-500"
              />
              <span>{r}</span>
            </label>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowFlagDialog(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              onClick={confirmFlag}
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
