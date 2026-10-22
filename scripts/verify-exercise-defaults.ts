/**
 * Regression check for exercise-default hydration: template switches
 * (דחיפה ↔ משיכה), block switches and sync merges must keep every saved
 * weight / reps / seconds value with zero index bleeding.
 *
 *   npm run verify:defaults
 */
import assert from 'node:assert/strict'
import { SEED_WORKOUT_TEMPLATES } from '../src/data/workouts'
import {
  blockExerciseKey,
  buildSetsFromDefaults,
  canonicalExerciseKey,
  defaultsFromExercise,
} from '../src/lib/exerciseDefaults'
import {
  reconcileWorkoutExercises,
  resolveExerciseDefaults,
  type ExerciseDefaultsContext,
} from '../src/lib/exerciseDefaultsResolve'
import {
  mergeExerciseDefaults,
  type ExerciseDefaultsMap,
  type StoredExerciseDefaults,
} from '../src/lib/exerciseDefaultsStore'
import type {
  Exercise,
  ExerciseDefaultSet,
  ExerciseMetric,
  LoggedExercise,
  LoggedSet,
  WorkoutLog,
} from '../src/lib/types'

let passed = 0
function check(name: string, fn: () => void) {
  fn()
  passed++
  console.log(`  ✓ ${name}`)
}

const BLOCK_2 = 'block-2'
const BLOCK_3 = 'block-3'

function template(id: string): Exercise[] {
  const tpl = SEED_WORKOUT_TEMPLATES.find((t) => t.id === id)
  assert.ok(tpl, `missing seed template ${id}`)
  return tpl.exercises.map((ex) => ({ ...ex }))
}

function row(
  name: string,
  sets: Array<[number | null, number | null]>,
  updatedAt: string,
  opts: { blockId?: string; metric?: ExerciseMetric } = {},
): StoredExerciseDefaults {
  const defaultSets: ExerciseDefaultSet[] = sets.map(([weightKg, reps], i) => ({
    setNumber: i + 1,
    weightKg,
    reps,
  }))
  return {
    exerciseKey: opts.blockId ? blockExerciseKey(opts.blockId, name) : canonicalExerciseKey(name),
    exerciseName: name,
    metric: opts.metric ?? 'reps',
    sets: defaultSets.length,
    defaultSets,
    updatedAt,
  }
}

function mapOf(...rows: StoredExerciseDefaults[]): ExerciseDefaultsMap {
  return Object.fromEntries(rows.map((r) => [r.exerciseKey, r]))
}

/** Same pipeline the session uses: resolve → LoggedExercise. */
function hydrate(ex: Exercise, ctx: ExerciseDefaultsContext): LoggedExercise {
  const resolved = resolveExerciseDefaults(ex, ctx)
  const defaults = defaultsFromExercise(resolved.exercise)
  return {
    exerciseId: ex.id,
    name: ex.name,
    targetSets: defaults.sets,
    targetReps: resolved.exercise.reps,
    defaultSets: defaults.defaultSets,
    metric: resolved.metric,
    defaultMetric: resolved.metric,
    sets: buildSetsFromDefaults(defaults),
  }
}

const values = (sets: LoggedSet[]) => sets.map((s) => [s.weightKg, s.reps])

const pull = template('tpl-b2-pull')
const push = template('tpl-b2-push')
const pyramid = pull.find((e) => e.name.includes('פירמידה'))!
const pushNames = new Set(push.map((e) => canonicalExerciseKey(e.name)))
const pullOnly = pull.filter((e) => !pushNames.has(canonicalExerciseKey(e.name)))

console.log('exercise defaults verification')

check('seed pyramid hydrates per set (no 3 × 17.5 kg)', () => {
  const logged = hydrate(pyramid, { blockId: BLOCK_2, stored: {}, logs: [] })
  assert.deepEqual(values(logged.sets), [
    [17.5, 6],
    [25, 4],
    [32.5, 2],
  ])
})

const saved = row(
  pyramid.name,
  [
    [20, 6],
    [27.5, 4],
    [35, 3],
  ],
  '2026-10-20T10:00:00.000Z',
)
const savedBlock2 = { ...saved, exerciseKey: blockExerciseKey(BLOCK_2, pyramid.name) }
const timed = pull.find((e) => !pushNames.has(canonicalExerciseKey(e.name)) && e !== pyramid)!
const savedTimed = row(
  timed.name,
  [
    [5, 45],
    [5, 40],
  ],
  '2026-10-20T10:00:00.000Z',
  { metric: 'seconds' },
)
const stored = mapOf(saved, savedBlock2, savedTimed)
const ctx2: ExerciseDefaultsContext = { blockId: BLOCK_2, stored, logs: [] }

check('saved per-set default wins (block priority)', () => {
  const resolved = resolveExerciseDefaults(pyramid, ctx2)
  assert.equal(resolved.source, 'block')
  assert.deepEqual(values(hydrate(pyramid, ctx2).sets), [
    [20, 6],
    [27.5, 4],
    [35, 3],
  ])
})

check('seconds metric + per-set seconds preserved', () => {
  const logged = hydrate(timed, ctx2)
  assert.equal(logged.metric, 'seconds')
  assert.deepEqual(values(logged.sets), [
    [5, 45],
    [5, 40],
  ])
})

check('דחיפה → משיכה switch: zero index bleeding', () => {
  // Push workout in progress with edited but uncommitted values everywhere.
  const pushWorkout = push.map((ex) => {
    const logged = hydrate(ex, ctx2)
    return { ...logged, sets: logged.sets.map(() => ({ weightKg: 99, reps: 99, done: false })) }
  })
  const pullIds = pull.map((ex, i) => ({ ...ex, id: `pull-${i}` }))
  const realigned = reconcileWorkoutExercises(pushWorkout, pullIds, (ex) => hydrate(ex, ctx2))
  assert.ok(realigned, 'lineup change must realign')
  assert.equal(realigned.length, pullIds.length)
  realigned.forEach((logged, i) => {
    assert.equal(logged.name, pullIds[i]!.name, 'exercise order follows the new template')
    assert.deepEqual(logged.sets, hydrate(pullIds[i]!, ctx2).sets, `${logged.name} hydrated by key`)
    assert.ok(logged.sets.every((s) => s.weightKg !== 99), `${logged.name} carried push values`)
  })
})

check('משיכה → דחיפה switch back restores push values', () => {
  const pullWorkout = pull.map((ex, i) => hydrate({ ...ex, id: `pull-${i}` }, ctx2))
  const pushIds = push.map((ex, i) => ({ ...ex, id: `push-${i}` }))
  const realigned = reconcileWorkoutExercises(pullWorkout, pushIds, (ex) => hydrate(ex, ctx2))!
  realigned.forEach((logged, i) => {
    assert.deepEqual(logged.sets, hydrate(push[i]!, ctx2).sets)
  })
  assert.ok(
    realigned.every((l) => !pullOnly.some((p) => p.name === l.name)),
    'no pull exercise survives a switch to push',
  )
})

check('completed sets survive a switch for the same exercise only', () => {
  const shared = { ...pyramid, id: 'a' }
  const done = { ...hydrate(shared, ctx2), sets: [{ weightKg: 22, reps: 6, done: true }] }
  const realigned = reconcileWorkoutExercises([done], [{ ...pyramid, id: 'b' }], (ex) => hydrate(ex, ctx2))!
  assert.equal(realigned[0]!.exerciseId, 'b')
  assert.deepEqual(values(realigned[0]!.sets), [[22, 6]])
})

check('unchanged lineup is left alone', () => {
  const workout = pull.map((ex) => hydrate(ex, ctx2))
  assert.equal(reconcileWorkoutExercises(workout, pull, (ex) => hydrate(ex, ctx2)), null)
})

check('new block falls back to the global default', () => {
  const resolved = resolveExerciseDefaults(pyramid, { blockId: BLOCK_3, stored, logs: [] })
  assert.equal(resolved.source, 'global')
  assert.deepEqual(values(hydrate(pyramid, { blockId: BLOCK_3, stored, logs: [] }).sets), [
    [20, 6],
    [27.5, 4],
    [35, 3],
  ])
})

check('returning to an old block months later restores that block', () => {
  const later = '2027-01-20T10:00:00.000Z'
  const block3 = row(pyramid.name, [[30, 5], [37.5, 3], [45, 2]], later, { blockId: BLOCK_3 })
  const global3 = row(pyramid.name, [[30, 5], [37.5, 3], [45, 2]], later)
  const map = mergeExerciseDefaults(stored, mapOf(block3, global3))
  assert.deepEqual(values(hydrate(pyramid, { blockId: BLOCK_2, stored: map, logs: [] }).sets), [
    [20, 6],
    [27.5, 4],
    [35, 3],
  ])
  assert.deepEqual(values(hydrate(pyramid, { blockId: BLOCK_3, stored: map, logs: [] }).sets), [
    [30, 5],
    [37.5, 3],
    [45, 2],
  ])
})

check('last completed log is used before seed data', () => {
  const ex = pullOnly.find((e) => e !== pyramid && e !== timed)!
  const log = (completedAt: string, kg: number): WorkoutLog => ({
    id: completedAt,
    programId: BLOCK_2,
    programName: 'בלוק 2',
    dayId: 'd',
    dayNumber: 1,
    workoutName: 'משיכה 2',
    startedAt: completedAt,
    completedAt,
    exercises: [
      {
        exerciseId: 'x',
        name: ex.name,
        targetSets: 2,
        targetReps: ex.reps,
        sets: [
          { weightKg: kg, reps: 6, done: true },
          { weightKg: kg + 2.5, reps: 5, done: true },
        ],
      },
    ],
  })
  const logs = [log('2026-10-21T10:00:00.000Z', 10), log('2026-10-01T10:00:00.000Z', 5)]
  const resolved = resolveExerciseDefaults(ex, { blockId: BLOCK_2, stored, logs })
  assert.equal(resolved.source, 'history')
  assert.deepEqual(values(hydrate(ex, { blockId: BLOCK_2, stored, logs }).sets), [
    [10, 6],
    [12.5, 5],
  ])
})

check('older cloud payload never overwrites a newer local default', () => {
  const stale = row(pyramid.name, [[17.5, 6], [17.5, 6], [17.5, 6]], '2026-10-01T00:00:00.000Z')
  const merged = mergeExerciseDefaults(stored, mapOf(stale))
  assert.equal(merged, stored)
  assert.deepEqual(merged[canonicalExerciseKey(pyramid.name)]!.defaultSets, saved.defaultSets)
})

check('newer cloud default is adopted per key', () => {
  const fresh = row(pyramid.name, [[21, 6], [28, 4], [36, 3]], '2026-10-25T00:00:00.000Z')
  const merged = mergeExerciseDefaults(stored, mapOf(fresh))
  assert.deepEqual(merged[canonicalExerciseKey(pyramid.name)]!.defaultSets, fresh.defaultSets)
  assert.equal(merged[savedTimed.exerciseKey], stored[savedTimed.exerciseKey], 'other keys untouched')
})

console.log(`\n${passed} checks passed`)
