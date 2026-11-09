// Experimental ATP2-BOOK bridge for openGym. The ATP2 reducer is the authority;
// this file adapts openGym's editable workout rows without altering the frozen prescription.
import { evaluateAtp2, normalizeAtp2State } from '../../../api/training-control/atp2.js'
import { isSideSet, isWarmupRow, syncSideAggregate } from './workout-model.js'

export function prepareAtp2Session({ config, previous, prescription, paired = false }) {
  if (config?.enabled !== true) return null
  const p = prescription
  if (p?.parameters?.durationSeconds || !p?.parameters?.reps || !p?.rows?.length || p.assisted) return null
  const divisor = paired ? 2 : 1
  const minTarget = Math.ceil(p.parameters.reps.min / divisor)
  const maxTarget = Math.ceil(p.parameters.reps.max / divisor)
  const candidate = previous?.candidate ?? p.prefill?.load?.value ?? p.rows[0]?.load?.value
  if (!Number.isFinite(candidate) || candidate <= 0 || minTarget < 2 || maxTarget < minTarget) return null
  const rounding = p.ruleSnapshot?.rounding
  const initialState = normalizeAtp2State({
    candidate, floorWeight: config.floorWeight ?? 0,
    minTarget, maxTarget, paired: paired ? 1 : 0,
    probeActive: previous?.probeActive ?? 0, lowCount: previous?.lowCount ?? 0
  }, rounding)
  return { version: 1, initialState, rounding }
}

export function atp2WorkRows(entry) {
  let ordinal = 0
  return (entry?.sets || []).filter(row => !isWarmupRow(row)).map(row => {
    ordinal++
    if (isSideSet(row)) {
      return {
        ordinal, completed: row.done === true,
        weight: Math.min(row.sides.L.w, row.sides.R.w),
        reps: row.sides.R.r, leftReps: row.sides.L.r
      }
    }
    return { ordinal, completed: row.done === true, weight: row.w, reps: row.r }
  })
}

export function prefillAtp2Entry(entry, exposure) {
  if (!exposure?.atp2 || !entry?.sets) return entry
  const w = exposure.atp2.initialState.candidate
  return {
    ...entry,
    target: { ...entry.target, weight: w },
    sets: entry.sets.map(row => {
      if (isWarmupRow(row)) return row
      if (isSideSet(row)) return syncSideAggregate({
        ...row, sides: {
          L: { ...row.sides.L, w, r: 1 },
          R: { ...row.sides.R, w, r: 1 }
        }
      })
      return { ...row, w, r: 1 }
    })
  }
}

/** Re-evaluate on any tick/untick; never overwrite logged sets or prescription. */
export function refreshAtp2Live(active, entryIndex) {
  const entry = active?.entries?.[entryIndex]
  const exposure = active?.exposures?.find(x => x.exposureId === entry?.exposureId)
  if (!exposure?.atp2 || exposure.excludedFromProgression || !entry) return null
  const workRows = atp2WorkRows(entry)
  if (!workRows.length) return null
  const result = evaluateAtp2({
    state: exposure.atp2.initialState,
    rounding: exposure.atp2.rounding,
    sets: workRows, numberOfSets: workRows.length
  })
  const lastCompleted = workRows.reduce((n, row) => row.completed ? row.ordinal : n, 0)
  let ordinal = 0
  entry.sets = entry.sets.map(row => {
    if (isWarmupRow(row)) return row
    ordinal++
    if (row.done || ordinal <= lastCompleted) return row
    const w = result.nextSetLoad
    if (isSideSet(row)) return syncSideAggregate({
      ...row, sides: {
        L: { ...row.sides.L, w },
        R: { ...row.sides.R, w }
      }
    })
    return { ...row, w }
  })
  entry.atp2Preview = {
    phase: result.uiPhase,
    candidate: result.nextState.candidate,
    probeActive: result.nextState.probeActive
  }
  return result
}
