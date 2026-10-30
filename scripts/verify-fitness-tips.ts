/**
 * Offline checks for the fitness-tips merge used by cloud sync.
 * Run: npm run verify:tips
 */
import assert from 'node:assert/strict'
import {
  deletionKeys,
  mergeTipCategories,
  normalizeCategories,
  type TipCategory,
} from '../src/lib/fitnessTips'

const item = (id: string, title: string, body = '') => ({ id, title, body })
const cat = (id: string, title: string, items: TipCategory['items'] = []): TipCategory => ({
  id,
  title,
  items,
})

let passed = 0
function check(name: string, fn: () => void) {
  fn()
  passed += 1
  console.log(`  ✓ ${name}`)
}

check('cloud-only category from another device is kept', () => {
  const local = [cat('a', 'חזה')]
  const remote = [cat('a', 'חזה'), cat('p', 'פוזינג אקטיבי')]
  assert.deepEqual(
    mergeTipCategories(local, remote).map((c) => c.title),
    ['חזה', 'פוזינג אקטיבי'],
  )
})

check('unsynced local edit wins over the cloud copy of the same tip', () => {
  const local = [cat('a', 'חזה', [item('i1', 'מרפקים', 'local')])]
  const remote = [cat('a', 'חזה', [item('i1', 'מרפקים', 'remote')])]
  assert.equal(mergeTipCategories(local, remote)[0].items[0].body, 'local')
})

check('tips added on both devices are combined', () => {
  const local = [cat('a', 'גב', [item('i1', 'כיווץ')])]
  const remote = [cat('a', 'גב', [item('i2', 'חתירה')])]
  assert.deepEqual(
    mergeTipCategories(local, remote)[0].items.map((i) => i.title),
    ['כיווץ', 'חתירה'],
  )
})

check('seeded categories with different ids but same title do not duplicate', () => {
  const local = [cat('x1', 'חימום ומוביליטי לפני אימון', [item('x2', 'חימום כללי')])]
  const remote = [cat('y1', 'חימום ומוביליטי לפני אימון', [item('y2', 'חימום כללי')])]
  const merged = mergeTipCategories(local, remote)
  assert.equal(merged.length, 1)
  assert.equal(merged[0].items.length, 1)
})

check('category deleted locally before first sync is not resurrected (different seed ids)', () => {
  const deleted = cat('x1', 'חימום', [item('x2', 'סטים מדורגים')])
  const tombstones = [...deletionKeys(deleted), ...deleted.items.flatMap(deletionKeys)]
  const remote = [cat('y1', 'חימום', [item('y2', 'סטים מדורגים')]), cat('y3', 'גב')]
  assert.deepEqual(
    mergeTipCategories([cat('y3', 'גב')], remote, tombstones).map((c) => c.title),
    ['גב'],
  )
})

check('tip deleted locally stays deleted when cloud still has it', () => {
  const gone = item('i9', 'נשימה')
  const local = [cat('a', 'אימון', [item('i1', 'טמפו')])]
  const remote = [cat('a', 'אימון', [item('i1', 'טמפו'), gone])]
  assert.deepEqual(
    mergeTipCategories(local, remote, deletionKeys(gone))[0].items.map((i) => i.id),
    ['i1'],
  )
})

check('local order is preserved', () => {
  const local = [cat('b', 'גב'), cat('a', 'חזה')]
  const remote = [cat('a', 'חזה'), cat('b', 'גב')]
  assert.deepEqual(mergeTipCategories(local, remote).map((c) => c.id), ['b', 'a'])
})

check('normalizeCategories drops malformed rows and clips sizes', () => {
  const out = normalizeCategories([
    null,
    { title: '' },
    { id: 'c', title: 'x'.repeat(500), items: [{ title: '', body: '' }, { title: 't' }] },
  ])
  assert.equal(out.length, 1)
  assert.equal(out[0].title.length, 80)
  assert.equal(out[0].items.length, 1)
})

console.log(`fitness tips: ${passed} checks passed`)
