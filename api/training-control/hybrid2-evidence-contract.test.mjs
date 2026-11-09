import test from 'node:test'
import assert from 'node:assert/strict'
import { K5, M6, SYN4 } from './hybrid2/fixtures/reference-adapters.js'
import { makeFixtureCycle, fixtureCycles } from './hybrid2/fixtures/cycles.js'
import { replayHybridHistory } from './hybrid2/history.js'
import { h1FromExposure, H1_SUPPORTED_REPS_UPPER } from './hybrid2/observation.js'

const clone = value => structuredClone(value)
const broken = (fixture, alter, cycle = 0) => {
  const log = makeFixtureCycle(fixture, cycle, 15)
  alter(log)
  return () => replayHybridHistory({ workouts: log, adapter: fixture.adapter })
}

for (const fixture of [K5, M6, SYN4]) {
  test(fixture.adapter.namespace + ': invalid metadata is rejected before any H1/lifecycle action', () => {
    const changes = [
      ['workout controller', a => { a[0].hybrid2.controllerVersion = 'HYBRID-1' }],
      ['workout schema', a => { a[0].hybrid2.stateSchemaVersion = 'HYBRID-STATE-1' }],
      ['workout event version', a => { a[0].hybrid2.version = 2 }],
      ['missing workout event', a => { delete a[0].hybrid2 }],
      ['workout namespace', a => { a[0].hybrid2.namespace = 'another-namespace' }],
      ['workout plan', a => { a[0].hybrid2.planVersion = 'unreviewed' }],
      ['foreign but internally consistent namespace', a => {
        a[0].hybrid2.namespace = 'old-epoch'
        for (const exposure of a[0].exposures) exposure.hybrid2.namespace = 'old-epoch'
      }],
      ['workout fingerprint', a => { a[0].hybrid2.adapterFingerprint = 'foreign' }],
      ['workout position', a => { a[0].hybrid2.positions = ['UNKNOWN'] }],
      ['exposure controller', a => { a[0].exposures[0].hybrid2.controllerVersion = 'HYBRID-1' }],
      ['exposure metric', a => { a[0].exposures[0].hybrid2.metricVersion = 'H1-OLD' }],
      ['exposure reference', a => { a[0].exposures[0].hybrid2.referenceVersion = 'REF-OLD' }],
      ['exposure optional schema', a => { a[0].exposures[0].hybrid2.stateSchemaVersion = 'HYBRID-STATE-1' }],
      ['exposure version', a => { a[0].exposures[0].hybrid2.version = 2 }],
      ['stripped H2 tag from declared occurrence', a => { delete a[0].exposures[0].hybrid2 }],
      ['exposure namespace', a => { a[0].exposures[0].hybrid2.namespace = 'foreign' }],
      ['exposure plan', a => { a[0].exposures[0].hybrid2.planVersion = 'foreign' }],
      ['exposure fingerprint', a => { a[0].exposures[0].hybrid2.adapterFingerprint = 'foreign' }],
      ['exposure position', a => { a[0].exposures[0].hybrid2.cyclePosition = 'UNKNOWN' }],
      ['occurrence identity', a => { a[0].exposures[0].occurrenceId = 'forged-closer' }],
      ['conflicting redundant occurrence identity', a => { a[0].exposures[0].hybrid2.occurrenceId = 'forged-closer' }],
      ['routine identity', a => { a[0].exposures[0].routineId = 'another-routine' }],
      ['progression identity', a => { a[0].exposures[0].hybrid2.progressionIdentity = 'another-track' }],
      ['track identity', a => { a[0].exposures[0].trackId = 'different-track' }],
      ['signal ID', a => { a[0].exposures[0].hybrid2.signalId = 'another-signal' }],
      ['signal class', a => { a[0].exposures[0].hybrid2.signalClass = 'TIMED_LOAD' }],
      ['unit witness', a => { a[0].exposures[0].hybrid2.unit = 'kg?' }],
      ['deload marker', a => { a[0].exposures[0].hybrid2.deloadFrozen = 'false' }],
    ]
    for (const [name, change] of changes)
      assert.throws(broken(fixture, change), /HYBRID-2 replay:/, fixture.adapter.namespace + ' ' + name)
  })
}

test('terminal closer requires its own true occurrence/progression/signal/position identity', () => {
  const prior = fixtureCycles(K5, [
    { reps: 15 }, { reps: 15 }, { reps: 15 }, { reps: 15 }, { reps: 8 }
  ])
  const missingCloser = makeFixtureCycle(K5, 5, 8, { frozen: true, omitCloser: true })
  const before = replayHybridHistory({ workouts: [...prior, ...missingCloser], adapter: K5.adapter })
  assert.equal(before.status, 'DELOAD')
  assert.equal(before.decisions.some(d => d.epochReset), false)

  // Replacing only occurrenceId must not turn this H1 signal into a closer.
  const forged = clone(missingCloser)
  forged.at(-1).exposures[0].occurrenceId = K5.adapter.closerOccurrence
  assert.throws(() => replayHybridHistory({ workouts: [...prior, ...forged], adapter: K5.adapter }),
    /HYBRID-2 replay:.*(signalId|identity|occurrence)/)

  // Even with a legitimate closer identity, the wrong routine/track/position
  // cannot close a cycle or reset the H1 epoch.
  const closer = makeFixtureCycle(K5, 5, 8, { frozen: true })
  for (const mutate of [
    x => { x.routineId = 'wrong-routine' },
    x => { x.hybrid2.progressionIdentity = 'wrong-track' },
    x => { x.hybrid2.signalId = 'leg_press' },
    x => { x.hybrid2.signalClass = 'LOADED_REPS' },
    x => { x.hybrid2.cyclePosition = 'TUE' },
  ]) {
    const modified = clone(closer)
    mutate(modified.at(-1).exposures.at(-1))
    assert.throws(() => replayHybridHistory({ workouts: [...prior, ...modified], adapter: K5.adapter }),
      /HYBRID-2 replay:/)
  }

  const missingSets = clone(closer)
  missingSets.at(-1).exposures.at(-1).performance.sets[0].status = 'skipped'
  const noClosure = replayHybridHistory({ workouts: [...prior, ...missingSets], adapter: K5.adapter })
  assert.equal(noClosure.status, 'DELOAD', 'correctly skipped closer does not reset H1')
  assert.equal(noClosure.decisions.filter(d => d.epochReset).length, 0)
  const valid = replayHybridHistory({ workouts: [...prior, ...closer], adapter: K5.adapter })
  assert.equal(valid.status, 'LEARNING')
  assert.equal(valid.decisions.filter(d => d.epochReset).length, 1)
})

test('unmarked old workouts remain legal; skipped H1 evidence stays indeterminate', () => {
  const legacy = {
    id: 'older-untagged-workout', start: Date.UTC(2025, 0, 1), d: '2025-01-01',
    exposures: [{ occurrenceId: 'old', performance: { sets: [] } }]
  }
  const marked = makeFixtureCycle(M6, 0, 15)
  marked[0].exposures[0].performance.sets[0].status = 'skipped'
  const result = replayHybridHistory({ workouts: [legacy, ...marked], adapter: M6.adapter })
  assert.equal(result.status, 'LEARNING')
  assert.equal(result.state.anchors[M6.adapter.signals[0].signalId].perfCount, 0)
  assert.equal(result.decisions.at(-1).evaluation.cycleClass, 'INDETERMINATE')
  assert.equal(result.decisions.some(d => d.epochReset), false)
})

test('H2PERF-DEC-001 supported envelope: out-of-range reps do not seed/refit H1', () => {
  assert.equal(H1_SUPPORTED_REPS_UPPER, 20)
  const exposure = makeFixtureCycle(K5, 0, 15)[0].exposures[0]
  for (const reps of [20, 21, 300]) {
    const altered = clone(exposure)
    altered.performance.sets[0].observations[0].value = reps
    const signal = h1FromExposure(altered, { beforeCandidate: 100, afterCandidate: 100, baselineUnit: 'kg' })
    assert.equal(signal.kind, reps <= 20 ? 'COMPARABLE' : 'INDETERMINATE', 'reps=' + reps)
    if (reps > 20) assert.equal(signal.performance, null)
  }
  const raised = clone(exposure)
  raised.performance.sets[0].observations[0].value = 300
  assert.deepEqual(h1FromExposure(raised, { beforeCandidate: 100, afterCandidate: 102.5 }),
    { kind: 'INDETERMINATE', performance: null, candidateRaised: true })
})

test('300 reps in a real historical cycle cannot inflate the reference or queue a false deload', () => {
  const baseline = fixtureCycles(K5, [{ reps:15 }, { reps:15 }, { reps:15 }, { reps:15 }])
  const original = replayHybridHistory({ workouts: baseline, adapter: K5.adapter })
  assert.equal(original.status, 'NORMAL')
  const corrupt = clone(baseline)
  const signal = K5.adapter.signals[0].signalId
  const lastCycleStart = baseline.length - K5.adapter.orderedCyclePositions.length
  const target = corrupt[lastCycleStart].exposures[0]
  assert.equal(target.hybrid2.signalId, signal)
  target.performance.sets[0].observations[0].value = 300
  const replayed = replayHybridHistory({ workouts: corrupt, adapter: K5.adapter })
  assert.equal(replayed.status, 'NORMAL')
  assert.equal(replayed.state.anchors[signal].perfCount, 3)
  assert.equal(replayed.state.anchors[signal].perfReference, original.state.anchors[signal].perfReference)
  assert.equal(replayed.decisions.at(-1).evaluation.weakCount, 0)
  assert.equal(replayed.decisions.at(-1).evaluation.queueDeload, false)

  for (const w of corrupt.slice(lastCycleStart)) for (const x of w.exposures)
    if (x.hybrid2?.signalId) x.performance.sets[0].observations[0].value = 300
  const allUnsupported = replayHybridHistory({ workouts: corrupt, adapter: K5.adapter })
  assert.equal(allUnsupported.decisions.at(-1).evaluation.cycleClass, 'INDETERMINATE')
  assert.equal(allUnsupported.decisions.at(-1).evaluation.queueDeload, false)
  assert.ok(K5.adapter.signals.every(s =>
    allUnsupported.state.anchors[s.signalId].perfReference === original.state.anchors[s.signalId].perfReference))
})
