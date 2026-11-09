// Deterministic HYBRID-STATE-2 reconstruction from chronological, identity-keyed
// completed workout evidence. Never merge old H1 state by last-write-wins.
import { chronologicalWorkouts, replayProgression } from '../../engine/context.js'
import { historicalAtp2Rows } from '../history.js'
import { evaluateAtp2 } from '../atp2.js'
import { initialHybridState, observeSignal, evaluateNormalCloser,
  startStructuralCycle, closeDeload, settleStructuralRollover, hybridStatus, validateHybridState } from './controller.js'
import { h1FromExposure, engineCandidate } from './observation.js'
import { compilePlanAdapter } from './adapter.js'

const fail = reason => { throw new Error('HYBRID-2 replay: ' + reason) }
const completedWork = exposure => (exposure?.performance?.sets || [])
  .filter(row => row.role === 'work' && row.status === 'completed').length
const byId = (workouts) => {
  const ids = new Map()
  for (const w of workouts) {
    if (!w?.id) fail('every HYBRID-2 workout needs a stable id')
    if (ids.has(w.id)) fail('duplicate workout id in canonical history')
    ids.set(w.id, w)
  }
  return [...ids.values()]
}
const ownSpec = (x, a) => x.hybrid2?.version === 1 &&
  x.hybrid2.namespace === a.namespace && x.hybrid2.planVersion === a.planVersion &&
  x.hybrid2.adapterFingerprint === a.adapterFingerprint
const tracked = (w, adapter) => (w.exposures || []).filter(x => x.hybrid2 != null &&
  (x.hybrid2.namespace == null || x.hybrid2.namespace === adapter.namespace))
  .filter(x => {
    if (!ownSpec(x, adapter)) fail('adapter version/fingerprint drift in historical log')
    return true
  })
const progressFor = (exposure, current, previousWorkouts, prescriptions) => {
  if (exposure.atp2?.version === 1) {
    const spec = exposure.atp2, rows = historicalAtp2Rows(exposure)
    const before = current || spec.initialState
    if (!rows.some(r => r.completed) || exposure.excludedFromProgression)
      return { beforeCandidate: before.candidate, afterCandidate: before.candidate, next: current }
    const state = current ? { ...current, minTarget: spec.initialState.minTarget,
      maxTarget: spec.initialState.maxTarget, floorWeight: spec.initialState.floorWeight,
      paired: spec.initialState.paired } : spec.initialState
    const after = evaluateAtp2({ state, rounding: spec.rounding, sets: rows, numberOfSets: rows.length }).nextState
    return { beforeCandidate: state.candidate, afterCandidate: after.candidate, next: after }
  }
  // Engine v2 is the only authority on its own progression. This path never
  // calculates "should raise load" from completed reps.
  const p = prescriptions?.[exposure.prescriptionId]
  const before = current || replayProgression({ workouts: previousWorkouts,
    trackId: exposure.trackId, prescriptions })
  const beforeCandidate = engineCandidate(before) ?? p?.prefill?.load?.value ?? p?.rows?.[0]?.load?.value
  if (!p || exposure.excludedFromProgression || !exposure.actual) return {
    beforeCandidate, afterCandidate: beforeCandidate, next: current
  }
  const stamp = Date.parse(exposure.completedAt)
  if (!Number.isFinite(stamp)) fail('missing completedAt for Engine v2 replay')
  const next = replayProgression({ workouts: [...previousWorkouts, {
    id: 'h2:current', start: stamp,
    d: exposure.completedAt?.slice(0, 10), exposures: [exposure]
  }], trackId: exposure.trackId, prescriptions })
  const afterCandidate = engineCandidate(next)
  return { beforeCandidate, afterCandidate: afterCandidate ?? beforeCandidate, next }
}

/** Replay from verified adapter and saved structural exposures; no device snapshots accepted. */
export function replayHybridHistory({ workouts = [], adapter, prescriptions = {} }) {
  const compiled = compilePlanAdapter(adapter)
  const sorted = chronologicalWorkouts(byId(workouts))
  let state = initialHybridState(compiled)
  const decisions = []
  const lastWorkouts = []
  const atp2ByTrack = new Map()
  const positionIndex = new Map(compiled.orderedCyclePositions.map((p, i) => [p, i]))
  let lastPosition = -1
  for (const w of sorted) {
    const exposures = tracked(w, compiled)
    if (w.hybrid2?.namespace === compiled.namespace) {
      const positions = [...new Set(exposures.map(x => x.hybrid2?.cyclePosition))]
      if (w.hybrid2.version !== 1 || w.hybrid2.planVersion !== compiled.planVersion ||
          w.hybrid2.adapterFingerprint !== compiled.adapterFingerprint ||
          JSON.stringify(w.hybrid2.positions) !== JSON.stringify(positions))
        fail('structural event metadata mismatch')
    }
    if (!exposures.length) { lastWorkouts.push(w); continue }
    const positions = [...new Set(exposures.map(x => x.hybrid2.cyclePosition))]
      .sort((a, b) => (positionIndex.get(a) ?? -1) - (positionIndex.get(b) ?? -1))
    for (const position of positions) {
      const slot = positionIndex.get(position)
      if (slot === undefined) fail('unknown cycle position')
      const current = exposures.filter(x => x.hybrid2.cyclePosition === position)
      const frozen = current[0].hybrid2.deloadFrozen
      if (typeof frozen !== 'boolean' || current.some(x => x.hybrid2.deloadFrozen !== frozen))
        fail('mixed/incomplete deload flags in one position')
      if (frozen && current.some(x => x.excludedFromProgression !== true))
        fail('frozen deload must exclude every exposure from durable progression')
      if (lastPosition >= 0 && slot !== (lastPosition + 1) % positionIndex.size)
        fail('missing or reordered structural position: cannot infer cycle safely')
      if (slot === 0) {
        // On the NEXT start after a missed closer, the normal shape is authoritative
        // and signals stale rollover rather than delivering a second deload.
        const expectedFrozen = state.runtime.deloadQueued === 1
        if (frozen !== expectedFrozen) fail('wrong deload shape at cycle start')
        const start = startStructuralCycle(state, compiled, { reducedSetShape: frozen })
        state = start.state
        decisions.push({ workoutId: w.id, event: start.event, epochReset: start.epochReset })
      } else if (state.runtime.deloadActive !== Number(frozen))
        fail('deload shape drift within structural cycle')
      if (state.runtime.rolloverClear) {
        // Stale-start is the convergence event; do not use its observations as new H1 seed.
        // The latch protects reset propagation, and is settled at the next safe position.
        for (const x of current) if (!x.excludedFromProgression && x.hybrid2.deloadFrozen)
          fail('stale rollover cannot progress')
        state = settleStructuralRollover(state, compiled)
        decisions.push({ workoutId: w.id, event: 'ROLLOVER_SETTLED', epochReset: false })
        lastPosition = slot
        continue
      }
      const byOccurrence = new Map(current.map(x => [x.occurrenceId, x]))
      if (byOccurrence.size !== current.length) fail('duplicate occurrence within position')
      for (const spec of compiled.signals.filter(s => s.cyclePosition === position)) {
        const x = byOccurrence.get(spec.occurrence)
        if (!x || frozen) continue
        if (x.mode === 'time' || x.timedLoad?.version === 1 || spec.signalClass !== 'LOADED_REPS')
          fail('unsupported H1 signal class')
        if (x.hybrid2.signalId !== spec.signalId ||
            x.hybrid2.progressionIdentity !== spec.progressionIdentity)
          fail('H1 identity mismatch')
        const prev = atp2ByTrack.get(x.trackId)
        const progress = progressFor(x, prev, lastWorkouts, prescriptions)
        const signal = h1FromExposure(x, { beforeCandidate: progress.beforeCandidate,
          afterCandidate: progress.afterCandidate,
          baselineUnit: x.atp2?.version === 1 ? x.hybrid2.unit : x.hybrid2.unit })
        state = observeSignal(state, compiled, spec.signalId, signal).state
      }
      // The subordinate reducer is applied to every non-frozen ATP2 occurrence,
      // including occurrences not selected as H1 signals.
      for (const x of current) {
        if (!x?.atp2 || x.excludedFromProgression) continue
        const result = progressFor(x, atp2ByTrack.get(x.trackId), lastWorkouts, prescriptions)
        if (result.next) atp2ByTrack.set(x.trackId, result.next)
      }
      const closer = byOccurrence.get(compiled.closerOccurrence)
      if (closer) {
        if (frozen) {
          const result = closeDeload(state, compiled, completedWork(closer))
          state = result.state
          decisions.push({ workoutId: w.id, event: result.event, epochReset: result.epochReset })
        } else {
          const result = evaluateNormalCloser(state, compiled)
          state = result.state
          decisions.push({ workoutId: w.id, event: result.evaluation.cycleClass,
            evaluation: result.evaluation, epochReset: false })
        }
      }
      lastPosition = slot
    }
    lastWorkouts.push(w)
  }
  validateHybridState(state, compiled)
  return { state, status: hybridStatus(state), decisions, sourceCount: sorted.length }
}
