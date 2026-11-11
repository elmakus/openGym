// Explicit, reviewed migration of source-native H1 memory. The checkpoint is
// immutable canonical evidence, NOT a device-owned HYBRID-2 controller snapshot.
// A checksum detects accidental edits; it is not proof of source authenticity.
import { canonicalJSON, contentHash, deepFreeze } from '../../engine/canonical.js'
import { chronologicalWorkouts } from '../../engine/context.js'
import { compilePlanAdapter } from './adapter.js'
import { validateAnchor } from './h1.js'

const fail = reason => { throw new Error('HYBRID-2 bootstrap: ' + reason) }
const label = value => typeof value === 'string' && value.trim().length > 0
const iso = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) &&
  new Date(Date.parse(value)).toISOString() === value
const tagged = w => w.hybrid2 != null || (w.exposures || []).some(x => x.hybrid2 != null)

export function createHybridBootstrap({ adapter, sourceId, cutoverAt, importedAt, anchors }) {
  const compiled = compilePlanAdapter(adapter)
  if (!label(sourceId) || sourceId.length > 200) fail('reviewed source ID is required')
  if (!iso(cutoverAt) || !iso(importedAt) || Date.parse(importedAt) < Date.parse(cutoverAt))
    fail('valid UTC cutover/import timestamps required')
  if (!anchors || typeof anchors !== 'object' || Array.isArray(anchors) ||
      Object.keys(anchors).length !== compiled.signals.length)
    fail('exact H1 signal identities required')
  const normalized = {}
  for (const signal of compiled.signals) {
    if (!Object.hasOwn(anchors, signal.signalId)) fail('missing H1 signal: ' + signal.signalId)
    const original = validateAnchor(anchors[signal.signalId])
    const fields = ['perf1', 'perf2', 'perf3', 'perfCount', 'perfReference', 'candidateGuard']
    if (Object.keys(original).length !== fields.length || fields.some(k => !Object.hasOwn(original, k)))
      fail('unsupported H1 anchor fields')
    normalized[signal.signalId] = Object.fromEntries(fields.map(k => [k, original[k]]))
  }
  const body = {
    version: 1, source: 'LIFTOSAUR_H1_V1', sourceId, cutoverAt, importedAt,
    namespace: compiled.namespace, planVersion: compiled.planVersion,
    adapterFingerprint: compiled.adapterFingerprint, anchors: normalized
  }
  return deepFreeze({ ...body, checksum: contentHash(body) })
}

export function validateHybridBootstrap(checkpoint, adapter) {
  if (!checkpoint || typeof checkpoint !== 'object' || Array.isArray(checkpoint))
    fail('checkpoint object required')
  if (checkpoint.version !== 1 || checkpoint.source !== 'LIFTOSAUR_H1_V1')
    fail('unsupported checkpoint provenance/version')
  const rebuilt = createHybridBootstrap({ ...checkpoint, adapter })
  if (canonicalJSON(checkpoint) !== canonicalJSON(rebuilt))
    fail('checkpoint checksum, identity or fields changed')
  return rebuilt
}

export function assertHybridBootstrapHistory(workouts = [], adapter, checkpoint) {
  if (!checkpoint) return
  const verified = validateHybridBootstrap(checkpoint, adapter)
  const compiled = compilePlanAdapter(adapter)
  const cutover = Date.parse(verified.cutoverAt)
  const occurrenceIds = new Set(compiled.occurrences.map(o => o.occurrenceId))
  let first = true
  for (const w of chronologicalWorkouts(workouts)) {
    const exposures = w.exposures || []
    const hasTag = tagged(w)
    const mapped = exposures.some(x => occurrenceIds.has(x.occurrenceId))
    if (!hasTag && !mapped) continue
    if (!Number.isFinite(w.start)) fail('structural history requires an exact start timestamp')
    if (hasTag && w.start <= cutover)
      fail('HYBRID-2 event at or before native H1 cutover')
    if (hasTag && w.start < Date.parse(verified.importedAt))
      fail('native H1 checkpoint must precede first recorded HYBRID-2 event')
    if (mapped && w.start > cutover && !hasTag)
      fail('untagged adapter workout after native H1 cutover')
    if (hasTag && first) {
      const positions = [...new Set(exposures.filter(x => x.hybrid2).map(x => x.hybrid2.cyclePosition))]
      if (positions.length !== 1 || positions[0] !== compiled.cycleStartPosition)
        fail('first imported H1 structural workout must begin at cycle start')
      first = false
    }
  }
}

export function validateHybridBootstrapTransition(previous, next) {
  const old = previous?.trainingControl?.hybrid2Bootstrap
  const incoming = next?.trainingControl?.hybrid2Bootstrap
  if (!old && !incoming) return { ok: true, errors: [] }
  const errors = []
  const explicitReset = next?.workouts?.length === 0 &&
    Number(next?.resetAt) > Number(previous?.resetAt || 0)
  if (old && canonicalJSON(old) !== canonicalJSON(incoming) && !explicitReset)
    errors.push('native H1 bootstrap is immutable after first server write')
  if (!old && incoming && (previous?.workouts || []).some(tagged))
    errors.push('native H1 bootstrap must be installed before server HYBRID-2 history')
  return { ok: errors.length === 0, errors }
}
