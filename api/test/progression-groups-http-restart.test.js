// Real standalone HTTP API + disk + restart test for opt-in Engine v2 group identities.
// Only a temporary test database is used; this test never contacts production or a user account.
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
import { defaultPlanRule, joinProgressionGroup, replayProgression, contentHash } from '../engine/index.js'
import { validateCanonicalProfile } from '../migration/profile-validation.js'
import { packProfile, unpackProfile } from '../migration/profile-pack.js'
import { buildSessionExposures } from '../../frontend/src/lib/session-start.js'
import { entriesForExposures } from '../../frontend/src/lib/session-ui-adapter.js'
import { buildCompletedSession } from '../../frontend/src/lib/finish-session.js'
import { mergeStates, stampEdits } from '../../frontend/src/lib/sync-merge.js'

const API = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const SECRET=crypto.randomBytes(32).toString('hex')
const UID='group_e2e_local_only'
const clone=x=>structuredClone(x)
const headers=()=>{
  const payload=`${UID}:${Date.now()+86400000}:0`
  const cookie='gymsid='+payload+'.'+crypto.createHmac('sha256',SECRET).update(payload).digest('base64url')
  return {cookie,origin:'http://localhost:8080','content-type':'application/json',
    'x-opengym-engine-schema':'2'}
}
const occurrence=(routineId,id,exerciseId='0025',reps={min:6,max:8},preset='linear',sets=2)=>({
  occurrenceId:id,exerciseId,warmup:'none',
  rule:defaultPlanRule(preset,{id:'rule-'+id,routineId,exerciseId,completion:[],target:{mode:'none'},
    sets:{min:sets,max:sets},reps,load:{mode:'absolute',value:100,unit:'kg'}})
})
const initial=()=>{
  const s={engineSchemaVersion:2,unit:'kg',lastFrom:'any',startFrom:'plan',
    prescriptions:{},progression:{},oneRepMaxes:{},workouts:[],_ts:100,week:{},
    routines:[
      {id:'MON',name:'Monday',ex:[occurrence('MON','bench-mon')]},
      {id:'WED',name:'Wednesday',ex:[
        ...Array.from({length:4},(_,i)=>occurrence('WED','filler-'+i,'0001',{min:8,max:8},'manual',1)),
        occurrence('WED','bench-wed','0025',{min:10,max:12})]},
      {id:'FRI',name:'Friday',ex:[occurrence('FRI','bench-fri')]}
    ]}
  assert.equal(joinProgressionGroup(s,'bench-mon','bench-fri',()=> 'bench-main'),true)
  assert.deepEqual(validateCanonicalProfile(s),{ok:true,errors:[]})
  return s
}
let count=0
const training=(s,rid)=>{
  const day=Date.UTC(2026,10,10+count,12)
  const r=s.routines.find(x=>x.id===rid)
  const exposures=buildSessionExposures(s,r,{now:day,newId:x=>x,unit:'kg'})
  const entries=entriesForExposures(exposures,s.prescriptions)
  const active={id:'http-e2e-'+count,d:new Date(day).toISOString().slice(0,10),
    start:day,routineIds:[rid],exposures,entries}
  const firstBench=entries.find(e=>e.exerciseId==='0025' || e.id==='0025')
  for(const e of entries)for(const row of e.sets)if(!row.warmup){
    row.r=rid==='WED' && e===firstBench ? 12 : rid==='WED' ? 8 : 8
    row.done=true
  }
  const completed=buildCompletedSession(active,s,{end:day+3600000,newId:x=>x,unit:'kg'})
  Object.assign(s.progression,completed.progression)
  s.workouts.push(completed.session)
  s._ts=100+count+1
  count++
  assert.deepEqual(validateCanonicalProfile(s),{ok:true,errors:[]})
  return {
    preview:entries.find(e=>e.exposureId===exposures.find(x=>x.exerciseId==='0025')?.exposureId)
      ?.sets.find(row=>!row.warmup).w,
    trackIds:exposures.filter(x=>x.exerciseId==='0025').map(x=>x.trackId)
  }
}
const preview=(p,rid)=>{
  const s=clone(p)
  const r=s.routines.find(x=>x.id===rid)
  const exposures=buildSessionExposures(s,r,{now:Date.UTC(2026,10,24,12),newId:x=>x,unit:'kg'})
  const entries=entriesForExposures(exposures,s.prescriptions)
  const x=exposures.find(y=>y.exerciseId==='0025')
  return {w:entries.find(e=>e.exposureId===x.exposureId).sets.find(row=>!row.warmup).w,
    trackId:x.trackId}
}
const startServer=async(dataDir)=>{
  const child=spawn(process.execPath,['server.js'],{cwd:API,stdio:['ignore','pipe','pipe'],
    env:{...process.env,PORT:'0',DATA_DIR:dataDir,ORIGIN:'http://localhost:8080',
      RP_ID:'localhost',INTEGRATIONS:''}})
  const current={child,log:''}
  child.stdout.on('data',d=>current.log+=d)
  child.stderr.on('data',d=>current.log+=d)
  current.port=await boundPort(child,()=>current.log)
  current.base=`http://127.0.0.1:${current.port}`
  return current
}
const stopServer=async h=>{
  if(!h || h.child.exitCode!=null || h.child.signalCode!=null)return
  const exited=once(h.child,'exit')
  h.child.kill('SIGTERM')
  await exited
}
test('real HTTP /api/data: grouped Engine v2 sessions survive disk/restart, stale writes and invalid rekey are rejected', async t=>{
  count=0
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'opengym-groups-http-'))
  fs.writeFileSync(path.join(dir,'secret'),SECRET,{mode:0o600})
  fs.writeFileSync(path.join(dir,'db.json'),JSON.stringify({users:[{id:UID,name:'Temporary',created:new Date().toISOString()}],
    creds:[],subs:[],invites:[]}))
  let server=null
  t.after(async()=>{await stopServer(server);fs.rmSync(dir,{recursive:true,force:true})})
  server=await startServer(dir)
  let observedRequests=0,acceptedWrites=0,rejectedWrites=0,restarts=0
  const request=async(method,url,body)=>{
    observedRequests++
    const resp=await fetch(server.base+'/api'+url,{method,headers:headers(),
      ...(body===undefined?{}:{body:JSON.stringify(body)})})
    return {status:resp.status,data:await resp.json()}
  }
  const read=async()=>{
    const x=await request('GET','/data')
    assert.equal(x.status,200,JSON.stringify(x))
    return {state:unpackProfile(x.data.state),rev:x.data.rev}
  }
  const write=async(s,rev,opts={})=>{
    const x=await request('PUT','/data',{
      state:opts.plain? s : packProfile(s),
      baseRev:rev,...(opts.baseWid?{baseWid:opts.baseWid}:{}),
      stamped:opts.stamped??false
    })
    if(x.status===200)acceptedWrites++
    else rejectedWrites++
    return x
  }
  let got=await read()
  assert.equal(got.rev,0)
  assert.equal(got.state,null)
  let p=initial()
  let res=await write(p,0)
  assert.equal(res.status,200,JSON.stringify(res))
  let rev=res.data.rev
  let wid=res.data.wid
  got=await read()
  assert.equal(got.rev,rev)
  assert.deepEqual(got.state.progressionGroups,p.progressionGroups)
  assert.deepEqual(validateCanonicalProfile(got.state),{ok:true,errors:[]})
  const disk=()=>unpackProfile(JSON.parse(fs.readFileSync(path.join(dir,'state-'+UID+'.json'),'utf8')))
  assert.deepEqual(disk().progressionGroups,p.progressionGroups)

  // A forged client must not save a structurally invalid group over a canonical profile.
  let bad=clone(got.state)
  bad.progressionGroups.groups[0].members[1]='bench-wed'
  res=await write(bad,rev)
  assert.equal(res.status,400,JSON.stringify(res))
  assert.match(res.data.details.join(' '),/repetition ranges must match/)
  assert.equal((await read()).rev,rev)

  p=got.state
  let x=training(p,'MON')
  assert.equal(x.preview,100)
  assert.deepEqual(x.trackIds,['progression-group:bench-main'])
  res=await write(p,rev)
  assert.equal(res.status,200,JSON.stringify(res))
  rev=res.data.rev
  p=(await read()).state

  x=training(p,'WED')
  assert.equal(x.preview,100)
  assert.deepEqual(x.trackIds,['bench-wed'])
  res=await write(p,rev,{plain:true})
  assert.equal(res.status,200,JSON.stringify(res))
  rev=res.data.rev
  assert.equal(preview((await read()).state,'FRI').w,102.5)

  // Reboot from the same private, temporary database — *not* a mock restart.
  await stopServer(server)
  server=await startServer(dir)
  restarts++
  got=await read()
  assert.equal(got.rev,rev)
  p=got.state
  assert.equal(p.workouts.length,2)
  assert.equal(preview(p,'FRI').w,102.5)
  assert.equal(preview(p,'WED').w,102.5)
  assert.deepEqual(validateCanonicalProfile(p),{ok:true,errors:[]})

  x=training(p,'FRI')
  assert.equal(x.preview,102.5)
  assert.deepEqual(x.trackIds,['progression-group:bench-main'])
  res=await write(p,rev)
  assert.equal(res.status,200,JSON.stringify(res))
  rev=res.data.rev
  p=(await read()).state
  assert.equal(preview(p,'MON').w,105)

  x=training(p,'WED')
  assert.equal(x.preview,102.5)
  res=await write(p,rev)
  assert.equal(res.status,200,JSON.stringify(res))
  rev=res.data.rev
  p=(await read()).state
  assert.equal(preview(p,'WED').w,105)
  assert.equal(preview(p,'MON').w,105)

  // As requested, grouping is clean-start only. A forged JSON payload changing
  // the membership after completed group workouts must fail at the API boundary.
  const tampered=clone(p)
  tampered.progressionGroups={version:1,groups:[]}
  res=await write(tampered,rev)
  assert.equal(res.status,400,JSON.stringify(res))
  assert.match(res.data.details.join(' '),/progression group.*history/i)
  assert.equal((await read()).rev,rev)
  assert.deepEqual(disk().progressionGroups,p.progressionGroups)

  // Strong negative control: an attacker fully rekeys the completed exposures,
  // all immutable prescriptions and the progression map together. The forged
  // document is internally canonical, so only cross-revision transition checking
  // can detect that history was silently reassigned.
  const forged=clone(p)
  const oldTrack='progression-group:bench-main', newTrack='progression-group:bench-forged'
  forged.progressionGroups.groups[0].id='bench-forged'
  for(const w of forged.workouts)for(const e of w.exposures)if(e.trackId===oldTrack)e.trackId=newTrack
  for(const rec of Object.values(forged.prescriptions))if(rec.trackId===oldTrack){
    rec.trackId=newTrack
    const {contentHash:oldHash,...body}=rec
    rec.contentHash=contentHash(body)
  }
  forged.progression[newTrack]={...forged.progression[oldTrack],trackId:newTrack}
  delete forged.progression[oldTrack]
  assert.deepEqual(validateCanonicalProfile(forged),{ok:true,errors:[]})
  res=await write(forged,rev)
  assert.equal(res.status,400,JSON.stringify(res))
  assert.match(res.data.details.join(' '),/transition after completed history/)
  assert.equal((await read()).rev,rev)
  assert.deepEqual(disk().progressionGroups,p.progressionGroups)

  // One completed Monday session races a different device's legitimate routine name edit.
  const concurrent=clone(p)
  concurrent.routines.find(r=>r.id==='WED').name='Wednesday (edited offline)'
  stampEdits(p,concurrent,Date.now()+1000)
  concurrent._ts=Date.now()+1000
  x=training(p,'MON')
  assert.equal(x.preview,105)
  res=await write(p,rev)
  assert.equal(res.status,200,JSON.stringify(res))
  const afterRaceRev=res.data.rev
  const nextWid=res.data.wid
  res=await write(concurrent,rev,{baseWid:wid})
  assert.equal(res.status,409,JSON.stringify(res))
  assert.equal(res.data.rev,afterRaceRev)
  assert.equal(res.data.state.packed,1)
  const remote=unpackProfile(res.data.state)
  const merged=mergeStates(concurrent,remote)
  assert.deepEqual(validateCanonicalProfile(merged),{ok:true,errors:[]})
  assert.deepEqual(merged.progressionGroups,p.progressionGroups)
  assert.equal(merged.routines.find(r=>r.id==='WED').name,'Wednesday (edited offline)')
  assert.equal(merged.workouts.length,5)
  res=await write(merged,afterRaceRev,{baseWid:nextWid,stamped:true})
  assert.equal(res.status,200,JSON.stringify(res))
  rev=res.data.rev

  // A second actual process boot must retrieve the exact persisted identities.
  await stopServer(server)
  server=await startServer(dir)
  restarts++
  got=await read()
  assert.equal(got.rev,rev)
  assert.equal(got.state.routines[1].name,'Wednesday (edited offline)')
  assert.equal(got.state.workouts.length,5)
  assert.equal(preview(got.state,'FRI').w,107.5)
  assert.equal(preview(got.state,'WED').w,105)
  assert.deepEqual(validateCanonicalProfile(got.state),{ok:true,errors:[]})
  const tracks=Object.keys(got.state.progression)
  assert.ok(tracks.includes('progression-group:bench-main'))
  assert.ok(tracks.includes('bench-wed'))
  const replay={}
  for(const id of ['progression-group:bench-main','bench-wed']){
    const state=got.state.progression[id]
    const actual=replayProgression({workouts:got.state.workouts,prescriptions:got.state.prescriptions,trackId:id})
    assert.equal(actual.lastCompletedLogId,state.lastCompletedLogId)
    assert.equal(actual.values.load.value,state.values.load.value)
    replay[id]={source:state.lastCompletedLogId,targetLoad:state.values.load.value}
  }
  assert.deepEqual(disk().progressionGroups,got.state.progressionGroups)
  const evidence={
    schema:'EXPLICIT-GROUPS-HTTP-RESTART-1',classification:'PASS',
    environment:'isolated temporary API child processes and fresh disposable db; synthetic workouts only',
    acceptedWrites,rejectedWrites,restarts,observedRequests,
    completedSessions:got.state.workouts.length,
    completedGroupTracks:replay,
    nextMondayLoad:preview(got.state,'MON').w,
    nextWednesdayLoad:preview(got.state,'WED').w,
    finalRevision:rev,
    assertions:['invalid repetition membership: HTTP 400','post-history unlink: HTTP 400',
      'internally self-consistent full-history rekey: HTTP 400',
      'concurrent stale revision: HTTP 409','two real backend process restarts: state retained',
      'client merge: progression and unrelated name edit retained','all immutable prescriptions valid',
      'two independent replayed tracks match stored progressions']
  }
  if(process.env.H2_PARITY_OUT){
    fs.mkdirSync(process.env.H2_PARITY_OUT,{recursive:true,mode:0o700})
    fs.writeFileSync(path.join(process.env.H2_PARITY_OUT,'explicit-groups-http-restart-sanitized.json'),
      JSON.stringify(evidence,null,2)+'\n',{mode:0o600})
  }
  console.log('HTTP_GROUPS_E2E_PASS',JSON.stringify(evidence))
})
