// Port of fitness@9f2deb6: hybrid2_controller_state.py (H2PERF-DEC-001).
// Only the controller owns this state. No progression controller writes here.
export const CONTROLLER_VERSION = 'HYBRID-2'
export const STATE_VERSION = 'HYBRID-STATE-2'
export const METRIC_VERSION = 'H1-EPL-1'
export const REFERENCE_VERSION = 'H1-ASYM-M3-1'
export const WEAK_RATIO = 0.95

const fail = message => { throw new Error('HYBRID-2 H1: ' + message) }
const number = value => typeof value === 'number' && Number.isFinite(value)
const integer = value => Number.isInteger(value)
const median3 = (a, b, c) => [a, b, c].sort((x, y) => x - y)[1]

export function loadedRepScore(weight, reps) {
  if (!number(weight) || weight <= 0 || !integer(reps) || reps <= 0) fail('invalid loaded-reps sample')
  return weight * (1 + reps / 30)
}
export function initialAnchor() {
  return { perf1: 0, perf2: 0, perf3: 0, perfCount: 0, perfReference: 0, candidateGuard: 0 }
}
export function validateAnchor(anchor) {
  if (!anchor || typeof anchor !== 'object' || Array.isArray(anchor)) fail('anchor object required')
  const { perf1, perf2, perf3, perfCount, perfReference, candidateGuard } = anchor
  if (![perf1, perf2, perf3, perfReference].every(x => number(x) && x >= 0)) fail('invalid performance slots/reference')
  if (![0, 1, 2, 3].includes(perfCount) || ![0, 1].includes(candidateGuard)) fail('invalid count/guard')
  if (perfCount === 0 && (perf1 !== 0 || perf2 !== 0 || perf3 !== 0 || perfReference !== 0)) fail('invalid unseeded anchor')
  if (perfCount === 1 && (perf1 <= 0 || perf2 !== 0 || perf3 !== 0 || perfReference !== 0)) fail('invalid count-1 anchor')
  if (perfCount === 2 && (perf1 <= 0 || perf2 <= 0 || perf3 !== 0 || perfReference !== 0)) fail('invalid count-2 anchor')
  if (perfCount === 3 && Math.min(perf1, perf2, perf3, perfReference) <= 0) fail('invalid seeded anchor')
  return anchor
}
export const anchorReady = a => validateAnchor(a).perfCount === 3

export function asymmetricReferenceUpdate(reference, estimate) {
  if (![reference, estimate].every(x => number(x) && x > 0)) fail('invalid reference/estimate')
  return reference + (estimate > reference ? 0.40 : estimate < reference ? 0.10 : 0) * (estimate - reference)
}

export function observeAnchor(state, { mode = 'NORMAL', kind, performance = null, candidateRaised = false, weakRatio = WEAK_RATIO }) {
  validateAnchor(state)
  if (!['NORMAL', 'DELOAD_FROZEN'].includes(mode) || !['COMPARABLE', 'MISSING', 'INVALID', 'INDETERMINATE', 'DISCONTINUITY'].includes(kind)) fail('invalid observation')
  if (typeof candidateRaised !== 'boolean' || !number(weakRatio) || weakRatio <= 0 || weakRatio >= 1) fail('invalid guard/threshold')
  const before = anchorReady(state) ? state.perfReference : null
  const result = (next, validVote = false, weak = false, guarded = false, reset = false) => ({
    state: validateAnchor(next), ready: anchorReady(next), validVote, weak, guarded, reset, referenceBefore: before
  })
  if (mode === 'DELOAD_FROZEN') return result(state)
  if (kind === 'DISCONTINUITY') return result(initialAnchor(), false, false, false, true)
  if (kind !== 'COMPARABLE') return result(candidateRaised ? { ...state, candidateGuard: 1 } : state)
  if (!number(performance) || performance <= 0) fail('comparable observation requires positive performance')
  const guarded = state.candidateGuard === 1
  const validVote = anchorReady(state) && !guarded
  const weak = validVote && performance <= before * weakRatio
  const guard = candidateRaised ? 1 : 0
  if (state.perfCount === 0) return result({ ...initialAnchor(), perf1: performance, perfCount: 1, candidateGuard: guard }, validVote, weak, guarded)
  if (state.perfCount === 1) return result({ ...state, perf2: performance, perfCount: 2, candidateGuard: guard }, validVote, weak, guarded)
  if (state.perfCount === 2) return result({
    ...state, perf3: performance, perfCount: 3, perfReference: median3(state.perf1, state.perf2, performance),
    candidateGuard: guard
  }, validVote, weak, guarded)
  const perf1 = state.perf2, perf2 = state.perf3, perf3 = performance
  return result({
    perf1, perf2, perf3, perfCount: 3,
    perfReference: asymmetricReferenceUpdate(state.perfReference, median3(perf1, perf2, perf3)),
    candidateGuard: guard
  }, validVote, weak, guarded)
}
