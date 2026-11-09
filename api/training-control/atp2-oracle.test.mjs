// Behavioural acceptance vectors translated from elmakus/fitness/tests/oracle/test_atp2_book_oracle.py.
// Not a claim of executing Liftosaur itself.
import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateAtp2 } from './atp2.js'
const cable = [5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 30, 35, 40, 45, 50]
const state = (candidate = 10, probeActive = 0, extra = {}) => ({ candidate, probeActive, floorWeight: 5, minTarget: 8, maxTarget: 15, paired: 0, ...extra })
const evalSet = (weight, reps, s = state(), values = cable, numberOfSets = 3) => evaluateAtp2({ state: s, rounding: { mode: 'allowed_values', allowedValues: values }, sets: [{ weight, reps, ordinal: 1 }], numberOfSets })

test('ATP2 accepted oracle: first-result matrix, exact MAX and above-MAX mapping', () => {
  const cases = [
    [10, 10, 10, 0], [10, 15, 12.5, 0], [10, 16, 12.5, 1],
    [10, 21, 12.5, 1], [10, 28, 15, 1], [10, 53, 25, 1],
    [10, 7, 7.5, 0], [20, 5, 17.5, 0]
  ]
  for (const [weight, reps, candidate, probe] of cases) {
    const r = evalSet(weight, reps, state(weight))
    assert.equal(r.nextState.candidate, candidate, weight + 'x' + reps)
    assert.equal(r.nextState.probeActive, probe, weight + 'x' + reps + ' probe')
  }
})

test('ATP2 accepted oracle: chained calibration & final settlement', () => {
  const r = evaluateAtp2({ state: state(), rounding: { mode: 'allowed_values', allowedValues: cable }, sets: [
    { weight: 10, reps: 28, ordinal: 1 }, { weight: 15, reps: 22, ordinal: 2 }, { weight: 20, reps: 12, ordinal: 3 }
  ], numberOfSets: 3 })
  assert.equal(r.nextState.candidate, 20)
  assert.equal(r.nextState.probeActive, 0)
  assert.equal(r.progressPhase, 'SETTLED')
})

test('ATP2 accepted oracle: manual override splits same-session and next-session decisions', () => {
  const r = evalSet(10, 28, state(20, 1))
  assert.equal(r.manualOverride, true)
  assert.equal(r.nextSetLoad, 10)
  assert.equal(r.nextState.candidate, 15)
  assert.equal(r.nextState.probeActive, 1)
  assert.equal(r.progressPhase, 'SETTLED')
})

test('ATP2 accepted oracle: normalization avoids false manual override', () => {
  const r = evalSet(5, 28, state(6), [5, 7.5, 10])
  assert.equal(r.manualOverride, false)
  assert.equal(r.nextSetLoad, 7.5)
  assert.equal(r.nextState.candidate, 7.5)
  assert.equal(r.progressPhase, 'CALIBRATING')
})

test('ATP2 accepted oracle: probing cannot exceed finite equipment ladder top', () => {
  const r = evalSet(50, 30, state(50))
  assert.equal(r.nextSetLoad, 50)
  assert.equal(r.nextState.candidate, 50)
  assert.equal(r.nextState.probeActive, 0)
})

test('ATP2 accepted oracle: coarse ladder always advances above MAX', () => {
  const r = evalSet(5, 16, state(5, 0, { floorWeight: 4 }), [4, 5, 7.5, 10, 15, 20, 25])
  assert.equal(r.nextSetLoad, 7.5)
})

test('ATP2 accepted oracle: non-inverse native-mapping is intentional', () => {
  const ladder = [85, 87.5, 90, 92.5, 95, 97.5, 100]
  const a = evalSet(92.5, 16, state(92.5, 0, { floorWeight: 85 }), ladder)
  assert.equal(a.nextState.candidate, 95)
  const b = evalSet(95, 7, state(95, 1, { floorWeight: 85 }), ladder)
  assert.equal(b.nextState.candidate, 90)
  assert.equal(b.nextState.probeActive, 0)
})

test('ATP2 accepted oracle: multi-session Turbo without session cap', () => {
  const values = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70]
  let s = state(10)
  for (let i = 0; i < 4; i++) {
    const r = evalSet(s.candidate, 30, s, values, 1)
    assert.equal(r.nextState.probeActive, 1)
    assert.equal(r.progressPhase, 'SETTLED')
    s = r.nextState
  }
  assert.ok(s.candidate > 10)
})

test('ATP2 accepted oracle: native upper tie goes to lower available load', () => {
  const r = evalSet(12.5, 20, state(12.5, 0, { floorWeight: 12.5 }), [12.5, 14, 16])
  assert.equal(r.nextState.candidate, 14)
})
