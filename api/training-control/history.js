// Deterministic ATP2 replay from completed openGym workout history.
// Engine v2's progression is replayed separately; ATP2 never writes into it.
import { evaluateAtp2 } from './atp2.js'

const observation = (row, metric) => row?.observations?.find(o => o.metric === metric)?.value
const load = row => row?.resistance?.kind === 'external-load' ? row.resistance.value : 0

/** Saved unilateral rows use a shared setId and one row for each limb. */
export function historicalAtp2Rows(exposure) {
  const rows = (exposure?.performance?.sets || []).filter(x => x.role === 'work')
  const out = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i], next = rows[i + 1]
    if (row.side === 'L' && next?.side === 'R' && row.setId === next.setId) {
      out.push({
        ordinal: out.length + 1,
        completed: row.status === 'completed' && next.status === 'completed',
        weight: Math.min(load(row), load(next)),
        leftReps: observation(row, 'repetitions'),
        reps: observation(next, 'repetitions')
      })
      i++
    } else {
      out.push({
        ordinal: out.length + 1,
        completed: row.status === 'completed',
        weight: load(row),
        reps: observation(row, 'repetitions')
      })
    }
  }
  return out
}

/** Full replay, not last-write-wins: history edits and sync must not double-progress. */
export function replayAtp2History(workouts) {
  const stateByTrack = {}
  const sorted = [...(workouts || [])].sort((a, b) =>
    (Number(a.start) || Date.parse(a.end) || 0) - (Number(b.start) || Date.parse(b.end) || 0)
      || String(a.id).localeCompare(String(b.id)))
  for (const workout of sorted) {
    // Like openGym finish-session: only the last counted exposure per track advances.
    const counted = new Map()
    for (const exposure of workout.exposures || []) {
      if (!exposure?.atp2 || exposure.excludedFromProgression) continue
      const rows = historicalAtp2Rows(exposure)
      if (rows.some(r => r.completed)) counted.set(exposure.trackId, { exposure, rows })
    }
    for (const [trackId, { exposure, rows }] of counted) {
      const spec = exposure.atp2
      if (spec.version !== 1 || !spec.rounding || !spec.initialState) continue
      const current = stateByTrack[trackId]
      // The exercise's target range, floor and side mode can evolve between workouts.
      // Its candidate and probe state must flow through the chronological records.
      const state = current
        ? { ...current, minTarget: spec.initialState.minTarget,
          maxTarget: spec.initialState.maxTarget,
          floorWeight: spec.initialState.floorWeight,
          paired: spec.initialState.paired }
        : spec.initialState
      stateByTrack[trackId] = evaluateAtp2({
        state, rounding: spec.rounding, sets: rows, numberOfSets: rows.length
      }).nextState
    }
  }
  return stateByTrack
}
