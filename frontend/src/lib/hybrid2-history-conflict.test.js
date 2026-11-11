import { describe, expect, it } from 'vitest'
import { mergeStates } from './sync-merge.js'
import { reconcileHybridHistory, resolveHybridHistoryConflict } from './hybrid2-sync.js'
import { createHybridBootstrap } from '../../../api/training-control/hybrid2/bootstrap.js'
import { K5 } from '../../../api/training-control/hybrid2/fixtures/reference-adapters.js'
import { fixtureCycles } from '../../../api/training-control/hybrid2/fixtures/cycles.js'

const copy = value => JSON.parse(JSON.stringify(value))
const source = () => fixtureCycles(K5, [
  { reps: 15 }, { reps: 15 }, { reps: 15 }, { reps: 15 },
  { reps: 8 }, { reps: 8, frozen: true }
])
function profile(workouts, time = 1000) {
  return {
    engineSchemaVersion: 2, unit: 'kg', _ts: time, routines: copy(K5.routines),
    workouts: copy(workouts), prescriptions: {}, customEx: [], bodyweight: [],
    trainingControl: { hybrid2Config: { version: 1, enabled: true,
      adapter: copy(K5.adapter) } }, progression: {}, oneRepMaxes: {}
  }
}
function conflictingPair() {
  const records = source()
  const local = profile(records, 2000)
  const remote = profile(records, 3000)
  // A historical result was corrected offline, but the subsequent frozen
  // session on the other device was prescribed by the original queued vote.
  const firstWeak = K5.adapter.orderedCyclePositions.length * 4
  for (let i = firstWeak; i < firstWeak + 5; i++) {
    remote.workouts[i]._ts = 5000
    for (const x of remote.workouts[i].exposures)
      x.performance.sets[0].observations[0].value = 15
  }
  expect(reconcileHybridHistory(local)).toBeTruthy()
  return { local, remote, firstWeak }
}

describe('HYBRID-2 offline sync must preserve conflicting historical evidence', () => {
  it('records both sides of an invalid 409 merge and refuses to treat it as resolved', () => {
    const { local, remote, firstWeak } = conflictingPair()
    const merged = mergeStates(local, remote)
    expect(merged.trainingControl.hybrid2Diagnostics.status).toBe('INCOMPATIBLE')
    const pending = merged.trainingControl.hybrid2HistoryConflict
    expect(pending).toBeDefined()
    expect(pending.reason).toMatch(/deload|history|shape/i)
    expect(pending.entries.length).toBeGreaterThan(0)
    const changed = pending.entries.find(x => x.id === local.workouts[firstWeak].id)
    expect(changed.local).toEqual(local.workouts[firstWeak])
    expect(changed.remote).toEqual(remote.workouts[firstWeak])
    expect(merged.trainingControl.hybrid2).toBeUndefined()
    const repeated = mergeStates(merged, local)
    expect(repeated.trainingControl.hybrid2HistoryConflict).toBeDefined()
  })

  it('recovers explicitly with verified choices, preserving evidence, no H1 reset', () => {
    const { local, remote, firstWeak } = conflictingPair()
    const merged = mergeStates(local, remote)
    const pending = merged.trainingControl.hybrid2HistoryConflict
    const selection = Object.fromEntries(pending.entries.map(e => [e.id, 'local']))
    expect(() => resolveHybridHistoryConflict(merged, {})).toThrow(/select|review/i)
    resolveHybridHistoryConflict(merged, selection)
    expect(merged.trainingControl.hybrid2HistoryConflict).toBeUndefined()
    expect(merged.trainingControl.hybrid2HistoryReviews).toHaveLength(1)
    expect(merged.trainingControl.hybrid2HistoryReviews[0].entries).toEqual(pending.entries)
    expect(merged.trainingControl.hybrid2Config.enabled).toBe(false)
    expect(merged.trainingControl.hybrid2Diagnostics.status).toBe('DISABLED')
    expect(merged.workouts.map(w => [w.id, w.exposures]))
      .toEqual(local.workouts.map(w => [w.id, w.exposures]))
    expect(merged.workouts.find(w => w.id === local.workouts[firstWeak].id)._ts)
      .toBeGreaterThan(local.workouts[firstWeak]._ts || 0)
    expect(merged.trainingControl.hybrid2HistoryReviews[0].choices).toEqual(selection)
    const staleLater = copy(remote)
    staleLater._ts = merged._ts + 1000
    const afterReviewMerge = mergeStates(merged, staleLater)
    expect(afterReviewMerge.trainingControl.hybrid2HistoryReviews).toHaveLength(1)
    expect(afterReviewMerge.workouts.find(w => w.id === local.workouts[firstWeak].id)
      .exposures).toEqual(local.workouts[firstWeak].exposures)
    // A stale device may open a new review; it must not overwrite the
    // explicitly chosen performance or erase the prior review receipt.
  })

  it('merges independent compatible history edits without manufacturing a conflict', () => {
    const records = fixtureCycles(K5, [{ reps: 15 }])
    const a = profile(records, 1500), b = profile(records, 2000)
    a.workouts[0].note = 'Reviewed first day'
    a.workouts[0]._ts = 4000
    b.workouts[1].note = 'Reviewed second day'
    b.workouts[1]._ts = 5000
    const merged = mergeStates(a, b)
    expect(merged.trainingControl.hybrid2HistoryConflict).toBeUndefined()
    expect(merged.trainingControl.hybrid2Diagnostics.status).not.toBe('INCOMPATIBLE')
    expect(merged.workouts[0].note).toBe('Reviewed first day')
    expect(merged.workouts[1].note).toBe('Reviewed second day')
  })
  it('holds conflicting completed H1 values even when both replay paths remain structurally valid', () => {
    const records = fixtureCycles(K5, [{ reps: 15 }])
    const a = profile(records, 2000), b = profile(records, 3000)
    a.workouts[1]._ts = 4000
    b.workouts[1]._ts = 5000
    a.workouts[1].exposures[0].performance.sets[0].observations[0].value = 12
    b.workouts[1].exposures[0].performance.sets[0].observations[0].value = 8
    expect(reconcileHybridHistory(a)).toBeTruthy()
    expect(reconcileHybridHistory(b)).toBeTruthy()
    const out = mergeStates(a, b)
    expect(out.trainingControl.hybrid2HistoryConflict).toBeDefined()
    expect(out.trainingControl.hybrid2HistoryConflict.entries.map(e => e.id))
      .toContain(records[1].id)
    expect(out.trainingControl.hybrid2Diagnostics.status).toBe('INCOMPATIBLE')
    expect(out.trainingControl.hybrid2).toBeUndefined()
  })

  it('refuses a stale device editing existing H1 evidence without its imported native checkpoint', () => {
    const records = fixtureCycles(K5, [{ reps: 15 }])
    const original = profile(records, 3000)
    const anchor = Object.fromEntries(K5.adapter.signals.map(s => [s.signalId, {
      perf1: 100, perf2: 100, perf3: 100, perfCount: 3,
      perfReference: 100, candidateGuard: 0
    }]))
    original.trainingControl.hybrid2Bootstrap = createHybridBootstrap({
      adapter: K5.adapter, sourceId: 'reviewed-cutover',
      cutoverAt: '2025-12-30T20:00:00.000Z',
      importedAt: '2025-12-30T22:00:00.000Z', anchors: anchor
    })
    const stale = profile(records, 4000)
    stale.workouts[2]._ts = 6000
    stale.workouts[2].exposures[0].performance.sets[0].observations[0].value = 10
    const out = mergeStates(original, stale)
    expect(out.trainingControl.hybrid2BootstrapConflict).toBeDefined()
    expect(out.trainingControl.hybrid2Diagnostics.status).toBe('INCOMPATIBLE')
    expect(out.trainingControl.hybrid2).toBeUndefined()
  })

})
