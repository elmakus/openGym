#!/usr/bin/env node
// Checks *real integrated* Engine v2 source against previously recorded original M6 history.
// Real original native evidence is already pinned; no mock H2 and no new native workout is claimed.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { buildSessionExposures } from '../../frontend/src/lib/session-start.js'
import { replayHybridHistory } from '../../api/training-control/hybrid2/history.js'
import { validateCanonicalProfile } from '../../api/migration/profile-validation.js'
import { replayProgression, contentHash } from '../../api/engine/index.js'
import { reconcileHybridHistory } from '../../frontend/src/lib/hybrid2-sync.js'

const root=process.env.H2_PARITY_ROOT
const out=process.env.H2_PARITY_OUT
if(!root || !out)throw Error('H2_PARITY_ROOT/H2_PARITY_OUT are required')
const sha=x=>crypto.createHash('sha256').update(x).digest('hex')
const privateSource=fs.readFileSync(path.join(root,'private-live/qtwbbqff.liftoscript'),'utf8')
if(sha(privateSource)!=='7b1c7d114229b4d1cf86093409d7d89ae4e7d88e6a0c1c4c89bcba30a4a425df')
  throw Error('original pinned source drifted')
const runtimeVersion=fs.readFileSync(path.join(root,'liftosaur/README.txt'),'utf8')
assert.match(runtimeVersion,/ce75750bde4a190682fb5a6fa1984fc9184a9842/)
const profiles=Array.from({length:9},(_,i)=>JSON.parse(fs.readFileSync(
  path.join(root,'evidence-m6-full-36/profiles/profile-'+String(i+1).padStart(2,'0')+'.json'),'utf8')))
const full=profiles.at(-1)
const catalog=full.trainingControl.hybrid2Config.adapter
const byOccurrence=new Map(catalog.occurrences.map(o=>[o.occurrenceId,o]))
const report={
  schema:'HYBRID2-SHIPPED-SOURCE-M6-IDENTITY-INTEGRATION-1',
  sourceBranch:'validation/hybrid2-liftosaur-runtime-parity',
  sourceBaseline:'8529b2d41b28fea8ae96a50325aaf28e864a0160',
  sourceFiles:{sessionStartSha256:sha(fs.readFileSync(new URL('../../frontend/src/lib/session-start.js',import.meta.url),'utf8'))},
  originalNativeSourceSha256:sha(privateSource),
  priorNativeWorkoutsReused:9,newNativeWorkouts:0,
  checkedHistoryProfiles:0,checkedHistoryExposures:0,immutablePrescriptionHashes:0,
  checkedProgressionStates:0,realSourceMaterializations:0,checks:0,failures:[],
  classification:''
}
const check=(name,ok)=>{report.checks++;if(!ok)report.failures.push(name)}
for(const [i,p] of profiles.entries()){
  check('canonical-'+i,validateCanonicalProfile(p).ok)
  const replay=replayHybridHistory({workouts:p.workouts,adapter:catalog,prescriptions:p.prescriptions})
  check('h2-replay-count-'+i,replay.sourceCount===i+1)
  const merged=reconcileHybridHistory(structuredClone(p))
  check('h2-reconcile-'+i,!!merged&&JSON.stringify(merged.state)===JSON.stringify(replay.state))
  report.checkedHistoryProfiles++
  const ex=p.workouts.flatMap(w=>w.exposures)
  for(const x of ex){
    check('history-shared-key-'+i,x.trackId===byOccurrence.get(x.occurrenceId)?.progressionIdentity)
    report.checkedHistoryExposures++
  }
  for(const prescription of Object.values(p.prescriptions)){
    const {contentHash:hash,...body}=prescription
    check('immutable-prescription-'+i,hash===contentHash(body))
    report.immutablePrescriptionHashes++
  }
  for(const [id,state] of Object.entries(p.progression)){
    const replayed=replayProgression({workouts:p.workouts,trackId:id,prescriptions:p.prescriptions})
    check('replay-pointer-'+i,replayed?.lastCompletedLogId===state.lastCompletedLogId)
    report.checkedProgressionStates++
  }
}
const make=(p,ridx,when)=>{
  const s=structuredClone(p)
  const xs=buildSessionExposures(s,s.routines[ridx],{now:when,newId:id=>id,unit:'kg'})
  report.realSourceMaterializations++
  return {s,xs}
}
const when=Date.UTC(2026,10,18,12)
const next=make(full,0,when)
check('all-11-a-slots',next.xs.length===11)
for(const exposure of next.xs){
  const native=byOccurrence.get(exposure.occurrenceId)
  const p=next.s.prescriptions[exposure.prescriptionId]
  check('shipped-direct-h2-native-track',exposure.trackId===native?.progressionIdentity)
  check('shipped-prescription-id',p.trackId===exposure.trackId)
  const {contentHash:hash,...body}=p
  check('shipped-content-hash',hash===contentHash(body))
}
check('next-canonical',validateCanonicalProfile(next.s).ok)
// Opt-out from HYBRID-2 must retain Engine v2's per-occurrence identities.
const ordinary=structuredClone(full)
ordinary.workouts=[];ordinary.prescriptions={};ordinary.progression={}
ordinary.trainingControl.hybrid2Config.enabled=false
const disabled=make(ordinary,0,when+86400000)
check('disabled-native-adapter-does-not-share',disabled.xs.every(x=>x.trackId===x.occurrenceId))
check('disabled-canonical',validateCanonicalProfile(disabled.s).ok)
const noController=structuredClone(ordinary)
delete noController.trainingControl.hybrid2Config
const noCfg=make(noController,0,when+172800000)
check('no-controller-original-id',noCfg.xs.every(x=>x.trackId===x.occurrenceId))
report.classification=report.failures.length?'RED':'INTEGRATED_SOURCE_PASS'
fs.mkdirSync(out,{recursive:true,mode:0o700})
fs.writeFileSync(path.join(out,'shipped-m6-identity-integration-sanitized.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600})
console.log(JSON.stringify(report,null,2))
if(report.failures.length)process.exitCode=1
