#!/usr/bin/env node
// Real frozen fitness get_program intake (private local copy) -> approved-target
// Python preflight -> full candidate -> unchanged original Liftosaur native run.
// No external account calls or source patches during this execution.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

const here=path.dirname(fileURLToPath(import.meta.url))
const preflight=process.env.M6_PYTHON_PREFLIGHT
const originalDir=process.env.PRIVATE_LIVE_ROOT
const frozenFitness=process.env.FITNESS_ROOT
const nativeRoot=process.env.LIFTOSAUR_RUNTIME_ROOT
const output=process.env.H2_PARITY_OUT
for(const [key,value] of Object.entries({M6_PYTHON_PREFLIGHT:preflight,
 PRIVATE_LIVE_ROOT:originalDir,FITNESS_ROOT:frozenFitness,
 LIFTOSAUR_RUNTIME_ROOT:nativeRoot,H2_PARITY_OUT:output})){
 if(!value)throw Error('Required explicit '+key)
}
if(fs.existsSync(output)&&fs.readdirSync(output).length)
 throw Error('Output path must be fresh or empty')
fs.mkdirSync(output,{recursive:true,mode:0o700})
const sourcePins=[
 {path:'qtwbbqff.liftoscript',prefix:'m6-normal',
  sha:'7b1c7d114229b4d1cf86093409d7d89ae4e7d88e6a0c1c4c89bcba30a4a425df'},
 {path:'qtwbbqff-queued-native.liftoscript',prefix:'m6-queued',
  sha:'b1f481de1385292b63ae12d7873c37f386e5f521c4807b89bfa503c8ddaa89e5'}
]
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex')
const tmp=fs.mkdtempSync(path.join(process.env.M6_CANDIDATE_TMP||os.tmpdir(),'m6-preflight-native-'))
fs.chmodSync(tmp,0o700)
const spawn=(label,executable,args,env={})=>{
 const proc=spawnSync(executable,args,{cwd:here,encoding:'utf8',maxBuffer:6*1024*1024,
  env:{...process.env,...env}})
 fs.writeFileSync(path.join(output,'private-'+label+'.log'),
  (proc.stdout||'')+'\n'+(proc.stderr||''),{mode:0o600})
 if(proc.status!==0)throw Error(label+' command failed; see private log on authorized host')
}
try {
 const artifacts={}
 for(const pin of sourcePins){
  const raw=fs.readFileSync(path.join(originalDir,pin.path))
  if(sha(raw)!==pin.sha)throw Error('Frozen original M6 bytes differ from declared pin')
  // Mimic the exact data shape of a fresh, read-only Liftosaur get_program
  // response without making any external API request.
  const getProgram=path.join(tmp,pin.prefix+'-get-program.json')
  const payload={id:'qtwbbqff',name:'Marta - Hypertrophy A-B-C v2',text:raw.toString('utf8')}
  fs.writeFileSync(getProgram,JSON.stringify(payload),{mode:0o600})
  const candidate=path.join(tmp,pin.prefix+'-fixed.liftoscript')
  const manifest=path.join(tmp,pin.prefix+'.json')
  spawn('preflight-'+pin.prefix,process.env.PYTHON||'python3',[
   preflight,'--fresh-get-program-json',getProgram,
   '--expected-source-sha256',pin.sha,
   '--candidate-output',candidate,'--manifest-output',manifest
  ],{PYTHONPATH:[path.dirname(preflight),path.join(frozenFitness,'programs'),
      process.env.PYTHONPATH||''].join(path.delimiter)})
  const m=JSON.parse(fs.readFileSync(manifest,'utf8'))
  if(m.target_program_id!=='qtwbbqff'||m.occurrence_count!==36||
     m.merged_overrides!==29||m.account_writes!==0||
     m.original_sha256!==pin.sha||m.candidate_sha256!==sha(fs.readFileSync(candidate))||
     !m.source_generator?.includes('M6-H1-STALE-ENTRY-BARRIER-1'))
   throw Error('Python preflight target, topology or digest guard failed')
  artifacts[pin.prefix]={...m}
 }
 // The existing native test accepts this directory as an already-generated
 // candidate. It does NOT call the JavaScript RTT/H1 source transforms.
 spawn('direct-original-native',process.execPath,
  [path.join(here,'run-current-marta-rtt-source-fixed.mjs')],{
    M6_GENERATED_CANDIDATE_DIR:tmp,H2_PARITY_OUT:output
  })
 const r=JSON.parse(fs.readFileSync(path.join(output,'rtt-source-fixed-sanitized.json'),'utf8'))
 if(r.nativeFinishedWorkouts!==29||r.nativeSetProbes!==48||r.comparisons!==688||
    r.failureCount!==0||
    r.pin.fusedInitialSha256!==artifacts['m6-normal'].candidate_sha256||
    r.pin.fusedQueuedSha256!==artifacts['m6-queued'].candidate_sha256)
   throw Error('Original-native execution did not verify both fresh-preflight candidates')
 const report={
  schema:'M6-LIVE-INTAKE-READONLY-PREFLIGHT-NATIVE-1',
  status:'READ_ONLY_PREPARE_AND_ORIGINAL_NATIVE_PASS',
  inputProvenance:'Private frozen get_program-shaped input; NOT actual live API response',
  fitnessSourceBranch:'fix/m6-rtt-centralized-h1-persistence',
  preflightSourceSHA256:sha(fs.readFileSync(preflight)),
  originalRuntimeCommit:'ce75750bde4a190682fb5a6fa1984fc9184a9842',
  candidates:Object.fromEntries(Object.entries(artifacts).map(([k,v])=>
    [k,{inputSha256:v.original_sha256,candidateSha256:v.candidate_sha256,
      topologySha256:v.topology_sha256,occurrences:v.occurrence_count,
      normalizedOverrides:v.merged_overrides}])),
  directOriginalNativeWorkouts:r.nativeFinishedWorkouts,
  nativeSetProbes:r.nativeSetProbes,
  fieldComparisons:r.comparisons,
  mismatches:r.failureCount,
  programAccountWrites:0,
  sourceCodeOverlaysDuringNativeRun:false,
  privateSourceFilesCommitted:false,
  actualLiveGetProgramCalled:false,
  deployed:false
 }
 fs.writeFileSync(path.join(output,'fitness-preflight-m6-native-sanitized.json'),
  JSON.stringify(report,null,2)+'\n',{mode:0o600})
 console.log(JSON.stringify(report,null,2))
}finally{
 fs.rmSync(tmp,{recursive:true,force:true})
}
