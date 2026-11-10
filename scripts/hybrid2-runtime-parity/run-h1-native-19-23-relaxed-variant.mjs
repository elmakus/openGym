#!/usr/bin/env node
// Run pinned original Liftosaur H1 native boundary harness against a validation-only observer.
// Unmodified production H1 adapter still rejects >20; this is an isolated parity experiment.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const here=path.dirname(fileURLToPath(import.meta.url))
const sha=s=>crypto.createHash('sha256').update(s).digest('hex')
const observer=path.join(here,'../../api/training-control/hybrid2/observation.js')
const harness=path.join(here,'run-h1-native-19-23-boundary.mjs')
const original=fs.readFileSync(observer,'utf8')
const originalSha=sha(original)
const candidate='  if (first.reps > H1_SUPPORTED_REPS_UPPER) return bare(\'INDETERMINATE\', raised)\n'
assert.equal(original.split(candidate).length,2,'Pinned original >20 condition changed')
const altered=original.replace(candidate,'  // Validation: Liftosaur native includes 21, 22, 23 reps in H1 when otherwise comparable.\n')
const oldHarness=fs.readFileSync(harness,'utf8')
const originalImport="from '../../api/training-control/hybrid2/observation.js'"
assert.equal(oldHarness.split(originalImport).length,2)
const observerName='observation-h1-variant-'+process.pid+'.mjs'
const harnessName='run-h1-native-19-23-replay-'+process.pid+'.mjs'
const temporaryObserver=path.join(path.dirname(observer),observerName)
const temporaryHarness=path.join(here,harnessName)
const adapted=oldHarness.replace(originalImport,"from '../../api/training-control/hybrid2/"+observerName+"'")
const output=path.resolve(process.env.H2_PARITY_OUT||'/tmp/hybrid2-relaxed-variant')
fs.mkdirSync(output,{recursive:true})
let printed
fs.writeFileSync(temporaryObserver,altered,{mode:0o600})
fs.writeFileSync(temporaryHarness,adapted,{mode:0o600})
try {
  printed=execFileSync(process.execPath,[temporaryHarness],{
    env:{...process.env,H2_PARITY_OUT:output},encoding:'utf8',timeout:180000,maxBuffer:8*1024*1024
  })
}finally{
  fs.rmSync(temporaryHarness,{force:true})
  fs.rmSync(temporaryObserver,{force:true})
}
const r=JSON.parse(fs.readFileSync(path.join(output,'h1-native-19-23-sanitized.json'),'utf8'))
assert.equal(r.newOriginalNativeWorkouts,28)
assert.equal(r.comparisons,336)
const result={
  schema:'HYBRID2-H1-RELAXED-REPS-VARIANT-1',
  originals:{openGymObserverSha256:originalSha,isolatedObserverSha256:sha(altered)},
  workoutScope:'Repeated same 28 original native boundary test sequences (not new independent scenarios)',
  nativeLiftosaurRuns:r.newOriginalNativeWorkouts,
  nativeComparisonFields:r.comparisons,
  stepsWithDifferences:r.discrepancyWorkoutSteps,
  discrepantFields:r.discrepancyFields,
  outcome:r.discrepancyWorkoutSteps===0?'SOURCE_OVERLAY_PASS':'RED',
  nativeSerializedFirstSet:'command-projected, not serializer-extracted',
  limitations:'Unbounded 300+ reps outside original normal envelope not validated. No shipped code, actual profile history, or production writes.',
  byReps:Object.entries(Object.groupBy(r.trace,x=>String(x.reps))).map(([reps,rows])=>({
    reps:Number(reps),nativeWorkouts:rows.length,
    originalNativeAuditVotes:rows.filter(x=>x.nativeAuditValid).length,
    variantAuditVotes:rows.filter(x=>x.openGymAuditValid).length,
    redSteps:rows.filter(x=>x.mismatchFields.length).length
  })).sort((a,b)=>a.reps-b.reps)
}
fs.writeFileSync(path.join(output,'h1-relaxed-reps-variant-sanitized.json'),JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify({result,sourceRunnerOutput:printed.trim().slice(0,1500)},null,2))
if(result.outcome!=='SOURCE_OVERLAY_PASS')process.exitCode=1
