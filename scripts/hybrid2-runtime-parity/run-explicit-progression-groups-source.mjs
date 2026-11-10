#!/usr/bin/env node
// Validation-only source-overlay test. Exercises unchanged Engine v2 start/finish/replay.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { defaultPlanRule } from '../../api/engine/index.js'
import { replayProgression, resolveProgressionContext } from '../../api/engine/context.js'
import { contentHash } from '../../api/engine/canonical.js'
import { buildSessionExposures as unchangedStart } from '../../frontend/src/lib/session-start.js'
import { entriesForExposures } from '../../frontend/src/lib/session-ui-adapter.js'
import { buildCompletedSession } from '../../frontend/src/lib/finish-session.js'
import { validateProgressionGroups, resolveValidationTrackId, resolveValidationHistory } from './progression-groups-validation.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const frontendSource = path.resolve(here, '../../frontend/src/lib/session-start.js')
const source = fs.readFileSync(frontendSource, 'utf8')
const sha = data => crypto.createHash('sha256').update(data).digest('hex')
if (sha(source) !== 'f8d0575f047e04155531aab00a536f7f97ff1e0267cac2413c5919d3c6310ed1')
  throw Error('Unpinned original openGym session-start.js')
const needle = 'const trackId = occ.occurrenceId'
assert.equal(source.split(needle).length, 2)
const overlay = source.replace(
  "import { currentOneRm,",
  "import { resolveValidationTrackId, resolveValidationAcrossRoutines, resolveValidationHistory } from '../../../scripts/hybrid2-runtime-parity/progression-groups-validation.mjs'\nimport { currentOneRm,"
).replace(needle, 'const trackId = resolveValidationTrackId(stored, original, hybrid)')
 .replace("acrossRoutines: lastAcrossRoutines(profile) && !(occ.rule && operatorFor(planPhase(occ.rule), 'difficulty'))",
  "acrossRoutines: resolveValidationAcrossRoutines(stored, original, hybrid, lastAcrossRoutines(profile) && !(occ.rule && operatorFor(planPhase(occ.rule), 'difficulty')))")
 .replace('workouts: history.workouts, prescriptions: profile.prescriptions',
  'workouts: resolveValidationHistory(stored, original, hybrid, trackId, history.workouts), prescriptions: profile.prescriptions')
const temp = path.join(path.dirname(frontendSource), 'session-start-explicit-groups-' + process.pid + '.mjs')
let groupedStart
fs.writeFileSync(temp, overlay, {mode:0o600})
try { ({buildSessionExposures:groupedStart} = await import(pathToFileURL(temp).href)) }
finally { fs.unlinkSync(temp) }

const BENCH = '0025', other = '0001'
const counts = { assertions:0, sessions:0, completed:0, groups:0, negativeControls:0, failures:[] }
const check = (name, fn) => {
  counts.assertions++
  try { fn() } catch(e) { counts.failures.push({name,error:String(e.message).slice(0,200)}) }
}
const reject = (name, profile, reason) => {
  check(name, () => assert.throws(()=>validateProgressionGroups(profile),reason))
  counts.negativeControls++
}
const rule = (rid, exerciseId, reps={min:6,max:8}, preset='linear', sets=2) =>
  defaultPlanRule(preset,{id:'rule-'+rid+'-'+exerciseId,exerciseId,routineId:rid,completion:[],target:{mode:'none'},
    sets:{min:sets,max:sets},reps,load:{mode:'absolute',value:100,unit:'kg'}})
const occ = (id,rid,exerciseId,reps,preset='linear',sets=2) =>
  ({occurrenceId:id, exerciseId, rule:rule(rid,exerciseId,reps,preset,sets), warmup:'none'})
const fixtures = () => {
  const filler = Array.from({length:4},(_,i)=>occ('filler-'+i,'WED',other,{min:8,max:8},'manual',1))
  return {
    engineSchemaVersion:2,unit:'kg',startFrom:'plan',lastFrom:'routine',
    oneRepMaxes:{},prescriptions:{},progression:{},workouts:[],
    routines:[
      {id:'MON',name:'Monday',ex:[occ('bench-mon','MON',BENCH,{min:6,max:8})]},
      {id:'WED',name:'Wednesday',ex:[...filler,occ('bench-wed','WED',BENCH,{min:10,max:12})]},
      {id:'FRI',name:'Friday',ex:[occ('bench-fri','FRI',BENCH,{min:6,max:8})]}
    ],
    progressionGroups:{version:1,groups:[{id:'bench-main',members:['bench-mon','bench-fri']}]}
  }
}
const blank = p => structuredClone(p)
const first = p => p.routines[0].ex[0]
const friday = p => p.routines[2].ex[0]
const wed = p => p.routines[1].ex.at(-1)

const p = fixtures()
check('valid-group-membership',()=>assert.equal(validateProgressionGroups(p).size,2))
check('shared-mon-track',()=>assert.equal(resolveValidationTrackId(p,first(p)), 'progression-group:bench-main'))
check('shared-fri-track',()=>assert.equal(resolveValidationTrackId(p,friday(p)), 'progression-group:bench-main'))
check('wednesday-is-independent',()=>assert.equal(resolveValidationTrackId(p,wed(p)), 'bench-wed'))
check('wednesday-is-fifth-exercise',()=>assert.equal(p.routines[1].ex[4].occurrenceId,'bench-wed'))
check('native-h2-identity-source-authoritative',()=>assert.equal(resolveValidationTrackId({...p,progressionGroups:undefined},first(p),{adapter:{occurrences:[{occurrenceId:'bench-mon',progressionIdentity:'native-shared'}]}}),'native-shared'))
counts.groups=1

let day = 0
const start = (profile, rid, fn=groupedStart) => {
  const routine=profile.routines.find(r=>r.id===rid)
  const now=Date.UTC(2026,10,11+day,12)
  const exposures=fn(profile,routine,{now,newId:id=>id})
  counts.sessions++
  return {id:'session-'+day,d:new Date(now).toISOString().slice(0,10),start:now,
    routineIds:[rid],exposures,entries:entriesForExposures(exposures,profile.prescriptions)}
}
const benchEntry = a => a.entries.find(e=>e.exposureId===benchExposure(a)?.exposureId)
const benchExposure = a => a.exposures.find(e=>e.exerciseId===BENCH)
const load = a => benchEntry(a).sets.find(r=>!r.warmup).w
const complete = (profile,rid) => {
  const active=start(profile,rid), entry=benchEntry(active)
  for(const row of entry.sets.filter(r=>!r.warmup)){
    row.done=true
    row.r=rid==='WED'?12:8
  }
  const result=buildCompletedSession(active,profile,{end:active.start+3600000,unit:'kg',newId:id=>id})
  Object.assign(profile.progression,result.progression)
  profile.workouts.push(result.session)
  counts.completed++
  day++
  return {active,result}
}
const a0 = start(p,'MON')
check('mon-initial-load-100',()=>assert.equal(load(a0),100))
check('group-is-materialized-not-only-metadata',()=>assert.equal(benchExposure(a0).trackId,'progression-group:bench-main'))
const old=blank(p)
delete old.progressionGroups
const untouched=unchangedStart(old,old.routines[0],{now:Date.UTC(2026,10,11),newId:id=>id})
check('without-explicit-group-remains-occurrence-key',()=>assert.equal(untouched.find(x=>x.exerciseId===BENCH).trackId,'bench-mon'))
complete(p,'MON')
check('after-monday-shared-state-102_5',()=>assert.equal(p.progression['progression-group:bench-main'].values.load.value,102.5))
const WedOcc=wed(p)
const contextInput={trackId:'bench-wed',exerciseId:BENCH,rule:WedOcc.rule,
  workouts:p.workouts,prescriptions:p.prescriptions,progression:p.progression}
check('negative-control-unfiltered-engine-borrows-monday',
  ()=>assert.equal(resolveProgressionContext(contextInput).baseline.trackId,'progression-group:bench-main'))
check('explicit-group-history-cannot-borrow-other-track',
  ()=>assert.equal(resolveProgressionContext({...contextInput,
    workouts:resolveValidationHistory(p,WedOcc,null,'bench-wed',p.workouts)}).baseline,null))
const w0=start(p,'WED')
check('wednesday-independent-initial-load',()=>assert.equal(load(w0),100))
check('wednesday-fifth-exposure',()=>assert.equal(w0.exposures[4].occurrenceId,'bench-wed'))
check('wednesday-own-track',()=>assert.equal(benchExposure(w0).trackId,'bench-wed'))
complete(p,'WED')
const f0=start(p,'FRI')
check('friday-reuses-monday-load',()=>assert.equal(load(f0),102.5))
check('friday-no-plan-restart',()=>assert.equal(p.prescriptions[benchExposure(f0).prescriptionId].planFingerprint,p.prescriptions[benchExposure(a0).prescriptionId].planFingerprint))
complete(p,'FRI')
check('friday-advances-shared-state',()=>assert.equal(p.progression['progression-group:bench-main'].values.load.value,105))
const w1=start(p,'WED')
check('wednesday-advances-independently',()=>assert.equal(load(w1),102.5))
complete(p,'WED')
const m1=start(p,'MON')
check('monday-reuses-friday-load',()=>assert.equal(load(m1),105))
check('wednesday-state-remains-separate',()=>assert.equal(p.progression['bench-wed'].values.load.value,105))
check('only-two-progression-tracks',()=>assert.deepEqual(Object.keys(p.progression).sort(),['bench-wed','progression-group:bench-main']))
for (const [id,state] of Object.entries(p.progression)) {
  const replayed=replayProgression({workouts:p.workouts,trackId:id,prescriptions:p.prescriptions})
  check('replay-pointer-'+id,()=>assert.equal(replayed.lastCompletedLogId,state.lastCompletedLogId))
  check('replay-load-'+id,()=>assert.equal(replayed.values.load.value,state.values.load.value))
}
for (const x of p.workouts.flatMap(w=>w.exposures)) {
  const pres=p.prescriptions[x.prescriptionId]
  check('immutable-record-track-'+x.occurrenceId,()=>assert.equal(pres.trackId,x.trackId))
  check('immutable-content-hash-'+x.occurrenceId,()=>{const {contentHash:record,...body}=pres;assert.equal(record,contentHash(body))})
}
// Regression: the global Any workout fallback must not cross explicitly separated tracks.
const any=fixtures()
any.lastFrom='any'
complete(any,'MON')
const anyWed=start(any,'WED')
check('any-wednesday-does-not-import-monday',()=>assert.equal(load(anyWed),100))
complete(any,'WED')
const anyFri=start(any,'FRI')
check('any-friday-ignores-wednesday',()=>assert.equal(load(anyFri),102.5))
complete(any,'FRI')
const anyMonNext=start(any,'MON')
check('any-monday-reuses-friday',()=>assert.equal(load(anyMonNext),105))
const anyWedNext=start(any,'WED')
check('any-wednesday-keeps-independent-history',()=>assert.equal(load(anyWedNext),102.5))
check('any-two-tracks-only',()=>assert.deepEqual(Object.keys(any.progression).sort(),['bench-wed','progression-group:bench-main']))
for(const [track,state] of Object.entries(any.progression)) {
  const rebuilt=replayProgression({workouts:any.workouts,trackId:track,prescriptions:any.prescriptions})
  check('any-replay-'+track,()=>assert.equal(rebuilt.lastCompletedLogId,state.lastCompletedLogId))
}
const noGroupsAny=fixtures()
noGroupsAny.lastFrom='any'
delete noGroupsAny.progressionGroups
const noGroupsAnyCopy=structuredClone(noGroupsAny)
const plain=unchangedStart(noGroupsAny,noGroupsAny.routines[0],{now:Date.UTC(2026,10,11),newId:id=>id})
const overlayOrdinary=groupedStart(noGroupsAnyCopy,noGroupsAnyCopy.routines[0],{now:Date.UTC(2026,10,11),newId:id=>id})
check('ungrouped-any-original-behavior-byte-identical',()=>assert.deepEqual(overlayOrdinary,plain))
check('ungrouped-any-prescriptions-identical',()=>assert.deepEqual(noGroupsAnyCopy.prescriptions,noGroupsAny.prescriptions))

const modified=callback=>{const c=fixtures();callback(c);return c}
reject('rep-mismatch',modified(c=>{c.routines[2].ex[0].rule=rule('FRI',BENCH,{min:8,max:10})}),/different repetition range/)
reject('different-exercise',modified(c=>{c.routines[2].ex[0].exerciseId=other}),/different exerciseId/)
reject('different-algorithm',modified(c=>{c.routines[2].ex[0].rule=rule('FRI',BENCH,{min:6,max:8},'greyskull')}),/incompatible (progression|sets)/)
reject('different-set-count',modified(c=>{c.routines[2].ex[0].rule=rule('FRI',BENCH,{min:6,max:8},'linear',3)}),/incompatible sets/)
reject('multiple-group-membership',modified(c=>c.progressionGroups.groups.push({id:'other',members:['bench-fri','bench-wed']})),/multiple groups|different repetition range/)
reject('unknown-member',modified(c=>c.progressionGroups.groups[0].members[1]='not-existing'),/unknown occurrenceId/)
reject('duplicate-member',modified(c=>c.progressionGroups.groups[0].members=['bench-mon','bench-mon']),/multiple groups/)
reject('no-single-member-group',modified(c=>c.progressionGroups.groups[0].members=['bench-mon']),/at least two/)
check('h2-cannot-override-native',()=>assert.throws(()=>resolveValidationTrackId(p,first(p),{adapter:{occurrences:[{occurrenceId:'bench-mon',progressionIdentity:'some-native-key'}]}}),/cannot override/))

const report={
  schema:'OPENGYM-ENGINEV2-EXPLICIT-GROUPS-SOURCE-VALIDATION-1',
  source:{unchangedSha256:sha(source),overlaySha256:sha(overlay)},
  verdict:counts.failures.length?'RED':'SOURCE_OVERLAY_PASS',
  assertions:counts.assertions,failures:counts.failures,
  sourceMaterializations:counts.sessions, completedSessions:counts.completed,
  persistedHistoryWorkouts:p.workouts.length+any.workouts.length, scenarioProfiles:2, progressionTracks:Object.keys(p.progression).length,
  negativeControls:counts.negativeControls,
  scope:'Source-only overlay of unchanged Engine v2 start/finish/replay. No shipped UI, schema changes or native workout.'
}
const out=process.env.H2_PARITY_OUT||'/tmp'
fs.mkdirSync(out,{recursive:true})
fs.writeFileSync(path.join(out,'explicit-progression-groups-sanitized.json'),JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify(report,null,2))
if(counts.failures.length)process.exitCode=1
