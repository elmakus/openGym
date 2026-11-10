import test from 'node:test'
import assert from 'node:assert/strict'
import { K5, M6, SYN4 } from './hybrid2/fixtures/reference-adapters.js'
import { makeFixtureCycle, fixtureCycles } from './hybrid2/fixtures/cycles.js'
import { replayHybridHistory } from './hybrid2/history.js'
import { h1FromExposure } from './hybrid2/observation.js'
import { loadedRepScore } from './hybrid2/h1.js'

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

test('original source-exact H1 boundary: comparable first set accepts 20, 21, 23, 24, 30, 100 and 300 reps', () => {
  const exposure = makeFixtureCycle(K5, 0, 15)[0].exposures[0]
  for (const reps of [2, 5, 19, 20, 21, 22, 23, 24, 25, 30, 50, 100, 300, 301]) {
    const altered = clone(exposure)
    altered.performance.sets[0].observations[0].value = reps
    const signal = h1FromExposure(altered, { beforeCandidate: 100, afterCandidate: 100, baselineUnit: 'kg' })
    assert.equal(signal.kind, 'COMPARABLE', 'reps=' + reps)
    assert.equal(signal.performance, loadedRepScore(100, reps), 'native H1 Epley score reps=' + reps)
    assert.equal(signal.candidateRaised, false)
  }
  const raised = clone(exposure)
  raised.performance.sets[0].observations[0].value = 300
  assert.deepEqual(h1FromExposure(raised, { beforeCandidate: 100, afterCandidate: 102.5 }),
    { kind: 'COMPARABLE', performance: 1100, candidateRaised: true })
})

test('H1 first-set sentinels remain in force even without a high-rep cap', () => {
  const first = makeFixtureCycle(K5, 0, 15)[0].exposures[0]
  for (const invalid of [0, -1, 1, 2.5, null, '300']) {
    const altered = clone(first)
    altered.performance.sets[0].observations[0].value = invalid
    assert.notEqual(h1FromExposure(altered, {beforeCandidate:100,afterCandidate:100}).kind,
      'COMPARABLE','bad reps='+String(invalid))
  }
  const changedLoad = clone(first)
  changedLoad.performance.sets[0].observations[0].value = 300
  changedLoad.performance.sets[0].resistance.value = 90
  assert.equal(h1FromExposure(changedLoad, {beforeCandidate:100,afterCandidate:100}).kind, 'DISCONTINUITY')
  const skipped = clone(first)
  skipped.performance.sets[0].status = 'skipped'
  assert.notEqual(h1FromExposure(skipped, {beforeCandidate:100,afterCandidate:100}).kind, 'COMPARABLE')
  for (const key of ['timedLoad','excludedFromProgression']) {
    const altered = clone(first)
    altered[key] = true
    altered.performance.sets[0].observations[0].value = 300
    assert.equal(h1FromExposure(altered, {beforeCandidate:100,afterCandidate:100}).kind,'INDETERMINATE')
  }
})

test('300 reps in a completed H1 historical cycle is comparable and updates the same reference as native', () => {
  const baseline = fixtureCycles(K5, [{ reps:15 }, { reps:15 }, { reps:15 }, { reps:15 }])
  const reference = replayHybridHistory({ workouts: baseline, adapter: K5.adapter })
  assert.equal(reference.status, 'NORMAL')
  const modified = clone(baseline)
  const signalId = K5.adapter.signals[0].signalId
  const lastCycleStart = baseline.length - K5.adapter.orderedCyclePositions.length
  const target = modified[lastCycleStart].exposures[0]
  assert.equal(target.hybrid2.signalId, signalId)
  const baselineWeight = target.performance.sets[0].resistance.value
  target.performance.sets[0].observations[0].value = 300
  assert.equal(h1FromExposure(target,{beforeCandidate:baselineWeight,afterCandidate:baselineWeight}).kind,'COMPARABLE')
  const replayed = replayHybridHistory({ workouts: modified, adapter: K5.adapter })
  assert.equal(replayed.status, 'NORMAL')
  assert.equal(replayed.state.anchors[signalId].perfCount, 3)
  assert.equal(replayed.state.anchors[signalId].perf3, loadedRepScore(baselineWeight,300))
  assert.ok(replayed.state.anchors[signalId].perf3 > reference.state.anchors[signalId].perf3)
  assert.equal(replayed.decisions.at(-1).evaluation.queueDeload,false)

  // No upper threshold is introduced for later working-set observations:
  // every H1 signal in the current cycle remains valid in native source parity.
  for (const w of modified.slice(lastCycleStart)) for (const x of w.exposures)
    if (x.hybrid2?.signalId) x.performance.sets[0].observations[0].value = 300
  const all300 = replayHybridHistory({ workouts: modified, adapter: K5.adapter })
  assert.notEqual(all300.decisions.at(-1).evaluation.cycleClass,'INDETERMINATE')
  assert.equal(all300.decisions.at(-1).evaluation.queueDeload,false)
  assert.ok(K5.adapter.signals.every(s =>
    all300.state.anchors[s.signalId].perf3 > reference.state.anchors[s.signalId].perf3))
})
