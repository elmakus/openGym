// HYBRID-2 semantic controller: H1 windows + generic trigger + lifecycle.
// Port of fitness@9f2deb6 modules hybrid2_{controller_state,trigger_core,runtime_bridge,state_integration}.py
import { CONTROLLER_VERSION, STATE_VERSION, METRIC_VERSION, REFERENCE_VERSION,
  initialAnchor, validateAnchor, anchorReady, observeAnchor, WEAK_RATIO } from './h1.js'
import { evaluateCycle } from './trigger.js'
import { initialRuntime, validateRuntime, logicalState, recordCycleEvaluation,
  cycleStartTransition, completeDeloadCloser, settleRolloverLatch } from './lifecycle.js'

const fail = reason => { throw new Error('HYBRID-2 state: ' + reason) }
const bareWindow = () => ({ seen: false, valid: false, weak: false })
const cloneMap = obj => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, { ...v }]))
const signalIds = adapter => adapter.signals.map(s => s.signalId)
export function initialHybridState(adapter) {
  const keys = signalIds(adapter)
  if (!keys.length || new Set(keys).size !== keys.length) fail('unique signals required')
  return {
    controllerVersion: CONTROLLER_VERSION, stateSchemaVersion: STATE_VERSION,
    metricVersion: METRIC_VERSION, referenceVersion: REFERENCE_VERSION,
    namespace: adapter.namespace, planVersion: adapter.planVersion,
    anchors: Object.fromEntries(keys.map(id => [id, initialAnchor()])),
    windows: Object.fromEntries(keys.map(id => [id, bareWindow()])),
    runtime: initialRuntime()
  }
}
export function validateHybridState(state, adapter) {
  if (!state || state.controllerVersion !== CONTROLLER_VERSION ||
      state.stateSchemaVersion !== STATE_VERSION || state.metricVersion !== METRIC_VERSION ||
      state.referenceVersion !== REFERENCE_VERSION) fail('unsupported state, metric or policy version')
  if (state.namespace !== adapter.namespace || state.planVersion !== adapter.planVersion)
    fail('plan adapter version changed without reviewed rebase')
  const expected = signalIds(adapter)
  for (const name of ['anchors', 'windows']) {
    const obj = state[name]
    if (!obj || typeof obj !== 'object' || Array.isArray(obj) ||
        JSON.stringify(Object.keys(obj)) !== JSON.stringify(expected)) fail('incompatible ' + name + ' identities')
  }
  for (const a of Object.values(state.anchors)) validateAnchor(a)
  for (const w of Object.values(state.windows))
    if (!['seen', 'valid', 'weak'].every(k => typeof w[k] === 'boolean') ||
        (w.valid && !w.seen) || (w.weak && !w.valid)) fail('invalid signal window')
  validateRuntime(state.runtime)
  return state
}
export function resetH1(state, adapter) {
  validateHybridState(state, adapter)
  const fresh = initialHybridState(adapter)
  return { ...state, anchors: fresh.anchors, windows: fresh.windows }
}
export function observeSignal(state, adapter, signalId, sample) {
  validateHybridState(state, adapter)
  if (!Object.hasOwn(state.anchors, signalId)) fail('unknown signal')
  if (state.runtime.deloadActive || state.runtime.rolloverClear)
    fail('cannot ingest H1 during deload/stale rollover')
  const observed = observeAnchor(state.anchors[signalId], {
    mode: 'NORMAL', weakRatio: adapter.thresholds.weakRatio, ...sample
  })
  const previous = state.windows[signalId]
  // One signal gets one observable representative sample per structural cycle.
  if (previous.seen) fail('duplicate H1 signal in structural cycle')
  return {
    state: validateHybridState({ ...state,
      anchors: { ...state.anchors, [signalId]: observed.state },
      windows: { ...state.windows, [signalId]: {
        seen: true, valid: observed.validVote, weak: observed.weak
      } }
    }, adapter), observation: observed
  }
}
export function absentSignal(state, adapter, signalId, kind = 'MISSING') {
  return observeSignal(state, adapter, signalId, { kind, performance: null, candidateRaised: false })
}
export function evaluateNormalCloser(state, adapter) {
  validateHybridState(state, adapter)
  if (state.runtime.deloadActive || state.runtime.deloadQueued || state.runtime.rolloverClear)
    fail('normal evaluation not allowed during deload lifecycle')
  const projections = adapter.signals.map(s => ({
    signalId: s.signalId, systemGroup: s.systemGroup,
    ready: anchorReady(state.anchors[s.signalId]), ...state.windows[s.signalId]
  }))
  const evaluation = evaluateCycle(projections, adapter.thresholds,
    { badCycleStreak: state.runtime.badCycleStreak })
  return {
    state: { ...state, windows: Object.fromEntries(signalIds(adapter).map(id => [id, bareWindow()])),
      runtime: recordCycleEvaluation(state.runtime, evaluation) },
    evaluation
  }
}
export function startStructuralCycle(state, adapter, { reducedSetShape = false } = {}) {
  validateHybridState(state, adapter)
  const transition = cycleStartTransition(state.runtime, reducedSetShape)
  const next = { ...state, runtime: transition.state }
  return {
    state: transition.epochReset ? { ...resetH1(next, adapter), runtime: transition.state } : next,
    event: transition.event, epochReset: transition.epochReset
  }
}
export function closeDeload(state, adapter, completedWorkingSets) {
  validateHybridState(state, adapter)
  const next = completeDeloadCloser(state.runtime, completedWorkingSets)
  const result = { ...state, runtime: next.state }
  return {
    state: next.epochReset ? resetH1(result, adapter) : result,
    epochReset: next.epochReset, event: next.epochReset ? 'DELOAD_CLOSED' : 'NO_RESET'
  }
}
export function settleStructuralRollover(state, adapter) {
  validateHybridState(state, adapter)
  return { ...state, runtime: settleRolloverLatch(state.runtime) }
}
export const hybridStatus = state => logicalState(state.runtime)
