import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateAtp2, normalizeAtp2State } from './atp2.js'

const ladder = { mode: 'allowed_values', allowedValues: [5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30, 32.5, 35, 37.5, 40] }
const initial = { minTarget: 8, maxTarget: 12, candidate: 20, floorWeight: 5, paired: 0, probeActive: 0 }
const run = (sets, state = initial, rounding = ladder, numberOfSets = 3) => evaluateAtp2({ state, rounding, sets: sets.map(([weight, reps], i) => ({ weight, reps, ordinal: i + 1 })), numberOfSets })

test('Turbo chains within one exposure; next session candidate matches final probe', () => {
  const a = run([[20, 18]])
  assert.equal(a.nextSetLoad, 25)
  assert.equal(a.nextState.candidate, 25)
  assert.equal(a.nextState.probeActive, 1)
  assert.equal(a.uiPhase, 'CALIBRATING')
  const b = run([[20, 18], [25, 16]])
  assert.equal(b.nextSetLoad, 30)
  assert.equal(b.nextState.candidate, 30)
  assert.equal(b.progressPhase, 'CALIBRATING')
  const c = run([[20, 18], [25, 16], [30, 10]])
  assert.equal(c.nextSetLoad, 30)
  assert.equal(c.nextState.candidate, 30)
  assert.equal(c.nextState.probeActive, 0)
})

test('Exact MAX advances only future exposure, never next set', () => {
  const a = run([[20, 12]])
  assert.equal(a.nextSetLoad, 20)
  assert.equal(a.nextState.candidate, 22.5)
  assert.equal(a.nextState.probeActive, 0)
})

test('Below MIN immediately corrects next set and persistent candidate', () => {
  const a = run([[20, 6]])
  assert.equal(a.nextSetLoad, 17.5)
  assert.equal(a.nextState.candidate, 17.5)
  assert.equal(a.nextState.probeActive, 0)
  assert.equal(a.uiPhase, 'SETTLED')
})

test('SETTLED ignores ordinary later fatigue for next-session progression', () => {
  const a = run([[20, 10], [20, 6], [20, 5]])
  assert.equal(a.nextState.candidate, 20)
  assert.equal(a.nextSetLoad, 20)
})

test('One rep is Liftosaur sentinel, not a usable result', () => {
  const a = run([[20, 1], [20, 16]])
  assert.equal(a.usableCount, 1)
  assert.equal(a.nextSetLoad, 22.5)
})

test('Conservative manual downshift blocks Turbo update, not durable candidate', () => {
  const a = run([[15, 18]], { ...initial, candidate: 20 })
  assert.equal(a.nextSetLoad, 15)
  assert.equal(a.nextState.candidate, 17.5)
  assert.equal(a.nextState.probeActive, 1)
  assert.equal(a.manualOverride, true)
})

test('Normalize non-native floor upwards and stale candidate downwards', () => {
  const rounding = { mode: 'allowed_values', allowedValues: [5, 7.5, 10] }
  assert.equal(normalizeAtp2State({ ...initial, floorWeight: 6, candidate: 9 }, rounding).floorWeight, 7.5)
  assert.equal(normalizeAtp2State({ ...initial, floorWeight: 6, candidate: 9 }, rounding).candidate, 7.5)
  assert.equal(normalizeAtp2State({ ...initial, floorWeight: 5, candidate: 6 }, rounding).candidate, 5)
})

test('Native ladder never invents weights', () => {
  const rounding = { mode: 'allowed_values', allowedValues: [4, 5, 6] }
  assert.equal(run([[5, 10]], { ...initial, candidate: 5, floorWeight: 4 }, rounding).nextState.candidate, 5)
  assert.equal(run([[5, 17]], { ...initial, candidate: 5, floorWeight: 4 }, rounding).nextSetLoad, 6)
})

test('Paired unilateral: 1/1 sentinel and recovered 1/3', () => {
  const state = { ...initial, paired: 1 }
  const a = evaluateAtp2({ state, rounding: ladder, sets: [{ weight: 20, reps: 1, leftReps: 1, ordinal: 1 }, { weight: 20, reps: 3, leftReps: 1, ordinal: 2 }], numberOfSets: 3 })
  assert.equal(a.usableCount, 1)
  assert.equal(a.nextState.candidate, 15)
})

test('State normalization rejects floor above finite ladder', () => {
  assert.throws(() => normalizeAtp2State({ ...initial, floorWeight: 100 }, ladder))
})
