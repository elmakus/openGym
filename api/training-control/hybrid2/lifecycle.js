// Exact HYBRID-2 lifecycle / deload policy port from fitness@9f2deb6
// hybrid2_runtime_bridge.py. No RTT, cooldown or additional detector.
const fail = msg => { throw new Error('HYBRID-2 lifecycle: ' + msg) }
export function initialRuntime() {
  return { deloadQueued: 0, deloadActive: 0, deloadStarted: 0, rolloverClear: 0,
    badCycleStreak: 0, allSignalsReady: false, lastCycleClass: 0 }
}
export function validateRuntime(s) {
  if (!s || typeof s !== 'object') fail('runtime required')
  for (const k of ['deloadQueued', 'deloadActive', 'deloadStarted', 'rolloverClear'])
    if (![0, 1].includes(s[k])) fail(k + ' must be 0 or 1')
  if (![0, 1, 2].includes(s.lastCycleClass) ||
    !Number.isInteger(s.badCycleStreak) || s.badCycleStreak < 0 ||
    typeof s.allSignalsReady !== 'boolean') fail('invalid runtime')
  if (s.deloadQueued && s.deloadActive) fail('queued and active coexist')
  if (s.deloadStarted !== s.deloadActive) fail('active/started mismatch')
  if (s.rolloverClear && (s.deloadQueued || s.deloadActive)) fail('rollover latch during deload')
  return s
}
export function logicalState(s) {
  validateRuntime(s)
  return s.deloadActive ? 'DELOAD' : s.deloadQueued ? 'QUEUED' :
    !s.allSignalsReady ? 'LEARNING' : s.badCycleStreak > 0 ? 'SUSPECT' : 'NORMAL'
}
export function recordCycleEvaluation(s, evaluation) {
  validateRuntime(s)
  if (s.deloadActive || s.deloadQueued || s.rolloverClear) fail('cycle evaluated during lifecycle transition')
  const codes = { INDETERMINATE: 0, GOOD: 1, BROAD_WEAK: 2 }
  if (!(evaluation.cycleClass in codes)) fail('invalid cycle class')
  return validateRuntime({ ...initialRuntime(),
    deloadQueued: evaluation.queueDeload ? 1 : 0,
    badCycleStreak: evaluation.state.badCycleStreak, allSignalsReady: evaluation.allReady,
    lastCycleClass: codes[evaluation.cycleClass] })
}
const fresh = (rolloverClear = 0) => ({ ...initialRuntime(), rolloverClear })
export function cycleStartTransition(s, reducedSetShape) {
  validateRuntime(s)
  if (typeof reducedSetShape !== 'boolean') fail('shape must be boolean')
  if (s.rolloverClear) {
    if (reducedSetShape) fail('rollover synchronization must use normal sets')
    return { state: s, event: 'ROLLOVER_SYNC', epochReset: false }
  }
  if (s.deloadQueued) {
    if (!reducedSetShape) fail('queued start must have deload shape')
    return { state: validateRuntime({ ...s, deloadQueued: 0, deloadActive: 1, deloadStarted: 1, lastCycleClass: 0 }),
      event: 'DELOAD_STARTED', epochReset: false }
  }
  if (s.deloadActive) {
    if (reducedSetShape) return { state: s, event: 'DELOAD_CONTINUES', epochReset: false }
    return { state: fresh(1), event: 'STALE_ROLLOVER', epochReset: true }
  }
  if (reducedSetShape) fail('deload shape without queued/active cycle')
  return { state: s, event: 'NORMAL', epochReset: false }
}
export function settleRolloverLatch(s) {
  validateRuntime(s)
  return s.rolloverClear ? { ...s, rolloverClear: 0 } : s
}
export function completeDeloadCloser(s, completedWorkingSets) {
  validateRuntime(s)
  if (!Number.isInteger(completedWorkingSets) || completedWorkingSets < 0) fail('invalid completed sets')
  return s.deloadActive && completedWorkingSets > 0
    ? { state: fresh(), epochReset: true }
    : { state: s, epochReset: false }
}
export function deloadSetBudget(sets, frozen, zeroOverride = false) {
  if (!Number.isInteger(sets) || sets < 1 || typeof frozen !== 'boolean' || typeof zeroOverride !== 'boolean') fail('invalid deload budget')
  return !frozen ? sets : zeroOverride ? 0 : Math.floor((sets + 1) / 2)
}
export const reactivePermissions = frozen => ({
  persistentProgressionWrites: !frozen, transientDownwardSafety: true, h1Updates: !frozen
})
