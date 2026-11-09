// Chronological, idempotent reconstruction from immutable completed exposure logs.
// No last-write-wins merge of candidate state: edits/deletions/backfills are replayed.
import { evaluateTimedLoad, initialTimedState, validateTimedConfig } from './timed-load.js'
import { nativeTimedKg } from './timed-load-weight.js'

const observation = row => row?.observations?.find(x => x.metric === 'duration')?.value

/** One physical L/R timed row per side, even when the two share a setId. */
export function historicalTimedRows(exposure) {
  const spec = exposure?.timedLoad
  if (spec?.version !== 1) return []
  const cfg = validateTimedConfig(spec.config)
  return (exposure.performance?.sets || []).filter(r => r.role === 'work').map(row => ({
    side: row.side || null,
    completed: row.status === 'completed',
    seconds: observation(row) ?? null,
    weightKg: nativeTimedKg(row.resistance?.kind === 'external-load' ? row.resistance.value : 0,
      row.resistance?.unit || spec.unit || 'kg', cfg.ladderKg),
    techniqueValid: row.techniqueValid !== false
  }))
}

/** Same chronological sorting and per-track last-worked ownership as ATP2/Engine v2. */
export function replayTimedLoadHistory(workouts) {
  const byTrack = {}
  const sorted = [...(workouts || [])].sort((a, b) =>
    (Number(a.start) || Date.parse(a.end) || 0) - (Number(b.start) || Date.parse(b.end) || 0) ||
    String(a.id).localeCompare(String(b.id)))
  for (const workout of sorted) {
    const counted = new Map()
    for (const exposure of workout.exposures || []) {
      if (exposure?.timedLoad?.version !== 1 || exposure.excludedFromProgression || !exposure.trackId) continue
      const rows = historicalTimedRows(exposure)
      if (rows.some(r => r.completed)) counted.set(exposure.trackId, { exposure, rows })
    }
    for (const [trackId, { exposure, rows }] of counted) {
      const config = validateTimedConfig(exposure.timedLoad.config)
      const previous = byTrack[trackId] || initialTimedState(config)
      const result = evaluateTimedLoad({ config, state: previous, rows })
      if (result.counted) byTrack[trackId] = result.nextState
    }
  }
  return byTrack
}
