import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { initialAnchor, observeAnchor, loadedRepScore, asymmetricReferenceUpdate,
  WEAK_RATIO, METRIC_VERSION, REFERENCE_VERSION } from './hybrid2/h1.js'

const fixture = JSON.parse(readFileSync(fileURLToPath(new URL('./hybrid2/fixtures/h1-python-oracle.json', import.meta.url)), 'utf8'))
const eq = (a, b, label) => {
  if (a == null || b == null) return assert.equal(a, b, label)
  assert.ok(Math.abs(a - b) <= Math.max(1e-9, Math.abs(b) * 1e-11), label + ': ' + a + ' != ' + b)
}
test('exact pinned fitness Python oracle: thousands of H1 state transitions', () => {
  assert.equal(fixture.sourceCommit, '9f2deb6c345643d7c0c793c52d358e496c2710d2')
  assert.equal(fixture.oracleSha256, '65c6539e9ebc7e4ec9832e20591a8693130e564da88238f81052f7c63fca8e58')
  let compared = 0
  for (const run of fixture.trajectories) {
    let state = initialAnchor()
    for (const [i, event] of run.events.entries()) {
      const expected = run.expected[i]
      const actual = observeAnchor(state, { mode: event.mode,
        kind: event.kind, performance: event.score, candidateRaised: event.candidateRaised })
      state = actual.state
      const where = 'trace ' + run.id + ' step ' + i
      assert.equal(actual.ready, expected.ready, where + ' ready')
      assert.equal(actual.validVote, expected.validVote, where + ' validVote')
      assert.equal(actual.weak, expected.weak, where + ' weak')
      assert.equal(actual.guarded, expected.guarded, where + ' guarded')
      assert.equal(actual.reset, expected.reset, where + ' reset')
      assert.equal(state.candidateGuard === 1, expected.candidateGuard, where + ' guard state')
      eq(state.perfReference || null, expected.reference, where + ' ref')
      eq(actual.referenceBefore, expected.referenceBefore, where + ' ref before')
      assert.equal(state.perfCount, expected.samples.length, where + ' count')
      const samples = [state.perf1, state.perf2, state.perf3].slice(0, state.perfCount)
      for (const [j, sample] of samples.entries()) eq(sample, expected.samples[j], where + ' perf' + j)
      compared++
    }
  }
  assert.ok(compared > 3500, 'insufficient oracle cases')
})
test('learning median; classification precedes asymmetric reference update; equality inclusive', () => {
  assert.equal(METRIC_VERSION, 'H1-EPL-1')
  assert.equal(REFERENCE_VERSION, 'H1-ASYM-M3-1')
  assert.equal(loadedRepScore(100, 10), 100 * (1 + 10 / 30))
  let state = initialAnchor()
  for (const p of [100, 120, 110]) {
    const x = observeAnchor(state, { kind: 'COMPARABLE', performance: p })
    state = x.state
    assert.equal(x.weak, false)
    assert.equal(x.validVote, false)
  }
  assert.equal(state.perfReference, 110)
  const atThreshold = observeAnchor(state, { kind: 'COMPARABLE', performance: 110 * WEAK_RATIO })
  assert.equal(atThreshold.referenceBefore, 110)
  assert.equal(atThreshold.weak, true)
  eq(atThreshold.state.perfReference, asymmetricReferenceUpdate(110, 110), 'smooth update')
})
test('candidate guard arms only from passed actual candidate change, not from reps', () => {
  let state = initialAnchor()
  for (let i = 0; i < 3; i++) state = observeAnchor(state, { kind: 'COMPARABLE', performance: 100 }).state
  state = observeAnchor(state, { kind: 'COMPARABLE', performance: 100, candidateRaised: true }).state
  assert.equal(state.candidateGuard, 1)
  state = observeAnchor(state, { kind: 'INVALID' }).state
  assert.equal(state.candidateGuard, 1)
  const protectedSample = observeAnchor(state, { kind: 'COMPARABLE', performance: 80 })
  assert.equal(protectedSample.validVote, false)
  assert.equal(protectedSample.weak, false)
  assert.equal(protectedSample.state.candidateGuard, 0)
  const weak = observeAnchor(protectedSample.state, { kind: 'COMPARABLE', performance: 80 })
  assert.equal(weak.weak, true)
})
test('invalid, timing and nonpositive loaded-reps samples fail closed', () => {
  for (const pair of [[0, 8], [-3, 9], [10, 0], [10, 1.5], [Infinity, 9]])
    assert.throws(() => loadedRepScore(...pair), /invalid/)
  assert.throws(() => observeAnchor(initialAnchor(), { kind: 'COMPARABLE', performance: 0 }), /positive performance/)
})
