import test from 'node:test'
import assert from 'node:assert/strict'
import { existingH1Changes, issueH1Approval, verifyH1Approval,
  appendH1Receipt, verifyH1ReceiptLog, verifyH1ReceiptState } from '../training-control/hybrid2/edit-authority.js'

const secret='h1-token-test-key'
const clone=structuredClone
const w=(id='h1:1',n=10)=>({id,d:'2026-11-11',start:1000,hybrid2:{version:1},
  exposures:[{hybrid2:{version:1},performance:{sets:[{role:'work',
    observations:[{metric:'repetitions',value:n}]}]}}]})
const profile=workouts=>({trainingControl:{hybrid2Config:{adapter:{occurrences:[]}}},
  workouts})
const base={secret,uid:'owner-1',sessionVersion:2,rev:9,wid:'wid-a',now:1700000000000}
const authorization=changes=>issueH1Approval({...base,changes})
const check=(token,changes,extra={})=>verifyH1Approval(token,{...base,changes,...extra})

test('only previously confirmed H1 result edits or removals need approval',()=>{
  const original=profile([w()])
  const metadata=profile([{...w(),note:'Sore shoulder',media:[{hash:'file'}]}])
  assert.deepEqual(existingH1Changes(original,metadata),[])
  const added=profile([w(),w('h1:2')])
  assert.deepEqual(existingH1Changes(original,added),[])
  const corrected=profile([w('h1:1',12)])
  const edits=existingH1Changes(original,corrected)
  assert.equal(edits.length,1)
  assert.equal(edits[0].id,'h1:1')
  assert.match(edits[0].from,/^[0-9a-f]{64}$/)
  assert.match(edits[0].to,/^[0-9a-f]{64}$/)
  assert.notEqual(edits[0].from,edits[0].to)
  const deleted=existingH1Changes(original,profile([]))
  assert.deepEqual(deleted.map(x=>x.to),[null])
})

test('signed approval bound to H1 evidence, user, session, revision/wid and expiration',()=>{
  const changes=existingH1Changes(profile([w()]),profile([w('h1:1',12)]))
  const token=authorization(changes)
  assert.ok(check(token,changes))
  assert.equal(check(token,changes,{uid:'another-user'}),null)
  assert.equal(check(token,changes,{sessionVersion:3}),null)
  assert.equal(check(token,changes,{rev:10}),null)
  assert.equal(check(token,changes,{wid:'another-branch'}),null)
  assert.equal(check(token,changes,{secret:'different-secret'}),null)
  assert.equal(check(token,changes,{now:base.now+300001}),null)
  assert.equal(check(token,changes,{now:base.now-1}),null)
  assert.equal(check(token,existingH1Changes(profile([w()]),profile([w('h1:1',9)]))),null)
  const [payload,signature]=token.split('.')
  const changedFinalChar = signature.endsWith('A') ? 'B' : 'A'
  assert.equal(check(payload+'.'+signature.slice(0,-1)+changedFinalChar,changes),null)
  assert.equal(check('not-a-token',changes),null)
  assert.equal(check(token+'JUNK',changes),null)
})

test('accepted receipt is server HMAC chained; clients cannot alter or remove history',()=>{
  const changes=existingH1Changes(profile([w()]),profile([w('h1:1',12)]))
  const approved=check(authorization(changes),changes)
  const entries=appendH1Receipt(undefined,approved,{secret,rev:10,wid:'wid-b',changes})
  assert.equal(entries.length,1)
  assert.equal(verifyH1ReceiptLog(entries,secret).length,1)
  assert.equal(entries[0].body.changes[0].id,'h1:1')
  assert.equal(entries[0].body.changesHash.length,64)
  const nextChanges=existingH1Changes(profile([w('h1:1',12)]),profile([w('h1:1',13)]))
  const next=appendH1Receipt(entries,check(authorization(nextChanges),nextChanges),
    {secret,rev:11,wid:'wid-c',changes:nextChanges})
  assert.equal(next.length,2)
  assert.equal(verifyH1ReceiptLog(next,secret).length,2)
  const altered=clone(next)
  altered[0].body.changes[0].id='silently-swapped'
  assert.throws(()=>verifyH1ReceiptLog(altered,secret),/chain/)
  assert.throws(()=>appendH1Receipt(altered,null,{secret,rev:12,wid:'d',changes:[]}),/chain/)
  assert.throws(()=>verifyH1ReceiptLog([next[1]],secret),/chain/)
})

test('signed receipt must agree with current H1 workout evidence, not just its own HMAC',()=>{
  const original=profile([w()])
  const target=profile([w('h1:1',12)])
  const changes=existingH1Changes(original,target)
  const approved=check(authorization(changes),changes)
  const receipts=appendH1Receipt([],approved,{secret,rev:10,wid:'wid-10',changes})
  target._h1Receipts=receipts
  assert.equal(verifyH1ReceiptState(target,secret).length,1)
  const forged=clone(target)
  forged.workouts[0].start+=60000
  assert.equal(verifyH1ReceiptLog(forged._h1Receipts,secret).length,1)
  assert.throws(()=>verifyH1ReceiptState(forged,secret),/no longer matches/)
})
