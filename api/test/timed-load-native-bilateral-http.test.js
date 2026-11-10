// Genuine ORIGINAL Liftosaur separate L/R timed-set values are loaded from a
// pinned native-runtime transcript. Tests actual openGym UI session persistence,
// chronological replay and real isolated HTTP backend restarts. No live account.
import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {spawn} from 'node:child_process'
import {once} from 'node:events'
import {fileURLToPath} from 'node:url'
import {boundPort} from './helpers.mjs'
import {SIDE_PLANK_TIMED_CONFIG} from '../training-control/timed-load.js'
import {replayTimedLoadHistory} from '../training-control/timed-load-history.js'
import {defaultPlanRule} from '../engine/index.js'
import {packProfile,unpackProfile} from '../migration/profile-pack.js'
import {validateCanonicalProfile} from '../migration/profile-validation.js'
import {buildSessionExposures} from '../../frontend/src/lib/session-start.js'
import {entriesForExposures} from '../../frontend/src/lib/session-ui-adapter.js'
import {buildCompletedSession} from '../../frontend/src/lib/finish-session.js'

const apiDir=path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const evidence=JSON.parse(fs.readFileSync(new URL('../../docs/validation/hybrid2-runtime-parity/timed-load-native-bilateral-sanitized.json',import.meta.url),'utf8'))
assert.equal(evidence.schema,'HYBRID2-TIMED-ORIGINAL-BILATERAL-NATIVE-1')
assert.equal(evidence.status,'PASS_WITH_LIMITS')
assert.equal(evidence.originalNativeWorkouts,24)
assert.equal(evidence.physicalSideRecords,96)
assert.equal(evidence.comparisons,384)
assert.deepEqual(evidence.failures,[])
assert.equal(evidence.originalSourceSha256,'9b6a10c60c8d53888ade21f60640e4baee03bb8a0ed3b9637e31f82543799218')
assert.equal(evidence.runtimeCommit,'ce75750bde4a190682fb5a6fa1984fc9184a9842')
const user='timed_native_bilateral_scratch'
const track='side-plank-timed'
const secret=crypto.randomBytes(32).toString('hex')
const nativeFields=['initialized','load','target','fails','provenance','emergency','bridgeTarget','bridgeProvenance']
const rule=defaultPlanRule('manual',{id:'timed-native-rule',exerciseId:'0025',routineId:'TIMED',
 sets:{min:2,max:2},reps:{min:1,max:1},durationSeconds:{min:30,max:30},
 load:{mode:'absolute',value:0,unit:'kg'},completion:[],target:{mode:'none'}})
const seed=()=>({engineSchemaVersion:2,unit:'kg',prescriptions:{},progression:{},oneRepMaxes:{},
 workouts:[],trainingControl:{timedLoad:{}},routines:[{id:'TIMED',name:'Timed',ex:[{
  occurrenceId:track,exerciseId:'0025',mode:'time',side:true,warmup:'none',
  timedLoad:{...SIDE_PLANK_TIMED_CONFIG,enabled:true},rule
 }]}]})
function assertState(actual,expected,label){
 assert.ok(actual,label+' missing')
 for(const key of nativeFields)assert.equal(actual[key],expected[key],label+' '+key)
}
function nativeToSession(profile,step,index){
 const now=Date.UTC(2026,9,index+1,12)
 profile.prescriptions={...profile.prescriptions} // invalidate immutable pack memo
 const exposures=buildSessionExposures(profile,profile.routines[0],{now,newId:x=>x,unit:'kg'})
 assert.equal(exposures.length,1)
 const exp=exposures[0]
 assert.equal(exp.mode,'time')
 assert.equal(exp.trackId,track)
 assertState(exp.timedLoad.initialState,step.beforeNativeState,`start ${index+1}`)
 const entries=entriesForExposures(exposures,profile.prescriptions)
 const rows=entries[0].sets
 assert.deepEqual(rows.map(r=>r.side),['L','R','L','R'])
 assert.equal(rows.length,4)
 for(const [i,native] of step.originalNativeRows.entries()) {
  assert.equal(rows[i].side,native.side)
  rows[i].done=native.completed
  rows[i].sec=native.seconds
  rows[i].w=native.weightKg
 }
 const active={id:'timed-native-'+(index+1),d:new Date(now).toISOString().slice(0,10),
  start:now,routineIds:['TIMED'],exposures,entries}
 const done=buildCompletedSession(active,profile,{end:now+1800000,newId:x=>x,unit:'kg'})
 profile.workouts=[...profile.workouts,done.session]
 profile.trainingControl.timedLoad={...profile.trainingControl.timedLoad,...done.timedLoadStates}
 assert.deepEqual(validateCanonicalProfile(profile),{ok:true,errors:[]})
 assertState(profile.trainingControl.timedLoad[track],step.nativeState,`finish ${index+1}`)
 assert.deepEqual(replayTimedLoadHistory(profile.workouts),profile.trainingControl.timedLoad)
 return done.session.exposures[0].performance.sets
}
function checkNativeRows(saved,native,stage) {
 assert.equal(saved.length,4,stage+' row count')
 for(const [i,row] of saved.entries()){
  const expected=native[i]
  assert.equal(row.side,expected.side,stage+' side '+i)
  assert.equal(row.status,expected.completed?'completed':'skipped',stage+' status '+i)
  assert.equal(row.observations.find(o=>o.metric==='duration')?.value,expected.seconds,stage+' seconds '+i)
  const actualKg=row.resistance?.kind==='external-load'?row.resistance.value:0
  assert.equal(actualKg,expected.weightKg,stage+' load '+i)
  if(expected.weightKg>0)assert.equal(row.resistance?.unit,'kg',stage+' unit '+i)
  else assert.equal(row.resistance?.kind,'bodyweight',stage+' logical zero '+i)
 }
}
const cookie=()=>{
 const p=user+':'+(Date.now()+86400000)+':0'
 return 'gymsid='+p+'.'+crypto.createHmac('sha256',secret).update(p).digest('base64url')
}
async function start(dir){
 const child=spawn(process.execPath,['server.js'],{cwd:apiDir,stdio:['ignore','pipe','pipe'],
  env:{...process.env,PORT:'0',DATA_DIR:dir,ORIGIN:'http://localhost:8080',RP_ID:'localhost',
   INTEGRATIONS:'',REMINDER_TICK_MS:'99999999',MEDIA_UPLOADS:'0'}})
 const instance={child,log:''}
 child.stdout.on('data',x=>instance.log+=x)
 child.stderr.on('data',x=>instance.log+=x)
 instance.port=await boundPort(child,()=>instance.log)
 return instance
}
async function stop(server){
 if(!server||server.child.exitCode!=null||server.child.signalCode!=null)return
 const done=once(server.child,'exit')
 server.child.kill('SIGTERM')
 await done
}
test('real original-native asymmetric timed L/R -> Engine v2 -> HTTP -> history/restart',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'og-native-timed-bilateral-'))
 fs.chmodSync(dir,0o700)
 fs.writeFileSync(path.join(dir,'secret'),secret,{mode:0o600})
 fs.writeFileSync(path.join(dir,'db.json'),JSON.stringify({users:[{
  id:user,name:'Synthetic only',created:'2026-11-10T00:00:00.000Z'}],creds:[],subs:[],invites:[]}),{mode:0o600})
 let server=null,rev=0,reads=0,writes=0,restarts=0,checks=0
 t.after(async()=>{await stop(server);fs.rmSync(dir,{recursive:true,force:true})})
 server=await start(dir)
 const request=async(method,body)=>{
  const res=await fetch(`http://127.0.0.1:${server.port}/api/data`,{method,
   headers:{cookie:cookie(),origin:'http://localhost:8080','content-type':'application/json',
    'x-opengym-engine-schema':'2'},...(body===undefined?{}:{body:JSON.stringify(body)})})
  return {status:res.status,data:await res.json()}
 }
 const read=async()=>{
  reads++
  const r=await request('GET')
  assert.equal(r.status,200,JSON.stringify(r))
  return {rev:r.data.rev,state:r.data.state?unpackProfile(r.data.state):null}
 }
 const write=async profile=>{
  const r=await request('PUT',{state:packProfile(profile),baseRev:rev})
  assert.equal(r.status,200,JSON.stringify(r))
  writes++;rev=r.data.rev
 }
 let p=seed()
 assert.deepEqual(validateCanonicalProfile(p),{ok:true,errors:[]})
 await write(p)
 for(const [index,step] of evidence.trace.entries()){
  const saved=nativeToSession(p,step,index)
  checkNativeRows(saved,step.originalNativeRows,'frontend '+(index+1));checks+=4
  await write(p)
  const received=await read()
  assert.equal(received.rev,rev)
  p=received.state
  assert.equal(p.workouts.length,index+1)
  assert.deepEqual(validateCanonicalProfile(p),{ok:true,errors:[]})
  const stored=p.workouts.at(-1).exposures[0].performance.sets
  checkNativeRows(stored,step.originalNativeRows,'HTTP '+(index+1));checks+=4
  assertState(p.trainingControl.timedLoad[track],step.nativeState,'HTTP state '+(index+1));checks+=nativeFields.length
  assert.deepEqual(replayTimedLoadHistory(p.workouts),p.trainingControl.timedLoad)
  if([7,15,23].includes(index)){
   await stop(server);server=await start(dir);restarts++
   const retrieved=await read()
   assert.equal(retrieved.rev,rev)
   assert.deepEqual(replayTimedLoadHistory(retrieved.state.workouts),retrieved.state.trainingControl.timedLoad)
   assertState(retrieved.state.trainingControl.timedLoad[track],step.nativeState,'restart '+(index+1))
   const again=retrieved.state.workouts.at(-1).exposures[0].performance.sets
   checkNativeRows(again,step.originalNativeRows,'restart '+(index+1))
   checks+=4+nativeFields.length
   p=retrieved.state
  }
 }
 const stateBeforeEdit=structuredClone(p.trainingControl.timedLoad[track])
 const edited=structuredClone(p)
 edited.workouts.at(-1).exposures[0].performance.sets[3]
  .observations.find(o=>o.metric==='duration').value=0
 const replayed=replayTimedLoadHistory(edited.workouts)
 assert.notDeepEqual(replayed[track],stateBeforeEdit)
 edited.trainingControl.timedLoad=replayed
 assert.deepEqual(validateCanonicalProfile(edited),{ok:true,errors:[]})
 await write(edited)
 const afterEdit=await read()
 assert.deepEqual(afterEdit.state.trainingControl.timedLoad,replayTimedLoadHistory(afterEdit.state.workouts))
 assert.notDeepEqual(afterEdit.state.trainingControl.timedLoad[track],stateBeforeEdit)
 checks+=2
 const report={schema:'HYBRID2-TIMED-NATIVE-BILATERAL-HTTP-1',status:'PASS',
  originalSourceSha256:evidence.originalSourceSha256,runtimeCommit:evidence.runtimeCommit,
  replayedGenuineNativeWorkouts:evidence.trace.length,independentNativeSideRecords:96,
  matchedAfterNativeStateFields:evidence.trace.length*nativeFields.length,
  verifiedSideRowsAtFrontendAndHttp:24*8,
  actualHttpWrites:writes,actualHttpReads:reads,actualBackendRestarts:restarts,
  exactExplicitChecks:checks,historicalRightSideDurationEditReplayed:true,
  liveAccountWrites:0,sourceRuntimeChanged:false,productionWrites:0}
 if(process.env.H2_PARITY_OUT){
  fs.mkdirSync(process.env.H2_PARITY_OUT,{recursive:true,mode:0o700})
  fs.writeFileSync(path.join(process.env.H2_PARITY_OUT,'timed-load-native-bilateral-http-sanitized.json'),
   JSON.stringify(report,null,2)+'\n',{mode:0o600})
 }
 console.log('TIMED_NATIVE_BILATERAL_HTTP_PASS',JSON.stringify(report))
})
