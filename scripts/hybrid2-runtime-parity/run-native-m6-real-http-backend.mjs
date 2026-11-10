#!/usr/bin/env node
// Current-M6 genuine original-native kg sets -> real isolated openGym API HTTP/disk/restart.
// Six-anchor M6 fixture only. Source evidence, profiles, credentials stay PRIVATE.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {spawn} from 'node:child_process'
import {isDeepStrictEqual} from 'node:util'
import {fileURLToPath} from 'node:url'
import {boundPort} from '../../api/test/helpers.mjs'
import {packProfile,unpackProfile} from '../../api/migration/profile-pack.js'
import {replayHybridHistory} from '../../api/training-control/hybrid2/history.js'
import {h1FromExposure} from '../../api/training-control/hybrid2/observation.js'
import {reconcileHybridHistory} from '../../frontend/src/lib/hybrid2-sync.js'
import {buildSessionExposures} from '../../frontend/src/lib/session-start.js'
import {entriesForExposures} from '../../frontend/src/lib/session-ui-adapter.js'
const here=path.dirname(fileURLToPath(import.meta.url)),api=path.resolve(here,'../../api')
const out=process.env.H2_PARITY_OUT,inputs=process.env.H2_PRIVATE_PROFILE_SNAPSHOTS,originalPath=process.env.H2_NATIVE_M6_PRIVATE
if(!out||!inputs||!originalPath)throw Error('Explicit isolated evidence/private source/profile paths required')
const nativeBytes=fs.readFileSync(originalPath,'utf8')
const sha=x=>crypto.createHash('sha256').update(x).digest('hex')
if(sha(nativeBytes)!=='2b4a0747d39890dfb3c89a49e4df8c3229e39c390713a8a58d42e66284d25c95')throw Error('Native original source SHA mismatch')
const native=JSON.parse(nativeBytes)
if(native.outcome!=='PASS'||native.steps?.length!==9)throw Error('Original-native M6 trace not PASS')
const nmap={hip_a:'d1i1',chest_a:'d1i6',hip_b:'d2i2',row_b:'d2i8',hip_c:'d3i2',row_c:'d3i8'}
const uid='h2_m6_validation_scratch_only',secret=crypto.randomBytes(32).toString('hex')
const dir=fs.mkdtempSync(path.join(out,'m6-api-isolated-'))
fs.chmodSync(dir,0o700)
fs.writeFileSync(path.join(dir,'secret'),secret,{mode:0o600})
fs.writeFileSync(path.join(dir,'db.json'),JSON.stringify({users:[{id:uid,name:'Validation Only',created:'2026-11-10T00:00:00.000Z'}],creds:[],subs:[],invites:[]}),{mode:0o600})
const result={schema:'HYBRID2-M6-ORIGINAL-NATIVE-KG-REAL-HTTP-RESTART-1',
 provenance:{nativePrivateSha256:sha(nativeBytes),backend:'openGym real api/server.js',fixture:'six real M6 original-native H1 anchor set inputs, fixture M6 adapter/closer',
  newNativeLiftosaurExecutions:0,sourceOnlyOriginalLoadHistory:true,absoluteNativeH1StateEqualityNotClaimed:true,
  originalM6Complete36PositionsNotClaimed:true,accountWrites:0,privateCredentialsPublished:false},
 writes:0,reads:0,restarts:0,checks:0,loadedNativeSets:0,nativeFirstSetObservations:0,issues:[],steps:[],nextSession:null}
const check=(label,okay,step,meta={})=>{result.checks++;if(!okay)result.issues.push({step,label,...meta})}
const cookie=()=>{const payload=uid+':'+(Date.now()+86400000)+':0'
 return 'gymsid='+payload+'.'+crypto.createHmac('sha256',secret).update(payload).digest('base64url')}
let child,port,log=''
async function start(){
 log=''
 child=spawn(process.execPath,['server.js'],{cwd:api,stdio:['ignore','pipe','pipe'],
  env:{...process.env,PORT:'0',DATA_DIR:dir,ORIGIN:'http://localhost:8080',RP_ID:'localhost',
   PASSWORD_LOGIN:'',FIRST_USER_ADMIN:'',ADMIN_UIDS:'',INVITE_ONLY:'',MEDIA_UPLOADS:'0',AUDIT_LOG:'0',REMINDER_TICK_MS:'99999999'}})
 child.stdout.on('data',x=>log+=x.toString());child.stderr.on('data',x=>log+=x.toString())
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
  method,headers:{Cookie:cookie(),'X-OpenGym-Engine-Schema':'2','Content-Type':'application/json','Sec-Fetch-Site':'same-origin'},
  ...(body===undefined?{}:{body:JSON.stringify(body)})})
 const data=await response.json()
 if(response.status===200&&method==='GET'&&endpoint==='/api/data'&&data?.state)data.state=unpackProfile(data.state)
 return {status:response.status,data}
}
async function read(step){
 const r=await call('GET','/api/data');result.reads++
 check('HTTP-GET-200',r.status===200,step,{status:r.status,error:r.data?.error})
 return r.data
}
const stripStamps=xs=>(xs||[]).map(({_ts,_f,...rest})=>rest)
const validStamps=xs=>(xs||[]).every(x=>(x._ts==null&&x._f==null)||
 (Number.isFinite(x._ts)&&x._f?.exposures===x._ts&&Object.keys(x._f).length===1))
let rev=0,wid=null
try{
 await start()
 for(let i=1;i<=9;i++){
  const fixture=JSON.parse(fs.readFileSync(path.join(inputs,'profile-'+String(i).padStart(2,'0')+'.json'),'utf8'))
  check('private-native-profile-count',fixture.workouts?.length===i,i)
  const sent=await call('PUT','/api/data',{state:fixture,baseRev:rev,...(wid?{baseWid:wid}:{})})
  check('HTTP-PUT-200',sent.status===200,i,{status:sent.status,error:sent.data?.error})
  if(sent.status!==200)break
  result.writes++
  const got=await read(i);rev=got.rev;wid=got.state?._wid
  check('revision-sequential',rev===i,i,{got:rev})
  check('persisted-workout-count',got.state?.workouts?.length===i,i)
  const canonical=unpackProfile(packProfile(fixture))
  check('all-canonical-record-fields-from-native-input',
    isDeepStrictEqual(stripStamps(got.state?.workouts),stripStamps(canonical.workouts)),i)
  check('only-known-server-sync-stamps',validStamps(got.state?.workouts),i)
  const originalStep=native.steps[i-1],record=got.state.workouts.at(-1)
  for(const [slot,id]of Object.entries(nmap)){
   if(Number(id[1])!==originalStep.day)continue
   const src=originalStep.privateEvidence.find(x=>x.identity===id)
   const exp=record.exposures.find(x=>x.occurrenceId==='fixture-m6:'+slot)
   const rows=(exp?.performance?.sets||[]).filter(x=>x.role==='work'&&x.status==='completed')
   check('native-anchor-present',!!src&&!!exp,i,{slot})
   check('native-anchor-set-count',rows.length===src?.setsKg?.length,i,{slot})
   for(const [k,row]of rows.entries()){
    check('original-native-kg-exact',row.resistance?.unit==='kg'&&Math.abs(row.resistance.value-src.setsKg[k])<1e-7,i,{slot,set:k+1})
    check('original-native-reps-exact',row.observations?.find(x=>x.metric==='repetitions')?.value===src.setsReps[k],i,{slot,set:k+1})
    result.loadedNativeSets++
   }
   const ob=h1FromExposure(exp,{beforeCandidate:src.beforeCandidateKg,afterCandidate:src.nativeAfterCandidateKg,baselineUnit:'kg'})
   check('native-first-set-comparable-after-http',ob.kind==='COMPARABLE',i,{slot,kind:ob.kind})
   result.nativeFirstSetObservations++
  }
  const a=replayHybridHistory({workouts:got.state.workouts,adapter:got.state.trainingControl.hybrid2Config.adapter,
   prescriptions:got.state.prescriptions})
  const b=reconcileHybridHistory(got.state)
  check('persisted-canonical-history-replay',JSON.stringify(a.state)===JSON.stringify(b.state),i)
  check('persisted-replay-source-count',a.sourceCount===i,i)
  result.steps.push({ordinal:i,originalNativeBeforeSha256:originalStep.beforeSha256,
   nativeSourceAfterSha256:originalStep.afterSha256,persistedRevision:rev,sourceCount:a.sourceCount,
   controller:a.status,issuesToDate:result.issues.length})
  if(i===3||i===6||i===9){
   const stored=unpackProfile(JSON.parse(fs.readFileSync(path.join(dir,'state-'+uid+'.json'),'utf8')))
   check('real-disk-session-count',stored.workouts?.length===i,i)
   await stop();await start();result.restarts++
   const after=await read(i)
   check('restart-preserves-revision',after.rev===rev,i)
   check('restart-preserves-write-id',after.state?._wid===wid,i)
   check('restart-preserves-loaded-history',isDeepStrictEqual(stripStamps(after.state?.workouts),stripStamps(got.state?.workouts)),i)
   const again=replayHybridHistory({workouts:after.state.workouts,
    adapter:after.state.trainingControl.hybrid2Config.adapter,prescriptions:after.state.prescriptions})
   check('restart-preserves-controller-state',JSON.stringify(again.state)===JSON.stringify(a.state),i)
  }
 }
 if(result.writes===9){
  const p=await read('next'),r=p.state.routines[0]
  const exposed=buildSessionExposures(p.state,r,{now:Date.UTC(2026,11,20),newId:s=>s,unit:'kg'})
  const entries=entriesForExposures(exposed,p.state.prescriptions)
  check('next-session-two-original-anchor-fixture-positions',exposed.length===2&&entries.length===2,'next')
  result.nextSession={exposures:exposed.length,entries:entries.length,revision:p.rev}
  const conflict=await call('PUT','/api/data',{state:p.state,baseRev:0})
  check('stale-revision-rejected',conflict.status===409,'next',{code:conflict.status})
 }
}finally{await stop()}
result.outcome=result.issues.length?'RED':'PASS'
fs.writeFileSync(path.join(out,'m6-native-kg-real-http-private.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600})
const safe=structuredClone(result)
fs.writeFileSync(path.join(out,'m6-native-kg-real-http-sanitized.json'),JSON.stringify(safe,null,2)+'\n')
console.log(JSON.stringify({outcome:result.outcome,writes:result.writes,reads:result.reads,restarts:result.restarts,
 nativeLoadedSets:result.loadedNativeSets,originalFirstSetObservations:result.nativeFirstSetObservations,
 checks:result.checks,issues:result.issues.slice(0,20),nextSession:result.nextSession},null,2))
if(result.issues.length)process.exitCode=1
