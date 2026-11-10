#!/usr/bin/env node
// Original Liftosaur timed Side Plank L/R records, direct genuine source execution.
// Validation-only. No live accounts, API writes, source rewriting or deployment.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {createRequire} from 'node:module'
import {evaluateTimedLoad, initialTimedState, SIDE_PLANK_TIMED_CONFIG as config} from '../../api/training-control/timed-load.js'

const runtimeRoot=process.env.LIFTOSAUR_RUNTIME_ROOT
const sourceFile=process.env.TIMED_LOAD_ORIGINAL_SOURCE
const output=process.env.H2_PARITY_OUT
if(!runtimeRoot||!sourceFile||!output) throw Error('Pinned LIFTOSAUR_RUNTIME_ROOT, TIMED_LOAD_ORIGINAL_SOURCE, H2_PARITY_OUT required')
const runtimeCommit='ce75750bde4a190682fb5a6fa1984fc9184a9842'
const originalSourceSha256='9b6a10c60c8d53888ade21f60640e4baee03bb8a0ed3b9637e31f82543799218'
const sha=b=>crypto.createHash('sha256').update(b).digest('hex')
if(!fs.readFileSync(path.join(runtimeRoot,'README.txt'),'utf8').includes(runtimeCommit)) throw Error('Unrecognized original Liftosaur runtime')
let currentSource=fs.readFileSync(sourceFile,'utf8')
if(sha(currentSource)!==originalSourceSha256) throw Error('Frozen original Side Plank source changed')
// runtime_api registers the original pinned runtime's TypeScript import system;
// all subsequently imported actions are ORIGINAL unmodified source functions.
const require=createRequire(import.meta.url)
const rt=require(path.join(runtimeRoot,'runtime_api.cjs'))
const {Program_evaluate,Program_nextHistoryRecord,Program_getProgramExercise,Program_getDayNumber,Program_runAllFinishDayScripts}=require(path.join(runtimeRoot,'src/models/program.ts'))
const {Progress_completeSetAction,Progress_settleTimedSet}=require(path.join(runtimeRoot,'src/models/progress.ts'))
const {PlannerProgram_generateFullText}=require(path.join(runtimeRoot,'src/pages/planner/models/plannerProgram.ts'))
const {LiftohistorySerializer_serialize}=require(path.join(runtimeRoot,'src/liftohistory/liftohistorySerializer.ts'))

const settings=structuredClone(rt.settings)
settings.units='kg'
const dumbbell=settings.gyms.find(g=>g.id==='default')?.equipment?.dumbbell
if(!dumbbell) throw Error('Original runtime lacks dumbbell equipment')
dumbbell.isFixed=true
dumbbell.fixed=config.ladderKg.map(value=>({value,unit:'kg'}))
dumbbell.bar.kg.value=0
const fields=['initialized','load','target','fails','provenance','emergency','bridgeTarget','bridgeProvenance']
function nativeState(source) {
 const line=source.split('\n').find(x=>x.startsWith('Side Plank, Dumbbell'))
 const shape=line?.match(/2x1\s+(?:([\d.]+)kg\s+)?(\d+)s\|(\d+)s(?:\s+\/\s+([\d.]+)kg)?/)
 const saved=source.match(/progress: custom\(([^)]*)\)/)
 if(!shape||!saved) throw Error('Unable to read original native state')
 const kv=Object.fromEntries(saved[1].split(',').map(x=>x.trim().split(':').map(y=>y.trim())))
 const n=k=>Number(kv[k]?.replace('kg','')??0),bridge=n('bridgeTarget')
 return {initialized:n('initialized')===1,load:Number(shape[4]??shape[1]),target:Number(shape[2]),
  fails:n('fails'),provenance:n('newLoad')===1?'new':'established',
  emergency:n('emergency')===1,bridgeTarget:bridge||null,
  bridgeProvenance:bridge?(n('bridgeWasNew')===1?'new':'established'):null}
}
function actualNativeWorkout(source,durations) {
 const weeks=rt.PlannerProgram_evaluateText(source)
 const program={vtype:'program',id:'playground',name:'Playground',url:'',author:'',shortDescription:'',description:'',
  nextDay:1,exercises:[],days:[],weeks:[],isMultiweek:weeks.length>1,tags:[],clonedAt:Date.now(),
  planner:{vtype:'planner',name:'Playground',weeks}}
 const evaluated=Program_evaluate(program,settings)
 const stats=rt.defaultStats()
 let progress=Program_nextHistoryRecord(program,settings,stats,Program_getDayNumber(evaluated,1,1))
 if(progress.entries.length!==1||progress.entries[0].sets.length!==2) throw Error('Expected exactly two logical unilateral sets')
 const exercise=Program_getProgramExercise(progress.day,evaluated,progress.entries[0].programExerciseId)
 if(!exercise) throw Error('Original exercise not in program')
 const observations=[]
 for(let i=0;i<2;i++) {
  progress=Progress_completeSetAction(settings,stats,progress,{type:'CompleteSetAction',entryIndex:0,
   setIndex:i,mode:'workout',programExercise:exercise,otherStates:evaluated.states,
   isPlayground:true,forceUpdateEntryIndex:false,isExternal:false},undefined)
  progress=Progress_settleTimedSet(settings,stats,progress,0,i,'workout',durations[i],
   {programExercise:exercise,otherStates:evaluated.states,isPlayground:true})
  const set=progress.entries[0].sets[i]
  if(!set?.isCompleted||set.completedSetTimerLeft!==durations[i].left||
    set.completedSetTimer!==durations[i].right||!Number.isFinite(set.completedWeight?.value))
   throw Error('Native timed-set persistence lost one side or weight')
  observations.push({side:'L',completed:true,techniqueValid:true,
   weightKg:set.completedWeight.value,seconds:set.completedSetTimerLeft})
  observations.push({side:'R',completed:true,techniqueValid:true,
   weightKg:set.completedWeight.value,seconds:set.completedSetTimer})
 }
 const record=LiftohistorySerializer_serialize(progress,settings)
 if(!record.includes('Side Plank, Dumbbell / 2x1|1')) throw Error('Native history serializer lost unilateral set identity')
 const finished=Program_runAllFinishDayScripts(program,progress,stats,settings)
 if(!finished.program.planner) throw Error('Original native finish did not write planner')
 return {source:PlannerProgram_generateFullText(finished.program.planner.weeks),observations}
}

// 2 sets × 2 independent limbs. Every offset is seconds relative to prescribed time.
// Cases include each side failing on either set, repeated failures, emergency and bridge return.
const success=[[0,0],[0,0]]
const patterns=[
 ['initial',success],['left-extra',[[2,0],[0,1]]],['right-extra',[[0,3],[1,0]]],
 ['promotion',success],['first-right-miss',[[0,-2],[0,0]]],
 ['second-left-miss',[[0,0],[-2,0]]],['emergency-right-miss',[[0,-1],[0,0]]],
 ['bridge-step1',success],['bridge-step2',[[0,1],[2,0]]],
 ['bridge-step3',[[1,0],[0,2]]],['bridge-return',success],
 ['established-step1',success],['first-left-miss',[[-1,0],[0,0]]],
 ['second-right-miss',[[0,0],[0,-1]]],['time-recovery1',success],
 ['time-recovery2',[[0,1],[0,0]]],['time-recovery3',success],
 ['second-promotion',success],['second-load-miss',[[0,-2],[0,0]]],
 ['second-load-repeat-miss',[[0,0],[-2,0]]],['emergency-success',success],
 ['resumed-normal',[[1,0],[0,2]]],['late-bilateral-miss',[[-2,0],[0,-1]]],
 ['late-success',success]
]
const result={schema:'HYBRID2-TIMED-ORIGINAL-BILATERAL-NATIVE-1',
 originalSourceSha256,runtimeCommit,originalFitnessCommit:'9f2deb6c345643d7c0c793c52d358e496c2710d2',
 exercise:'Side Plank, Dumbbell',mode:'independent real original Left/Right completedSetTimerLeft/completedSetTimer',
 originalNativeWorkouts:0,physicalSideRecords:0,comparisons:0,failures:[],trace:[],
 settings:'isolated in-memory native kg dumbbell ladder matches published original source',
 accountWrites:0,originalSourceModified:false,backendWrites:0}
let model=initialTimedState(config)
for(const [index,[name,offsets]] of patterns.entries()) {
 const before=nativeState(currentSource)
 for(const key of fields) {
  result.comparisons++
  if(model[key]!==before[key]) result.failures.push({step:index+1,key,phase:'before',expected:model[key],got:before[key]})
 }
 const durations=offsets.map(([l,r])=>({left:Math.max(1,before.target+l),right:Math.max(1,before.target+r)}))
 const native=actualNativeWorkout(currentSource,durations)
 const oracle=evaluateTimedLoad({config,state:model,rows:native.observations})
 const after=nativeState(native.source)
 const issues=[]
 for(const key of fields) {
  result.comparisons++
  if(after[key]!==oracle.nextState[key]) {
   issues.push({key,expected:oracle.nextState[key],got:after[key]})
   result.failures.push({step:index+1,key,phase:'after',expected:oracle.nextState[key],got:after[key]})
  }
 }
 result.trace.push({ordinal:index+1,name,durations,reason:oracle.reason,
  actualSideRecords:native.observations.length,originalNativeRows:native.observations,
  beforeNativeState:before,nativeState:after,nativeSourceSha256:sha(native.source),mismatches:issues.length})
 result.originalNativeWorkouts++
 result.physicalSideRecords+=native.observations.length
 model=oracle.nextState
 currentSource=native.source
}
result.status=result.failures.length?'RED':'PASS_WITH_LIMITS'
if(sha(fs.readFileSync(sourceFile))!==originalSourceSha256) throw Error('Unexpected source file mutation')
fs.mkdirSync(output,{recursive:true,mode:0o700})
fs.writeFileSync(path.join(output,'timed-load-native-bilateral-sanitized.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600})
console.log(JSON.stringify({status:result.status,originalNativeWorkouts:result.originalNativeWorkouts,
 physicalSideRecords:result.physicalSideRecords,comparisons:result.comparisons,
 failures:result.failures,distinctReasons:[...new Set(result.trace.map(x=>x.reason))]},null,2))
if(result.failures.length) process.exitCode=1
