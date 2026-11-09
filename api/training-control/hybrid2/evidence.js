// HYBRID-STATE-2 persisted evidence contract. Validate BEFORE replaying
// progression, casting weak votes or recognising a terminal closer.
// A missing/skipped performance set is NOT invalid structural identity.
const fail = reason => { throw new Error('HYBRID-2 replay: ' + reason) }
const obj = x => x && typeof x === 'object' && !Array.isArray(x)
const nonempty = x => typeof x === 'string' && x.length > 0
const match = (actual, expected, label) => {
  if (actual !== expected) fail(label + ' metadata mismatch')
}
const versioned = (event, compiled) => {
  if (!obj(event)) fail('missing structural workout event')
  match(event.version, 1, 'structural version')
  match(event.controllerVersion, compiled.controllerVersion, 'structural controllerVersion')
  match(event.stateSchemaVersion, compiled.stateSchemaVersion, 'structural stateSchemaVersion')
  if (event.metricVersion !== undefined) match(event.metricVersion, compiled.metricVersion, 'structural metricVersion')
  if (event.referenceVersion !== undefined) match(event.referenceVersion, compiled.referenceVersion, 'structural referenceVersion')
  if (!nonempty(event.namespace) || !nonempty(event.planVersion) ||
      !nonempty(event.adapterFingerprint)) fail('missing structural provenance')
  if (!Array.isArray(event.positions) || !event.positions.length ||
      event.positions.some(p => !nonempty(p)) ||
      new Set(event.positions).size !== event.positions.length) fail('invalid structural positions')
}
const exposureVersion = (meta, event, compiled) => {
  if (!obj(meta)) fail('missing exposure metadata')
  match(meta.version, 1, 'exposure version')
  match(meta.controllerVersion, compiled.controllerVersion, 'exposure controllerVersion')
  match(meta.metricVersion, compiled.metricVersion, 'exposure metricVersion')
  match(meta.referenceVersion, compiled.referenceVersion, 'exposure referenceVersion')
  if (meta.stateSchemaVersion !== undefined)
    match(meta.stateSchemaVersion, compiled.stateSchemaVersion, 'exposure stateSchemaVersion')
  match(meta.namespace, event.namespace, 'exposure namespace')
  match(meta.planVersion, event.planVersion, 'adapter version/fingerprint drift: exposure planVersion')
  match(meta.adapterFingerprint, event.adapterFingerprint, 'adapter version/fingerprint drift: exposure adapterFingerprint')
  if (!nonempty(meta.cyclePosition)) fail('missing exposure cyclePosition')
  if (meta.unit !== 'kg' && meta.unit !== 'lb') fail('invalid H1 load unit')
  if (typeof meta.deloadFrozen !== 'boolean') fail('missing deloadFrozen metadata')
}

/** Only tagged workouts need the H2 evidence contract; legacy records are untouched.
 * No exercise may impersonate the closer by changing only occurrenceId.
 */
export function verifiedHybridExposures(workout, compiled) {
  const all = workout.exposures || []
  if (!Array.isArray(all)) fail('invalid exposure catalog')
  const tagged = all.filter(x => x?.hybrid2 != null)
  if (!tagged.length && workout.hybrid2 == null) return []
  const event = workout.hybrid2
  versioned(event, compiled)
  if (!tagged.length) fail('structural event missing tagged exposures')
  // All marked exposures belong to this single persisted structural event.
  // Even a foreign namespace fails closed: a historical H2 adapter/epoch change
  // requires explicit review, never silent omission from chronological replay.
  for (const x of tagged) {
    const meta = x.hybrid2
    exposureVersion(meta, event, compiled)
  }
  match(event.namespace, compiled.namespace, 'structural namespace')
  match(event.planVersion, compiled.planVersion, 'adapter version/fingerprint drift: structural planVersion')
  match(event.adapterFingerprint, compiled.adapterFingerprint, 'adapter version/fingerprint drift: structural adapterFingerprint')

  const occurrenceById = new Map(compiled.occurrences.map(o => [o.occurrenceId, o]))
  for (const x of all) {
    if (x?.hybrid2 == null && occurrenceById.has(x?.occurrenceId))
      fail('missing HYBRID-2 exposure metadata for declared occurrence')
  }
  const signalById = new Map(compiled.signals.map(s => [s.signalId, s]))
  const seenExposures = new Set()
  const seenOccurrences = new Set()
  for (const x of tagged) {
    if (!nonempty(x.exposureId) || seenExposures.has(x.exposureId))
      fail('missing or duplicate exposure identity')
    seenExposures.add(x.exposureId)
    if (!nonempty(x.occurrenceId) || seenOccurrences.has(x.occurrenceId))
      fail('missing or duplicate occurrence identity')
    seenOccurrences.add(x.occurrenceId)
    const o = occurrenceById.get(x.occurrenceId)
    if (!o) fail('undeclared occurrence identity')
    const meta = x.hybrid2
    match(x.routineId, o.routineId, 'routine identity')
    if (meta.occurrenceId !== undefined)
      match(meta.occurrenceId, o.occurrenceId, 'exposure metadata occurrenceId')
    match(meta.cyclePosition, o.cyclePosition, 'occurrence cyclePosition')
    match(meta.progressionIdentity, o.progressionIdentity, 'occurrence progressionIdentity')
    match(meta.signalId, o.signalId, 'occurrence signalId')
    const signal = o.signalId == null ? null : signalById.get(o.signalId)
    match(meta.signalClass, signal?.signalClass ?? null, 'occurrence signalClass')
    if (signal) {
      match(meta.progressionIdentity, signal.progressionIdentity, 'H1 progression identity')
      match(meta.cyclePosition, signal.cyclePosition, 'H1 structural position')
      if (x.mode !== 'reps' || x.timedLoad?.version === 1)
        fail('incompatible H1 signal class')
    }
    if (o.progressionIdentity !== null) match(x.trackId, o.progressionIdentity, 'exposure track identity')
    if (o.exerciseId !== undefined) match(x.exerciseId, o.exerciseId, 'exercise identity')
    // The caller checks deload-dependent durable progression exclusions.
  }
  const positions = [...new Set(tagged.map(x => x.hybrid2.cyclePosition))]
  if (JSON.stringify(event.positions) !== JSON.stringify(positions))
    fail('structural event metadata mismatch: positions')
  return tagged
}
