import type { DaySession, WorkoutDay, WorkoutTemplate } from '../lib/types'
import { uid } from '../lib/types'

function ex(
  name: string,
  sets: number,
  reps: string,
  notes?: string,
): DaySession['exercises'][number] {
  return { id: uid(), name, sets, reps, notes }
}

function session(
  name: string,
  exercises: DaySession['exercises'],
  sourceTemplateId?: string | null,
): DaySession {
  return {
    id: uid(),
    name,
    sourceTemplateId: sourceTemplateId ?? null,
    exercises,
  }
}

/** Built-in library templates (stable ids for seeding). */
export const SEED_WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'tpl-push',
    name: 'אימון דחיפה',
    updatedAt: '2026-01-01T00:00:00.000Z',
    exercises: [
      { id: 'tpl-push-1', name: 'Incline Bench Press', sets: 4, reps: '6–8' },
      { id: 'tpl-push-2', name: 'Dips', sets: 3, reps: '8–12' },
      { id: 'tpl-push-3', name: 'Overhead Press', sets: 3, reps: '8–10' },
      { id: 'tpl-push-4', name: 'Lateral Raises', sets: 3, reps: '12–15' },
      { id: 'tpl-push-5', name: 'Triceps', sets: 3, reps: '10–12' },
    ],
  },
  {
    id: 'tpl-pull',
    name: 'אימון משיכה',
    updatedAt: '2026-01-01T00:00:00.000Z',
    exercises: [
      { id: 'tpl-pull-1', name: 'Weighted Pull-ups', sets: 4, reps: '4–7' },
      { id: 'tpl-pull-2', name: 'Rows', sets: 4, reps: '8–10' },
      { id: 'tpl-pull-3', name: 'Biceps Curls', sets: 3, reps: '10–12' },
      { id: 'tpl-pull-4', name: 'Face Pulls', sets: 3, reps: '12–15' },
    ],
  },
  {
    id: 'tpl-swim',
    name: 'אימון שחייה / אירובי',
    updatedAt: '2026-01-01T00:00:00.000Z',
    exercises: [
      {
        id: 'tpl-swim-1',
        name: 'שחייה חופשית',
        sets: 1,
        reps: '20–30 דק׳',
        notes: 'קצב נוח / אירובי',
      },
      {
        id: 'tpl-swim-2',
        name: 'אינטרוולים',
        sets: 6,
        reps: '50–100מ׳',
        notes: 'מנוחה 30–45 שנ׳',
      },
      {
        id: 'tpl-swim-3',
        name: 'קיק / טכניקה',
        sets: 4,
        reps: '25–50מ׳',
      },
    ],
  },
]

export function createSeedTemplates(): WorkoutTemplate[] {
  return structuredClone(SEED_WORKOUT_TEMPLATES)
}

/** Add any missing built-in templates without overwriting user edits/deletes once seeded. */
export function ensureSeedTemplates(
  existing: WorkoutTemplate[],
  alreadySeeded: boolean,
): { templates: WorkoutTemplate[]; seeded: boolean } {
  if (alreadySeeded) {
    return { templates: existing, seeded: true }
  }
  const byId = new Map(existing.map((t) => [t.id, t]))
  for (const seed of SEED_WORKOUT_TEMPLATES) {
    if (!byId.has(seed.id)) {
      byId.set(seed.id, structuredClone(seed))
    }
  }
  const seeds = SEED_WORKOUT_TEMPLATES.map((s) => byId.get(s.id)!).filter(Boolean)
  const custom = existing.filter(
    (t) => !SEED_WORKOUT_TEMPLATES.some((s) => s.id === t.id),
  )
  return { templates: [...seeds, ...custom], seeded: true }
}

export const DEFAULT_WORKOUT_DAYS: WorkoutDay[] = [
  {
    id: 'day-1',
    dayNumber: 1,
    title: 'יום 1',
    focus: 'דחיפה',
    sessions: [
      session('אימון דחיפה', [
        ex('Incline Bench Press', 4, '6–8'),
        ex('Dips', 3, '8–12'),
        ex('Overhead Press', 3, '8–10'),
        ex('Lateral Raises', 3, '12–15'),
        ex('Triceps', 3, '10–12'),
      ], 'tpl-push'),
    ],
    exercises: [],
  },
  {
    id: 'day-2',
    dayNumber: 2,
    title: 'יום 2',
    focus: 'משיכה',
    sessions: [
      session('אימון משיכה', [
        ex('Weighted Pull-ups', 4, '4–7'),
        ex('Rows', 4, '8–10'),
        ex('Biceps Curls', 3, '10–12'),
        ex('Face Pulls', 3, '12–15'),
      ], 'tpl-pull'),
    ],
    exercises: [],
  },
  {
    id: 'day-3',
    dayNumber: 3,
    title: 'יום 3',
    focus: 'דחיפה + אירובי',
    sessions: [
      session('אימון דחיפה', [
        ex('Incline Bench Press', 4, '6–8'),
        ex('Dips', 3, '8–12'),
        ex('Overhead Press', 3, '8–10'),
        ex('Lateral Raises', 3, '12–15'),
        ex('Triceps', 3, '10–12'),
      ], 'tpl-push'),
      session('אימון שחייה / אירובי', [
        ex('שחייה חופשית', 1, '20–30 דק׳', 'קצב נוח / אירובי'),
        ex('אינטרוולים', 6, '50–100מ׳', 'מנוחה 30–45 שנ׳'),
        ex('קיק / טכניקה', 4, '25–50מ׳'),
      ], 'tpl-swim'),
    ],
    exercises: [],
  },
  {
    id: 'day-4',
    dayNumber: 4,
    title: 'יום 4',
    focus: 'משיכה',
    sessions: [
      session('אימון משיכה', [
        ex('Weighted Pull-ups', 4, '4–7'),
        ex('Rows', 4, '8–10'),
        ex('Biceps Curls', 3, '10–12'),
        ex('Face Pulls', 3, '12–15'),
      ], 'tpl-pull'),
    ],
    exercises: [],
  },
  {
    id: 'day-5',
    dayNumber: 5,
    title: 'יום 5',
    focus: 'דחיפה + משיכה',
    sessions: [
      session('אימון דחיפה', [
        ex('Incline Bench Press', 3, '6–8'),
        ex('Dips', 3, '8–12'),
        ex('Overhead Press', 3, '8–10'),
      ], 'tpl-push'),
      session('אימון משיכה', [
        ex('Weighted Pull-ups', 3, '4–7'),
        ex('Rows', 3, '8–10'),
        ex('Face Pulls', 3, '12–15'),
      ], 'tpl-pull'),
    ],
    exercises: [],
  },
]
