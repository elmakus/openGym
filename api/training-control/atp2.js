// ATP2-BOOK experimental port. Source: elmakus/fitness Liftoscript candidate
// (adaptive_rep_engine_turbo_probe_candidate.liftoscript, ATP-DEC-004).
// Pure reducer for deterministic replay from completed work sets.
const EPS = 1e-8
const clean = n => Number(n.toFixed(6))

/** The equipment ladder is never inferred from the ATP2 percentage heuristic. */
export function nativeLadder(rounding) {
  if (rounding?.mode === 'allowed_values') {
    const values = [...new Set((rounding.allowedValues || []).filter(Number.isFinite))].sort((a, b) => a - b)
    if (!values.length) throw new Error('ATP2 requires a nonempty equipment ladder')
    return {
      up: n => values.find(v => v >= n - EPS) ?? null,
      down: n => [...values].reverse().find(v => v <= n + EPS) ?? null,
      next: n => values.find(v => v > n + EPS) ?? null,
      previous: n => [...values].reverse().find(v => v < n - EPS) ?? null
    }
  }
  const step = rounding?.step
  if (!Number.isFinite(step) || step <= 0) throw new Error('ATP2 requires a positive equipment step')
  return {
    up: n => clean(Math.ceil((n - EPS) / step) * step),
    down: n => clean(Math.floor((n + EPS) / step) * step),
    next: n => clean((Math.floor((n + EPS) / step) + 1) * step),
    previous: n => clean((Math.ceil((n - EPS) / step) - 1) * step)
  }
}

/** Normalize stale candidate conservatively and floor upwards, as in ATP-DEC-004. */
export function normalizeAtp2State(state, rounding) {
  const ladder = nativeLadder(rounding)
  if (!Number.isFinite(state?.floorWeight) || !Number.isFinite(state?.candidate)) throw new Error('ATP2 needs candidate and floorWeight')
  if (!Number.isInteger(state.minTarget) || !Number.isInteger(state.maxTarget) || state.minTarget < 2 || state.maxTarget < state.minTarget) throw new Error('Invalid ATP2 rep range')
  const floorWeight = ladder.up(state.floorWeight)
  if (floorWeight == null) throw new Error('ATP2 floor is above the equipment ladder')
  const candidate = Math.max(ladder.down(state.candidate) ?? floorWeight, floorWeight)
  return { ...state, floorWeight, candidate }
}

function nearest(raw, low, high) {
  if (high == null) return low
  // Liftoscript breaks equal-distance ties toward the lower native load.
  return Math.abs(raw - low) <= Math.abs(raw - high) + EPS ? low : high
}

function increasedLoad(used, reps, maxTarget, ladder) {
  const firstHigher = ladder.next(used)
  if (firstHigher == null || firstHigher <= used) return used
  const raw = used * (1 + 0.04 * (reps - maxTarget))
  const low = Math.max(ladder.down(raw) ?? firstHigher, firstHigher)
  return nearest(raw, low, ladder.next(low))
}

function decreasedLoad(used, reps, minTarget, floor, ladder) {
  const firstLower = Math.max(ladder.previous(used) ?? used, floor)
  if (firstLower >= used) return used
  const target = Math.max(used * (1 - 0.04 * (minTarget - reps)), floor)
  let low = Math.max(ladder.down(target) ?? floor, floor)
  if (low >= used) low = firstLower
  const high = ladder.next(low)
  return high == null || high >= used ? low : nearest(target, low, high)
}

function usable(row, paired) {
  if (row?.completed === false || !Number.isFinite(row?.weight)) return null
  const weight = row.weight
  if (paired) {
    const left = row.leftReps, right = row.reps
    if (!Number.isFinite(left) || !Number.isFinite(right) || weight <= 0 || (left === 1 && right === 1)) return null
    const reps = left === 1 && right >= 3 ? right : right === 1 && left >= 3 ? left : Math.min(left, right)
    return { weight, reps }
  }
  if (!Number.isFinite(row.reps) || row.reps === 1 || !(row.reps > 0 || weight !== 0)) return null
  return { weight, reps: row.reps }
}

/**
 * Evaluate the same completed-set sequence twice, like Liftosaur's update() and progress().
 * update() decides remaining set load; progress() decides durable next-session state.
 * Sets contain completed or skipped work rows in prescribed order; omit warmups.
 * Pass the exercise's own unit and its real equipment rounding.
 */
export function evaluateAtp2({ state, rounding, sets = [], numberOfSets = sets.length }) {
  const original = normalizeAtp2State(state, rounding)
  const ladder = nativeLadder(rounding)
  let uiPhase = 'FRESH', progressPhase = 'FRESH'
  let nextSetLoad = original.candidate, candidate = original.candidate, probeActive = original.probeActive ?? 0
  let firstUsableSeen = false, manualOverride = false, usableCount = 0

  for (let i = 0; i < sets.length; i++) {
    const result = usable(sets[i], original.paired === 1 || original.paired === true)
    if (!result) continue
    usableCount++
    const { weight: used, reps } = result
    const hasLaterSet = (sets[i].ordinal ?? i + 1) < numberOfSets
    if (!firstUsableSeen) {
      firstUsableSeen = true
      manualOverride = used < original.candidate
    }

    // Liftosaur update(): only remaining sets, not durable progression.
    nextSetLoad = used
    if (uiPhase !== 'SETTLED') {
      if (reps < original.minTarget) {
        nextSetLoad = decreasedLoad(used, reps, original.minTarget, original.floorWeight, ladder)
        uiPhase = 'SETTLED'
      } else if (reps > original.maxTarget) {
        const advanced = increasedLoad(used, reps, original.maxTarget, ladder)
        if (uiPhase === 'FRESH' && manualOverride) {
          nextSetLoad = used
          uiPhase = 'SETTLED'
        } else {
          nextSetLoad = advanced
          uiPhase = hasLaterSet && advanced > used ? 'CALIBRATING' : 'SETTLED'
        }
      } else {
        uiPhase = 'SETTLED'
      }
    }

    // Liftosaur progress(): separate persistent candidate and probeActive.
    if (progressPhase !== 'SETTLED') {
      if (reps < original.minTarget) {
        candidate = decreasedLoad(used, reps, original.minTarget, original.floorWeight, ladder)
        probeActive = 0
        progressPhase = 'SETTLED'
      } else if (reps < original.maxTarget) {
        candidate = used
        probeActive = 0
        progressPhase = 'SETTLED'
      } else if (reps === original.maxTarget) {
        candidate = ladder.next(used) ?? used
        probeActive = 0
        progressPhase = 'SETTLED'
      } else {
        candidate = increasedLoad(used, reps, original.maxTarget, ladder)
        probeActive = candidate > used ? 1 : 0
        progressPhase = hasLaterSet && probeActive === 1 && (progressPhase === 'CALIBRATING' || !manualOverride) ? 'CALIBRATING' : 'SETTLED'
      }
    }
  }
  return {
    nextSetLoad,
    nextState: { ...original, candidate, probeActive, lowCount: 0 },
    uiPhase,
    progressPhase,
    manualOverride,
    usableCount
  }
}
