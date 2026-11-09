// HYBRID-2 persistence is a pure, replayable view of canonical workout evidence.
// Never trust/merge H1 controller snapshots from devices (no last-write-wins).
import { replayHybridHistory } from '../../../api/training-control/hybrid2/history.js'
import { verifyFrozenHistory } from '../../../api/training-control/hybrid2/supervisor.js'
import { validatePlanAdapter } from '../../../api/training-control/hybrid2/adapter.js'
import { canonicalJSON } from '../../../api/engine/canonical.js'

export function reconcileHybridHistory(profile) {
  const cfg = profile?.trainingControl?.hybrid2Config
  if (!cfg?.adapter) return null
  profile.trainingControl ||= {}
  try {
    if (profile.trainingControl.hybrid2Conflict) throw new Error('Conflicting plan adapter settings across devices')
    validatePlanAdapter(cfg.adapter, profile.routines)
    verifyFrozenHistory(profile.workouts, cfg.adapter)
    const result = replayHybridHistory({ workouts: profile.workouts,
      adapter: cfg.adapter, prescriptions: profile.prescriptions })
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
  if (!a && !b) return {}
  if (!a) return { hybrid2Config: structuredClone(b) }
  if (!b) return { hybrid2Config: structuredClone(a) }
  // Equal assignments may be replayed arbitrarily often. Disagreement requires
  // explicit reconciliation by the user; an older enabled adapter cannot win by LWW.
  if (canonicalJSON(a) === canonicalJSON(b)) return { hybrid2Config: structuredClone(a) }
  return { hybrid2Config: structuredClone(a),
    hybrid2Conflict: { reason: 'Concurrent HYBRID-2 configuration changes require review',
      local: structuredClone(a), remote: structuredClone(b) } }
}
