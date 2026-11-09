import test from 'node:test'
import assert from 'node:assert/strict'
import { K5 } from './hybrid2/fixtures/reference-adapters.js'
import { makeFixtureCycle } from './hybrid2/fixtures/cycles.js'
import { replayHybridHistory } from './hybrid2/history.js'

test('corrupt workout controller version should not be interpreted as HYBRID-2', () => {
  const logs = makeFixtureCycle(K5,0,15)
  logs[0].hybrid2.controllerVersion = 'HYBRID-1'
  assert.throws(() => replayHybridHistory({workouts:logs,adapter:K5.adapter}), /version|controller|mismatch/i)
})

test('missing required structural workout event cannot bypass provenance verification', () => {
  const logs = makeFixtureCycle(K5,0,15)
  delete logs[0].hybrid2
  assert.throws(() => replayHybridHistory({workouts:logs,adapter:K5.adapter}), /structural|missing|event|version/i)
})

test('old H1 metric marker cannot be silently replayed under new version', () => {
  const logs = makeFixtureCycle(K5,0,15)
  logs[0].exposures[0].hybrid2.metricVersion = 'H1-PREDECESSOR'
  assert.throws(() => replayHybridHistory({workouts:logs,adapter:K5.adapter}), /metric|version|fingerprint/i)
})
