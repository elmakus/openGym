import test from 'node:test'
import assert from 'node:assert/strict'
import { M6 } from './hybrid2/fixtures/reference-adapters.js'
import { bootstrapFromNativeExercises, nativeH1Anchor } from './hybrid2/native-bootstrap.js'
import { replayHybridHistory } from './hybrid2/history.js'
import { makeFixtureCycle } from './hybrid2/fixtures/cycles.js'

const mapping = Object.fromEntries(M6.adapter.signals.map((s, i) => [s.signalId, i + 1]))
const native = () => M6.adapter.signals.map((_, i) => ({
  progress: { state: { anchorId: i + 1,
    perfCount: 3, perf1: {value: 150, unit: 'kg'},
    perf2: {value: 150, unit: 'kg'}, perf3: {value: 150, unit: 'kg'},
    perfReference: {value: 150, unit: 'kg'}, candidateGuard: 0,
    deloadQueued: 0, deloadActive: 0, rolloverClear: 0
  } }
}))
const params = () => ({
  exercises: native(), adapter: M6.adapter, signalToNativeId: mapping,
  sourceId: 'sha256:' + 'a'.repeat(64),
  cutoverAt: '2025-12-31T20:00:00.000Z',
  importedAt: '2025-12-31T21:00:00.000Z'
})
test('source-evaluated H1 memory is imported by reviewed IDs and drives real RTT replay', () => {
  const cp = bootstrapFromNativeExercises(params())
  assert.deepEqual(Object.keys(cp.anchors), M6.adapter.signals.map(s => s.signalId))
  assert.equal(cp.anchors.hip_a.perfReference, 150)
  assert.equal(replayHybridHistory({workouts:makeFixtureCycle(M6,0,8),
    adapter:M6.adapter,bootstrap:cp}).status,'QUEUED')
  const reversed = params()
  reversed.exercises.reverse()
  assert.deepEqual(bootstrapFromNativeExercises(reversed),cp)
})
test('native converter rejects ambiguous IDs, lifecycle, missing states and invalid source units', () => {
  const original=params()
  assert.throws(()=>bootstrapFromNativeExercises({...original,signalToNativeId:{
    ...mapping, hip_b:1 }}),/unique positive/)
  assert.throws(()=>bootstrapFromNativeExercises({...original,exercises:native().slice(1)}),/missing native/)
  const duplicate=native()
  duplicate.push(structuredClone(duplicate[0]))
  assert.throws(()=>bootstrapFromNativeExercises({...original,exercises:duplicate}),/duplicate/)
  const queued=native()
  queued[0].progress.state.deloadQueued=1
  assert.throws(()=>bootstrapFromNativeExercises({...original,exercises:queued}),/queued/)
  const badUnit=native()
  badUnit[0].progress.state.perfReference={value:150,unit:'stones'}
  assert.throws(()=>bootstrapFromNativeExercises({...original,exercises:badUnit}),/unit/)
  const copied=native()
  copied[0].progress.state.perfCount=2
  assert.throws(()=>bootstrapFromNativeExercises({...original,exercises:copied}),/invalid/)
  assert.equal(nativeH1Anchor({}).perfCount,0)
  assert.equal(nativeH1Anchor({perfCount:1,perf1:{value:100,unit:'lb'}}).perf1,100*0.45359237)
})
