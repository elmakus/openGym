#!/usr/bin/env node
// End-to-end validation of a REAL Python-generated M6 candidate against native
// Liftosaur; never invokes JavaScript source overlays or a connected account.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const here=path.dirname(fileURLToPath(import.meta.url))
const script=path.join(here,'run-current-marta-rtt-source-fixed.mjs')
const root=process.env.PRIVATE_LIVE_ROOT
const generator=process.env.M6_PYTHON_GENERATOR
const runtime=process.env.LIFTOSAUR_RUNTIME_ROOT
const fitness=process.env.FITNESS_ROOT
const out=process.env.H2_PARITY_OUT
if(!root||!generator||!runtime||!fitness||!out)
 throw Error('PRIVATE_LIVE_ROOT, M6_PYTHON_GENERATOR, FITNESS_ROOT, LIFTOSAUR_RUNTIME_ROOT, H2_PARITY_OUT are mandatory')
const pins=[
 {input:'qtwbbqff.liftoscript',output:'m6-normal',sha:'7b1c7d114229b4d1cf86093409d7d89ae4e7d88e6a0c1c4c89bcba30a4a425df'},
 {input:'qtwbbqff-queued-native.liftoscript',output:'m6-queued',sha:'b1f481de1385292b63ae12d7873c37f386e5f521c4807b89bfa503c8ddaa89e5'}
]
const sha=s=>crypto.createHash('sha256').update(s).digest('hex')
if(fs.existsSync(out)&&fs.readdirSync(out).length)
 throw Error('H2_PARITY_OUT must be fresh and empty: refuse overwrite')
fs.mkdirSync(out,{recursive:true,mode:0o700})
const tmp=fs.mkdtempSync(path.join(process.env.M6_CANDIDATE_TMP||os.tmpdir(),'m6-generated-native-'))
fs.chmodSync(tmp,0o700)
const spawned=(label,cmd,args,env)=> {
 const r=spawnSync(cmd,args,{cwd:here,encoding:'utf8',env:{...process.env,...env},maxBuffer:6*1024*1024})
 // Logs on the authorized machine only. No private program text in summary.
 fs.writeFileSync(path.join(out,'private-'+label+'.log'),(r.stdout||'')+'\n'+(r.stderr||''),{mode:0o600})
 if(r.status!==0)throw Error(label+' failed; inspect the local private log')
 return r
}
try {
 const generated={}
 for(const pin of pins) {
  const input=path.join(root,pin.input)
  if(sha(fs.readFileSync(input))!==pin.sha)throw Error('Original M6 source pin changed; refuse to generate')
  const output=path.join(tmp,pin.output+'-fixed.liftoscript')
  const manifest=path.join(tmp,pin.output+'.json')
  spawned('python-'+pin.output,process.env.PYTHON||'python3',[
   generator,'--input',input,'--expected-sha256',pin.sha,
   '--output',output,'--manifest',manifest
  ])
  const m=JSON.parse(fs.readFileSync(manifest,'utf8'))
  if(m.merged_overrides!==29 ||m.original_sha256!==pin.sha ||
     m.candidate_sha256!==sha(fs.readFileSync(output)) ||
     !m.version?.includes('M6-H1-STALE-ENTRY-BARRIER-1'))
    throw Error('Generated M6 identity, shape or digest mismatch')
  generated[pin.output]={originalSha256:pin.sha,candidateSha256:m.candidate_sha256,
    mergedOverrides:m.merged_overrides}
 }
 spawned('actual-native',process.execPath,[script],{
  M6_GENERATED_CANDIDATE_DIR:tmp,H2_PARITY_OUT:out
 })
 const r=JSON.parse(fs.readFileSync(path.join(out,'rtt-source-fixed-sanitized.json'),'utf8'))
 if(r.nativeFinishedWorkouts!==29||r.nativeSetProbes!==48||
    r.comparisons!==688||r.failureCount!==0||
    r.pin.fusedInitialSha256!==generated['m6-normal'].candidateSha256 ||
    r.pin.fusedQueuedSha256!==generated['m6-queued'].candidateSha256)
  throw Error('Genuine native runner did not confirm both compiled candidate SHA-256 values and 688 checks')
 const summary={
  schema:'FITNESS-PYTHON-M6-SOURCE-COMPILED-NATIVE-1',
  status:'SOURCE_GENERATOR_NATIVE_PASS_NOT_DEPLOYED',
  sourceGenerator:'fitness:fix/m6-rtt-centralized-h1-persistence',
  sourceGeneratorSha256:sha(fs.readFileSync(generator)),
  realNativeRuntimeCommit:'ce75750bde4a190682fb5a6fa1984fc9184a9842',
  compiledCandidates:generated,
  sourceGeneratedBy:'Python real candidate compiler, not JS source overlay',
  nativeFinishWorkoutExecutions:r.nativeFinishedWorkouts,
  nativeSetProbeExecutions:r.nativeSetProbes,
  comparisons:r.comparisons,failures:r.failureCount,
  fields:['NORMAL inherited Adaptive','RTT INTRO','queued-to-active deload',
    'H1 stale shared-state barrier','post-deload relearning'],
  accountWrites:0,originalFilesMutated:false,privateCandidateCommitted:false,
  deployment:'none; validation branch only'
 }
 fs.writeFileSync(path.join(out,'fitness-python-m6-native-sanitized.json'),
   JSON.stringify(summary,null,2)+'\n',{mode:0o600})
 console.log(JSON.stringify(summary,null,2))
} finally {
 fs.rmSync(tmp,{recursive:true,force:true})
}
