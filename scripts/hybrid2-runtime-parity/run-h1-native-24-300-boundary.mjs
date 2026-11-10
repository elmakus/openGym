#!/usr/bin/env node
// Additional independent 24-300 rep native Liftosaur execution from pinned original fitness H1 codegen.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { initialAnchor, observeAnchor, loadedRepScore } from '../../api/training-control/hybrid2/h1.js'
import { h1FromExposure } from '../../api/training-control/hybrid2/observation.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../..')
const runtimeRoot = process.env.LIFTOSAUR_RUNTIME_ROOT
const fitnessRoot = process.env.FITNESS_ROOT
if (!runtimeRoot || !fitnessRoot) {
  console.error('LIFTOSAUR_RUNTIME_ROOT and FITNESS_ROOT are required; no mocked fallback')
  process.exit(2)
}
const runtimeReadme = fs.readFileSync(path.join(runtimeRoot, 'README.txt'), 'utf8')
const runtimePin = 'ce75750bde4a190682fb5a6fa1984fc9184a9842'
const fitnessPin = '9f2deb6c345643d7c0c793c52d358e496c2710d2'
if (!runtimeReadme.includes(runtimePin)) throw Error('Liftosaur runtime pin differs from expected')
const rt = createRequire(import.meta.url)(path.join(runtimeRoot, 'runtime_api.cjs'))
const output = path.resolve(process.env.H2_PARITY_OUT || path.join(os.tmpdir(), 'hybrid2-h1-parity'))
fs.mkdirSync(output, { recursive: true })
const script = path.join(output, 'current-h1.generated.liftoscript')
const generatedManifest = JSON.parse(execFileSync('python3', [
  path.join(here, 'generate-current-h1.py'),
  '--fitness-root', fitnessRoot, '--out', script
], { encoding: 'utf8' }).trim())
const initialProgram = fs.readFileSync(script, 'utf8')
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex')
const approx = (x,y) => x === y || (Number.isFinite(x) && Number.isFinite(y) &&
  Math.abs(x-y) <= 0.01)
const kg = value => {
  if (typeof value === 'number') return value
  if (!value || typeof value !== 'object') throw Error('expected Liftosaur unit value')
  if (value.unit === 'kg') return value.value
  if (value.unit === 'lb') return value.value * 0.45359237
  throw Error('unhandled Liftosaur weight unit: ' + value.unit)
}
const projected = source => {
  const weeks = rt.PlannerProgram_evaluateText(source)
  const p = {vtype:'program',id:'h2test',name:'h2test',url:'',author:'',shortDescription:'',
    description:'',nextDay:1,exercises:[],days:[],weeks:[],
    isMultiweek:weeks.length>1,tags:[],clonedAt:0,
    planner:{vtype:'planner',name:'h2test',weeks}}
  const evaluated = rt.Program_evaluate(p,rt.settings)
  const s = evaluated.states?.['843']
  if (!s) throw Error('Liftosaur state tag 843 missing')
  return s
}
const norm = s => ({
  perf1:kg(s.perf1),perf2:kg(s.perf2),perf3:kg(s.perf3),
  perfCount:s.perfCount,perfReference:kg(s.perfReference),
  candidateGuard:s.candidateGuard,candidate:kg(s.candidate),
  auditWeak:s.auditWeak === 1,auditValid:s.auditValid === 1,
  auditReady:s.auditReady === 1,auditReset:s.auditReset === 1,
  auditGuardBefore:s.auditGuardBefore,
  auditRefBefore:kg(s.auditRefBefore),auditPerformance:kg(s.auditPerformance)
})
const input = (reps, weightLb) => {
  const commands = []
  if (weightLb !== undefined) commands.push(`change_weight(1,1,${weightLb}lb)`)
  if (reps !== null) commands.push(`change_reps(1,1,${reps})`, 'complete_set(1,1)')
  commands.push('finish_workout()')
  return commands
}
// Extended genuine runtime differential: new long-horizon and boundary scenarios only.
const ev = xs => xs.map(reps => ({reps}))
const suites = [
  {id:'H1_NEW_24_25_30_THEN_10', events:ev([10,10,10,24,10,25,10,30,10])},
  {id:'H1_NEW_50_100_THEN_10', events:ev([10,10,10,50,10,100,10])},
  {id:'H1_NEW_300_THEN_10', events:ev([10,10,10,300,10])},
  {id:'H1_NEW_19_TO_25', events:ev([19,20,21,22,23,24,25,19,10])}
]
const trace = [], divergences = []
let maxToleratedNumericDeltaKg = 0
let comparisons = 0, runtimeRuns = 0
for (const suite of suites) {
  let source=initialProgram, state=initialAnchor(), candidateLb=75
  for (const [index,event] of suite.events.entries()) {
    const previous = norm(projected(source))
    const weightLb = event.weightLb ?? 75
    const before = structuredClone(state)
    const beforeSourceSha256 = sha256(source)
    // Feed the actual native command's completed first set through the unchanged
    // openGym H1 observation adapter, rather than hardcoding its >20 predicate.
    // This input row is a command-to-openGym projection, not a serialized native set.
    const exposure={mode:'reps',performance:{sets: event.reps == null ? [] : [{
      role:'work',status:'completed',resistance:{kind:'external-load',value:weightLb,unit:'lb'},
      observations:[{metric:'repetitions',value:event.reps}]
    }]}}
    const mapped=h1FromExposure(exposure,{beforeCandidate:candidateLb,afterCandidate:candidateLb,baselineUnit:'lb'})
    const kind=mapped.kind
    const candidateRaised = event.reps === 12
    const performance=mapped.performance
    const jsObservation = observeAnchor(state, {
      kind,performance:kind==='COMPARABLE'?performance:null,candidateRaised
    })
    state=jsObservation.state
    const commands=input(event.reps, event.weightLb)
    const response=rt.Playground_run({programText:source,week:1,day:1,commands},
      rt.settings,rt.defaultStats())
    runtimeRuns++
    if (!response.success || typeof response.data?.updatedProgramText !== 'string')
      throw Error(`Liftosaur failed ${suite.id} step ${index}: ${JSON.stringify(response)}`)
    source=response.data.updatedProgramText
    const actual=norm(projected(source))
    const expected={
      perf1:state.perf1,perf2:state.perf2,perf3:state.perf3,
      perfCount:state.perfCount,perfReference:state.perfReference,
      candidateGuard:state.candidateGuard,
      auditWeak:jsObservation.weak,auditValid:jsObservation.validVote,
      auditReady:jsObservation.ready,auditReset:jsObservation.reset,
      auditGuardBefore:before.candidateGuard,
      auditRefBefore:before.perfReference
    }
    if (candidateRaised) candidateLb += 5
    const issues=[]
    for (const key of Object.keys(expected).filter(k => event.reps !== null || !k.startsWith('audit'))) {
      comparisons++
      const eq = typeof expected[key]==='number' && !Number.isInteger(expected[key])
        ? approx(actual[key], expected[key]) :
        ['perf1','perf2','perf3','perfReference','auditRefBefore'].includes(key)
          ? approx(actual[key],expected[key]) : actual[key]===expected[key]
      if (!eq) issues.push({field:key,original:actual[key],openGym:expected[key]})
      else if (['perf1','perf2','perf3','perfReference','auditRefBefore'].includes(key))
        maxToleratedNumericDeltaKg = Math.max(maxToleratedNumericDeltaKg, Math.abs(actual[key]-expected[key]))
    }
    const row={
      id:suite.id,step:index+1,input:{...event,commands},kind,
      voteObservable:event.reps !== null,
      previous:{liftosaur:previous,openGym:before},expected,
      liftosaur:actual,openGym:expected,issues,
      previousProgramSha256:beforeSourceSha256,nextProgramSha256:sha256(source)
    }
    trace.push(row)
    if (issues.length) divergences.push({
      scenarioId:suite.id,step:index+1,sourceCommit:fitnessPin,
      runtimeCommit:runtimePin,kind:'serialization / observation adapter / algorithm',
      ...row
    })
  }
}
const result={schema:'HYBRID2-REAL-LIFTOSAUR-H1-24-300-DIFF-1',sourceCommit:fitnessPin,
  runtimeCommit:runtimePin, openGymBase:'8529b2d41b28fea8ae96a50325aaf28e864a0160',
  provenance:generatedManifest,
  coverage:'Original current H1 seam + promotion observation setup in exact Git-pinned Liftosaur runtime; NOT a full HYBRID-2 plan, nor ATP2/Turbo integration',
  scenarios:suites.length,runtimeRuns,comparisons,unitToleranceKg:0.01,
  maxToleratedNumericDeltaKg,passingSteps:trace.length-divergences.length,
  failingSteps:divergences.length,firstDivergence:divergences[0]??null,
  trace,divergences}
const sourceHashes=generatedManifest.sourceSha256||{}
if(sourceHashes['hybrid2_promotion_materializer.py']!=='493839d999795a7ba21e17026fca027dea9c192721d905428a0d38cc2edbe655' ||
  sourceHashes['hybrid2_h1_liftosaur_codegen.py']!=='c38004d7f0bd53ce3994ae15675bb6cc8205109accaf378cc675d662ae9f3b8c')
  throw Error('Original fitness source pin drifted')
fs.writeFileSync(path.join(output,'h1-native-24-300-full-private.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600})
const safe={
  schema:'HYBRID2-ORIGINAL-NATIVE-H1-BOUNDARY-24-300-1',
  fitnessCommit:fitnessPin,runtimeCommit:runtimePin,productionOpenGymCommit:result.openGymBase,
  originalFitnessSha256:sourceHashes,generatedLiftoscriptSha256:generatedManifest.generatedSha256,
  newOriginalNativeWorkouts:runtimeRuns,scenarios:suites.length,
  comparisons, discrepancyFields:divergences.reduce((n,r)=>n+r.issues.length,0),
  discrepancyWorkoutSteps:divergences.length,
  comparativeSteps:trace.length,
  protocol:'Original fitness Python H1 generator -> pinned real Liftosaur Playground_run complete_set + finish_workout -> updatedProgramText native state readback; unchanged openGym h1FromExposure projection from issued completed-set commands -> observeAnchor',
  nativeSerializationOfCompletedSet:'not extracted: command projection only',
  newNativeRunsPriorOverlap:false,
  extremeExerciseInputScope:"24-300; source generator unchanged; no claim that this is a supported production operating range",
  trace:trace.map(r=>({scenario:r.id,step:r.step,reps:r.input.reps,
    openGymKind:r.kind,nativeAuditValid:r.liftosaur.auditValid,
    openGymAuditValid:r.expected.auditValid,nativePerfCount:r.liftosaur.perfCount,
    openGymPerfCount:r.expected.perfCount,
    mismatchFields:r.issues.map(x=>x.field),
    nativeProgressChanged:r.liftosaur.perf1!==r.previous.liftosaur.perf1||
      r.liftosaur.perf2!==r.previous.liftosaur.perf2||
      r.liftosaur.perf3!==r.previous.liftosaur.perf3}))
}
safe.classification=divergences.length?'ORIGINAL_FITNESS_VS_OPENGYM_CONTRACT_RED':'PASS'
fs.writeFileSync(path.join(output,'h1-native-24-300-sanitized.json'),JSON.stringify(safe,null,2)+'\n',{mode:0o600})
console.log(JSON.stringify({outcome:safe.classification,scenarios:safe.scenarios,
  nativeWorkouts:safe.newOriginalNativeWorkouts,comparisons:safe.comparisons,
  mismatchWorkoutSteps:safe.discrepancyWorkoutSteps,mismatchFields:safe.discrepancyFields,
  byReps:Object.groupBy(safe.trace,r=>String(r.reps))&&Object.entries(Object.groupBy(safe.trace,r=>String(r.reps))).map(([reps,a])=>({
    reps,count:a.length,red:a.filter(r=>r.mismatchFields.length).length,nativeAuditValid:a.filter(r=>r.nativeAuditValid).length,
    openGymAuditValid:a.filter(r=>r.openGymAuditValid).length
  }))},null,2))
if (divergences.length) process.exitCode=1
