// Two genuinely diverged Engine V2 client profiles, optimistic HTTP 409, canonical
// merge/replay, independent physical sides and restarted isolated persistence.
// Synthetic only: no production account, original Liftosaur runs or private athlete data.
import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'
import { boundPort } from './helpers.mjs'
import { K5 } from '../training-control/hybrid2/fixtures/reference-adapters.js'
import { SIDE_PLANK_TIMED_CONFIG } from '../training-control/timed-load.js'
import { replayAtp2History } from '../training-control/history.js'
import { replayTimedLoadHistory } from '../training-control/timed-load-history.js'
import { replayHybridHistory } from '../training-control/hybrid2/history.js'
import { defaultPlanRule, joinProgressionGroup, replayProgression } from '../engine/index.js'
import { validateCanonicalProfile } from '../migration/profile-validation.js'
import { packProfile, unpackProfile } from '../migration/profile-pack.js'
import { buildSessionExposures } from '../../frontend/src/lib/session-start.js'
import { entriesForExposures } from '../../frontend/src/lib/session-ui-adapter.js'
import { buildCompletedSession } from '../../frontend/src/lib/finish-session.js'
import { mergeStates } from '../../frontend/src/lib/sync-merge.js'
import { editCompletedSession, saveWorkoutEdit } from '../../frontend/src/lib/session-edit.js'
import { syncSideAggregate } from '../../frontend/src/lib/workout-model.js'
import { reconcileHybridHistory, resolveHybridHistoryConflict } from '../../frontend/src/lib/hybrid2-sync.js'

const API=path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const UID='two_device_engine_v2_synthetic'
const SECRET=crypto.randomBytes(32).toString('hex')
const clone=structuredClone
const at=day=>Date.UTC(2026,10,day,12)
const rule=(id,rid,{sets=2,reps=[6,8],kg=100,preset='linear',sec=null}={})=>
 defaultPlanRule(preset,{id:'rule-'+id,routineId:rid,exerciseId:'0025',
  completion:[],target:{mode:'none'},sets:{min:sets,max:sets},
  reps:{min:reps[0],max:reps[1]},...(sec?{durationSeconds:{min:sec,max:sec}}:{}),
  load:{mode:'absolute',value:kg,unit:'kg'}})
function seed(){
 const routines=K5.routines.map(r=>({...r,ex:r.ex.map(x=>
  x.occurrenceId.endsWith(':closer')
   ? {...x,exerciseId:'0089',mode:'time',side:true,warmup:'none',
      timedLoad:{...SIDE_PLANK_TIMED_CONFIG,enabled:true},
      rule:defaultPlanRule('hold_seconds',{id:'rule-closer',routineId:r.id,
       exerciseId:'0089',sets:{min:2,max:2},reps:{min:1,max:1},
       durationSeconds:{min:30,max:30},
       load:{mode:'absolute',value:0,unit:'kg'},completion:[],target:{mode:'none'}})}
   : {...x,warmup:'none',atp2:{enabled:true,floorWeight:10},
      rule:rule(x.occurrenceId,r.id,{sets:3,reps:[8,16]})}
 )}))
 for(const [rid,id] of [['EXTRA-A','shared-a'],['EXTRA-B','shared-b']]){
  routines.push({id:rid,name:rid,ex:[{
   occurrenceId:id,exerciseId:'0025',side:true,warmup:'none',
   rule:rule(id,rid,{sets:2,reps:[6,8],kg:100})
  }]})
 }
 const p={engineSchemaVersion:2,unit:'kg',lastFrom:'any',startFrom:'plan',
  routines,workouts:[],prescriptions:{},progression:{},oneRepMaxes:{},
  trainingControl:{atp2:{},timedLoad:{},
   hybrid2Config:{version:1,enabled:true,adapter:clone(K5.adapter)}},
  _ts:at(9)}
 assert.equal(joinProgressionGroup(p,'shared-a','shared-b',()=> 'synthetic-shared'),true)
 assert.deepEqual(validateCanonicalProfile(p),{ok:true,errors:[]})
 return p
}
function complete(p,rid,day,options={}){
 const r=p.routines.find(x=>x.id===rid)
 assert.ok(r,'missing routine '+rid)
 const now=at(day)
 const exposures=buildSessionExposures(p,r,{now,newId:x=>x,unit:'kg'})
 const entries=entriesForExposures(exposures,p.prescriptions)
 assert.ok(entries.length)
 for(const e of entries)for(const [idx,row] of e.sets.entries()){
  if(row.warmup)continue
  if(row.sides){
   for(const side of ['L','R']){
    const part=row.sides[side]
    part.done=true
    if(rid===K5.routines.at(-1).id){
     part.sec=side==='R'?(options.rightSeconds??32):(options.leftSeconds??35)
     part.w=0
    }else part.r=side==='R'?(options.rightReps??8):(options.leftReps??8)
   }
   e.sets[idx]=syncSideAggregate(row)
  }else{
   row.done=true
   if(rid===K5.routines.at(-1).id){row.sec=options.rightSeconds??32;row.w=0}
   else row.r=options.leftReps??8
  }
 }
 const active={id:'real-finish-'+rid+'-'+day,start:now,d:new Date(now).toISOString().slice(0,10),
  routineIds:[rid],exposures,entries}
 const result=buildCompletedSession(active,p,{end:now+3600000,newId:x=>x,unit:'kg'})
 p.workouts.push(result.session)
 Object.assign(p.progression,result.progression)
 p.trainingControl.atp2={...p.trainingControl.atp2,...result.atp2States}
 p.trainingControl.timedLoad={...p.trainingControl.timedLoad,...result.timedLoadStates}
 reconcileHybridHistory(p)
 p._ts=now+3600000
 assert.deepEqual(validateCanonicalProfile(p),{ok:true,errors:[]})
 return result.session
}
function physical(session,track){
 const exp=session.exposures.find(x=>x.trackId===track)
 assert.ok(exp,'missing physical track '+track)
 return exp.performance.sets.filter(x=>x.status==='completed')
}
function expectedDerived(p){
 assert.deepEqual(p.trainingControl.atp2,replayAtp2History(p.workouts),'ATP2 replay')
 assert.deepEqual(p.trainingControl.timedLoad,replayTimedLoadHistory(p.workouts),'Timed replay')
 const replay=replayHybridHistory({workouts:p.workouts,adapter:K5.adapter,prescriptions:p.prescriptions})
 assert.deepEqual(p.trainingControl.hybrid2,replay.state,'H1/deload replay')
 assert.notEqual(p.trainingControl.hybrid2Diagnostics?.status,'INCOMPATIBLE')
 const track='progression-group:synthetic-shared'
 assert.ok(p.progression[track]?.lastCompletedLogId,'group state must advance from completed bilateral work')
 assert.deepEqual(p.progression[track],replayProgression({
  workouts:p.workouts,prescriptions:p.prescriptions,trackId:track}),'group Engine replay')
}
const cookie=()=>{
 const payload=UID+':'+(Date.now()+86400000)+':0'
 return 'gymsid='+payload+'.'+crypto.createHmac('sha256',SECRET).update(payload).digest('base64url')
}
async function start(dir){
 const child=spawn(process.execPath,['server.js'],{cwd:API,stdio:['ignore','pipe','pipe'],
  env:{...process.env,PORT:'0',DATA_DIR:dir,ORIGIN:'http://localhost:8080',RP_ID:'localhost',
   INTEGRATIONS:'',REMINDER_TICK_MS:'99999999',MEDIA_UPLOADS:'0'}})
 const s={child,log:''}
 child.stdout.on('data',x=>s.log+=x)
 child.stderr.on('data',x=>s.log+=x)
 s.port=await boundPort(child,()=>s.log)
 return s
}
async function stop(s){
 if(!s||s.child.exitCode!=null||s.child.signalCode!=null)return
 const exited=once(s.child,'exit')
 s.child.kill('SIGTERM')
 await exited
}
test('two offline clients: A completes, B edits earlier L/R, HTTP 409/merge, restart and deterministic replay',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'og-two-device-v2-'))
 fs.chmodSync(dir,0o700)
 fs.writeFileSync(path.join(dir,'secret'),SECRET,{mode:0o600})
 fs.writeFileSync(path.join(dir,'db.json'),JSON.stringify({
  users:[{id:UID,name:'Synthetic',created:'2026-11-10T00:00:00.000Z'}],
  creds:[],subs:[],invites:[]}),{mode:0o600})
 let s=null,requests=0,writes=0,reads=0,restarts=0,conflicts=0
 t.after(async()=>{await stop(s);fs.rmSync(dir,{recursive:true,force:true})})
 s=await start(dir)
 const req=async(method,body)=>{
  requests++
  const r=await fetch('http://127.0.0.1:'+s.port+'/api/data',{
   method,headers:{cookie:cookie(),origin:'http://localhost:8080','content-type':'application/json',
    'x-opengym-engine-schema':'2'},
   ...(body===undefined?{}:{body:JSON.stringify(body)})})
  return {status:r.status,data:await r.json()}
 }
 const read=async()=>{
  reads++
  const r=await req('GET')
  assert.equal(r.status,200,JSON.stringify(r))
  return {rev:r.data.rev,wid:r.data.wid,state:r.data.state?unpackProfile(r.data.state):null}
 }
 const write=async(p,rev,wid=null,{approved=false}={})=>{
  assert.deepEqual(validateCanonicalProfile(p),{ok:true,errors:[]})
  let h1Authorization=null
  if(approved){
   const auth=await fetch('http://127.0.0.1:'+s.port+'/api/data/h1-authorize',{
    method:'POST',headers:{cookie:cookie(),origin:'http://localhost:8080',
     'content-type':'application/json','x-opengym-engine-schema':'2'},
    body:JSON.stringify({state:packProfile(p),baseRev:rev,baseWid:wid,
     confirmed:'APPROVE_EXISTING_H1_HISTORY_CHANGES'})})
   const answer=await auth.json()
   assert.equal(auth.status,200,JSON.stringify(answer))
   h1Authorization=answer.token
  }
  const r=await req('PUT',{state:packProfile(p),baseRev:rev,stamped:true,
    ...(wid?{baseWid:wid}:{}),...(h1Authorization?{h1Authorization}:{})})
  if(r.status===200)writes++
  if(r.status===409)conflicts++
  return r
 }
 let p=seed()
 let r=await write(p,0)
 assert.equal(r.status,200,JSON.stringify(r))
 let head=await read()
 assert.equal(head.rev,1)
 p=head.state
 for(let i=0;i<5;i++)complete(p,K5.routines[i].id,10+i,
  i===4?{leftSeconds:35,rightSeconds:32}:{leftReps:12,rightReps:10})
 const shared=complete(p,'EXTRA-A',15,{leftReps:8,rightReps:7})
 assert.equal(physical(shared,'progression-group:synthetic-shared').length,4)
 assert.deepEqual(physical(shared,'progression-group:synthetic-shared').map(x=>x.side),['L','R','L','R'])
 expectedDerived(p)
 r=await write(p,head.rev)
 assert.equal(r.status,200,JSON.stringify(r))
 head=await read()
 assert.equal(head.rev,2)
 const A=clone(head.state),B=clone(head.state)
 const baseRev=head.rev
 // A finishes two new sessions unseen by B. They go through genuine session UI + finish.
 const aGroup=complete(A,'EXTRA-B',16,{leftReps:8,rightReps:6})
 assert.equal(physical(aGroup,'progression-group:synthetic-shared').length,4)
 complete(A,K5.routines[0].id,17,{leftReps:12,rightReps:10})
 expectedDerived(A)
 r=await write(A,baseRev)
 assert.equal(r.status,200,JSON.stringify(r))
 const revA=r.data.rev
 assert.equal(revA,3)
 // B remains offline, edits two historical workouts (including only RIGHT timed seconds).
 const timedId='real-finish-'+K5.routines[4].id+'-14'
 const sharedId='real-finish-EXTRA-A-15'
 const closerTrack=K5.adapter.closerOccurrence
 const timedRows=physical(B.workouts.find(w=>w.id===timedId),closerTrack)
 assert.deepEqual(timedRows.map(x=>[x.side,x.setId]),[['L','r0'],['R','r0'],['L','r1'],['R','r1']])
 const beforeLeft=timedRows[0].observations.find(x=>x.metric==='duration').value
 // B opens its persisted workout through the real historical-editor adapter.
 const timedDraft=editCompletedSession(B,timedId)
 const timedExposureId=timedDraft.exposures.find(x=>x.trackId===closerTrack).exposureId
 const timedEntry=timedDraft.entries.find(x=>x.exposureId===timedExposureId)
 assert.deepEqual(timedEntry.sets.map(x=>[x.side,x.setId]),
  [['L','r0'],['R','r0'],['L','r1'],['R','r1']])
 timedEntry.sets[1].sec=21
 const bTimed=saveWorkoutEdit(B,at(24))
 assert.equal(bTimed.id,timedId)
 // The L/R repetitions rejoin as editable pairs and split again on Save.
 const sharedDraft=editCompletedSession(B,sharedId)
 const sharedRow=sharedDraft.entries[0].sets[0]
 assert.equal(sharedRow.setId,'r0')
 assert.equal(sharedRow.sides.L.done,true)
 assert.equal(sharedRow.sides.R.done,true)
 sharedRow.sides.R.r=5
 sharedDraft.entries[0].sets[0]=syncSideAggregate(sharedRow)
 const bShared=saveWorkoutEdit(B,at(25))
 delete B.active // useStore stores the editor in separate A; profile S cannot contain active
 assert.equal(bShared.id,sharedId)
 assert.deepEqual(physical(bShared,'progression-group:synthetic-shared').map(x=>[x.side,x.setId]),
  [['L','r0'],['R','r0'],['L','r1'],['R','r1']])
 B.trainingControl.timedLoad={[closerTrack]:{target:999}}
 B.trainingControl.atp2={[K5.adapter.signals[0].progressionIdentity]:{candidate:999}}
 B.trainingControl.hybrid2={stale:true}
 B._ts=at(25)
 r=await write(B,baseRev)
 assert.equal(r.status,409,'stale client must be rejected, never overwrite A')
 assert.equal(r.data.rev,revA)
 const remote=unpackProfile(r.data.state)
 assert.equal(remote.workouts.length,8)
 // Same conflict algorithm used by useStore.doPush after 409.
 const merged=mergeStates(B,remote)
 assert.ok(merged.trainingControl.hybrid2HistoryConflict,
  'offline edit of H1 evidence requires review even with valid canonical schema')
 assert.equal(merged.trainingControl.hybrid2Diagnostics.status,'INCOMPATIBLE')
 // Server must also refuse an incompatible but canonical-valid merged timeline,
 // including if an older client bypasses the current app's offline hold.
 assert.equal((await write(merged,revA)).status,400)
 const noAdapter=clone(merged)
 delete noAdapter.trainingControl.hybrid2Config
 delete noAdapter.trainingControl.hybrid2HistoryConflict
 assert.equal((await write(noAdapter,revA)).status,400,
  'older client cannot strip H1 adapter and save the tagged timeline')
 assert.equal(merged.workouts.length,8)
 assert.equal(merged.workouts.filter(w=>w.id===bShared.id).length,1)
 assert.deepEqual(merged.progressionGroups,remote.progressionGroups)
 const savedTimed=physical(merged.workouts.find(w=>w.id===bTimed.id),closerTrack)
 assert.equal(savedTimed[0].observations.find(x=>x.metric==='duration').value,beforeLeft)
 assert.equal(savedTimed[1].observations.find(x=>x.metric==='duration').value,21)
 assert.equal(physical(merged.workouts.find(w=>w.id===bShared.id),
  'progression-group:synthetic-shared')[1].observations[0].value,5)
 assert.deepEqual(merged.workouts.map(w=>w.id),[...remote.workouts.map(w=>w.id)])
 const pending=clone(merged.trainingControl.hybrid2HistoryConflict)
 const choices=Object.fromEntries(pending.entries.map(e=>[e.id,'merged']))
 resolveHybridHistoryConflict(merged,choices) // explicit synthetic reviewer decision, not automatic sync
 assert.equal(merged.trainingControl.hybrid2Config.enabled,false)
 assert.deepEqual(merged.trainingControl.hybrid2HistoryReviews[0].entries,pending.entries)
 merged.trainingControl.hybrid2Config.enabled=true // separate explicit reviewer re-enable
 assert.ok(reconcileHybridHistory(merged))
 expectedDerived(merged)
 r=await write(merged,revA,remote._wid,{approved:true})
 assert.equal(r.status,200,JSON.stringify(r))
 const revFinal=r.data.rev
 head=await read()
 assert.equal(head.rev,revFinal)
 assert.deepEqual(head.state.workouts,merged.workouts)
 expectedDerived(head.state)
 await stop(s);s=await start(dir);restarts++
 const after=await read()
 assert.equal(after.rev,revFinal)
 assert.deepEqual(after.state.workouts,merged.workouts)
 assert.deepEqual(after.state.progressionGroups,merged.progressionGroups)
 expectedDerived(after.state)
 const disk=unpackProfile(JSON.parse(fs.readFileSync(path.join(dir,'state-'+UID+'.json'),'utf8')))
 assert.deepEqual(disk.workouts,after.state.workouts)
 expectedDerived(disk)
 const idChecks=after.state.workouts.flatMap(w=>w.exposures).filter(x=>x.occurrenceId==='shared-a' ||
  x.occurrenceId==='shared-b')
 assert.equal(idChecks.length,2)
 assert.ok(idChecks.every(x=>x.trackId==='progression-group:synthetic-shared'))
 for(const x of idChecks){
  assert.deepEqual(x.performance.sets.map(row=>[row.side,row.setId]),
   [['L','r0'],['R','r0'],['L','r1'],['R','r1']],
   'per-side set identities remain stable after edit, HTTP merge and restart')
  assert.ok(x.performance.sets.every(row=>row.status==='completed'))
 }
 const mergedOlder=after.state.workouts.find(w=>w.id===sharedId)
 const newerFromA=after.state.workouts.find(w=>w.id===aGroup.id)
 assert.ok(newerFromA,'latest A workout must not be lost to B offline correction')
 assert.equal(physical(mergedOlder,'progression-group:synthetic-shared')[1]
  .observations[0].value,5,'B edited only older right repetitions')
 assert.equal(physical(newerFromA,'progression-group:synthetic-shared')[1]
  .observations[0].value,6,'newer A right repetitions unchanged')
 const persistedTimed=physical(after.state.workouts.find(w=>w.id===timedId),closerTrack)
 assert.deepEqual(persistedTimed.map(row=>[row.side,row.setId]),
  [['L','r0'],['R','r0'],['L','r1'],['R','r1']])
 assert.equal(persistedTimed[0].observations[0].value,beforeLeft,'left hold unchanged')
 assert.equal(persistedTimed[1].observations[0].value,21,'older right hold edited')
 const secondMerge=mergeStates(after.state,B)
 assert.equal(secondMerge.workouts.length,8,'repeated stale merge must never duplicate workouts')
 // B has exactly the accepted H1 performance in this case. A later sync
 // of identical observations is safe; the immutable review receipt remains.
 assert.equal(secondMerge.trainingControl.hybrid2HistoryConflict,undefined)
 assert.deepEqual(secondMerge.trainingControl.hybrid2HistoryReviews,
  after.state.trainingControl.hybrid2HistoryReviews)
 expectedDerived(secondMerge)
 assert.deepEqual(secondMerge.workouts.find(w=>w.id===timedId).exposures,
  after.state.workouts.find(w=>w.id===timedId).exposures)
 const result={schema:'ENGINE-V2-TWO-DEVICE-HTTP-ADVERSARIAL-1',verdict:'PASS',
  syntheticCompletedSessions:after.state.workouts.length,physicalBilateralRows:8+4,
  httpRequests:requests,httpReads:reads,httpAcceptedWrites:writes,http409Conflicts:conflicts,
  backendRestarts:restarts,revision:revFinal,
  editedRightTimedSeconds:21,editedRightSharedReps:5,
  replay:['ATP2','Timed Load','HYBRID-2','grouped Engine V2'],
  explicitH1HistoryReviews:1,staleSameEvidenceAccepted:true,
  sourceNativeNewRuns:0,liveDataWrites:0}
 if(process.env.H2_PARITY_OUT){
  fs.mkdirSync(process.env.H2_PARITY_OUT,{recursive:true,mode:0o700})
  fs.writeFileSync(path.join(process.env.H2_PARITY_OUT,'two-device-engine-v2-adversarial-sanitized.json'),
   JSON.stringify(result,null,2)+'\n',{mode:0o600})
 }
 console.log('TWO_DEVICE_ENGINE_V2_HTTP_PASS',JSON.stringify(result))
})

test('revision-bound H1 ancestry: 409 resolves unilateral history edit, concurrent edits hold, survives restart', async t => {
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'og-h1-ancestry-'))
 fs.chmodSync(dir,0o700)
 fs.writeFileSync(path.join(dir,'secret'),SECRET,{mode:0o600})
 fs.writeFileSync(path.join(dir,'db.json'),JSON.stringify({
   users:[{id:UID,name:'Synthetic',created:'2026-11-10T00:00:00.000Z'}],
   creds:[],subs:[],invites:[]}),{mode:0o600})
 let s=null
 t.after(async()=>{await stop(s);fs.rmSync(dir,{recursive:true,force:true})})
 s=await start(dir)
 const req=async(method,profile,rev,wid,h1Authorization=null)=>{
   const res=await fetch('http://127.0.0.1:'+s.port+'/api/data',{
     method,headers:{cookie:cookie(),origin:'http://localhost:8080',
       'content-type':'application/json','x-opengym-engine-schema':'2'},
     ...(profile===undefined?{}:{body:JSON.stringify({
       state:packProfile(profile),stamped:true,
       ...(rev==null?{}:{baseRev:rev}),
       ...(wid?{baseWid:wid}:{}),
       ...(h1Authorization?{h1Authorization}:{})})})
   })
   const data=await res.json()
   return {status:res.status,data,profile:data.state?unpackProfile(data.state):null}
 }
 const get=async()=>{const res=await req('GET');assert.equal(res.status,200);return res}
 const approve=async(profile,rev,wid)=>{
   const response=await fetch('http://127.0.0.1:'+s.port+'/api/data/h1-authorize',{
     method:'POST',headers:{cookie:cookie(),origin:'http://localhost:8080',
       'content-type':'application/json','x-opengym-engine-schema':'2'},
     body:JSON.stringify({state:packProfile(profile),baseRev:rev,baseWid:wid,
       confirmed:'APPROVE_EXISTING_H1_HISTORY_CHANGES'})
   })
   const body=await response.json()
   assert.equal(response.status,200,JSON.stringify(body))
   assert.ok(body.token)
   return body.token
 }
 const edited=(profile,index,reps)=>{
   const w=profile.workouts[index]
   const row=w.exposures.find(x=>x.hybrid2?.signalId)?.performance?.sets?.find(r=>r.role==='work')
   assert.ok(row)
   row.observations.find(x=>x.metric==='repetitions').value=reps
   w._ts=at(28)
   profile._ts=at(29)
   reconcileHybridHistory(profile)
 }
 let p=seed()
 for(let i=0;i<5;i++)complete(p,K5.routines[i].id,10+i,{leftReps:12,rightReps:10})
 let response=await req('PUT',p,0)
 assert.equal(response.status,200,JSON.stringify(response.data))
 let head=await get()
 const initial=clone(head.profile),baseRev=head.data.rev,baseWid=head.profile._wid
 assert.ok(baseWid)
 const A=clone(initial),B=clone(initial)
 edited(A,1,13)
 B.restSec=77;B._ts=at(30)
 const preview=await fetch('http://127.0.0.1:'+s.port+'/api/data/h1-authorize',{
   method:'POST',headers:{cookie:cookie(),origin:'http://localhost:8080',
     'content-type':'application/json','x-opengym-engine-schema':'2'},
   body:JSON.stringify({state:packProfile(A),baseRev,baseWid,
     confirmed:'PREVIEW_EXISTING_H1_HISTORY_CHANGES'})
 })
 assert.equal(preview.status,200)
 const previewBody=await preview.json()
 assert.equal(previewBody.token,undefined,
   'preview cannot accidentally issue a write authorization')
 assert.equal(previewBody.requiresExplicitApproval,true)
 assert.deepEqual(previewBody.changedWorkoutIds,[initial.workouts[1].id])
 assert.equal(previewBody.changes[0].from.length,64)
 assert.equal(previewBody.changes[0].to.length,64)
 const firstApproval=await approve(A,baseRev,baseWid)
 // Same valid profile with correct wid cannot silently edit historical H1.
 const noApproval=await req('PUT',A,baseRev,baseWid)
 assert.equal(noApproval.status,428)
 assert.equal(noApproval.data.error,'h1-approval-required')
 const tamperedApproval=await req('PUT',A,baseRev,baseWid,firstApproval+'tampered')
 assert.equal(tamperedApproval.status,428)
 assert.equal(tamperedApproval.data.error,'h1-approval-required')
 response=await req('PUT',A,baseRev,baseWid,firstApproval)
 assert.equal(response.status,200,JSON.stringify(response.data))
 const nextRev=response.data.rev
 const auditAfterEdit=unpackProfile(JSON.parse(fs.readFileSync(
   path.join(dir,'state-'+UID+'.json'),'utf8')))
 assert.equal(auditAfterEdit._h1Receipts.length,1)
 assert.equal(auditAfterEdit._h1Receipts[0].body.sourceRev,baseRev)
 assert.equal(auditAfterEdit._h1Receipts[0].body.sourceWid,baseWid)
 assert.equal(auditAfterEdit._h1Receipts[0].body.changes.length,1)
 assert.equal(auditAfterEdit._h1Receipts[0].body.changes[0].id,initial.workouts[1].id)
 const confirmedPublic=await get()
 assert.equal(confirmedPublic.profile._h1Receipts,undefined)
 response=await req('PUT',B,baseRev,baseWid)
 assert.equal(response.status,409)
 assert.equal(response.data.rev,nextRev)
 assert.equal(response.data.hybrid2Ancestor?.rev,baseRev)
 assert.equal(response.data.hybrid2Ancestor?.wid,baseWid)
 assert.ok(response.data.hybrid2Ancestor.records[initial.workouts[1].id])
 assert.equal(response.data.hybrid2Ancestor.records[initial.workouts[1].id].length,16)
 const current=unpackProfile(response.data.state)
 const merged=mergeStates(B,current,{hybrid2Ancestor:response.data.hybrid2Ancestor})
 assert.equal(merged.trainingControl.hybrid2HistoryConflict,undefined)
 assert.notEqual(merged.trainingControl.hybrid2Diagnostics?.status,'INCOMPATIBLE')
 assert.equal(merged.restSec,77)
 const sample=w=>w.exposures.find(x=>x.hybrid2?.signalId).performance.sets[0].observations[0].value
 assert.equal(sample(merged.workouts[1]),13)
 response=await req('PUT',merged,nextRev,current._wid)
 assert.equal(response.status,200,JSON.stringify(response.data))
 await stop(s);s=await start(dir)
 head=await get()
 assert.equal(sample(head.profile.workouts[1]),13)
 const restartedReceipts=unpackProfile(JSON.parse(fs.readFileSync(
   path.join(dir,'state-'+UID+'.json'),'utf8')))._h1Receipts
 assert.equal(restartedReceipts.length,1,'approval survives real backend restart')
 assert.equal(restartedReceipts[0].seal,auditAfterEdit._h1Receipts[0].seal)
 assert.equal(head.profile.restSec,77)
 // A poll/pull is entitled to the same verified three-way ancestor as 409.
 const pulled=await fetch('http://127.0.0.1:'+s.port+'/api/data',{
   headers:{cookie:cookie(),origin:'http://localhost:8080',
     'x-opengym-engine-schema':'2',
     'x-opengym-h1-base-rev':String(baseRev),
     'x-opengym-h1-base-wid':baseWid}
 })
 assert.equal(pulled.status,200)
 const pullBody=await pulled.json()
 assert.equal(pullBody.hybrid2Ancestor.rev,baseRev)
 assert.equal(pullBody.hybrid2Ancestor.wid,baseWid)
 // Real paired Android WebViews require CORS preflight for these headers.
 const preflight=await fetch('http://127.0.0.1:'+s.port+'/api/data',{
   method:'OPTIONS',headers:{origin:'http://localhost',
     'access-control-request-method':'GET',
     'access-control-request-headers':'x-opengym-h1-base-rev,x-opengym-h1-base-wid'}
 })
 assert.equal(preflight.status,204)
 const allowed=preflight.headers.get('access-control-allow-headers').toLowerCase()
 assert.ok(allowed.includes('x-opengym-h1-base-rev'))
 assert.ok(allowed.includes('x-opengym-h1-base-wid'))
 const badPull=await fetch('http://127.0.0.1:'+s.port+'/api/data',{
   headers:{cookie:cookie(),origin:'http://localhost:8080',
     'x-opengym-engine-schema':'2',
     'x-opengym-h1-base-rev':String(baseRev),
     'x-opengym-h1-base-wid':'wrong-id'}
 })
 assert.equal((await badPull.json()).hybrid2Ancestor,undefined)
 const journal=JSON.parse(fs.readFileSync(path.join(dir,'h1-ancestors-'+UID+'.json'),'utf8'))
 assert.equal(journal.version,1)
 assert.ok(journal.entries.some(x=>x.rev===baseRev&&x.wid===baseWid))
 assert.ok(journal.entries.every(x=>Object.values(x.records).every(v=>/^[0-9a-f]{16}$/.test(v))))
 // A and B change the same previously confirmed result differently.
 const first=clone(head.profile),second=clone(head.profile),sharedRev=head.data.rev,sharedWid=head.profile._wid
 edited(first,0,13);edited(second,0,9)
 const legacyEdit=await req('PUT',first,sharedRev)
 assert.equal(legacyEdit.status,428,
  'the server must reject an existing H1 edit without a confirmed source write-id')
 assert.equal(legacyEdit.data.error,'h1-ancestry-required')
 const approvedFirst=await approve(first,sharedRev,sharedWid)
 response=await req('PUT',first,sharedRev,sharedWid,approvedFirst)
 assert.equal(response.status,200,JSON.stringify(response.data))
 response=await req('PUT',second,sharedRev,sharedWid)
 assert.equal(response.status,409)
 const dispute=mergeStates(second,unpackProfile(response.data.state),{
   hybrid2Ancestor:response.data.hybrid2Ancestor})
 assert.ok(dispute.trainingControl.hybrid2HistoryConflict)
 assert.equal(dispute.trainingControl.hybrid2Diagnostics.status,'INCOMPATIBLE')
 assert.equal((await req('PUT',dispute,response.data.rev,unpackProfile(response.data.state)._wid)).status,400)
 // Neither a wrong write-id nor an absent write-id can obtain an ancestor proof.
 const tampered=await req('PUT',second,sharedRev,'wrong-revision-id')
 assert.equal(tampered.status,409)
 assert.equal(tampered.data.hybrid2Ancestor,undefined)
 const legacy=await req('PUT',second,sharedRev)
 assert.equal(legacy.status,409)
 assert.equal(legacy.data.hybrid2Ancestor,undefined)
 // A corrupted persisted HMAC receipt must fail closed even when the next
 // PUT only changes a harmless setting, not H1 history.
 const beforeIntegrityCheck=await get()
 const verifiedStatePath=path.join(dir,'state-'+UID+'.json')
 const intactSnapshot=fs.readFileSync(verifiedStatePath,'utf8')
 const changedWithoutReceipt=unpackProfile(JSON.parse(intactSnapshot))
 assert.ok(changedWithoutReceipt._h1Receipts.length>=2)
 const lastApprovedId=changedWithoutReceipt._h1Receipts.at(-1).body.changes[0].id
 const changedSource=changedWithoutReceipt.workouts.find(w=>w.id===lastApprovedId)
 assert.ok(changedSource)
 changedSource.start+=60000
 await stop(s)
 fs.writeFileSync(verifiedStatePath,JSON.stringify(packProfile(changedWithoutReceipt)),{mode:0o600})
 s=await start(dir)
 const unsafeGet=await req('GET')
 assert.equal(unsafeGet.status,503,
   'GET cannot expose a corrupted H1 source to a recovering/offline device')
 assert.equal(unsafeGet.data.error,'h1-receipt-unavailable')
 const sourceMismatch=await req('PUT',beforeIntegrityCheck.profile,
   beforeIntegrityCheck.data.rev,beforeIntegrityCheck.profile._wid)
 assert.equal(sourceMismatch.status,503)
 assert.equal(sourceMismatch.data.error,'h1-receipt-unavailable')
 await stop(s)
 fs.writeFileSync(verifiedStatePath,intactSnapshot,{mode:0o600})
 s=await start(dir)
 const forgedSnapshot=unpackProfile(JSON.parse(intactSnapshot))
 assert.ok(forgedSnapshot._h1Receipts.length>=2)
 forgedSnapshot._h1Receipts[0].body.changes[0].id='FORGED'
 await stop(s)
 fs.writeFileSync(verifiedStatePath,JSON.stringify(packProfile(forgedSnapshot)),{mode:0o600})
 s=await start(dir)
 const alteredOnlySetting=clone(beforeIntegrityCheck.profile)
 alteredOnlySetting.restSec=400
 const integrityRefusal=await req('PUT',alteredOnlySetting,
   beforeIntegrityCheck.data.rev,beforeIntegrityCheck.profile._wid)
 assert.equal(integrityRefusal.status,503)
 assert.equal(integrityRefusal.data.error,'h1-receipt-unavailable')
 await stop(s)
 fs.writeFileSync(verifiedStatePath,intactSnapshot,{mode:0o600})
 s=await start(dir)
 // Simulate a server disk restore that keeps an old journal from another
 // branch. The revision may be reused, but _wids no longer descend from it.
 const beforeRestore=await get()
 await stop(s)
 const statePath=path.join(dir,'state-'+UID+'.json')
 const restored=clone(beforeRestore.profile)
 restored._rev=beforeRestore.data.rev+5
 restored._wid='restored-unrelated-branch'
 restored._wids=[]
 fs.writeFileSync(statePath,JSON.stringify(packProfile(restored)),{mode:0o600})
 s=await start(dir)
 const afterRestore=await fetch('http://127.0.0.1:'+s.port+'/api/data',{
   headers:{cookie:cookie(),origin:'http://localhost:8080',
     'x-opengym-engine-schema':'2',
     'x-opengym-h1-base-rev':String(sharedRev),
     'x-opengym-h1-base-wid':sharedWid}
 })
 assert.equal((await afterRestore.json()).hybrid2Ancestor,undefined,
  'a restored unrelated write lineage must NOT reuse an old H1 witness')
 const divergent=await req('PUT',second,sharedRev,sharedWid)
 assert.equal(divergent.status,409)
 assert.equal(divergent.data.hybrid2Ancestor,undefined)
 // Corrupt source-of-truth witness storage: the server must fail closed, not
 // accept a further untraceable H1 write or change the persisted revision.
 const corruptPath=path.join(dir,'h1-ancestors-'+UID+'.json')
 fs.writeFileSync(corruptPath,'{invalid-json',{mode:0o600})
 const beforeFailure=await get()
 const updated=clone(beforeFailure.profile)
 updated.restSec=63
 updated._ts=at(31)
 const rejected=await req('PUT',updated,beforeFailure.data.rev,beforeFailure.profile._wid)
 assert.equal(rejected.status,503)
 assert.equal(rejected.data.error,'h1-ancestry-unavailable')
 assert.equal((await get()).data.rev,beforeFailure.data.rev)
 console.log('HYBRID_H1_ANCESTRY_HTTP_PASS',JSON.stringify({
   optimistic409:true,verifiedAncestor:true,unilateralCorrection:true,
   divergentSameRecordHeld:true,backendRestart:true,
   noProofWithoutWid:true,privateDigestJournal:true,
   restoredBranchDenied:true,corruptJournalWriteBlocked:true,
   corruptReceiptWriteBlocked:true,sourceEvidenceTamperBlocked:true
 }))
})
