// Safe extraction of source-evaluated Liftosaur H1 memory. Only an explicit,
// reviewed signal-to-anchor mapping is accepted; source names and exercise
// ordering are never used to infer an H1 signal. No Liftosaur writes occur.
import { compilePlanAdapter } from './adapter.js'
import { createHybridBootstrap } from './bootstrap.js'
import { validateAnchor } from './h1.js'

const fail = message => { throw new Error('HYBRID-2 native H1 import: ' + message) }
const obj = o => o != null && typeof o === 'object' && !Array.isArray(o)

function kg(value, field) {
  if (value == null) return 0
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value
  if (obj(value) && Number.isFinite(value.value) && value.value >= 0) {
    if (value.unit === 'kg') return value.value
    if (value.unit === 'lb') return value.value * 0.45359237
  }
  fail('invalid source weight/unit for ' + field)
}

export function nativeH1Anchor(state) {
  if (!obj(state)) fail('source progress state required')
  // Native Liftosaur omits zero-initialized counters from some evaluated states.
  const count = state.perfCount ?? 0
  const guard = state.candidateGuard ?? 0
  if (!Number.isInteger(count) || ![0, 1, 2, 3].includes(count) || ![0, 1].includes(guard))
    fail('invalid source H1 count/guard')
  const anchor = {
    perf1: kg(state.perf1, 'perf1'), perf2: kg(state.perf2, 'perf2'),
    perf3: kg(state.perf3, 'perf3'), perfCount: count,
    perfReference: kg(state.perfReference, 'perfReference'), candidateGuard: guard
  }
  return validateAnchor(anchor)
}

/** Native exercises are the evaluated original runtime output, not guessed
 * Liftoscript source strings. signalToNativeId binds each openGym signalId to
 * its explicitly reviewed original integer anchorId.
 */
export function bootstrapFromNativeExercises({
  exercises, adapter, signalToNativeId, sourceId, cutoverAt, importedAt
}) {
  const compiled = compilePlanAdapter(adapter)
  const signals = compiled.signals.map(s => s.signalId)
  if (!obj(signalToNativeId) ||
      Object.keys(signalToNativeId).length !== signals.length ||
      !signals.every(id => Object.hasOwn(signalToNativeId, id)))
    fail('complete reviewed signal-to-native-anchor mapping required')
  const wanted = new Map()
  for (const id of signals) {
    const nativeId = signalToNativeId[id]
    if (!Number.isSafeInteger(nativeId) || nativeId <= 0 || wanted.has(nativeId))
      fail('unique positive native anchor IDs required')
    wanted.set(nativeId, id)
  }
  if (!Array.isArray(exercises)) fail('evaluated source exercises required')
  const seen = new Map()
  for (const exercise of exercises) {
    const state = exercise?.progress?.state
    const rawId = state?.anchorId
    if (rawId == null || rawId === 0) continue
    if (!Number.isSafeInteger(rawId) || rawId <= 0 || !wanted.has(rawId) || seen.has(rawId))
      fail('unexpected/duplicate source anchor identity')
    for (const key of ['deloadQueued', 'deloadActive', 'deloadStarted', 'rolloverClear']) {
      // A H1-only bootstrap cannot carry an active or queued deload runtime.
      // The target must be a clean structural A-cycle boundary.
      if (state[key] != null && state[key] !== 0)
        fail('cannot import active or queued source lifecycle: ' + key)
    }
    seen.set(rawId, nativeH1Anchor(state))
  }
  if (seen.size !== signals.length) fail('missing native H1 anchors')
  const anchors = Object.fromEntries(signals.map(id => [id,
    seen.get(signalToNativeId[id])]))
  return createHybridBootstrap({
    adapter, sourceId, cutoverAt, importedAt, anchors
  })
}
