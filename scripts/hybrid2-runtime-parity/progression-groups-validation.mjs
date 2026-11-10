// Validation-only prototype of explicit shared progression groups.
// Never infer groups from a display name or exerciseId alone.
// This is deliberately outside the shipping model/schema/UI.
import { canonicalJSON } from '../../api/engine/canonical.js'
import { planFingerprint } from '../../api/engine/context.js'

const fail = message => { throw new Error('Validation progression groups: ' + message) }
const text = v => typeof v === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(v)
const groupMembers = profile => profile.progressionGroups?.groups || []

function ruleSignature(occ) {
  const r = occ.rule
  if (!r?.program?.phases?.length) fail('missing rule/program')
  return canonicalJSON({
    exerciseId: occ.exerciseId, mode: occ.mode ?? 'reps',
    side: occ.side === true, assisted: occ.assisted === true,
    atp2: occ.atp2 ?? null, timedLoad: occ.timedLoad ?? null,
    intensifier: occ.intensifier ?? null, backoff: occ.backoff === true,
    rounding: r.rounding,
    program: r.program
  })
}

/** Fail closed on missing members, duplicate membership, mismatched rep ranges or incompatible plans. */
export function validateProgressionGroups(profile) {
  const groups = profile.progressionGroups
  if (groups == null) return new Map()
  if (groups.version !== 1 || !Array.isArray(groups.groups)) fail('unsupported group configuration')
  const occurrences = new Map()
  for (const routine of profile.routines || []) {
    for (const occ of routine.ex || []) {
      if (!text(occ.occurrenceId) || occurrences.has(occ.occurrenceId)) fail('invalid or duplicated occurrenceId')
      occurrences.set(occ.occurrenceId, occ)
    }
  }
  const memberToGroup = new Map(), ids = new Set()
  for (const group of groups.groups) {
    if (!text(group?.id) || ids.has(group.id)) fail('invalid or duplicated group ID')
    ids.add(group.id)
    if (!Array.isArray(group.members) || group.members.length < 2) fail('group requires at least two members')
    const members = group.members.map(id => {
      if (!text(id) || !occurrences.has(id)) fail('unknown occurrenceId in group')
      if (memberToGroup.has(id)) fail('occurrence belongs to multiple groups')
      memberToGroup.set(id, group.id)
      return occurrences.get(id)
    })
    const first = members[0], expectedSignature = ruleSignature(first)
    const repRange = first.rule.program.phases[0].parameters.reps
    const fp = planFingerprint(first.rule)
    for (const occ of members.slice(1)) {
      if (occ.exerciseId !== first.exerciseId) fail('different exerciseId')
      const reps = occ.rule.program.phases[0].parameters.reps
      if (canonicalJSON(reps) !== canonicalJSON(repRange)) fail('different repetition range')
      if (planFingerprint(occ.rule) !== fp) fail('incompatible sets or phase fingerprint')
      if (ruleSignature(occ) !== expectedSignature) fail('incompatible progression algorithm or prescription')
    }
  }
  return memberToGroup
}

/** One stable track for explicitly grouped compatible occurrences; H2 native keys remain authoritative. */
export function resolveValidationTrackId(profile, original, hybrid = null) {
  const groups = validateProgressionGroups(profile)
  const native = hybrid?.adapter?.occurrences?.find(x => x.occurrenceId === original.occurrenceId)
  if (native) {
    if (groups.has(original.occurrenceId)) fail('manual group cannot override pinned HYBRID-2 progression identity')
    return native.progressionIdentity ?? original.occurrenceId
  }
  const id = groups.get(original.occurrenceId)
  return id ? 'progression-group:' + id : original.occurrenceId
}

export const validationGroupMembers = groupMembers
