// HYBRID-2 persistence is a pure, replayable view of canonical workout evidence.
// Never trust/merge H1 controller snapshots from devices (no last-write-wins).
import { replayHybridHistory, assertHybridResumeContinuity } from '../../../api/training-control/hybrid2/history.js'
import { verifyFrozenHistory } from '../../../api/training-control/hybrid2/supervisor.js'
import { validatePlanAdapter } from '../../../api/training-control/hybrid2/adapter.js'
import { canonicalJSON } from '../../../api/engine/canonical.js'
import { assertHybridBootstrapHistory } from '../../../api/training-control/hybrid2/bootstrap.js'

export function reconcileHybridHistory(profile) {
  const cfg = profile?.trainingControl?.hybrid2Config
  if (!cfg?.adapter) return null
  profile.trainingControl ||= {}
  try {
    if (profile.trainingControl.hybrid2Conflict) throw new Error('Conflicting plan adapter settings across devices')
    if (profile.trainingControl.hybrid2BootstrapConflict) throw new Error('Conflicting native H1 bootstrap across devices')
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
    const knownIds = new Set((presentSide?.workouts || [])
      .filter(w => w.hybrid2 != null || (w.exposures || []).some(x => x.hybrid2 != null))
      .map(w => w.id))
    const extra = (oldSide?.workouts || []).some(w =>
      !knownIds.has(w.id) && (w.hybrid2 != null || (w.exposures || []).some(x => x.hybrid2 != null)))
    if (extra) result.hybrid2BootstrapConflict = {
      reason: 'Offline device recorded structural workouts without imported native H1 baseline',
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
