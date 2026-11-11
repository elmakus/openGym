// Server-side, authenticated H1 history-edit authorization and tamper-evident receipts.
// These tokens attest that a signed-in account explicitly requested the preview.
// They do NOT prove that a human pressed the button or that Liftosaur data is genuine.
import crypto from 'node:crypto'
import { canonicalJSON } from '../../engine/canonical.js'
import { hybridHistoryEvidence, isHybridHistoryWorkout } from './history-ancestry.js'

const digest = value => crypto.createHash('sha256').update(canonicalJSON(value)).digest('hex')
const mac = (secret, value) => crypto.createHmac('sha256', secret)
  .update('opengym-h1-authorization-v1:' + value).digest('base64url')
const safeEqual = (a, b) => typeof a === 'string' && typeof b === 'string' &&
  a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
const object = value => value && typeof value === 'object' && !Array.isArray(value)
const list = value => Array.isArray(value) ? value : []

// Only edits/removals of previously persisted structural H1 workouts require
// authorization. Creating a new normal workout and changing notes/media is
// intentionally not an H1 history edit.
export function existingH1Changes(previous, incoming) {
  const adapter = previous?.trainingControl?.hybrid2Config?.adapter ||
    incoming?.trainingControl?.hybrid2Config?.adapter
  if (!adapter) return []
  const next = new Map(list(incoming?.workouts).map(w => [w.id, w]))
  const changes = []
  for (const old of list(previous?.workouts)) {
    if (!isHybridHistoryWorkout(old, adapter) || typeof old.id !== 'string') continue
    const incomingWorkout = next.get(old.id)
    const from = digest(hybridHistoryEvidence(old))
    const to = incomingWorkout ? digest(hybridHistoryEvidence(incomingWorkout)) : null
    if (from !== to) changes.push({ id: old.id, from, to })
  }
  return changes.sort((a, b) => a.id.localeCompare(b.id, 'en'))
}

export function issueH1Approval({ secret, uid, sessionVersion = 0, rev, wid, changes,
  now = Date.now() }) {
  if (!changes.length || !Number.isSafeInteger(rev) || typeof wid !== 'string' || !wid)
    throw new Error('H1 approval requires existing revisions and concrete changed records')
  const body = { v: 1, scope: 'H1_EXISTING_HISTORY_EDIT', uid, sv: sessionVersion,
    rev, wid, changesHash: digest(changes), issuedAt: now,
    expiresAt: now + 5 * 60 * 1000, nonce: crypto.randomBytes(16).toString('hex') }
  const serialized = Buffer.from(canonicalJSON(body)).toString('base64url')
  return serialized + '.' + mac(secret, serialized)
}

export function verifyH1Approval(token, { secret, uid, sessionVersion = 0, rev, wid,
  changes, now = Date.now() }) {
  if (typeof token !== 'string' || token.length > 4096 || !token.includes('.')) return null
  const [payload, tag, extra] = token.split('.')
  if (!payload || !tag || extra != null || !safeEqual(mac(secret, payload), tag)) return null
  let claim
  try { claim = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) }
  catch { return null }
  if (!object(claim) || claim.v !== 1 || claim.scope !== 'H1_EXISTING_HISTORY_EDIT' ||
      claim.uid !== uid || claim.sv !== sessionVersion || claim.rev !== rev ||
      claim.wid !== wid || claim.changesHash !== digest(changes) ||
      !Number.isSafeInteger(claim.issuedAt) || !Number.isSafeInteger(claim.expiresAt) ||
      now < claim.issuedAt || now > claim.expiresAt ||
      claim.expiresAt - claim.issuedAt !== 5 * 60 * 1000 ||
      typeof claim.nonce !== 'string' || !/^[0-9a-f]{32}$/.test(claim.nonce))
    return null
  return claim
}

// Receipts are server owned, HMAC chained and stored ATOMICALLY IN THE SAME
// canonical profile as the H1 modification. Clients cannot append, strip,
// reorder or forge entries. The chain is tamper evident, not append-only WORM.
export function verifyH1ReceiptLog(receipts, secret) {
  if (receipts == null) return []
  if (!Array.isArray(receipts) || receipts.length > 4096) throw new Error('H1 receipt log invalid')
  let prevSeal = 'genesis'
  for (const entry of receipts) {
    if (!object(entry) || !object(entry.body) || typeof entry.seal !== 'string')
      throw new Error('H1 receipt log corrupted')
    const expect = mac(secret, prevSeal + ':' + canonicalJSON(entry.body))
    if (!safeEqual(expect, entry.seal)) throw new Error('H1 receipt chain failed verification')
    prevSeal = entry.seal
  }
  return receipts
}

// A valid HMAC chain alone could be pasted over independently modified
// workout data by somebody with file access. Compare the latest approved
// digest of EACH corrected workout against the actual canonical source.
export function verifyH1ReceiptState(profile, secret) {
  const receipts = verifyH1ReceiptLog(profile?._h1Receipts, secret)
  const last = new Map()
  for (const receipt of receipts) {
    for (const change of list(receipt.body.changes)) last.set(change.id, change.to)
  }
  if (!last.size) return receipts
  const byId = new Map(list(profile?.workouts).map(w => [w.id, w]))
  for (const [id, expected] of last) {
    const current = byId.has(id) ? digest(hybridHistoryEvidence(byId.get(id))) : null
    if (current !== expected) throw new Error('H1 approved evidence no longer matches the stored workout')
  }
  return receipts
}

export function appendH1Receipt(receipts, approval, { secret, rev, wid, changes }) {
  const verified = verifyH1ReceiptLog(receipts, secret)
  if (!approval) return verified
  if (verified.length >= 4096) throw new Error('H1 receipt log capacity exceeded')
  const body = { v: 1, uid: approval.uid, sv: approval.sv,
    sourceRev: approval.rev, sourceWid: approval.wid, targetRev: rev,
    targetWid: wid, approvedAt: approval.issuedAt, committedAt: Date.now(),
    changesHash: digest(changes), changes, intentNonce: approval.nonce }
  const seal = mac(secret, (verified.at(-1)?.seal || 'genesis') + ':' + canonicalJSON(body))
  return [...verified, { body, seal }]
}
