// openGym session adapter for canonical-kg Timed Load; the reducer is in the API layer.
// Timer rows keep their real held seconds. In the UI, Done means valid position;
 // an early stop is recorded as fewer seconds and does not meet the target.
import { adaptTimedState, evaluateTimedLoad, firstTimedLoadSet, validateTimedConfig } from '../../../api/training-control/timed-load.js'
import { isWarmupRow } from './workout-model.js'
import { displayTimedWeight as viewLoad, nativeTimedKg } from '../../../api/training-control/timed-load-weight.js'
export { nativeTimedKg } from '../../../api/training-control/timed-load-weight.js'

export function prepareTimedLoadSession({ config, previous, prescription, unit = 'kg', unilateral = false }) {
  if (config?.enabled !== true || !prescription?.parameters?.durationSeconds || prescription.assisted) return null
  const cfg = validateTimedConfig(config)
  if (cfg.unilateral !== unilateral || prescription.rows.length !== cfg.setsPerSide) return null
  const initialState = adaptTimedState(previous, cfg)
  return { version: 1, config: cfg, initialState, unit }
}

export function timedWorkRows(entry, spec) {
  const cfg = validateTimedConfig(spec.config)
  return (entry?.sets || []).filter(row => !isWarmupRow(row)).map(row => ({
    side: row.side || null,
    completed: row.done === true,
    seconds: Number.isFinite(row.sec) ? row.sec : null,
    weightKg: nativeTimedKg(row.w ?? 0, spec.unit, cfg.ladderKg),
    techniqueValid: row.techniqueValid !== false
  }))
}

/** Initialize the editable rows from durable state, without modifying Engine's prescription. */
export function prefillTimedLoadEntry(entry, exposure) {
  const spec = exposure?.timedLoad
  if (spec?.version !== 1 || !entry?.sets) return entry
  const target = spec.initialState.target, load = viewLoad(spec.initialState.load, spec.unit)
  return {
    ...entry,
    target: { ...entry.target, weight: load, sec: target },
    sets: entry.sets.map(row => isWarmupRow(row) ? row : { ...row, sec: target, w: load })
  }
}

/** The first deliberate conservative downshift may propagate within THIS session only. */
export function refreshTimedLoadLive(active, entryIndex) {
  const entry = active?.entries?.[entryIndex]
  const exposure = active?.exposures?.find(x => x.exposureId === entry?.exposureId)
  if (!entry || exposure?.timedLoad?.version !== 1 || exposure.excludedFromProgression) return null
  const spec = exposure.timedLoad
  const rows = timedWorkRows(entry, spec)
  const result = evaluateTimedLoad({ config: spec.config, state: spec.initialState, rows })
  const firstSet = firstTimedLoadSet(rows, spec.config)
  // Liftoscript update() propagates a changed first set on first-exposure calibration,
  // including an upward conservative starting load (e.g. 0 -> 6 kg).
  const calibrated = !spec.initialState.initialized && firstSet &&
    firstSet.weightKg !== spec.initialState.load
  // As in Liftoscript update(), only setIndex == 1 can own a downshift.
  // An arbitrary completed R side or later set is never a valid trigger.
  const lower = spec.initialState.initialized && firstSet &&
    firstSet.weightKg < spec.initialState.load ? viewLoad(firstSet.weightKg, spec.unit) : null
  const carried = calibrated ? viewLoad(firstSet.weightKg, spec.unit) : lower
  if (carried != null) {
    const firstSetRows = spec.config.unilateral ? 2 : 1
    let ordinal = 0
    entry.sets = entry.sets.map(row => {
      if (isWarmupRow(row)) return row
      const i = ordinal++
      return row.done || i < firstSetRows ? row : { ...row, w: carried }
    })
  }
  entry.timedLoadPreview = { reason: result.reason, nextTarget: result.nextState.target,
    nextLoad: viewLoad(result.nextState.load, spec.unit) }
  return result
}
