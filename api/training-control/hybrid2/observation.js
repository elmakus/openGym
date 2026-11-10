// HYBRID-2 comparability boundary: source hybrid2_promotion_materializer.py.
// The first completed working set is authoritative; later Turbo sets are not H1 samples.
import { loadedRepScore } from './h1.js'
import { historicalAtp2Rows } from '../history.js'
import { evaluateAtp2 } from '../atp2.js'
import { replayProgression } from '../../engine/context.js'

// H1 source parity policy (2026-11-10): the initial ~5..20 reps envelope is
// descriptive, not a hard observation limit. Pinned original Liftosaur accepts
// comparable 21..300-rep first working sets. Preserve the original semantics:
// valid positive integer reps, matched baseline load, and existing sentinels.
// Do not clamp scores or impose a new upper threshold on completed repetitions.
const KG_PER_LB = 0.45359237
const number = v => typeof v === 'number' && Number.isFinite(v)
const obs = (row, metric) => row?.observations?.find(x => x.metric === metric)?.value
const toKg = (weight, unit) => unit === 'kg' ? weight : unit === 'lb' ? weight * KG_PER_LB : null
const bare = (kind, candidateRaised = false) => ({ kind, performance: null, candidateRaised })
const sampleAt = rows => {
  if (!rows?.length) return null
  const first = rows.find(row => row.completed)
  if (!first || !(first.weight > 0)) return null
  if (first.leftReps != null) {
    const left = first.leftReps, right = first.reps
    if (!Number.isInteger(left) || !Number.isInteger(right) || (left === 1 && right === 1)) return null
    return { weight: first.weight, reps: left === 1 && right >= 3 ? right :
      right === 1 && left >= 3 ? left : Math.min(left, right) }
  }
  return first.reps !== 1 && Number.isInteger(first.reps) && first.reps > 0
    ? { weight: first.weight, reps: first.reps } : null
}

/** Return the actual first-set score/comparability, never infer an ATP2 candidate raise. */
export function h1FromExposure(exposure, { beforeCandidate, afterCandidate, baselineUnit = 'kg' } = {}) {
  if (!exposure || exposure.mode === 'time' || exposure.timedLoad || exposure.hybrid2?.signalClass === 'TIMED_LOAD')
    return bare('INDETERMINATE')
  if (exposure.excludedFromProgression || exposure.hybrid2?.deloadFrozen)
    return bare('INDETERMINATE')
  if (!number(beforeCandidate) || beforeCandidate <= 0) return bare('INDETERMINATE')
  let first
  if (exposure.atp2?.version === 1) first = sampleAt(historicalAtp2Rows(exposure))
  else {
    const rows = (exposure.performance?.sets || []).filter(row => row.role === 'work')
    const x = rows.find(row => row.status === 'completed')
    const partner = rows.find(row => row.setId === x?.setId && row.side === 'R')
    if (x?.side === 'L' && partner) {
      const left = obs(x, 'repetitions'), right = obs(partner, 'repetitions')
      first = sampleAt([{ completed: x.status === 'completed' && partner.status === 'completed',
        weight: Math.min(x.resistance?.value, partner.resistance?.value), leftReps: left, reps: right }])
    } else {
      first = sampleAt([{ completed: x?.status === 'completed',
        weight: x?.resistance?.value, reps: obs(x, 'repetitions') }])
    }
  }
  if (!first) return bare('INVALID')
  const firstUnit = (exposure.performance?.sets || []).find(r => r.role === 'work')?.resistance?.unit || baselineUnit
  const observedKg = toKg(first.weight, firstUnit)
  const baselineKg = toKg(beforeCandidate, baselineUnit)
  if (!number(observedKg) || !number(baselineKg) || observedKg <= 0 || baselineKg <= 0)
    return bare('INVALID')
  // Liftosaur discontinues when a manual first-set load differs from pre-candidate.
  if (Math.abs(observedKg - baselineKg) > 1e-7 * Math.max(observedKg, baselineKg))
    return bare('DISCONTINUITY')
  if (first.reps < 1) return bare('INVALID')
  const raised = number(afterCandidate) && afterCandidate > beforeCandidate + Math.max(1e-7, Math.abs(beforeCandidate) * 1e-8)
  // Exact original-fitness H1 behavior: a comparable first completed working
  // set remains valid at 21, 23, 300+ reps (no implicit high-rep exclusion).
  return { kind: 'COMPARABLE', performance: loadedRepScore(observedKg, first.reps),
    candidateRaised: raised }
}

/** Re-evaluate ATP2 from historical sets to obtain externally owned actual candidate delta. */
export function atp2NextCandidate(exposure, previous) {
  if (exposure?.atp2?.version !== 1 || exposure.excludedFromProgression) return null
  const spec = exposure.atp2
  const rows = historicalAtp2Rows(exposure)
  if (!rows.some(x => x.completed)) return null
  const state = previous ? { ...previous, minTarget: spec.initialState.minTarget,
    maxTarget: spec.initialState.maxTarget, floorWeight: spec.initialState.floorWeight,
    paired: spec.initialState.paired } : spec.initialState
  return evaluateAtp2({ state, rounding: spec.rounding, sets: rows, numberOfSets: rows.length }).nextState
}

/** Default Engine v2 candidate comes from its own chronological reducer, not H1 heuristics. */
export function engineCandidate(exposure, state) {
  const absolute = state?.values?.load
  return absolute?.mode === 'absolute' && number(absolute.value) ? absolute.value : null
}

export function engineStateForTrack(workouts, trackId, prescriptions) {
  return replayProgression({ workouts, trackId, prescriptions })
}
