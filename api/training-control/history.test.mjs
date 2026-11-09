import test from 'node:test'
import assert from 'node:assert/strict'
import { historicalAtp2Rows, replayAtp2History } from './history.js'

const ladder = { mode: 'allowed_values', allowedValues: [5, 10, 15, 17.5, 20, 22.5, 25, 27.5, 30] }
const atp2 = { version: 1, initialState: {
  candidate: 20, floorWeight: 5, minTarget: 8, maxTarget: 12, probeActive: 0, paired: 0
}, rounding: ladder }
const work = (id, weight, reps, status = 'completed', side = null) => ({
  setId: id, role: 'work', status, ...(side ? { side } : {}),
  observations: [{ metric: 'repetitions', unit: 'reps', value: reps }],
  resistance: { kind: 'external-load', value: weight, unit: 'kg' }
})
const event = (id, start, sets, overrides = {}) => ({
  id, start, end: new Date(start).toISOString(), exposures: [{
    trackId: 'squat-slot', exposureId: id + '-x', atp2: overrides.atp2 || atp2,
    performance: { sets }, ...overrides
  }]
})

test('Historical replay of ATP2 Turbo preserves candidate and probe across sessions', () => {
  const history = [
    event('w1', 1000, [work('r0', 20, 18), work('r1', 25, 10)]),
    event('w2', 2000, [work('r0', 25, 12), work('r1', 25, 8)])
  ]
  const s1 = replayAtp2History(history.slice(0, 1))['squat-slot']
  assert.equal(s1.candidate, 25)
  assert.equal(s1.probeActive, 0)
  const s2 = replayAtp2History(history)['squat-slot']
  assert.equal(s2.candidate, 27.5)
  assert.equal(s2.probeActive, 0)
})

test('Replay is idempotent and observes corrections to completed history', () => {
  const history = [event('w1', 1000, [work('r0', 20, 12), work('r1', 20, 8)])]
  assert.deepEqual(replayAtp2History(history), replayAtp2History(history))
  const earlier = replayAtp2History(history)['squat-slot']
  assert.equal(earlier.candidate, 22.5)
  history[0].exposures[0].performance.sets[0].observations[0].value = 10
  const corrected = replayAtp2History(history)['squat-slot']
  assert.equal(corrected.candidate, 20)
})

test('Unilateral paired logged limbs are interpreted as one ATP2 working set', () => {
  const x = {
    performance: { sets: [
      work('r0', 20, 1, 'completed', 'L'), work('r0', 20, 1, 'completed', 'R'),
      work('r1', 20, 9, 'completed', 'L'), work('r1', 20, 8, 'completed', 'R')
    ] }
  }
  const rows = historicalAtp2Rows(x)
  assert.equal(rows.length, 2)
  assert.equal(rows[0].leftReps, 1)
  assert.equal(rows[1].reps, 8)
  const spec = { ...atp2, initialState: { ...atp2.initialState, paired: 1 } }
  const profile = event('w1', 1000, x.performance.sets, { atp2: spec })
  assert.equal(replayAtp2History([profile])['squat-slot'].candidate, 20)
})

test('Skipped and excluded rows cannot trigger ATP2 progression', () => {
  const skipped = event('skip', 1000, [work('r0', 20, 18, 'skipped')])
  assert.deepEqual(replayAtp2History([skipped]), {})
  const excluded = event('excluded', 1000, [work('r0', 20, 18)], { excludedFromProgression: true })
  assert.deepEqual(replayAtp2History([excluded]), {})
})
