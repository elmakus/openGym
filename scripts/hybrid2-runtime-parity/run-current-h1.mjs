#!/usr/bin/env node
// Real Liftosaur execution, from original fitness H1 codegen; no simulated Liftosaur.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { initialAnchor, observeAnchor, loadedRepScore } from '../../api/training-control/hybrid2/h1.js'

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
  Math.abs(x-y) <= 0.32)
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
const suites = [
  {id:'H1_STABLE', events:[10,10,10,10,10,10].map(reps=>({reps}))},
  {id:'H1_WEAK_EQUALITY', events:[10,10,10,8,8,8].map(reps=>({reps}))},
  {id:'H1_SLOW_DECLINE', events:[10,10,10,9,9,8,8,7,7,7].map(reps=>({reps}))},
  {id:'H1_ASCENDING', events:[10,10,10,11,11,11,12,11].map(reps=>({reps}))},
  {id:'H1_CANDIDATE_GUARD', events:[
    {reps:10},{reps:10},{reps:10},{reps:12},{reps:5,weightLb:80},{reps:5,weightLb:80}]},
  {id:'H1_MISSING_INVALID',events:[{reps:10},{reps:10},{reps:10},{reps:null},{reps:1},{reps:10}]},
  {id:'H1_MANUAL_LOAD_CHANGE',events:[{reps:10},{reps:10},{reps:10},{reps:10,weightLb:80},{reps:10}]},
  {id:'H1_UNSUPPORTED_GT20',events:[{reps:10},{reps:10},{reps:10},{reps:21},{reps:22},{reps:10}]}
]
const trace = [], divergences = []
let comparisons = 0, runtimeRuns = 0
for (const suite of suites) {
  let source=initialProgram, state=initialAnchor(), candidateLb=75
  for (const [index,event] of suite.events.entries()) {
    const previous = norm(projected(source))
    const weightLb = event.weightLb ?? 75
    const before = structuredClone(state)
    const beforeSourceSha256 = sha256(source)
    const kind = event.reps === null ? 'MISSING' :
      event.reps === 1 ? 'INVALID' :
      weightLb !== candidateLb ? 'DISCONTINUITY' :
      event.reps > 20 ? 'INDETERMINATE' : 'COMPARABLE'
    const candidateRaised = event.reps === 12
    const performance = event.reps === null ? null :
      loadedRepScore(weightLb*0.45359237,event.reps)
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
const result={schema:'HYBRID2-REAL-LIFTOSAUR-H1-DIFF-1',sourceCommit:fitnessPin,
  runtimeCommit:runtimePin, openGymBase:'8529b2d41b28fea8ae96a50325aaf28e864a0160',
  provenance:generatedManifest,
  coverage:'Original current H1 seam + promotion observation setup in exact Git-pinned Liftosaur runtime; NOT a full HYBRID-2 plan, nor ATP2/Turbo integration',
  scenarios:suites.length,runtimeRuns,comparisons,passingSteps:trace.length-divergences.length,
  failingSteps:divergences.length,firstDivergence:divergences[0]??null,
  trace,divergences}
fs.writeFileSync(path.join(output,'h1-differential.json'),JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify({scenarios:result.scenarios,runtimeRuns,comparisons,
  passingSteps:result.passingSteps,failingSteps:result.failingSteps,
  discrepancies:divergences.map(x=>({scenario:x.scenarioId,step:x.step,issues:x.issues}))},null,2))
if (divergences.length) process.exitCode=1
