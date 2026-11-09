// Exact generic trigger projection port of fitness@9f2deb6 hybrid2_trigger_core.py.
const fail = message => { throw new Error('HYBRID-2 trigger: ' + message) }
export function evaluateCycle(projections, policy, state = { badCycleStreak: 0 }) {
  if (!Array.isArray(projections) || !projections.length) fail('signals required')
  if (new Set(projections.map(x => x.signalId)).size !== projections.length) fail('duplicate signal')
  if (!Number.isInteger(state.badCycleStreak) || state.badCycleStreak < 0) fail('invalid streak')
  const count = projections.length
  for (const k of ['minValidSignals', 'broadWeakMin', 'fastWeakMin'])
    if (!Number.isInteger(policy[k]) || policy[k] < 1 || policy[k] > count) fail('unreachable threshold')
  if (!Number.isInteger(policy.slowBroadCycles) || policy.slowBroadCycles < 1) fail('invalid slow threshold')
  for (const p of projections) {
    if (typeof p.signalId !== 'string' || !p.signalId.trim() || typeof p.systemGroup !== 'string' || !p.systemGroup.trim() ||
        !['ready', 'seen', 'valid', 'weak'].every(k => typeof p[k] === 'boolean') ||
        (p.valid && !p.seen) || (p.weak && !p.valid)) fail('invalid projection')
  }
  const seenCount = projections.filter(p => p.seen).length
  const validCount = projections.filter(p => p.valid).length
  const weakCount = projections.filter(p => p.weak).length
  const weakGroups = [...new Set(projections.filter(p => p.weak).map(p => p.systemGroup))].sort()
  const allReady = projections.every(p => p.ready)
  const evaluable = seenCount === count && validCount >= policy.minValidSignals
  const cycleClass = !evaluable ? 'INDETERMINATE' :
    weakCount >= policy.broadWeakMin && weakGroups.length >= 2 ? 'BROAD_WEAK' : 'GOOD'
  let badCycleStreak = state.badCycleStreak
  let fastTrigger = false, slowTrigger = false
  if (cycleClass === 'GOOD') badCycleStreak = 0
  else if (cycleClass === 'BROAD_WEAK' && allReady) {
    badCycleStreak++
    fastTrigger = weakCount >= policy.fastWeakMin
    slowTrigger = badCycleStreak >= policy.slowBroadCycles
  }
  return {
    cycleClass, evaluable, allReady, seenCount, validCount, weakCount, weakGroups,
    queueDeload: fastTrigger || slowTrigger, fastTrigger, slowTrigger,
    state: { badCycleStreak }
  }
}
