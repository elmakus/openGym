// Real backend HTTP/disk/restart test of source-exact 300-rep H1 observations.
// Uses synthetic K5 metadata; no native account, production database, or private history.
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
import { fixtureCycles } from '../training-control/hybrid2/fixtures/cycles.js'
import { replayHybridHistory } from '../training-control/hybrid2/history.js'
import { loadedRepScore } from '../training-control/hybrid2/h1.js'
import { h1FromExposure } from '../training-control/hybrid2/observation.js'
import { validateCanonicalProfile } from '../migration/profile-validation.js'
import { packProfile, unpackProfile } from '../migration/profile-pack.js'
import { defaultPlanRule } from '../engine/index.js'

const API=path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const UID='source_exact_h1_300_local_fixture_only'
const SECRET=crypto.randomBytes(32).toString('hex')
const fixtures=[
  {reps:10},{reps:10},{reps:10},{reps:300}
]
const build=()=>{
  const routines=K5.routines.map(r=>({...r,ex:r.ex.map(o=>({...o,warmup:'none',
    rule:defaultPlanRule('linear',{id:'test-rule-'+o.occurrenceId,
      routineId:r.id,exerciseId:o.exerciseId,completion:[],target:{mode:'none'},
      sets:{min:1,max:1},reps:{min:10,max:12},
      load:{mode:'absolute',value:100,unit:'kg'}})}))}))
  return {engineSchemaVersion:2,unit:'kg',routines,workouts:[],
    oneRepMaxes:{},prescriptions:{},progression:{},
    trainingControl:{hybrid2Config:{enabled:true,adapter:K5.adapter}}}
}
const cookie=()=>{
  const payload=UID+':'+(Date.now()+86400000)+':0'
  return 'gymsid='+payload+'.'+crypto.createHmac('sha256',SECRET).update(payload).digest('base64url')
}
async function start(dir){
  const child=spawn(process.execPath,['server.js'],{
    cwd:API,stdio:['ignore','pipe','pipe'],
    env:{...process.env,PORT:'0',DATA_DIR:dir,ORIGIN:'http://localhost:8080',
      RP_ID:'localhost',INTEGRATIONS:'',REMINDER_TICK_MS:'99999999'}
  })
  const h={child,log:''}
  child.stdout.on('data',x=>{h.log+=x})
  child.stderr.on('data',x=>{h.log+=x})
  h.port=await boundPort(child,()=>h.log)
  h.base='http://127.0.0.1:'+h.port
  return h
}
async function stop(h){
  if(!h||h.child.exitCode!=null||h.child.signalCode!=null)return
  const exiting=once(h.child,'exit')
  h.child.kill('SIGTERM')
  await exiting
}
test('H1 300-rep native policy survives actual HTTP save, two restarts and reloaded canonical replay',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'h1-native-parity-http-'))
  fs.writeFileSync(path.join(dir,'secret'),SECRET,{mode:0o600})
  fs.writeFileSync(path.join(dir,'db.json'),JSON.stringify({
    users:[{id:UID,name:'Synthetic',created:new Date().toISOString()}],
    creds:[],subs:[],invites:[]
  }),{mode:0o600})
  let server=null,requests=0,writes=0,restarts=0
  t.after(async()=>{await stop(server);fs.rmSync(dir,{recursive:true,force:true})})
  server=await start(dir)
  const req=async(method,body)=>{
    requests++
    const res=await fetch(server.base+'/api/data',{
      method,headers:{cookie:cookie(),origin:'http://localhost:8080',
        'content-type':'application/json','x-opengym-engine-schema':'2'},
      ...(body===undefined?{}:{body:JSON.stringify(body)})
    })
    return {status:res.status,data:await res.json()}
  }
  const read=async()=>{
    const x=await req('GET')
    assert.equal(x.status,200,JSON.stringify(x))
    return {rev:x.data.rev,state:x.data.state?unpackProfile(x.data.state):null}
  }
  const write=async(state,rev)=>{
    assert.deepEqual(validateCanonicalProfile(state),{ok:true,errors:[]})
    const x=await req('PUT',{state:packProfile(state),baseRev:rev})
    assert.equal(x.status,200,JSON.stringify(x))
    writes++
    return x.data.rev
  }
  const first=build()
  first.workouts=fixtureCycles(K5,fixtures.slice(0,3))
  assert.equal(first.workouts.length,15)
  let rev=await write(first,0)
  let stored=await read()
  assert.equal(stored.rev,rev)
  const before=replayHybridHistory({
    workouts:stored.state.workouts,adapter:K5.adapter,prescriptions:stored.state.prescriptions
  })
  assert.equal(before.status,'NORMAL')
  const signalId=K5.adapter.signals[0].signalId
  assert.equal(before.state.anchors[signalId].perf3,loadedRepScore(100,10))
  assert.equal(before.state.anchors[signalId].perfCount,3)
  await stop(server)
  server=await start(dir)
  restarts++
  stored=await read()
  assert.equal(stored.state.workouts.length,15)

  const next=structuredClone(stored.state)
  // Build all four distinct fixture cycles and append only the fourth; source
  // IDs and chronological sequence must remain distinct across disk restarts.
  const finalCycle=fixtureCycles(K5,fixtures).slice(15)
  next.workouts=stored.state.workouts.concat(finalCycle)
  assert.equal(next.workouts.length,20)
  const high=next.workouts.at(-5).exposures[0]
  assert.equal(high.performance.sets[0].observations[0].value,300)
  const projection=h1FromExposure(high,{beforeCandidate:100,afterCandidate:100,baselineUnit:'kg'})
  assert.equal(projection.kind,'COMPARABLE')
  assert.equal(projection.performance,1100)
  rev=await write(next,rev)
  stored=await read()
  assert.equal(stored.rev,rev)
  const after=replayHybridHistory({
    workouts:stored.state.workouts,adapter:K5.adapter,prescriptions:stored.state.prescriptions
  })
  assert.equal(after.status,'NORMAL')
  assert.equal(after.sourceCount,20)
  assert.equal(after.state.anchors[signalId].perf3,1100)
  assert.equal(after.decisions.at(-1).evaluation.validCount,5)
  assert.equal(after.decisions.at(-1).evaluation.cycleClass,'GOOD')
  assert.equal(after.decisions.at(-1).evaluation.queueDeload,false)
  assert.equal(after.state.anchors[signalId].candidateGuard,1)

  await stop(server)
  server=await start(dir)
  restarts++
  stored=await read()
  assert.equal(stored.rev,rev)
  assert.equal(stored.state.workouts.length,20)
  const disk=unpackProfile(JSON.parse(fs.readFileSync(
    path.join(dir,'state-'+UID+'.json'),'utf8')))
  assert.deepEqual(disk.workouts,stored.state.workouts)
  const rebuilt=replayHybridHistory({
    workouts:disk.workouts,adapter:K5.adapter,prescriptions:disk.prescriptions
  })
  assert.deepEqual(rebuilt.state,after.state)
  assert.deepEqual(validateCanonicalProfile(disk),{ok:true,errors:[]})
  const result={schema:'HYBRID2-H1-300-REAL-HTTP-RESTART-1',classification:'PASS',
    scope:'Synthetic K5 canonical data, genuine openGym HTTP child process, not additional Liftosaur workouts',
    completedSyntheticSessions:disk.workouts.length,apiWrites:writes,apiRequests:requests,
    actualBackendRestarts:restarts,highRep:300,highRepWeightKg:100,
    nativeExpectedScore:loadedRepScore(100,300),persistedActualScore:rebuilt.state.anchors[signalId].perf3,
    afterCycleClass:rebuilt.decisions.at(-1).evaluation.cycleClass,
    afterValidH1Votes:rebuilt.decisions.at(-1).evaluation.validCount,
    replayStatus:rebuilt.status,sourceVersion:'H1-EPL-1 / H1-ASYM-M3-1'}
  if(process.env.H2_PARITY_OUT){
    fs.mkdirSync(process.env.H2_PARITY_OUT,{recursive:true,mode:0o700})
    fs.writeFileSync(path.join(process.env.H2_PARITY_OUT,'h1-300-real-http-sanitized.json'),
      JSON.stringify(result,null,2)+'\n',{mode:0o600})
  }
  console.log('H1_300_HTTP_PASS',JSON.stringify(result))
})
