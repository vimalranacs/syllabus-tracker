/**
 * Generic mock-test schema.
 *
 * To add a future mock:
 *  1. Drop the JSON file into `src/data/mocks/<mock-id>.json`
 *     conforming to `MockDefinition` below.
 *  2. Register it in `src/mocks/registry.ts` (import + one entry).
 *
 * The engine, timer, results, review, history and flagging systems
 * remain unchanged.
 */

export interface MockOption {
  id: string; // e.g. "a" | "b" | "c" | "d"
  text: string;
}

export interface MockQuestion {
  id: string; // e.g. "Q1"
  question: string;
  options: MockOption[];
  /** option id of the correct answer, e.g. "b" */
  correctOption: string;
  // Optional future fields — never required:
  explanation?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | string;
  topic?: string;
  subtopic?: string;
  tags?: string[];
  source?: string;
  year?: number | string;
  section?: string;
}

export interface MockDefinition {
  mockId: string;
  title: string;
  category: string;
  description?: string;
  /** seconds allowed per question; total duration = questions.length * secondsPerQuestion */
  secondsPerQuestion: number;
  tags?: string[];
  questions: MockQuestion[];
}

export interface MockMeta {
  mockId: string;
  title: string;
  category: string;
  description?: string;
  secondsPerQuestion: number;
  questionCount: number;
  /** derived: questionCount * secondsPerQuestion */
  totalSeconds: number;
  tags?: string[];
}

export type FlagReason =
  | 'Wrong answer in source'
  | 'Ambiguous question'
  | 'Typo'
  | 'Other';

export interface MockAttempt {
  id: string;
  mockId: string;
  mockTitle: string;
  timestamp: string;
  totalQuestions: number;
  score: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  /** score / totalQuestions * 100 */
  percentage: number;
  /** correct / attempted * 100 (0 when nothing attempted) */
  accuracy: number;
  timeUsedSeconds: number;
  timeRemainingSeconds: number;
  flaggedQuestionIds: string[];
  flagReasons?: Record<string, FlagReason | string>;
  /** questionId -> selected optionId */
  selectedAnswers: Record<string, string>;
}

export type QuestionFilter = 'all' | 'correct' | 'incorrect' | 'unanswered' | 'flagged';

export type PaletteStatus = 'unvisited' | 'answered' | 'not_answered';
