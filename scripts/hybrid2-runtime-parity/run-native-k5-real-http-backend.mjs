#!/usr/bin/env node
// Real isolated openGym API HTTP writes, backend restart and replay from genuine
// original Liftosaur K5 sourced (but openGym-materialized) performance records.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {spawn} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {boundPort} from '../../api/test/helpers.mjs'
import {packProfile,unpackProfile} from '../../api/migration/profile-pack.js'
import {isDeepStrictEqual} from 'node:util'
import {replayHybridHistory} from '../../api/training-control/hybrid2/history.js'
import {reconcileHybridHistory} from '../../frontend/src/lib/hybrid2-sync.js'
import {buildSessionExposures} from '../../frontend/src/lib/session-start.js'
import {entriesForExposures} from '../../frontend/src/lib/session-ui-adapter.js'
const here=path.dirname(fileURLToPath(import.meta.url)),api=path.resolve(here,'../../api')
const out=process.env.H2_PARITY_OUT,inputs=process.env.H2_PRIVATE_PROFILE_SNAPSHOTS
if(!out||!inputs)throw Error('Isolated private H2_PARITY_OUT and H2_PRIVATE_PROFILE_SNAPSHOTS required')
const secret=crypto.randomBytes(32).toString('hex'),uid='h2_validation_scratch_only'
const dir=fs.mkdtempSync(path.join(out,'k5-api-isolated-'))
fs.chmodSync(dir,0o700)
fs.writeFileSync(path.join(dir,'secret'),secret,{mode:0o600})
fs.writeFileSync(path.join(dir,'db.json'),JSON.stringify({users:[{id:uid,name:'Validation Only',created:'2026-11-10T00:00:00.000Z'}],creds:[],subs:[],invites:[]}),{mode:0o600})
const result={schema:'HYBRID2-K5-NATIVE-INPUT-REAL-OPENGYM-HTTP-RESTART-1',
 provenance:{nativeTranscriptSha256:'44a84c1dbe7439909810d1e7275f22a1afbcf94dcbbff10d937cef7a8a814e31',
 backend:'actual openGym api/server.js',input:'original-native K5 repetitions / openGym fixture loads',accountWrites:0,newNativeWorkouts:0,dataDir:'private-only random scratch'},
 backendWrites:0,backendReads:0,restarts:0,checks:0,issues:[],steps:[],nextSession:null}
const check=(label,okay,step,meta={})=>{result.checks++;if(!okay)result.issues.push({label,step,...meta})}
const cookie=()=>{
 const payload=uid+':'+(Date.now()+86400000)+':0'
 return 'gymsid='+payload+'.'+crypto.createHmac('sha256',secret).update(payload).digest('base64url')
}
let child,port,log=''
async function start(){
 log=''
 child=spawn(process.execPath,['server.js'],{cwd:api,stdio:['ignore','pipe','pipe'],
  env:{...process.env,PORT:'0',DATA_DIR:dir,ORIGIN:'http://localhost:8080',RP_ID:'localhost',
    PASSWORD_LOGIN:'',FIRST_USER_ADMIN:'',ADMIN_UIDS:'',INVITE_ONLY:'',MEDIA_UPLOADS:'0',AUDIT_LOG:'0',REMINDER_TICK_MS:'99999999'}})
 child.stdout.on('data',v=>log+=v.toString())
 child.stderr.on('data',v=>log+=v.toString())
 port=await boundPort(child,()=>log)
}
async function stop(){
 if(!child)return
 const prev=child;child=null
 if(prev.exitCode===null){
  prev.kill('SIGTERM')
  await Promise.race([new Promise(r=>prev.once('exit',r)),new Promise(r=>setTimeout(r,3000))])
  if(prev.exitCode===null)prev.kill('SIGKILL')
 }
}
async function call(method,endpoint,body){
 const response=await fetch('http://127.0.0.1:'+port+endpoint,{
  method,headers:{Cookie:cookie(),'X-OpenGym-Engine-Schema':'2','Content-Type':'application/json',
   'Sec-Fetch-Site':'same-origin'},
  ...(body===undefined?{}:{body:JSON.stringify(body)})})
 const parsed=await response.json()
 return {status:response.status,body:parsed}
}
async function read(step){
 const response=await call('GET','/api/data')
 // Match the actual frontend wire adapter: /api/data returns packed engine-v2 JSON.
 if(response.status===200&&response.body?.state)response.body.state=unpackProfile(response.body.state)
 result.backendReads++
 check('get-http-200',response.status===200,step,{status:response.status,error:response.body?.error})
 return response.body
}
const slots=['chest','squat','row','incline','leg_press']
const oracle=JSON.parse(fs.readFileSync(path.join(out,'native-k5-open-gym-persisted-pipeline-sanitized.json'),'utf8'))
if(oracle.outcome!=='PASS'||oracle.positionSummaries?.length!==20||oracle.nativeInputSha256!==result.provenance.nativeTranscriptSha256)
 throw Error('Pinned native-origin K5 oracle missing, incomplete or changed')
try{
 await start()
 let revision=0,wid=null
 for(let i=1;i<=20;i++){
  const fixture=JSON.parse(fs.readFileSync(path.join(inputs,'profile-'+String(i).padStart(2,'0')+'.json'),'utf8'))
  check('expected-native-input-session-count',fixture.workouts.length===i,i)
  const sent=await call('PUT','/api/data',{state:fixture,baseRev:revision,...(wid?{baseWid:wid}:{})})
  check('put-http-200',sent.status===200,i,{status:sent.status,error:sent.body?.error,details:sent.body?.details?.slice?.(0,3)})
  if(sent.status!==200)break
  result.backendWrites++
  const got=await read(i)
  revision=got.rev
  wid=got.state?._wid
  check('revision-sequential',revision===i,i,{got:revision})
  check('native-derived-workout-count',got.state?.workouts?.length===i,i,{got:got.state?.workouts?.length})
  check('native-derived-last-session-id',got.state?.workouts?.at(-1)?.id===fixture.workouts.at(-1)?.id,i)
  // The server intentionally stamps new workout records (_ts/_f), and the
  // wire encoder adds canonical set defaults and may reorder keys. Compare the
  // FULL workout/sets/exposure content after exactly the same pack/unpack wire
  // transform, excluding only the server's audited record bookkeeping fields.
  const withoutServerStamps=w=>Object.fromEntries(Object.entries(w).filter(([k])=>k!=='_ts'&&k!=='_f'))
  const expectedCanonical=unpackProfile(packProfile(fixture)).workouts
  check('transcript-derived-completed-sets',isDeepStrictEqual(got.state?.workouts?.map(withoutServerStamps),expectedCanonical.map(withoutServerStamps)),i)
  // Existing records receive server change stamps on subsequent writes; the
  // brand-new latest workout is not necessarily stamped until the next sync.
  if(i>1)check('prior-workout-stamp-present',Number.isFinite(Number(got.state?.workouts?.[0]?._ts)),i)
  if(i%5===0){
   const expected=fixture.workouts.at(-1).exposures.find(x=>x.occurrenceId==='fixture-k5:leg_press')
   const actual=got.state?.workouts?.at(-1)?.exposures?.find(x=>x.occurrenceId==='fixture-k5:leg_press')
   const repsOf=ex=>(ex?.performance?.sets||[]).filter(x=>x.side==='L'||x.side==='R')
     .map(x=>({id:x.setId,side:x.side,reps:x.observations?.find(y=>y.metric==='repetitions')?.value}))
   check('bilateral-native-left-right-persisted',JSON.stringify(repsOf(actual))===JSON.stringify(repsOf(expected)),i)
  }
  if(Array.isArray(got.state?.workouts)&&got.state?.trainingControl?.hybrid2Config?.adapter){
   const a=replayHybridHistory({workouts:got.state.workouts,adapter:got.state.trainingControl.hybrid2Config.adapter,prescriptions:got.state.prescriptions})
   const b=reconcileHybridHistory(got.state)
   check('server-persisted-history-replay',JSON.stringify(a.state)===JSON.stringify(b.state),i)
   check('server-history-replay-count',a.sourceCount===i,i)
   // The real K5 native transcript deliberately resets H1 after deload.
   // Never assume sample counts grow monotonically across a closer.
   const nativeOracleCount=oracle.positionSummaries[i-1].nativeH1Count
   check('H1-current-slot-native-count',a.state.anchors[slots[(i-1)%5]]?.perfCount===nativeOracleCount,i,
    {replayed:a.state.anchors[slots[(i-1)%5]]?.perfCount,nativeOracleCount})
   result.steps.push({session:i,backendRevision:revision,sourceCount:a.sourceCount,status:a.status,issuesSoFar:result.issues.length})
  } else check('restored-adapter-present',false,i)
  if(i===10||i===20){
   const diskFile=path.join(dir,'state-'+uid+'.json')
   const disk=JSON.parse(fs.readFileSync(diskFile,'utf8'))
   check('actual-on-disk-history',disk.workouts?.length===i,i)
   await stop()
   await start()
   result.restarts++
   const after=await read(i)
   check('post-restart-revision',after.rev===revision,i)
   check('post-restart-workouts',JSON.stringify(after.state?.workouts)===JSON.stringify(got.state?.workouts),i)
   check('post-restart-wid',after.state?._wid===wid,i)
   const anew=replayHybridHistory({workouts:after.state.workouts,adapter:after.state.trainingControl.hybrid2Config.adapter,prescriptions:after.state.prescriptions})
   const prior=replayHybridHistory({workouts:got.state.workouts,adapter:got.state.trainingControl.hybrid2Config.adapter,prescriptions:got.state.prescriptions})
   check('post-restart-controller-replay',JSON.stringify(anew.state)===JSON.stringify(prior.state),i)
  }
 }
 if(result.backendWrites===20){
  const persisted=await read('next')
  const routine=persisted.state.routines[0]
  const planned=buildSessionExposures(persisted.state,routine,{now:Date.UTC(2026,11,15),newId:s=>s,unit:'kg'})
  const entries=entriesForExposures(planned,persisted.state.prescriptions)
  check('next-session-has-original-occurrences',planned.length===entries.length&&planned.length>0,'next')
  check('next-session-follows-20-history',persisted.state.workouts.length===20,'next')
  result.nextSession={exposures:planned.length,entries:entries.length,fromRevision:persisted.rev,status:replayHybridHistory({
   workouts:persisted.state.workouts,adapter:persisted.state.trainingControl.hybrid2Config.adapter,
   prescriptions:persisted.state.prescriptions}).status}
  // No real account and no production DB: stale revision must fail closed on this private backend.
  const conflict=await call('PUT','/api/data',{state:persisted.state,baseRev:0})
  check('stale-revision-rejected',conflict.status===409,'next',{http:conflict.status})
 }
}finally{await stop()}
result.outcome=result.issues.length?'RED':'PASS'
const evidence=path.join(out,'k5-native-real-http-backend-private.json')
fs.writeFileSync(evidence,JSON.stringify(result,null,2)+'\n',{mode:0o600})
const safe=structuredClone(result)
safe.provenance.dataDir='private isolated per-run DATA_DIR; no production path'
fs.writeFileSync(path.join(out,'k5-native-real-http-backend-sanitized.json'),JSON.stringify(safe,null,2)+'\n')
console.log(JSON.stringify({outcome:result.outcome,backendWrites:result.backendWrites,backendReads:result.backendReads,
 restarts:result.restarts,checks:result.checks,issues:result.issues.slice(0,12),nextSession:result.nextSession},null,2))
if(result.issues.length)process.exitCode=1
