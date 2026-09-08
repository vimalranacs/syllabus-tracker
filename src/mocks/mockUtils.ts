import type { MockDefinition } from './types';

export interface GradeSummary {
  score: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  total: number;
  percentage: number;
  accuracy: number;
}

export function gradeAttempt(
  def: MockDefinition,
  selectedAnswers: Record<string, string>
): GradeSummary {
  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;

  for (const q of def.questions) {
    const sel = selectedAnswers[q.id];
    if (!sel) {
      unanswered++;
    } else if (String(sel).toLowerCase() === String(q.correctOption).toLowerCase()) {
      correct++;
    } else {
      incorrect++;
    }
  }

  const total = def.questions.length;
  const attempted = correct + incorrect;
  return {
    score: correct,
    correct,
    incorrect,
    unanswered,
    total,
    percentage: total > 0 ? Math.round((correct / total) * 10000) / 100 : 0,
    accuracy: attempted > 0 ? Math.round((correct / attempted) * 10000) / 100 : 0,
  };
}

export function isQuestionCorrect(
  def: MockDefinition,
  questionId: string,
  selected?: string
): boolean | null {
  const q = def.questions.find(x => x.id === questionId);
  if (!q) return null;
  if (!selected) return null;
  return String(selected).toLowerCase() === String(q.correctOption).toLowerCase();
}
