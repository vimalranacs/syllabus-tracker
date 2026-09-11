import type { MockDefinition, MockMeta } from './types';
import preamble100 from '../data/mocks/preamble-100.json';
import unionTerritories100 from '../data/mocks/union-territories-100.json';
import citizenship100 from '../data/mocks/citizenship-100.json';
import statesUt100 from '../data/mocks/states-ut-100.json';

/**
 * Central mock registry.
 *
 * ADDING A NEW MOCK (only 2 steps):
 *  1. Add `src/data/mocks/<mock-id>.json` conforming to MockDefinition.
 *  2. Import it here and append one entry to MOCK_REGISTRY.
 *
 * No engine/timer/result/history changes are needed.
 */

interface RegistryEntry {
  meta: Omit<MockMeta, 'questionCount' | 'totalSeconds'> & { questionCount?: number };
  load: () => MockDefinition;
}

function asDefinition(raw: unknown): MockDefinition {
  const d = raw as MockDefinition;
  return {
    ...d,
    secondsPerQuestion: Number(d.secondsPerQuestion) || 51,
    questions: (d.questions || []).map(q => ({
      ...q,
      id: String(q.id),
      correctOption: String(q.correctOption).toLowerCase(),
      options: (q.options || []).map(o => ({
        id: String(o.id).toLowerCase(),
        text: o.text,
      })),
    })),
  };
}

const MOCK_REGISTRY: RegistryEntry[] = [
  {
    meta: {
      mockId: 'preamble-100',
      title: 'Preamble of India',
      category: 'Indian Polity',
      description:
        '100-question Preamble mock covering basics, Objectives Resolution, key words, landmark cases and assertion-reason practice.',
      secondsPerQuestion: 51,
      tags: ['polity', 'preamble', 'prelims'],
    },
    load: () => asDefinition(preamble100),
  },
  {
    meta: {
      mockId: 'union-territories-100',
      title: 'Union Territories',
      category: 'Indian Polity',
      description:
        '100 source-based MCQs on Union Territories: constitutional articles, Delhi NCT, J&K and Ladakh reorganisation, capitals, High Courts and assertion-reason practice.',
      secondsPerQuestion: 51,
      tags: ['polity', 'union-territories', 'prelims'],
    },
    load: () => asDefinition(unionTerritories100),
  },
  {
    meta: {
      mockId: 'citizenship-100',
      title: 'Citizenship of India',
      category: 'Indian Polity',
      description:
        '100 mixed-level MCQs (20 easy, 50 moderate, 30 hard) on Articles 5–11, the Citizenship Act 1955, and acquisition and loss of citizenship.',
      secondsPerQuestion: 51,
      tags: ['polity', 'citizenship', 'prelims'],
    },
    load: () => asDefinition(citizenship100),
  },
  {
    meta: {
      mockId: 'states-ut-100',
      title: 'States & Union Territories',
      category: 'Indian Polity',
      description:
        '100 mixed-level MCQs (20 easy, 50 moderate, 30 hard) on Articles 1–4, State reorganisation, Union Territories and constitutional provisions.',
      secondsPerQuestion: 51,
      tags: ['polity', 'states', 'union-territories', 'prelims'],
    },
    load: () => asDefinition(statesUt100),
  },
  // Future mocks: append entries here, e.g.
  // { meta: { mockId: 'future-mock-1', title: '...', category: 'History', secondsPerQuestion: 51 }, load: () => asDefinition(futureMock1) },
];

export function listMocks(): MockMeta[] {
  return MOCK_REGISTRY.map(e => {
    const def = e.load();
    const questionCount = def.questions.length;
    return {
      ...e.meta,
      title: def.title || e.meta.title,
      category: def.category || e.meta.category,
      description: def.description ?? e.meta.description,
      secondsPerQuestion: def.secondsPerQuestion,
      questionCount,
      totalSeconds: questionCount * def.secondsPerQuestion,
    };
  });
}

export function getMockMeta(mockId: string): MockMeta | null {
  return listMocks().find(m => m.mockId === mockId) || null;
}

export function loadMock(mockId: string): MockDefinition | null {
  const entry = MOCK_REGISTRY.find(e => e.meta.mockId === mockId);
  return entry ? entry.load() : null;
}

/** total duration = questionCount × secondsPerQuestion (never hardcoded) */
export function getTotalSeconds(def: MockDefinition): number {
  return def.questions.length * def.secondsPerQuestion;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function formatMinutes(totalSeconds: number): string {
  const mins = Math.round(totalSeconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}
