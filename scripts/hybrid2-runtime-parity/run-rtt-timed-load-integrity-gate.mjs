#!/usr/bin/env node
// Deliberately pairs the source-negative control, positive source-only RTT
// composition and real openGym Timed Load HTTP test. Private pinned sources
// never leave the authorized host and no account/deployment changes occur.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const here=path.dirname(fileURLToPath(import.meta.url))
const repo=path.resolve(here,'../..')
const { FITNESS_ROOT,LIFTOSAUR_RUNTIME_ROOT,PRIVATE_LIVE_ROOT,H2_PARITY_OUT }=process.env
if(!FITNESS_ROOT || !LIFTOSAUR_RUNTIME_ROOT || !PRIVATE_LIVE_ROOT || !H2_PARITY_OUT)
  throw Error('Pinned FITNESS_ROOT, LIFTOSAUR_RUNTIME_ROOT, PRIVATE_LIVE_ROOT and isolated H2_PARITY_OUT required')
const sha=b=>crypto.createHash('sha256').update(b).digest('hex')
const originalSha='7b1c7d114229b4d1cf86093409d7d89ae4e7d88e6a0c1c4c89bcba30a4a425df'
assert.equal(sha(fs.readFileSync(path.join(PRIVATE_LIVE_ROOT,'qtwbbqff.liftoscript'))),originalSha,
  'Only the pinned current M6 source is authorized for this validation')
assert.match(fs.readFileSync(path.join(LIFTOSAUR_RUNTIME_ROOT,'README.txt'),'utf8'),
  /ce75750bde4a190682fb5a6fa1984fc9184a9842/)
const subdirs={unmodified:'original-source-negative',variant:'source-only-positive',timed:'timed-real-http'}
if(fs.existsSync(H2_PARITY_OUT) && fs.readdirSync(H2_PARITY_OUT).length)
  throw Error('Output root must be a fresh empty directory to prevent accidental evidence replacement')
fs.mkdirSync(H2_PARITY_OUT,{recursive:true,mode:0o700})
const run=(label,script)=>{
 const output=path.join(H2_PARITY_OUT,subdirs[label])
 fs.mkdirSync(output,{recursive:true,mode:0o700})
 const args=label==='timed'?['--test',path.join(repo,'api/test/timed-load-real-http-restart.test.js')]:
   [path.join(here,script)]
 const r=spawnSync(process.execPath,args,{
   cwd:repo,env:{...process.env,H2_PARITY_OUT:output},encoding:'utf8',maxBuffer:6*1024*1024
 })
 // Logs stay on the private host. Sanitized summary lists only result counts.
 const log=path.join(H2_PARITY_OUT,'private-'+label+'.log')
 fs.writeFileSync(log,(r.stdout||'')+'\n'+(r.stderr||''),{mode:0o600})
 if(r.status!==0)throw Error(label+' runner failed; inspect private log on authorized machine')
 return output
}
const read=(dir,name)=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'))
const neg=read(run('unmodified','run-current-marta-rtt-causal.mjs'),'real-marta-rtt-shadow-causal-raw.json')
assert.equal(neg.provenance.freshReadOnlySourceSha256,originalSha)
assert.equal(neg.failures,0,'causal harness must not have unexpected assertion errors')
assert.equal(neg.variants.length,3)
const [broken,first,all]=neg.variants
assert.equal(broken.id,'ORIGINAL_READONLY')
assert.equal(broken.removedRTTOverrides,0)
assert.equal(broken.firstWorkout.nativeController.deloadQueued,1)
assert.equal(broken.firstWorkout.nativeController.deloadActive,0)
assert.equal(broken.firstWorkout.nativeController.deloadStarted,0)
assert.equal(first.removedRTTOverrides,1)
assert.equal(first.firstWorkout.nativeController.deloadActive,1)
assert.equal(all.removedRTTOverrides,29)
assert.equal(all.firstWorkout.nativeController.deloadActive,1)
assert.equal(all.deloadDays.length,3)

const good=read(run('variant','run-current-marta-rtt-source-fixed.mjs'),'rtt-source-fixed-sanitized.json')
assert.equal(good.pin.originalSourceSha256,originalSha)
assert.equal(good.pin.runtime,'ce75750bde4a190682fb5a6fa1984fc9184a9842')
assert.equal(good.pin.privateOriginalPublished,false)
assert.equal(good.pin.accountWrites,0)
assert.equal(good.nativeFinishedWorkouts,29)
assert.equal(good.nativeSetProbes,48)
assert.equal(good.comparisons,688)
assert.equal(good.failureCount,0)
assert.equal(good.experiments[0].mergedOccurrenceOverrides,29)
assert.equal(good.experiments[0].originalSourceUntouched,true)

const timed=read(run('timed'),'timed-load-real-http-sanitized.json')
assert.equal(timed.status,'PASS')
assert.equal(timed.originalOracleFixtureCases,4976)
assert.equal(timed.matchedFrozenPythonOracleTransitions,12)
assert.equal(timed.syntheticSessions,13)
assert.equal(timed.physicalTimedRows,52)
assert.equal(timed.apiRequests,31)
assert.equal(timed.apiWrites,15)
assert.equal(timed.apiReads,16)
assert.equal(timed.actualBackendRestarts,2)
assert.equal(timed.noNativeRuntimeEquivalenceClaimed,true)
assert.equal(timed.noProductionOrPersonalDataTouched,true)

const summary={
  schema:'HYBRID2-RTT-NEGATIVE-AND-TIMED-HTTP-GATE-1',
  date:'2026-11-10',
  verdict:'EXPECTED_ORIGINAL_RTT_RED__SOURCE_ONLY_VARIANT_PASS__TIMED_HTTP_PASS',
  sourceOriginalSha256:originalSha,
  runtimePin:good.pin.runtime,
  originalFitnessPin:good.pin.fitness,
  provenance:'original native source pin and settings frozen on authorized host, no source/account publication',
  negativeOriginalM6:{
    classification:'EXPECTED_RED_FOR_ORIGINAL_M6_QUEUE_TO_DELOAD',
    finishedNativeWorkoutsInCausalRun:neg.nativeFinishedWorkouts,
    comparisons:neg.comparedFields,
    unexpectedHarnessFailures:neg.failures,
    queuedAfterNextWorkout:broken.firstWorkout.nativeController.deloadQueued,
    activeAfterNextWorkout:broken.firstWorkout.nativeController.deloadActive,
    firstOverrideRemovedDiagnosticStarts:first.firstWorkout.nativeController.deloadActive===1,
    removedAllOverridesDiagnosticStarts:all.firstWorkout.nativeController.deloadActive===1
  },
  correctedSourceOnlyM6:{
    classification:'SOURCE_VARIANT_PASS_NOT_DEPLOYED',
    nativeFinishExecutions:good.nativeFinishedWorkouts,
    nativeSetAccessProbes:good.nativeSetProbes,
    comparisons:good.comparisons,
    unexpectedDifferences:good.failureCount,
    unchangedOriginalRuntime:true
  },
  timedLoadHTTP:{
    classification:'PASS_WITH_FROZEN_PYTHON_ORACLE',
    oracleFixtureCases:timed.originalOracleFixtureCases,
    individuallyOracleMatchedTransitions:timed.matchedFrozenPythonOracleTransitions,
    syntheticSessions:timed.syntheticSessions,
    physicalTimedRows:timed.physicalTimedRows,
    realHTTPRequests:timed.apiRequests,
    acceptedWrites:timed.apiWrites,
    reads:timed.apiReads,
    realBackendRestarts:timed.actualBackendRestarts,
    genuinelyNativeLiftosaurTimedLoadComparison:false
  },
  limits:[
    'The RTT source fix is applied only in memory to a private test variant, never to the original account',
    'M6 unmodified queued→deload is an expected RED and cannot be reclassified using source-only variant results',
    'Timed Load comparison is anchored to the frozen Python oracle, not to a native Liftosaur Timed Load exercise',
    'No full unmodified original M6 combined Liftosaur→HTTP→two-device parity claimed',
    'Private source text, training values, equipment and test database secrets are not exported',
    'No original source, production branch, active account or workout history modified'
  ]
}
const file=path.join(H2_PARITY_OUT,'rtt-timed-load-gate-sanitized.json')
fs.writeFileSync(file,JSON.stringify(summary,null,2)+'\n',{mode:0o600})
console.log(JSON.stringify({
  verdict:summary.verdict,
  originalRTT:summary.negativeOriginalM6,
  correctedRTT:summary.correctedSourceOnlyM6,
  timedHTTP:summary.timedLoadHTTP
},null,2))
