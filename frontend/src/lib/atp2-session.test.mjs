import { test } from 'vitest'
import assert from 'node:assert/strict'
import { prepareAtp2Session, prefillAtp2Entry, refreshAtp2Live } from './atp2-session.js'

const prescription = {
  parameters: { reps: { min: 8, max: 12 }, sets: { min: 3, max: 3 } },
  prefill: { load: { value: 20, unit: 'kg' } },
  rows: Array.from({ length: 3 }, () => ({ load: { value: 20, unit: 'kg' } })),
  ruleSnapshot: { rounding: { mode: 'allowed_values', allowedValues: [5, 10, 15, 17.5, 20, 22.5, 25, 27.5, 30] } }
}
const fixture = () => {
  const atp2 = prepareAtp2Session({ config: { enabled: true, floorWeight: 5 }, prescription })
  const exposure = { exposureId: 'x1', atp2, trackId: 'track1' }
  const entry = prefillAtp2Entry({
    exposureId: 'x1', target: { weight: 20 }, sets: [
      { phase: 'warmup', w: 10, r: 8, done: false },
      ...Array.from({ length: 3 }, (_, i) => ({ setId: 'r' + i, w: 20, r: 12, done: false }))
    ]
  }, exposure)
  return { exposure, entry, active: { exposures: [exposure], entries: [entry] } }
}

test('ATP2 opt-in seeds work sets with no-result sentinel, not prefilled MAX', () => {
  const { entry } = fixture()
  assert.deepEqual(entry.sets.map(r => r.r), [8, 1, 1, 1])
  assert.deepEqual(entry.sets.map(r => r.w), [10, 20, 20, 20])
})

test('ATP2 Turbo cascades after first completed set, never edits logged work/warmups', () => {
  const { active } = fixture()
  const sets = active.entries[0].sets
  sets[1].r = 18; sets[1].done = true
  let result = refreshAtp2Live(active, 0)
  assert.equal(result.uiPhase, 'CALIBRATING')
  assert.deepEqual(sets.map(r => r.w), [10, 20, 20, 20]) // old reference, immutable once replaced
  assert.deepEqual(active.entries[0].sets.map(r => r.w), [10, 20, 25, 25])
  active.entries[0].sets[2].r = 16
  active.entries[0].sets[2].done = true
  result = refreshAtp2Live(active, 0)
  assert.equal(result.nextState.candidate, 30)
  assert.deepEqual(active.entries[0].sets.map(r => r.w), [10, 20, 25, 30])
})

test('ATP2 exact-MAX schedules future session only', () => {
  const { active } = fixture()
  active.entries[0].sets[1].r = 12; active.entries[0].sets[1].done = true
  const result = refreshAtp2Live(active, 0)
  assert.equal(result.nextSetLoad, 20)
  assert.equal(result.nextState.candidate, 22.5)
  assert.equal(active.entries[0].sets[2].w, 20)
})

test('ATP2 undo recomputes open sets from completed observations', () => {
  const { active } = fixture()
  active.entries[0].sets[1].r = 18; active.entries[0].sets[1].done = true
  refreshAtp2Live(active, 0)
  assert.equal(active.entries[0].sets[2].w, 25)
  active.entries[0].sets[1].done = false
  refreshAtp2Live(active, 0)
  assert.equal(active.entries[0].sets[2].w, 20)
})

test('ATP2 manual downshift suppresses same-session Turbo while tracking future candidate', () => {
  const { active } = fixture()
  active.entries[0].sets[1].w = 15
  active.entries[0].sets[1].r = 18
  active.entries[0].sets[1].done = true
  const r = refreshAtp2Live(active, 0)
  assert.equal(r.manualOverride, true)
  assert.equal(r.nextSetLoad, 15)
  assert.equal(r.nextState.candidate, 17.5)
  assert.equal(active.entries[0].sets[2].w, 15)
})

test('ATP2 completed out-of-order set never rewrites an already logged weight', () => {
  const { active } = fixture()
  active.entries[0].sets[3].r = 18; active.entries[0].sets[3].done = true
  refreshAtp2Live(active, 0)
  assert.equal(active.entries[0].sets[3].w, 20)
  assert.equal(active.entries[0].sets[1].w, 20)
})
