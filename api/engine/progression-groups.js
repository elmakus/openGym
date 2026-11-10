// Explicit opt-in progression groups for Engine v2.
// The occurrence retains its own plan and position. Only compatible members share a durable track.
// No inference from display names, calendar weekdays or exercise order.
import { canonicalJSON } from './canonical.js'
import { planFingerprint } from './context.js'

const fail = reason => { throw new Error('Progression groups: ' + reason) }
const validId = x => typeof x === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(x)
const same = (a, b) => canonicalJSON(a) === canonicalJSON(b)
const list = v => Array.isArray(v) ? v : []
const isObj = v => v && typeof v === 'object' && !Array.isArray(v)

const catalogue = profile => {
  const byId = new Map()
  for (const routine of list(profile?.routines)) for (const occ of list(routine?.ex)) {
    if (!validId(occ?.occurrenceId) || byId.has(occ.occurrenceId)) fail('invalid or duplicated occurrence ID')
    byId.set(occ.occurrenceId, occ)
  }
  return byId
}

// Includes anything which changes the advancement algorithm, not the rule ID, routine or label.
// Conservative initial compatibility: identical set structure and full operator configuration.
const signature = occ => canonicalJSON({
  exerciseId:occ.exerciseId, mode:occ.mode ?? 'reps', side:occ.side === true,
  assisted:occ.assisted === true, atp2:occ.atp2 ?? null, timedLoad:occ.timedLoad ?? null,
  backoff:occ.backoff === true, intensifier:occ.intensifier ?? null,
  rounding:occ.rule?.rounding, program:occ.rule?.program
})

const hybridNative = (profile, occurrenceId) => {
  const config = profile?.trainingControl?.hybrid2Config
  if (config?.enabled !== true) return null
  return config.adapter?.occurrences?.find(o => o.occurrenceId === occurrenceId) || null
}

export function validateProgressionGroups(profile) {
  const config = profile?.progressionGroups
  if (config == null) return new Map()
  if (!isObj(config) || config.version !== 1 || !Array.isArray(config.groups)) fail('unsupported configuration')
  const byId = catalogue(profile), seen = new Map(), ids = new Set()
  for (const group of config.groups) {
    if (!validId(group?.id) || ids.has(group.id)) fail('invalid or duplicate group ID')
    ids.add(group.id)
    if (!Array.isArray(group.members) || group.members.length < 2) fail('a group requires at least two occurrences')
    const members = group.members.map(id => {
      if (!validId(id) || !byId.has(id)) fail('unknown occurrence ID')
      if (seen.has(id)) fail('occurrence belongs to multiple groups')
      if (hybridNative(profile, id)) fail('HYBRID-2 pinned identity cannot be replaced by a manual group')
      seen.set(id, group.id)
      return byId.get(id)
    })
    // A ladder may change the effective exercise independently of its occurrence ID.
    // Its rung selection still reads occurrence-scoped state and cannot be grouped safely.
    if (members.some(o => o.rule?.program?.phases?.some(p =>
      p.progression?.some(step => step.metric === 'difficulty'))))
      fail('difficulty ladder groups require separate support')
    const first = members[0]
    const reps = first.rule?.program?.phases?.[0]?.parameters?.reps
    if (!isObj(reps) || !Number.isInteger(reps.min) || !Number.isInteger(reps.max))
      fail('member has no valid repetition range')
    const shape = planFingerprint(first.rule), fingerprint = signature(first)
    for (const other of members.slice(1)) {
      if (first.exerciseId !== other.exerciseId) fail('different exercises cannot share progression')
      if (!same(reps, other.rule?.program?.phases?.[0]?.parameters?.reps)) fail('repetition ranges must match')
      if (shape !== planFingerprint(other.rule)) fail('set and phase structure must match')
      if (fingerprint !== signature(other)) fail('progression rules must match')
    }
  }
  return seen
}

export function progressionTrackId(profile, occurrence, hybrid = null) {
  const mapped = validateProgressionGroups(profile)
  const native = hybrid?.adapter?.occurrences?.find(o => o.occurrenceId === occurrence.occurrenceId)
    ?? hybridNative(profile, occurrence.occurrenceId)
  if (native) {
    if (mapped.has(occurrence.occurrenceId)) fail('pinned identity conflicts with manual group')
    return native.progressionIdentity ?? occurrence.occurrenceId
  }
  const groupId = mapped.get(occurrence.occurrenceId)
  return groupId ? 'progression-group:' + groupId : occurrence.occurrenceId
}

const partitioned = (profile, occurrence, hybrid = null) => {
  if (hybrid?.adapter?.occurrences?.some(o => o.occurrenceId === occurrence.occurrenceId) ||
      hybridNative(profile, occurrence.occurrenceId)) return true
  const mapped = validateProgressionGroups(profile)
  if (!mapped.size) return false
  const byId = catalogue(profile)
  const includedExercises = new Set([...mapped.keys()].map(id => byId.get(id).exerciseId))
  return includedExercises.has(occurrence.exerciseId)
}

// A named group outranks the global "Any workout" fallback.
// Even with acrossRoutines=false Engine v2 may borrow an unlinked exercise's baseline,
// therefore filter *both* history lookup paths without touching stored workout records.
export function progressionAcrossRoutines(profile, occurrence, hybrid, fallback) {
  return partitioned(profile, occurrence, hybrid) ? false : fallback
}
export function progressionHistoryForTrack(profile, occurrence, hybrid, trackId, workouts) {
  if (!partitioned(profile, occurrence, hybrid)) return workouts
  return list(workouts).map(w => ({ ...w, exposures:list(w.exposures).filter(x =>
    x.exerciseId !== occurrence.exerciseId || x.trackId === trackId) }))
}

// Group edit operations are intentionally clean-start only for all affected occurrences.
// Existing completed sessions must never be relabelled to merge different progression states.
export function joinProgressionGroup(profile, occurrenceId, peerId, createId) {
  const byId = catalogue(profile)
  if (!byId.has(occurrenceId) || !byId.has(peerId) || occurrenceId === peerId) fail('choose two distinct existing occurrences')
  const mapped = validateProgressionGroups(profile)
  const a = mapped.get(occurrenceId), b = mapped.get(peerId)
  if (a && b && a === b) return false
  if (a && b && a !== b) fail('two existing groups cannot be merged')
  const affected = new Set([occurrenceId, peerId])
  for (const groupId of [a, b].filter(Boolean)) for (const member of profile.progressionGroups.groups
    .find(g => g.id === groupId)?.members || []) affected.add(member)
  if ([...affected].some(id => hasLoggedOccurrence(profile, id)))
    fail('cannot regroup an occurrence after history has been logged')
  const added = a ? peerId : occurrenceId
  const id = a || b || createId()
  if (!validId(id)) fail('invalid generated group ID')
  const before = structuredClone(profile.progressionGroups || { version:1, groups:[] })
  const next = structuredClone(before)
  if (a || b) next.groups.find(g => g.id === id).members.push(added)
  else {
    if (hasLoggedOccurrence(profile, peerId)) fail('cannot regroup an occurrence after history has been logged')
    next.groups.push({id, members:[occurrenceId,peerId]})
  }
  validateProgressionGroups({...profile, progressionGroups:next})
  profile.progressionGroups = next
  return true
}

export function leaveProgressionGroup(profile, occurrenceId) {
  const mapped = validateProgressionGroups(profile)
  const id = mapped.get(occurrenceId)
  if (!id) return false
  if (hasLoggedOccurrence(profile, occurrenceId)) fail('cannot ungroup an occurrence after history has been logged')
  const next = structuredClone(profile.progressionGroups)
  const group = next.groups.find(g => g.id === id)
  if (group.members.length === 2 && hasLoggedOccurrence(profile, group.members.find(x=>x!==occurrenceId)))
    fail('cannot dissolve a group after history has been logged')
  group.members = group.members.filter(x => x !== occurrenceId)
  if (group.members.length < 2) next.groups = next.groups.filter(g => g.id !== id)
  validateProgressionGroups({...profile,progressionGroups:next})
  profile.progressionGroups = next
  return true
}

const hasLoggedOccurrence = (profile, id) => list(profile?.workouts).some(w =>
  list(w?.exposures).some(x => x.occurrenceId === id && x.actual?.sets > 0))

// Editing a routine must not strand group references; do not silently detach a
// progressed occurrence, as that would fork the progression without a history policy.
export function pruneEmptyProgressionGroups(profile) {
  const c = profile?.progressionGroups
  if (!c) return
  const byId = catalogue(profile)
  const next = structuredClone(c)
  next.groups = next.groups.map(g=>({...g,members:g.members.filter(id=>byId.has(id))}))
  for (const old of c.groups) if (old.members.some(id=>!byId.has(id)) &&
    old.members.some(id=>hasLoggedOccurrence(profile,id))) fail('cannot remove logged group members')
  next.groups = next.groups.filter(g=>g.members.length>=2)
  validateProgressionGroups({...profile,progressionGroups:next})
  profile.progressionGroups=next
}
