// HYBRID-2 is supervisory: it may change one session's prescription and
// permission to persist progression, never an ATP2/Timed Load/Engine v2 reducer.
import { contentHash, deepFreeze } from '../../engine/canonical.js'
import { deloadSetBudget, reactivePermissions } from './lifecycle.js'
import { replayHybridHistory } from './history.js'
import { compilePlanAdapter } from './adapter.js'

const fail = msg => { throw new Error('HYBRID-2 supervisor: ' + msg) }
const freeze = p => {
  const { contentHash: old, ...body } = p
  return deepFreeze({ ...body, contentHash: contentHash(body) })
}
export function deloadPrescription(prescription, { zeroOverride = false, normalLoad = null } = {}) {
  if (!Array.isArray(prescription?.rows) || !prescription.rows.length)
    fail('unsupported prescription rows')
  const budget = deloadSetBudget(prescription.rows.length, true, zeroOverride)
  if (budget === 0) return { prescription: null, workingSets: 0,
    permissions: reactivePermissions(true) }
  const rows = prescription.rows.slice(0, budget).map(row => normalLoad == null ? row : ({
    ...row, ...(row.load ? { load: { ...row.load, value: normalLoad } } : {})
  }))
  const prefill = normalLoad == null ? prescription.prefill : {
    ...prescription.prefill,
    ...(prescription.prefill?.load ? { load: { ...prescription.prefill.load, value: normalLoad } } : {})
  }
  return {
    prescription: freeze({ ...prescription, rows, prefill,
      provenance: { ...prescription.provenance, hybrid2: {
        controllerVersion: 'HYBRID-2', state: 'DELOAD', normalLoadPreserved: true,
        originalWorkingSets: prescription.rows.length, deloadWorkingSets: budget
      } } }),
    workingSets: budget,
    permissions: reactivePermissions(true)
  }
}
const before = (workouts, time) => (workouts || []).filter(w =>
  (Number(w.start) || Date.parse(w.end) || 0) < time)
export function currentHybridPlan(profile, routine, now = Date.now()) {
  const config = profile.trainingControl?.hybrid2Config
  if (config?.enabled !== true) return null
  if (profile.trainingControl?.hybrid2Conflict || profile.trainingControl?.hybrid2Error)
    fail('unresolved HYBRID-2 configuration or history conflict')
  const adapter = compilePlanAdapter(config.adapter, profile.routines)
  const declared = adapter.occurrences.filter(o => o.routineId === routine.id)
  if (!declared.length) return null
  const positions = new Set(declared.map(x => x.cyclePosition))
  if (positions.size !== 1) fail('routine has mixed structural positions')
  const position = [...positions][0]
  verifyFrozenHistory(profile.workouts, adapter)
  const effective = replayHybridHistory({
    workouts: before(profile.workouts, now), adapter: config.adapter,
    prescriptions: profile.prescriptions
  })
  const rt = effective.state.runtime
  const isStart = position === adapter.cycleStartPosition
  const frozen = rt.deloadQueued === 1 ? isStart :
    rt.deloadActive === 1 ? !isStart : false
  if (rt.deloadQueued && !isStart) fail('deload queued but structural start missing')
  return { adapter, position, frozen, status: effective.status,
    runtime: effective.state.runtime, lastDecisions: effective.decisions.slice(-5) }
}
export function hybridSessionMetadata(context, occurrence, unit) {
  const match = context.adapter.occurrences.find(x => x.occurrenceId === occurrence.occurrenceId)
  if (!match) fail('undeclared occurrence')
  return {
    version: 1, namespace: context.adapter.namespace, planVersion: context.adapter.planVersion,
    adapterFingerprint: context.adapter.adapterFingerprint,
    controllerVersion: context.adapter.controllerVersion,
    metricVersion: context.adapter.metricVersion, referenceVersion: context.adapter.referenceVersion,
    cyclePosition: match.cyclePosition, progressionIdentity: match.progressionIdentity,
    signalId: match.signalId, signalClass: context.adapter.signals.find(s => s.signalId === match.signalId)?.signalClass || null,
    deloadFrozen: context.frozen, unit
  }
}
export function verifyFrozenHistory(workouts, adapter) {
  // No stored deload exposure, even a maliciously edited old one, can advance
  // subordinate controllers through the normal replay functions.
  for (const w of workouts || []) for (const x of w.exposures || []) {
    if (x.hybrid2?.namespace !== adapter.namespace) continue
    if (x.hybrid2.deloadFrozen && x.excludedFromProgression !== true)
      fail('deload exposure missing persistent progression exclusion')
  }
}
