// End-to-end Timed Load source-oracle scenario through the real openGym session
// generator, unilateral UI rows, immutable logs, and isolated HTTP disk/restarts.
// Not an original Liftosaur binary execution: PGE-DEC-002's frozen Python oracle
// is separately exercised by timed-load.test.mjs (4,976 cases).
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
import { SIDE_PLANK_TIMED_CONFIG } from '../training-control/timed-load.js'
import { replayTimedLoadHistory } from '../training-control/timed-load-history.js'
import { defaultPlanRule } from '../engine/index.js'
import { packProfile, unpackProfile } from '../migration/profile-pack.js'
import { validateCanonicalProfile } from '../migration/profile-validation.js'
import { buildSessionExposures } from '../../frontend/src/lib/session-start.js'
import { entriesForExposures } from '../../frontend/src/lib/session-ui-adapter.js'
import { buildCompletedSession } from '../../frontend/src/lib/finish-session.js'

const API=path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const SECRET=crypto.randomBytes(32).toString('hex')
const USER='timed_load_http_synthetic_only'
const TRACK='side-plank-timed'
const ORACLE=JSON.parse(fs.readFileSync(new URL('../training-control/fixtures/timed-load-oracle-v1.json',import.meta.url),'utf8'))
assert.equal(ORACLE.cases.length,4976)
assert.equal(ORACLE.oracle_git_blob,'9caa4778c291a652e08ed1342e2acef7ca83702b')
const fromOracle=s=>({load:s.load,target:s.target,fails:s.fails,provenance:s.provenance,
  emergency:s.emergency,bridge_target:s.bridgeTarget,bridge_provenance:s.bridgeProvenance})
const sameOracle=(a,b)=>Object.keys(a).every(k=>a[k]===b[k])
const rule=defaultPlanRule('manual',{id:'timed-rule',exerciseId:'0025',routineId:'SAT',
  sets:{min:2,max:2},reps:{min:1,max:1},durationSeconds:{min:30,max:30},
  load:{mode:'absolute',value:0,unit:'kg'},completion:[],target:{mode:'none'}})
const initial=()=>({
  engineSchemaVersion:2,unit:'kg',prescriptions:{},progression:{},oneRepMaxes:{},
  workouts:[],trainingControl:{timedLoad:{}},
  routines:[{id:'SAT',name:'Saturday',ex:[{
    occurrenceId:TRACK,exerciseId:'0025',mode:'time',side:true,warmup:'none',
    timedLoad:{...SIDE_PLANK_TIMED_CONFIG,enabled:true},rule
  }]}]
})
const steps=[
  {success:true,load:0,target:35,fails:0,provenance:'established',emergency:false,bridge:null},
  {success:true,load:0,target:40,fails:0,provenance:'established',emergency:false,bridge:null},
  {success:true,load:0,target:45,fails:0,provenance:'established',emergency:false,bridge:null},
  {success:true,load:2,target:30,fails:0,provenance:'new',emergency:false,bridge:null},
  {success:false,load:2,target:30,fails:1,provenance:'new',emergency:false,bridge:null},
  {success:false,load:2,target:25,fails:0,provenance:'new',emergency:true,bridge:null},
  {success:false,load:1,target:30,fails:0,provenance:'established',emergency:false,bridge:2},
  {success:true,load:1,target:35,fails:0,provenance:'established',emergency:false,bridge:2},
  {success:true,load:1,target:40,fails:0,provenance:'established',emergency:false,bridge:2},
  {success:true,load:1,target:45,fails:0,provenance:'established',emergency:false,bridge:2},
  {success:true,load:2,target:30,fails:0,provenance:'new',emergency:false,bridge:null},
  {success:true,load:2,target:35,fails:0,provenance:'established',emergency:false,bridge:null}
]
const expectedState=(state,s,i)=>{
  assert.ok(state,'Timed state must be present '+i)
  assert.equal(state.initialized,true)
  for (const [k,v] of Object.entries({load:s.load,target:s.target,fails:s.fails,
    provenance:s.provenance,emergency:s.emergency,bridgeTarget:s.bridge}))
    assert.equal(state[k],v,'session '+i+' field '+k)
}
const session=(profile,i,{success=true,excluded=false}={})=>{
  const t=Date.UTC(2026,9,1+i,12)
  const routine=profile.routines[0]
  // A generated prescription is appended by session-start. The real store
  // replaces this object identity before a new session, preserving pack memo.
  profile.prescriptions={...profile.prescriptions}
  const exposures=buildSessionExposures(profile,routine,{now:t,newId:x=>x,unit:profile.unit})
  assert.equal(exposures.length,1)
  const exposure=exposures[0]
  assert.equal(exposure.mode,'time')
  assert.equal(exposure.trackId,TRACK)
  assert.equal(exposure.timedLoad?.version,1)
  assert.equal(exposure.timedLoad.config.unilateral,true)
  const entries=entriesForExposures(exposures,profile.prescriptions)
  const rows=entries[0].sets
  assert.deepEqual(rows.map(x=>x.side),['L','R','L','R'])
  assert.equal(rows.length,4)
  const state=exposure.timedLoad.initialState
  assert.ok(state?.initialized===true || i===0)
  const reference=ORACLE.cases.find(x=>x.config==='side_plank' && x.success===success &&
    sameOracle(fromOracle(state),x.initial))
  assert.ok(reference,'Original Python oracle has no matching starting state at '+i)
  for(const row of rows){
    row.sec=success?state.target:Math.max(0,state.target-1)
    row.w=state.load
    row.done=true
  }
  if(excluded) exposure.excludedFromProgression=true
  const active={id:'timed-http-'+i,d:new Date(t).toISOString().slice(0,10),
    start:t,routineIds:['SAT'],exposures,entries}
  const done=buildCompletedSession(active,profile,{end:t+3600000,newId:x=>x,unit:profile.unit})
  // Packing memoizes immutable array identities, just like the actual store.
  // Replace, never mutate in place; otherwise the prior packed empty history is reused.
  profile.workouts=[...profile.workouts,done.session]
  if(!excluded)
    profile.trainingControl.timedLoad={...profile.trainingControl.timedLoad,...done.timedLoadStates}
  else
    assert.deepEqual(done.timedLoadStates,{})
  assert.deepEqual(validateCanonicalProfile(profile),{ok:true,errors:[]})
  const savedRows=done.session.exposures[0].performance.sets
  assert.deepEqual(savedRows.map(x=>x.side),['L','R','L','R'])
  assert.equal(savedRows.filter(x=>x.status==='completed').length,4)
  assert.ok(savedRows.every(x=>x.observations.find(y=>y.metric==='duration')?.value===rows[0].sec))
  assert.deepEqual(replayTimedLoadHistory(profile.workouts),profile.trainingControl.timedLoad)
  if(!excluded) assert.ok(sameOracle(fromOracle(profile.trainingControl.timedLoad[TRACK]),reference.final),
    'Persistable Timed Load step must match frozen original Python oracle at session '+i)
  return {oracleReason:reference.reason,targetBefore:state.target,loadBefore:state.load,secondsHeld:rows[0].sec,
    loadAfter:profile.trainingControl.timedLoad[TRACK].load,
    targetAfter:profile.trainingControl.timedLoad[TRACK].target,excluded}
}
const cookie=()=>{
  const payload=USER+':'+(Date.now()+86400000)+':0'
  return 'gymsid='+payload+'.'+crypto.createHmac('sha256',SECRET).update(payload).digest('base64url')
}
const start=async dir=>{
  const child=spawn(process.execPath,['server.js'],{cwd:API,stdio:['ignore','pipe','pipe'],
    env:{...process.env,PORT:'0',DATA_DIR:dir,ORIGIN:'http://localhost:8080',
      RP_ID:'localhost',INTEGRATIONS:'',REMINDER_TICK_MS:'99999999'}})
  const h={child,log:''}
  child.stdout.on('data',x=>h.log+=x)
  child.stderr.on('data',x=>h.log+=x)
  h.port=await boundPort(child,()=>h.log)
  h.base='http://127.0.0.1:'+h.port
  return h
}
const stop=async h=>{
  if(!h || h.child.exitCode!=null || h.child.signalCode!=null)return
  const promise=once(h.child,'exit')
  h.child.kill('SIGTERM')
  await promise
}
test('Timed Load original oracle transitions: complete unilateral session -> HTTP -> replay -> two backend restarts',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'opengym-timed-http-'))
  fs.writeFileSync(path.join(dir,'secret'),SECRET,{mode:0o600})
  fs.writeFileSync(path.join(dir,'db.json'),JSON.stringify({
    users:[{id:USER,name:'Synthetic only',created:'2026-11-10T00:00:00.000Z'}],
    creds:[],subs:[],invites:[]
  }),{mode:0o600})
  let srv=null,requests=0,writes=0,reads=0,restarts=0,rev=0
  t.after(async()=>{await stop(srv);fs.rmSync(dir,{recursive:true,force:true})})
  srv=await start(dir)
  const request=async(method,body)=>{
    requests++
    const response=await fetch(srv.base+'/api/data',{method,
      headers:{cookie:cookie(),origin:'http://localhost:8080',
        'content-type':'application/json','x-opengym-engine-schema':'2'},
      ...(body===undefined?{}:{body:JSON.stringify(body)})
    })
    return {code:response.status,data:await response.json()}
  }
  const read=async()=>{
    reads++
    const x=await request('GET')
    assert.equal(x.code,200,JSON.stringify(x))
    return {rev:x.data.rev,state:x.data.state?unpackProfile(x.data.state):null}
  }
  const write=async s=>{
    const x=await request('PUT',{state:packProfile(s),baseRev:rev})
    assert.equal(x.code,200,JSON.stringify(x))
    writes++;rev=x.data.rev
  }
  const disk=()=>unpackProfile(JSON.parse(fs.readFileSync(
    path.join(dir,'state-'+USER+'.json'),'utf8')))
  let p=initial()
  assert.deepEqual(validateCanonicalProfile(p),{ok:true,errors:[]})
  await write(p)
  const trace=[]
  for (const [i,s] of steps.entries()){
    const log=session(p,i,{success:s.success})
    expectedState(p.trainingControl.timedLoad[TRACK],s,i+1)
    trace.push({i:i+1,...log,success:s.success})
    await write(p)
    const got=await read()
    assert.equal(got.rev,rev)
    p=got.state
    assert.equal(p.workouts.length,i+1)
    assert.deepEqual(disk().workouts,p.workouts)
    assert.deepEqual(replayTimedLoadHistory(p.workouts),p.trainingControl.timedLoad)
    expectedState(p.trainingControl.timedLoad[TRACK],s,i+1)
    if(i===3 || i===10){
      await stop(srv);srv=await start(dir);restarts++
      const back=await read()
      assert.equal(back.rev,rev)
      assert.deepEqual(back.state.trainingControl.timedLoad,p.trainingControl.timedLoad)
      assert.deepEqual(replayTimedLoadHistory(back.state.workouts),back.state.trainingControl.timedLoad)
      p=back.state
    }
  }
  // An explicitly excluded timed workout never writes a new controller state
  // and is skipped during chronological replay, even though all four timed
  // physical L/R rows are recorded.
  const before=structuredClone(p.trainingControl.timedLoad)
  const excluded=session(p,12,{success:true,excluded:true})
  assert.equal(excluded.excluded,true)
  assert.deepEqual(p.trainingControl.timedLoad,before)
  await write(p)
  p=(await read()).state
  assert.deepEqual(p.trainingControl.timedLoad,before)
  assert.equal(p.workouts.length,13)
  // Simulate an offline edit of historical timing; the controller is always
  // reconstructed from canonical completed logs, not arbitrary last-write-wins.
  const altered=structuredClone(p)
  // Alter the most recent counted session (the final log is excluded).
  // Unlike an old recovered failure, this changes the current durable state.
  const oldRow=altered.workouts[11].exposures[0].performance.sets[3]
  oldRow.observations.find(o=>o.metric==='duration').value=0
  const replayed=replayTimedLoadHistory(altered.workouts)
  assert.notDeepEqual(replayed,altered.trainingControl.timedLoad)
  altered.trainingControl.timedLoad=replayed
  assert.deepEqual(validateCanonicalProfile(altered),{ok:true,errors:[]})
  await write(altered)
  const reread=(await read()).state
  assert.deepEqual(reread.trainingControl.timedLoad,replayTimedLoadHistory(reread.workouts))
  assert.deepEqual(disk().trainingControl.timedLoad,reread.trainingControl.timedLoad)
  const report={schema:'TIMED-LOAD-REAL-HTTP-PROGRESSION-1',status:'PASS',
    scope:'Source-oracle model + real frontend and HTTP backend; no native Liftosaur Timed Load execution',
    originalOracleFixtureCases:4976,originalPythonOracleGitBlob:'9caa4778c291a652e08ed1342e2acef7ca83702b',
    syntheticSessions:13,chronologicalStateTransitions:steps.length,physicalTimedRows:13*4,
    apiWrites:writes,apiReads:reads,apiRequests:requests,actualBackendRestarts:restarts,
    testedReasons:[...new Set(trace.map(x=>x.oracleReason))],
    otherChecks:['excluded workout ignored','historical edit triggers full replay'],
    matchedFrozenPythonOracleTransitions:steps.length,
    fullStates:trace.map(({i,success,targetBefore,loadBefore,loadAfter,targetAfter})=>
      ({i,success,targetBefore,loadBefore,loadAfter,targetAfter})),
    lastBeforeEdit:before[TRACK],lastAfterEdit:reread.trainingControl.timedLoad[TRACK],
    noNativeRuntimeEquivalenceClaimed:true,noProductionOrPersonalDataTouched:true}
  if(process.env.H2_PARITY_OUT){
    fs.mkdirSync(process.env.H2_PARITY_OUT,{recursive:true,mode:0o700})
    fs.writeFileSync(path.join(process.env.H2_PARITY_OUT,'timed-load-real-http-sanitized.json'),
      JSON.stringify(report,null,2)+'\n',{mode:0o600})
  }
  console.log('TIMED_LOAD_HTTP_PASS',JSON.stringify({
    transitions:steps.length,sessions:report.syntheticSessions,rows:report.physicalTimedRows,
    requests,writes,reads,restarts,
    beforeEdit:report.lastBeforeEdit,afterEdit:report.lastAfterEdit}))
})
