#!/usr/bin/env node
// Validation-only genuine original Liftosaur Timed Load differential.
// Source/fixture are pinned; no account, API writes, deployment or source patch.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {createRequire} from 'node:module'
import {evaluateTimedLoad, initialTimedState, SIDE_PLANK_TIMED_CONFIG as config} from '../../api/training-control/timed-load.js'

const runtimeRoot=process.env.LIFTOSAUR_RUNTIME_ROOT
const sourcePath=process.env.TIMED_LOAD_ORIGINAL_SOURCE
const outDir=process.env.H2_PARITY_OUT
if(!runtimeRoot||!sourcePath||!outDir) throw Error('LIFTOSAUR_RUNTIME_ROOT, TIMED_LOAD_ORIGINAL_SOURCE and H2_PARITY_OUT are required')
const runtimePin='ce75750bde4a190682fb5a6fa1984fc9184a9842'
const sourcePin='9b6a10c60c8d53888ade21f60640e4baee03bb8a0ed3b9637e31f82543799218'
const sha=x=>crypto.createHash('sha256').update(x).digest('hex')
if(!fs.readFileSync(path.join(runtimeRoot,'README.txt'),'utf8').includes(runtimePin)) throw Error('Unexpected Liftosaur runtime pin')
let source=fs.readFileSync(sourcePath,'utf8')
if(sha(source)!==sourcePin) throw Error('Frozen original Timed Load source SHA mismatch')
const runtime=createRequire(import.meta.url)(path.join(runtimeRoot,'runtime_api.cjs'))
const settings=structuredClone(runtime.settings)
settings.units='kg'
// Match the ORIGINAL fixture's native weight ladder, not Liftosaur's default 5kg dumbbell minimum.
const dumbbell=settings.gyms.find(x=>x.id==='default')?.equipment?.dumbbell
if(!dumbbell) throw Error('Pinned runtime lacks default dumbbell equipment')
dumbbell.isFixed=true
dumbbell.fixed=config.ladderKg.map(value=>({value,unit:'kg'}))
dumbbell.bar.kg.value=0

function stateOf(text) {
  const firstLine=text.split('\n').find(x=>x.startsWith('Side Plank, Dumbbell'))
  const matches=firstLine?.match(/2x1\s+(?:([\d.]+)kg\s+)?(\d+)s\|(\d+)s(?:\s+\/\s+([\d.]+)kg)?/)
  const saved=text.match(/progress: custom\(([^)]*)\)/)
  if(!matches||!saved) throw Error('Native Timed Load state not readable')
  const entries=Object.fromEntries(saved[1].split(',').map(x=>x.trim().split(':').map(y=>y.trim())))
  const number=k=>Number(entries[k]?.replace('kg','')??0)
  const bridge=number('bridgeTarget')
  return {
    initialized:number('initialized')===1,
    load:Number(matches[4]??matches[1]),
    target:Number(matches[2]),
    fails:number('fails'),
    provenance:number('newLoad')===1?'new':'established',
    emergency:number('emergency')===1,
    bridgeTarget:bridge||null,
    bridgeProvenance:bridge?(number('bridgeWasNew')===1?'new':'established'):null
  }
}

const scenarios=[
  true,true,true,true,        // initial calibration; 35,40,45; then 2 kg
  false,false,false,          // first miss; emergency 25s; bridge down to 1 kg
  true,true,true,true,        // relearn 35/40/45 and restore 2 kg bridge
  true,false,false,true,true,true // establish, double-fail backoff, recover
]
const keys=['initialized','load','target','fails','provenance','emergency','bridgeTarget','bridgeProvenance']
const result={
  schema:'HYBRID2-TIMED-LOAD-GENUINE-ORIGINAL-NATIVE-1',
  sourceCommit:'9f2deb6c345643d7c0c793c52d358e496c2710d2',
  sourceBlob:'48136e1756e9fa1e245bbe3036872525aa1647ee',
  sourceSha256:sourcePin,runtimeCommit:runtimePin,
  scope:'Original standalone Side Plank Liftoscript in genuine pinned Playground, frozen 0..30kg fixture ladder, two logical 1|1 timed sides; native change_set_time controls one timer per logical set; not full M6, independent L/R timer parity, actual gym settings, or HTTP backend.',
  nativeWorkouts:0,comparisons:0,failures:[],trace:[],accountWrites:0,sourceMutated:false
}
let model=initialTimedState(config)
for(const [index,success] of scenarios.entries()) {
  const before=stateOf(source)
  for(const key of keys) {
    result.comparisons++
    if(before[key]!==model[key]) result.failures.push({session:index+1,phase:'before',key,expected:model[key],actual:before[key]})
  }
  const seconds=success?before.target:Math.max(1,before.target-6)
  const commands=[1,2].flatMap(n=>[
    `complete_set(1,${n})`, `change_set_time(1,${n},${seconds})`
  ]).concat('finish_workout()')
  const native=runtime.Playground_run({programText:source,week:1,day:1,commands},settings,runtime.defaultStats())
  if(!native.success||typeof native.data?.updatedProgramText!=='string') throw Error(`Native workout ${index+1} failed: ${native.error}`)
  const record=native.data.workout.split('\n').find(x=>x.includes('Side Plank, Dumbbell /'))
  if(!record?.includes('2x1|1')) throw Error(`Native workout ${index+1} missing expected paired-set structure`)
  const rows=[1,2].flatMap(()=>[
    {side:'L',completed:true,techniqueValid:true,seconds:60,weightKg:before.load},
    {side:'R',completed:true,techniqueValid:true,seconds,weightKg:before.load}
  ])
  const expected=evaluateTimedLoad({config,state:model,rows})
  const actual=stateOf(native.data.updatedProgramText)
  const differences=[]
  for(const key of keys) {
    result.comparisons++
    if(actual[key]!==expected.nextState[key]) {
      const difference={session:index+1,phase:'after',key,expected:expected.nextState[key],actual:actual[key]}
      differences.push(difference)
      result.failures.push(difference)
    }
  }
  result.trace.push({ordinal:index+1,success,seconds,reason:expected.reason,
    before:before,after:actual,sourceAfterSha256:sha(native.data.updatedProgramText),
    mismatches:differences.length})
  result.nativeWorkouts++
  model=expected.nextState
  source=native.data.updatedProgramText
}
result.status=result.failures.length?'RED':'PASS_WITH_LIMITS'
fs.mkdirSync(outDir,{recursive:true,mode:0o700})
fs.writeFileSync(path.join(outDir,'timed-load-original-native-sanitized.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600})
console.log(JSON.stringify({status:result.status,nativeWorkouts:result.nativeWorkouts,comparisons:result.comparisons,
 failures:result.failures,coveredReasons:[...new Set(result.trace.map(x=>x.reason))]},null,2))
if(result.failures.length) process.exitCode=1
