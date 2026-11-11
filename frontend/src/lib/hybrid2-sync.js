// HYBRID-2 persistence is a pure, replayable view of canonical workout evidence.
// Never trust/merge H1 controller snapshots from devices (no last-write-wins).
import { replayHybridHistory, assertHybridResumeContinuity } from '../../../api/training-control/hybrid2/history.js'
import { verifyFrozenHistory } from '../../../api/training-control/hybrid2/supervisor.js'
import { validatePlanAdapter } from '../../../api/training-control/hybrid2/adapter.js'
import { canonicalJSON, replayProgression, reconcileDerivedOneRms } from '../../../api/engine/index.js'
import { replayAtp2History } from '../../../api/training-control/history.js'
import { replayTimedLoadHistory } from '../../../api/training-control/timed-load-history.js'
import { assertHybridBootstrapHistory } from '../../../api/training-control/hybrid2/bootstrap.js'

export function reconcileHybridHistory(profile) {
  const cfg = profile?.trainingControl?.hybrid2Config
  if (!cfg?.adapter) return null
  profile.trainingControl ||= {}
  try {
    if (profile.trainingControl.hybrid2Conflict) throw new Error('Conflicting plan adapter settings across devices')
    if (profile.trainingControl.hybrid2BootstrapConflict) throw new Error('Conflicting native H1 bootstrap across devices')
    if (profile.trainingControl.hybrid2HistoryConflict) throw new Error('Unresolved structural H1 history sync conflict; review both device records: ' + profile.trainingControl.hybrid2HistoryConflict.reason)
    validatePlanAdapter(cfg.adapter, profile.routines)
    verifyFrozenHistory(profile.workouts, cfg.adapter)
    if (cfg.enabled === true) assertHybridResumeContinuity(profile.workouts, cfg.adapter)
    const bootstrap = profile.trainingControl.hybrid2Bootstrap
    assertHybridBootstrapHistory(profile.workouts, cfg.adapter, bootstrap)
    const result = replayHybridHistory({ workouts: profile.workouts,
      adapter: cfg.adapter, prescriptions: profile.prescriptions, bootstrap })
    profile.trainingControl.hybrid2 = result.state
    profile.trainingControl.hybrid2Diagnostics = {
      status: cfg.enabled === true ? result.status : 'DISABLED',
      sourceCount: result.sourceCount,
      lastDecisions: result.decisions.slice(-8)
    }
    delete profile.trainingControl.hybrid2Error
    return result
  } catch (error) {
    // Keep user workout/history data. Fail closed on unsafe controller semantics.
    profile.trainingControl.hybrid2Error = String(error.message)
    delete profile.trainingControl.hybrid2
    profile.trainingControl.hybrid2Diagnostics = {
      status: 'INCOMPATIBLE', reason: String(error.message)
    }
    return null
  }
}
/** Before changing persisted history, test the proposed timeline with the same
 * full structural replay used at session start. A previously valid H1 epoch must
 * not be made incompatible by a date move, deletion or workout editor save.
 *
 * If history is already incompatible, do not lock the user out of corrective
 * editing; the ordinary reconcile path still reports its incompatibility.
 * No profile caches or source logs are modified during the preflight.
 */
export function assertSafeHybridHistoryEdit(profile, proposedWorkouts) {
  const cfg = profile?.trainingControl?.hybrid2Config
  if (!cfg?.adapter) return
  const tagged = list => (list || []).some(w => w.hybrid2 != null ||
    (w.exposures || []).some(x => x?.hybrid2 != null))
  if (!tagged(profile.workouts) && !tagged(proposedWorkouts)) return
  const errorOf = workouts => {
    try {
      validatePlanAdapter(cfg.adapter, profile.routines)
      verifyFrozenHistory(workouts, cfg.adapter)
      if (cfg.enabled === true) assertHybridResumeContinuity(workouts, cfg.adapter)
      const bootstrap = profile.trainingControl?.hybrid2Bootstrap
      assertHybridBootstrapHistory(workouts, cfg.adapter, bootstrap)
      replayHybridHistory({ workouts, adapter: cfg.adapter,
        prescriptions: profile.prescriptions, bootstrap })
      return null
    } catch (error) { return error }
  }
  if (errorOf(profile.workouts)) return
  const error = errorOf(proposedWorkouts)
  if (error) throw new Error('HYBRID-2 history edit blocked: ' + error.message)
}

export function mergeHybridSettings(local, remote) {
  const a = local?.trainingControl?.hybrid2Config, b = remote?.trainingControl?.hybrid2Config
  const result = {}
  if (a || b) {
    result.hybrid2Config = structuredClone(a || b)
    if (a && b && canonicalJSON(a) !== canonicalJSON(b))
      result.hybrid2Conflict = {
        reason: 'Concurrent HYBRID-2 configuration changes require review',
        local: structuredClone(a), remote: structuredClone(b)
      }
  }
  // A later ordinary sync must never auto-clear an unresolved adapter choice.
  const unresolvedAdapter = local?.trainingControl?.hybrid2Conflict ||
    remote?.trainingControl?.hybrid2Conflict
  if (unresolvedAdapter && !result.hybrid2Conflict)
    result.hybrid2Conflict = structuredClone(unresolvedAdapter)
  // A reviewed conflict is immutable audit evidence. Never let a later
  // device whose copy predates the review drop it by last-write-wins.
  const reviews = [...(local?.trainingControl?.hybrid2HistoryReviews || []),
    ...(remote?.trainingControl?.hybrid2HistoryReviews || [])]
  if (reviews.length) result.hybrid2HistoryReviews = [...new Map(reviews
    .map(review => [canonicalJSON(review), structuredClone(review)])).values()]
  const left = local?.trainingControl?.hybrid2Bootstrap
  const right = remote?.trainingControl?.hybrid2Bootstrap
  if (!left && !right) return result
  result.hybrid2Bootstrap = structuredClone(left || right)
  if (left && right && canonicalJSON(left) !== canonicalJSON(right)) {
    result.hybrid2BootstrapConflict = {
      reason: 'Two different native H1 cutovers require explicit review',
      local: structuredClone(left), remote: structuredClone(right)
    }
  } else if (Boolean(left) !== Boolean(right)) {
    // A device which has never received the imported baseline cannot
    // independently append new structural H1 workouts after its cutover.
    const oldSide = left ? remote : local
    const presentSide = left ? local : remote
    const known = new Map((presentSide?.workouts || []).filter(isStructural)
      .map(w => [w.id, w]))
    const staleEvidence = (oldSide?.workouts || []).some(w => isStructural(w) &&
      (!known.has(w.id) || differsInH1Evidence(w, known.get(w.id))))
    const staleDeletion = Object.keys(oldSide?.deleted?.workouts || {}).some(id =>
      known.has(id) && !Number(presentSide?.deleted?.workouts?.[id]))
    if (staleEvidence || staleDeletion) result.hybrid2BootstrapConflict = {
      reason: 'Offline device changed structural H1 evidence without imported native H1 baseline',
      local: left ? structuredClone(left) : null, remote: right ? structuredClone(right) : null
    }
  }
  // Once a divergent offline H1 epoch has been detected, subsequent merges
  // cannot erase the review barrier simply because the workout IDs converged.
  const unresolved = local?.trainingControl?.hybrid2BootstrapConflict ||
    remote?.trainingControl?.hybrid2BootstrapConflict
  if (unresolved && !result.hybrid2BootstrapConflict)
    result.hybrid2BootstrapConflict = structuredClone(unresolved)
  return result
}


const clone = value => structuredClone(value)
const isStructural = w => w?.hybrid2 != null ||
  (w?.exposures || []).some(x => x?.hybrid2 != null)
// Notes, media and timestamp stamps are not H1 observations. Completed sets,
// structural identity, a workout move or removal are; no LWW for those values.
const differsInH1Evidence = (a, b) => a?.start !== b?.start ||
  canonicalJSON(a?.hybrid2 || null) !== canonicalJSON(b?.hybrid2 || null) ||
  canonicalJSON(a?.exposures || []) !== canonicalJSON(b?.exposures || [])


/**
 * A failed automatic merge is NOT a resolved H1 history. Keep the original
 * records from both devices, including tombstones, so the reviewer can choose
 * the actual evidence rather than inventing workout results or resetting H1.
 * This function is called after the merged history has been fully replayed.
 */
export function retainHybridHistoryConflict(merged, local, remote, { ancestry = null } = {}) {
  const cfg = merged?.trainingControl?.hybrid2Config
  if (!cfg?.adapter) return
  const tc = merged.trainingControl
  const previousA = local?.trainingControl?.hybrid2HistoryConflict
  const previousB = remote?.trainingControl?.hybrid2HistoryConflict
  if (previousA || previousB) {
    tc.hybrid2HistoryConflict = previousA && previousB &&
      canonicalJSON(previousA) !== canonicalJSON(previousB)
      ? { version: 1, reason: 'Multiple pending H1 history reviews cannot be combined automatically',
        entries: [], alternatives: [clone(previousA), clone(previousB)] }
      : clone(previousA || previousB)
    reconcileHybridHistory(merged)
    return
  }
  if (tc.hybrid2Conflict || tc.hybrid2BootstrapConflict) return
  const occurrenceIds = new Set(cfg.adapter.occurrences.map(o => o.occurrenceId))
  const mapped = w => isStructural(w) ||
    (w?.exposures || []).some(x => occurrenceIds.has(x?.occurrenceId))
  const left = new Map((local.workouts || []).filter(mapped).map(w => [w.id, w]))
  const right = new Map((remote.workouts || []).filter(mapped).map(w => [w.id, w]))
  const mergedRows = new Map((merged.workouts || []).filter(mapped).map(w => [w.id, w]))
  const ids = new Set([...left.keys(), ...right.keys(), ...mergedRows.keys()])
  if (!ids.size) return
  const unsafe = ancestry ? ancestry.disputes.size > 0 : [...ids].some(id => {
    const a = left.get(id), b = right.get(id)
    const deletedLeft = Number(local.deleted?.workouts?.[id]) > 0
    const deletedRight = Number(remote.deleted?.workouts?.[id]) > 0
    return (a && b && differsInH1Evidence(a, b)) ||
      ((deletedLeft || deletedRight) && (a || b) &&
        (deletedLeft !== deletedRight || Boolean(a) !== Boolean(b)))
  })
  if (!unsafe && tc.hybrid2Diagnostics?.status !== 'INCOMPATIBLE') return
  const entries = []
  for (const id of ids) {
    const a = left.get(id) || null, b = right.get(id) || null, m = mergedRows.get(id) || null
    const da = local.deleted?.workouts?.[id] ?? null
    const db = remote.deleted?.workouts?.[id] ?? null
    const dm = merged.deleted?.workouts?.[id] ?? null
    if (canonicalJSON(a) === canonicalJSON(b) && da === db) continue
    if (ancestry && !ancestry.disputes.has(id) &&
        tc.hybrid2Diagnostics?.status !== 'INCOMPATIBLE') continue
    // Record differences which may affect H1. For an incompatible union keep
    // even different metadata for full forensic reconstruction.
    if (!differsInH1Evidence(a, b) && da === db &&
        tc.hybrid2Diagnostics?.status !== 'INCOMPATIBLE') continue
    entries.push({ id, local: clone(a), remote: clone(b), merged: clone(m),
      localDeleted: da, remoteDeleted: db, mergedDeleted: dm })
  }
  tc.hybrid2HistoryConflict = {
    version: 1, reason: tc.hybrid2Diagnostics?.status === 'INCOMPATIBLE'
      ? tc.hybrid2Error || 'Merged HYBRID-2 history is structurally incompatible'
      : ancestry ? 'Concurrent H1 edits differ from the same server revision; explicit review required'
        : 'Two devices contain differing completed HYBRID-2 evidence; last-write-wins is unsafe',
    entries
  }
  reconcileHybridHistory(merged)
}

/**
 * Explicit user-selected reconstruction. No mutation occurs unless EVERY
 * disputed record has been reviewed and the entire resulting history passes
 * the original adapter / native H1 checkpoint / frozen shape replay.
 */
export function resolveHybridHistoryConflict(profile, choices = {}) {
  const pending = profile?.trainingControl?.hybrid2HistoryConflict
  if (!pending) throw new Error('No H1 history conflict to review')
  if (pending.alternatives) throw new Error('Multiple conflict sources require manual evidence review')
  if (profile.trainingControl.hybrid2Conflict || profile.trainingControl.hybrid2BootstrapConflict)
    throw new Error('Resolve H1 adapter/bootstrap conflicts before history review')
  const entries = pending.entries || []
  const ids = new Set(entries.map(x => x.id))
  if (Object.keys(choices).length !== ids.size ||
      entries.some(e => !['local', 'remote', 'merged', 'current'].includes(choices[e.id])))
    throw new Error('Select and review one source for every disputed H1 workout')
  const next = clone(profile)
  const workouts = new Map((next.workouts || []).map(w => [w.id, w]))
  const latestStamp = Math.max(Date.now(), ...entries.flatMap(e =>
    [e.local, e.remote, e.merged].filter(Boolean).flatMap(w =>
      [Number(w._ts) || 0, ...Object.values(w._f || {}).map(Number).filter(Number.isFinite)])))
  const reviewStamp = latestStamp + 1
  for (const entry of entries) {
    const side = choices[entry.id]
    const selected = side === 'current' ? workouts.get(entry.id) || null : entry[side]
    if (selected) {
      const restored = clone(selected)
      // A reviewed selection must beat the superseded source record during the
      // next offline merge, including per-field edits, not just its _ts.
      restored._ts = reviewStamp
      restored._f = { ...restored._f, start: reviewStamp,
        exposures: reviewStamp, hybrid2: reviewStamp }
      workouts.set(entry.id, restored)
      if (next.deleted?.workouts) delete next.deleted.workouts[entry.id]
    } else {
      workouts.delete(entry.id)
      next.deleted ||= {}
      next.deleted.workouts ||= {}
      next.deleted.workouts[entry.id] = Math.max(Date.now(),
        Number(entry.localDeleted) || 0, Number(entry.remoteDeleted) || 0,
        Number(entry.mergedDeleted) || 0)
    }
  }
  next.workouts = [...workouts.values()]
  delete next.trainingControl.hybrid2HistoryConflict
  // Replay while H1 is still enabled so pause/resume gaps cannot pass as valid.
  const cfg = next.trainingControl.hybrid2Config
  if (!cfg?.adapter) throw new Error('Missing reviewed H1 adapter')
  assertHybridResumeContinuity(next.workouts, cfg.adapter)
  const replay = reconcileHybridHistory(next)
  if (!replay) throw new Error('Selected H1 history is still incompatible: ' +
    (next.trainingControl.hybrid2Error || 'replay rejected'))
  next.trainingControl.atp2 = replayAtp2History(next.workouts)
  next.trainingControl.timedLoad = replayTimedLoadHistory(next.workouts)
  const tracks = new Set([...Object.keys(next.progression || {}),
    ...next.workouts.flatMap(w => (w.exposures || []).map(x => x.trackId).filter(Boolean))])
  next.progression = {}
  for (const trackId of tracks) {
    const state = replayProgression({ workouts: next.workouts, trackId,
      prescriptions: next.prescriptions || {} })
    if (state) next.progression[trackId] = state
  }
  reconcileDerivedOneRms(next)
  // Review, including both rejected records, survives the resolution. The
  // controller stays disabled until the user enables it explicitly.
  next.trainingControl.hybrid2HistoryReviews ||= []
  next.trainingControl.hybrid2HistoryReviews.push({
    ...clone(pending), choices: clone(choices), reviewedAt: new Date().toISOString()
  })
  next.trainingControl.hybrid2Config.enabled = false
  reconcileHybridHistory(next)
  Object.assign(profile, next)
  return profile
}
