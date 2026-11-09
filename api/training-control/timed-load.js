// Timed Load controller. Semantics: fitness PGE-DEC-002 and timed oracle model.
// All controller loads and logical/native ladder entries remain in canonical kilograms.
// No Engine v2 progression, ATP2 reducer or rounding heuristic owns these transitions.

export const SIDE_PLANK_TIMED_CONFIG = Object.freeze({
  setsPerSide: 2, unilateral: true, minTime: 30, maxTime: 45, timeStep: 5,
  emergencyTime: 25, emergencyBehavior: 'timed_bridge',
  ladderKg: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30],
  lowLoadSwitchKg: 10, lowLoadUpStepKg: 2, downwardLadderSteps: 1,
  startLoadKg: 0
})

export const SYNTHETIC_HOLD_TIMED_CONFIG = Object.freeze({
  setsPerSide: 1, unilateral: false, minTime: 20, maxTime: 40, timeStep: 10,
  emergencyTime: null, emergencyBehavior: 'direct_backoff',
  ladderKg: [0, 2, 5, 9, 12], lowLoadSwitchKg: 9,
  lowLoadUpStepKg: 3, downwardLadderSteps: 2, startLoadKg: 0
})

const int = n => Number.isInteger(n)
const oneOf = (v, values) => values.includes(v)
const assert = (v, msg) => { if (!v) throw new Error('Timed Load: ' + msg) }

/** Strict validation is intentional: no rounding may invent an unavailable weight. */
export function validateTimedConfig(raw) {
  assert(raw && typeof raw === 'object', 'configuration required')
  const cfg = {
    setsPerSide: Number(raw.setsPerSide),
    unilateral: raw.unilateral === true,
    minTime: Number(raw.minTime), maxTime: Number(raw.maxTime), timeStep: Number(raw.timeStep),
    emergencyTime: raw.emergencyTime == null ? null : Number(raw.emergencyTime),
    emergencyBehavior: raw.emergencyBehavior,
    ladderKg: (raw.ladderKg || []).map(Number),
    lowLoadSwitchKg: Number(raw.lowLoadSwitchKg),
    lowLoadUpStepKg: Number(raw.lowLoadUpStepKg),
    downwardLadderSteps: Number(raw.downwardLadderSteps),
    startLoadKg: Number(raw.startLoadKg)
  }
  assert(int(cfg.setsPerSide) && cfg.setsPerSide >= 1, 'setsPerSide must be positive')
  assert(int(cfg.minTime) && cfg.minTime > 0 && int(cfg.maxTime) &&
    cfg.maxTime >= cfg.minTime && int(cfg.timeStep) && cfg.timeStep > 0 &&
    (cfg.maxTime - cfg.minTime) % cfg.timeStep === 0, 'invalid normal time ladder')
  assert(oneOf(cfg.emergencyBehavior, ['timed_bridge', 'direct_backoff']), 'invalid emergency policy')
  if (cfg.emergencyBehavior === 'timed_bridge') {
    assert(int(cfg.emergencyTime) && cfg.emergencyTime > 0 &&
      cfg.emergencyTime < cfg.minTime, 'emergencyTime must be below the normal floor')
  } else assert(cfg.emergencyTime == null, 'direct_backoff requires null emergencyTime')
  assert(cfg.ladderKg.length > 0 && cfg.ladderKg[0] === 0 &&
    cfg.ladderKg.every((v, i) => Number.isFinite(v) && v >= 0 &&
      (i === 0 || v > cfg.ladderKg[i - 1])), 'native ladder must start at 0 and be increasing')
  assert(Number.isFinite(cfg.lowLoadSwitchKg) && cfg.lowLoadSwitchKg >= 0 &&
    Number.isFinite(cfg.lowLoadUpStepKg) && cfg.lowLoadUpStepKg > 0, 'invalid upward policy')
  assert(int(cfg.downwardLadderSteps) && cfg.downwardLadderSteps >= 1, 'invalid downward policy')
  assert(cfg.ladderKg.includes(cfg.startLoadKg), 'startLoadKg must be native')
  return cfg
}

export function initialTimedState(raw) {
  const c = validateTimedConfig(raw)
  return { initialized: false, load: c.startLoadKg, target: c.minTime, fails: 0,
    provenance: 'established', emergency: false, bridgeTarget: null, bridgeProvenance: null }
}

export function validateTimedState(state, raw) {
  const c = validateTimedConfig(raw), s = state
  assert(s && typeof s === 'object', 'state required')
  assert(typeof s.initialized === 'boolean', 'invalid initialized flag')
  assert(c.ladderKg.includes(s.load), 'non-native current load')
  assert(oneOf(s.provenance, ['new', 'established']), 'invalid current provenance')
  assert(s.fails === 0 || s.fails === 1, 'failure counter out of range')
  if (s.emergency) assert(c.emergencyBehavior === 'timed_bridge' &&
    s.target === c.emergencyTime, 'emergency target mismatch')
  else assert(int(s.target) && s.target >= c.minTime && s.target <= c.maxTime &&
    (s.target - c.minTime) % c.timeStep === 0, 'invalid normal target')
  assert((s.bridgeTarget == null) === (s.bridgeProvenance == null), 'orphan bridge provenance')
  if (s.bridgeTarget != null) {
    assert(c.ladderKg.includes(s.bridgeTarget) && s.bridgeTarget > s.load, 'invalid bridge target')
    assert(oneOf(s.bridgeProvenance, ['new', 'established']), 'invalid bridge provenance')
  }
  return s
}

export function nextTimedLoadUp(load, raw) {
  const c = validateTimedConfig(raw), i = c.ladderKg.indexOf(load)
  assert(i >= 0, 'non-native load')
  const higher = c.ladderKg.slice(i + 1)
  if (!higher.length) return load
  if (load < c.lowLoadSwitchKg) {
    const desired = Math.min(c.lowLoadSwitchKg, load + c.lowLoadUpStepKg)
    return higher.find(v => v >= desired) ?? higher[0]
  }
  return higher[0]
}

export function nextTimedLoadDown(load, raw) {
  const c = validateTimedConfig(raw), i = c.ladderKg.indexOf(load)
  assert(i >= 0, 'non-native load')
  return c.ladderKg[Math.max(0, i - c.downwardLadderSteps)]
}

const stateAt = (load, target, provenance = 'established', bridgeTarget = null, bridgeProvenance = null) =>
  ({ initialized: true, load, target, fails: 0, provenance, emergency: false, bridgeTarget, bridgeProvenance })

/** One full prescribed exposure; pure, with exact reason and durable state. */
export function transitionTimedLoad(current, success, raw) {
  const c = validateTimedConfig(raw), s = validateTimedState(current, c)
  assert(s.initialized, 'cannot transition uninitialized state without calibration')
  let next, reason
  if (success) {
    if (s.emergency) {
      next = { ...s, target: c.minTime, fails: 0, emergency: false }
      reason = 'emergency_success_retry_normal_floor'
    } else if (s.target < c.maxTime) {
      next = { ...s, target: s.target + c.timeStep, fails: 0,
        provenance: s.target === c.minTime && s.provenance === 'new' ? 'established' : s.provenance }
      reason = 'normal_time_success'
    } else if (s.bridgeTarget != null) {
      next = stateAt(s.bridgeTarget, c.minTime, s.bridgeProvenance)
      reason = 'bridge_return'
    } else {
      const higher = nextTimedLoadUp(s.load, c)
      if (higher > s.load) {
        next = stateAt(higher, c.minTime, 'new')
        reason = 'top_success_load_increase'
      } else {
        next = { ...s, fails: 0 }
        reason = 'equipment_top_hold'
      }
    }
  } else if (s.emergency) {
    const lower = nextTimedLoadDown(s.load, c)
    if (lower === s.load) {
      next = { ...s, fails: 0 }
      reason = 'emergency_floor_clamp'
    } else {
      next = stateAt(lower, c.minTime, 'established', s.load, s.provenance)
      reason = 'emergency_failure_bridge'
    }
  } else if (s.fails === 0) {
    next = { ...s, fails: 1 }
    reason = 'first_failure_retry'
  } else if (s.target > c.minTime) {
    next = { ...s, target: s.target - c.timeStep, fails: 0 }
    reason = 'second_failure_time_backoff'
  } else if (s.provenance === 'new' && c.emergencyBehavior === 'timed_bridge') {
    next = { ...s, target: c.emergencyTime, fails: 0, emergency: true }
    reason = 'new_load_emergency'
  } else {
    const lower = nextTimedLoadDown(s.load, c)
    if (lower === s.load) {
      next = { ...s, fails: 0 }
      reason = 'absolute_floor_clamp'
    } else {
      next = stateAt(lower, c.minTime, 'established', s.load,
        c.emergencyBehavior === 'direct_backoff' ? s.provenance : 'established')
      reason = s.provenance === 'new' ? 'new_load_direct_backoff_bridge' : 'established_floor_bridge'
    }
  }
  validateTimedState(next, c)
  return { state: next, reason }
}

/**
 * Configuration change: retain an existing state if it is still representable.
 * A removed native load/bridge target or incompatible time ladder resets to an
 * uninitialized calibration state, never to a fictional intermediate weight.
 */
export function adaptTimedState(previous, raw) {
  const c = validateTimedConfig(raw)
  if (!previous) return initialTimedState(c)
  try { return validateTimedState({ ...previous }, c) } catch { return initialTimedState(c) }
}

/** A complete exposure needs every prescribed work row (including both timed sides). */
export function timedExposureSuccess(rows, state, raw) {
  const c = validateTimedConfig(raw)
  const count = c.setsPerSide * (c.unilateral ? 2 : 1)
  if (rows.length < count) return false
  const work = rows.slice(0, count)
  if (c.unilateral && work.some((r, i) => r.side !== (i % 2 ? 'R' : 'L'))) return false
  return work.every(r => r.completed === true && r.techniqueValid !== false &&
    c.ladderKg.includes(r.weightKg) && Number.isFinite(r.seconds) && r.seconds >= state.target)
}

/** No completed work = no progression event. Partial work = a failed exposure. */
export function evaluateTimedLoad({ config, state, rows = [] }) {
  const c = validateTimedConfig(config)
  const first = rows.find(r => r.completed === true && Number.isFinite(r.weightKg) &&
    c.ladderKg.includes(r.weightKg))
  if (!first) return { nextState: state || initialTimedState(c), reason: 'no_completed_work', counted: false }
  let s = adaptTimedState(state, c)
  const success = timedExposureSuccess(rows, s, c)
  if (!s.initialized) {
    // First exposure establishes the actual first native load instead of climbing from 0.
    const load = first.weightKg
    s = stateAt(load, c.minTime)
    const ok = timedExposureSuccess(rows, s, c)
    return { nextState: { ...s, target: ok && c.minTime < c.maxTime ? c.minTime + c.timeStep : c.minTime,
      fails: ok ? 0 : 1 }, reason: 'first_exposure_calibration', counted: true }
  }
  if (first.weightKg < s.load) {
    // Liftoscript update() may copy this downshift to later uncompleted sets.
    // progress() only persists the conservative baseline; no automatic promotion.
    return { nextState: stateAt(first.weightKg, s.target), reason: 'manual_conservative_downshift', counted: true }
  }
  const result = transitionTimedLoad(s, success, c)
  return { nextState: result.state, reason: result.reason, counted: true }
}
