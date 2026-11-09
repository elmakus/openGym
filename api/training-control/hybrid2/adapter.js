// Pure static adapter compiler; port of fitness@9f2deb6 hybrid2_plan_adapter.py.
// No inference from exercise names, weekdays, number of signals or calendar.
import { CONTROLLER_VERSION, STATE_VERSION, METRIC_VERSION, REFERENCE_VERSION, WEAK_RATIO } from './h1.js'
import { contentHash } from '../../engine/canonical.js'

const fail = message => { throw new Error('HYBRID-2 adapter: ' + message) }
const required = (ok, reason) => { if (!ok) fail(reason) }
const label = v => typeof v === 'string' && v.trim().length > 0
const unique = xs => new Set(xs).size === xs.length
const posInt = v => Number.isInteger(v) && v > 0
const allowedStatus = new Set(['UNCHANGED', 'REVIEWED_PRESERVE', 'REVIEWED_RESET'])
export const PERSISTENCE_VERSION = 'HYBRID-WRITE-THROUGH-1'

export function validatePlanAdapter(a, routines = null) {
  required(a && typeof a === 'object' && !Array.isArray(a), 'object required')
  required(posInt(a.controllerTag), 'controllerTag must be a positive integer')
  required(label(a.planVersion) && label(a.namespace), 'planVersion and namespace required')
  required(a.segmentationMode === 'STATIC_ORDERED', 'unsupported segmentation')
  required(allowedStatus.has(a.comparabilityStatus), 'unreviewed comparability change')
  required(a.controllerPersistence === PERSISTENCE_VERSION, 'unsupported persistence')
  const positions = a.orderedCyclePositions
  required(Array.isArray(positions) && positions.length && positions.every(label) && unique(positions), 'invalid structural positions')
  required(positions[0] === a.cycleStartPosition, 'cycle start must be the first ordered position')
  const occurrences = a.occurrences
  required(Array.isArray(occurrences) && occurrences.length && unique(occurrences.map(x => x.occurrenceId)), 'invalid occurrence catalog')
  const slot = new Map(positions.map((x, i) => [x, i]))
  let prior = -1
  const catalog = new Map()
  for (const o of occurrences) {
    required(label(o.occurrenceId) && slot.has(o.cyclePosition), 'invalid occurrence / position')
    required(slot.get(o.cyclePosition) >= prior, 'occurrences out of structural order')
    required(o.progressionIdentity === null || label(o.progressionIdentity), 'invalid progression identity')
    required(typeof o.optional === 'boolean' && typeof o.controllerTagged === 'boolean' && typeof o.canRaiseCandidate === 'boolean', 'occurrence flags must be explicit')
    // openGym needs an exact routine/occurrence mapping, not a fuzzy name match.
    required(label(o.routineId), 'routineId mapping required')
    prior = slot.get(o.cyclePosition)
    catalog.set(o.occurrenceId, o)
  }
  const closer = catalog.get(a.closerOccurrence)
  required(closer && !closer.optional && closer.controllerTagged, 'closer must be guaranteed and tagged')
  required(closer.cyclePosition === positions.at(-1) && occurrences.at(-1) === closer, 'closer must be terminal')
  const signals = a.signals
  required(Array.isArray(signals) && signals.length, 'signals required')
  required(unique(signals.map(x => x.signalId)) && unique(signals.map(x => x.performanceIdentity)) && unique(signals.map(x => x.occurrence)), 'duplicate signal identity')
  const groupSet = new Set()
  for (const s of signals) {
    const o = catalog.get(s.occurrence)
    required([s.signalId, s.performanceIdentity, s.progressionIdentity, s.systemGroup].every(label), 'signal identities and systemGroup required')
    required(o && !o.optional && o.controllerTagged && o.cyclePosition === s.cyclePosition, 'signal occurrence must be guaranteed and matching')
    required(o.progressionIdentity === s.progressionIdentity, 'progression identity mismatch')
    required(s.signalClass === 'LOADED_REPS', 'unsupported H1 performance class (timed/isometric is not loaded reps)')
    required(['LOCAL_ONLY', 'SHARED_OBSERVED_SAFE'].includes(s.candidateChangeVisibility), 'candidate visibility required')
    const writers = occurrences.filter(peer => peer.occurrenceId !== o.occurrenceId &&
      peer.progressionIdentity === s.progressionIdentity && peer.canRaiseCandidate)
    required(writers.length === 0 || s.candidateChangeVisibility === 'SHARED_OBSERVED_SAFE', 'ambiguous shared candidate ownership')
    groupSet.add(s.systemGroup)
  }
  required(groupSet.size >= 2, 'at least two effective groups required')
  const t = a.thresholds
  required(t && [t.minValidSignals, t.broadWeakMin, t.fastWeakMin].every(x => posInt(x) && x <= signals.length), 'unreachable thresholds')
  required(posInt(t.slowBroadCycles), 'slowBroadCycles must be positive')
  required(t.weakRatio === WEAK_RATIO, 'unapproved weak-ratio policy')
  const zeros = a.zeroOverrides || []
  required(Array.isArray(zeros) && unique(zeros), 'invalid ZERO overrides')
  for (const id of zeros) {
    const o = catalog.get(id)
    required(o && o.optional && o.occurrenceId !== a.closerOccurrence && !signals.some(s => s.occurrence === id), 'ZERO override requires non-signal optional work')
  }
  // When bound to a live openGym plan, require the exact occurrence order and guaranteed
  // terminal closer. The static adapter does not authorize changes to that plan.
  if (routines !== null) {
    required(Array.isArray(routines), 'routines must be supplied')
    const byId = new Map(routines.map(r => [r.id, r]))
    const byPos = new Map()
    for (const o of occurrences) {
      const r = byId.get(o.routineId)
      required(r && Array.isArray(r.ex), 'missing bound routine')
      required(r.ex.some(e => e.occurrenceId === o.occurrenceId), 'missing bound occurrence')
      if (!byPos.has(o.cyclePosition)) byPos.set(o.cyclePosition, new Set())
      byPos.get(o.cyclePosition).add(o.routineId)
    }
    required(positions.every(p => byPos.has(p) && byPos.get(p).size === 1), 'cycle position must bind to exactly one routine')
    for (const p of positions) {
      const rid = [...byPos.get(p)][0], r = byId.get(rid)
      const recorded = occurrences.filter(x => x.cyclePosition === p).map(x => x.occurrenceId)
      required(JSON.stringify(r.ex.map(x => x.occurrenceId)) === JSON.stringify(recorded), 'plan changed: catalog no longer matches routine order')
    }
    const last = byId.get(closer.routineId).ex.at(-1)
    required(last.occurrenceId === closer.occurrenceId, 'closer is no longer terminal')
  }
  return a
}

export function compilePlanAdapter(adapter, routines = null) {
  const a = validatePlanAdapter(adapter, routines)
  const slots = new Map(a.orderedCyclePositions.map((p, i) => [p, i + 1]))
  return {
    controllerVersion: CONTROLLER_VERSION, stateSchemaVersion: STATE_VERSION,
    metricVersion: METRIC_VERSION, referenceVersion: REFERENCE_VERSION,
    controllerTag: a.controllerTag, namespace: a.namespace, planVersion: a.planVersion,
    adapterFingerprint: contentHash(a),
    orderedCyclePositions: [...a.orderedCyclePositions], cycleStartPosition: a.cycleStartPosition,
    closerOccurrence: a.closerOccurrence,
    occurrences: a.occurrences.map((o, i) => ({ ...o, executionOrder: i + 1, cyclePositionSlot: slots.get(o.cyclePosition),
      signalId: a.signals.find(s => s.occurrence === o.occurrenceId)?.signalId || null,
      isCloser: o.occurrenceId === a.closerOccurrence, zeroOverride: (a.zeroOverrides || []).includes(o.occurrenceId) })),
    signals: a.signals.map((s, i) => ({ ...s, signalSlot: i + 1, cyclePositionSlot: slots.get(s.cyclePosition) })),
    thresholds: { ...a.thresholds }, comparabilityStatus: a.comparabilityStatus,
    controllerPersistence: PERSISTENCE_VERSION
  }
}
