// One isolated real HTTP persistence gate for immutable native H1 cutover.
// Synthetic identity/data only; never accesses an athlete's Liftosaur account.
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
import { M6 } from '../training-control/hybrid2/fixtures/reference-adapters.js'
import { makeFixtureCycle } from '../training-control/hybrid2/fixtures/cycles.js'
import { createHybridBootstrap } from '../training-control/hybrid2/bootstrap.js'
import { replayHybridHistory } from '../training-control/hybrid2/history.js'
import { validateCanonicalProfile } from '../migration/profile-validation.js'
import { packProfile, unpackProfile } from '../migration/profile-pack.js'
import { defaultPlanRule } from '../engine/index.js'

const API=path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const USER='bootstrap_h1_synthetic_http'
const SECRET=crypto.randomBytes(32).toString('hex')
const copy=structuredClone
function profile(){
  const routines=M6.routines.map(r=>({...r,ex:r.ex.map(o=>({...o,warmup:'none',
    rule:defaultPlanRule('linear',{id:'h1-rule-'+o.occurrenceId,routineId:r.id,
      exerciseId:o.exerciseId,completion:[],target:{mode:'none'},
      sets:{min:1,max:1},reps:{min:8,max:16},
      load:{mode:'absolute',value:100,unit:'kg'}})}))}))
  const anchors=Object.fromEntries(M6.adapter.signals.map(s=>[s.signalId,{
    perf1:150,perf2:150,perf3:150,perfCount:3,perfReference:150,candidateGuard:0
  }]))
  const bootstrap=createHybridBootstrap({
    adapter:M6.adapter,sourceId:'reviewed-synthetic-import',
    cutoverAt:'2025-12-31T20:00:00.000Z',importedAt:'2025-12-31T21:00:00.000Z',anchors
  })
  return {engineSchemaVersion:2,unit:'kg',routines,workouts:[],oneRepMaxes:{},
    prescriptions:{},progression:{},
    trainingControl:{hybrid2Config:{version:1,enabled:true,adapter:M6.adapter},
      hybrid2Bootstrap:bootstrap}}
}
const cookie=()=>{
  const payload=USER+':'+(Date.now()+86400000)+':0'
  return 'gymsid='+payload+'.'+crypto.createHmac('sha256',SECRET).update(payload).digest('base64url')
}
async function start(dir){
  const child=spawn(process.execPath,['server.js'],{
    cwd:API,stdio:['ignore','pipe','pipe'],
    env:{...process.env,PORT:'0',DATA_DIR:dir,ORIGIN:'http://localhost:8080',
      RP_ID:'localhost',INTEGRATIONS:'',REMINDER_TICK_MS:'99999999'}
  })
  const h={child,log:''}
  child.stdout.on('data',b=>h.log+=b)
  child.stderr.on('data',b=>h.log+=b)
  h.port=await boundPort(child,()=>h.log)
  return h
}
async function stop(h){
  if(!h || h.child.exitCode!=null || h.child.signalCode!=null)return
  const done=once(h.child,'exit')
  h.child.kill('SIGTERM')
  await done
}

test('reviewed H1 baseline survives HTTP/409/restart and server rejects replacing or deleting it',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'og-h1-bootstrap-'))
  fs.writeFileSync(path.join(dir,'secret'),SECRET,{mode:0o600})
  fs.writeFileSync(path.join(dir,'db.json'),JSON.stringify({
    users:[{id:USER,name:'Synthetic H1',created:new Date().toISOString()}],
    creds:[],subs:[],invites:[]
  }),{mode:0o600})
  let h=null
  t.after(async()=>{await stop(h);fs.rmSync(dir,{recursive:true,force:true})})
  h=await start(dir)
  const call=async(method,state,baseRev)=>{
    const res=await fetch('http://127.0.0.1:'+h.port+'/api/data',{
      method,headers:{cookie:cookie(),origin:'http://localhost:8080',
        'content-type':'application/json','x-opengym-engine-schema':'2'},
      ...(state===undefined?{}:{body:JSON.stringify({
        state:packProfile(state),baseRev
      })})
    })
    return {status:res.status,data:await res.json()}
  }
  const base=profile()
  assert.deepEqual(validateCanonicalProfile(base),{ok:true,errors:[]})
  let response=await call('PUT',base,0)
  assert.equal(response.status,200,JSON.stringify(response))
  const firstRev=response.data.rev
  const stored=await call('GET')
  assert.equal(stored.status,200)
  const baseline=unpackProfile(stored.data.state)
  assert.deepEqual(baseline.trainingControl.hybrid2Bootstrap,base.trainingControl.hybrid2Bootstrap)
  const next=copy(baseline)
  next.workouts=makeFixtureCycle(M6,0,8)
  assert.deepEqual(validateCanonicalProfile(next),{ok:true,errors:[]})
  response=await call('PUT',next,firstRev)
  assert.equal(response.status,200,JSON.stringify(response))
  const rev=response.data.rev
  assert.equal(replayHybridHistory({
    workouts:next.workouts,adapter:M6.adapter,
    bootstrap:next.trainingControl.hybrid2Bootstrap
  }).status,'QUEUED')
  const changed=copy(next)
  changed.trainingControl.hybrid2Bootstrap=createHybridBootstrap({
    adapter:M6.adapter,sourceId:'other-offline-baseline',
    cutoverAt:'2025-12-31T20:00:00.000Z',importedAt:'2025-12-31T21:00:00.000Z',
    anchors:base.trainingControl.hybrid2Bootstrap.anchors
  })
  assert.equal((await call('PUT',changed,rev)).status,400)
  const deleted=copy(next)
  delete deleted.trainingControl.hybrid2Bootstrap
  assert.equal((await call('PUT',deleted,rev)).status,400)
  assert.equal((await call('PUT',base,firstRev)).status,409)
  await stop(h)
  h=await start(dir)
  const restarted=await call('GET')
  assert.equal(restarted.status,200)
  assert.equal(restarted.data.rev,rev)
  const disk=unpackProfile(restarted.data.state)
  assert.deepEqual(disk.trainingControl.hybrid2Bootstrap,base.trainingControl.hybrid2Bootstrap)
  assert.equal(replayHybridHistory({
    workouts:disk.workouts,adapter:M6.adapter,
    bootstrap:disk.trainingControl.hybrid2Bootstrap
  }).status,'QUEUED')
  assert.deepEqual(validateCanonicalProfile(disk),{ok:true,errors:[]})
})
