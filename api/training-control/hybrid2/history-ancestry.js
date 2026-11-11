// Server-issued, revision-bound evidence digests for three-way H1 sync.
// No training values leave the user's account. The hashes are comparison
// evidence, not authentication or source-native proof.
import { contentHash } from '../../engine/canonical.js'

const list = value => Array.isArray(value) ? value : []
export const hybridHistoryEvidence = workout => workout ? {
  d: workout.d ?? null, start: workout.start ?? null, end: workout.end ?? null,
  hybrid2: workout.hybrid2 ?? null, exposures: list(workout.exposures)
} : null
export const hybridHistoryDigest = workout =>
  workout ? contentHash(hybridHistoryEvidence(workout)) : null

export const isHybridHistoryWorkout = (workout, adapter) => !!workout && (
  workout.hybrid2 != null ||
  list(workout.exposures).some(exposure => exposure?.hybrid2 != null ||
    list(adapter?.occurrences).some(o => o.occurrenceId === exposure?.occurrenceId))
)

export function makeHybridHistoryWitness(profile, rev, wid) {
  const adapter = profile?.trainingControl?.hybrid2Config?.adapter
  if (!adapter || !Number.isSafeInteger(rev) || rev < 0 ||
      typeof wid !== 'string' || !wid) return null
  const records = {}
  for (const workout of list(profile.workouts)) {
    if (!isHybridHistoryWorkout(workout, adapter) || typeof workout.id !== 'string') continue
    records[workout.id] = hybridHistoryDigest(workout)
  }
  return {
    version: 1, rev, wid,
    adapterDigest: contentHash(adapter),
    bootstrapChecksum: profile?.trainingControl?.hybrid2Bootstrap?.checksum || null,
    records
  }
}

export function validHybridHistoryWitness(witness, local, remote) {
  const a = local?.trainingControl?.hybrid2Config?.adapter
  const b = remote?.trainingControl?.hybrid2Config?.adapter
  if (!witness || witness.version !== 1 || !Number.isSafeInteger(witness.rev) ||
      witness.rev < 0 || typeof witness.wid !== 'string' || !witness.wid ||
      !a || !b || contentHash(a) !== witness.adapterDigest ||
      contentHash(b) !== witness.adapterDigest ||
      !witness.records || Array.isArray(witness.records) ||
      typeof witness.records !== 'object') return false
  const checksum = x => x?.trainingControl?.hybrid2Bootstrap?.checksum || null
  return checksum(local) === witness.bootstrapChecksum &&
    checksum(remote) === witness.bootstrapChecksum
}

export function compareHybridHistoryWitness(local, remote, witness) {
  if (!validHybridHistoryWitness(witness, local, remote)) return null
  const adapter = local.trainingControl.hybrid2Config.adapter
  const a = new Map(list(local.workouts).filter(w => isHybridHistoryWorkout(w, adapter)).map(w => [w.id, w]))
  const b = new Map(list(remote.workouts).filter(w => isHybridHistoryWorkout(w, adapter)).map(w => [w.id, w]))
  const ids = new Set([...Object.keys(witness.records), ...a.keys(), ...b.keys()])
  const selected = new Map()
  const disputes = new Set()
  for (const id of ids) {
    const ancestor = witness.records[id] ?? null
    const left = hybridHistoryDigest(a.get(id))
    const right = hybridHistoryDigest(b.get(id))
    const changedLeft = left !== ancestor, changedRight = right !== ancestor
    if (changedLeft && changedRight && left !== right) {
      disputes.add(id)
    } else if (changedLeft) {
      selected.set(id, a.get(id) || null)
    } else if (changedRight) {
      selected.set(id, b.get(id) || null)
    } else {
      selected.set(id, a.get(id) || b.get(id) || null)
    }
  }
  return { selected, disputes, compared: ids }
}
