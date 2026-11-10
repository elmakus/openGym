import test from 'node:test'
import assert from 'node:assert/strict'
import { defaultPlanRule, validateProgressionGroups, joinProgressionGroup, leaveProgressionGroup,
  progressionTrackId, progressionAcrossRoutines, progressionHistoryForTrack, replayProgression } from '../engine/index.js'
import { validateCanonicalProfile } from '../migration/profile-validation.js'
import { packProfile, unpackProfile } from '../migration/profile-pack.js'
import { mergeStates, stampEdits } from '../../frontend/src/lib/sync-merge.js'
import { deleteRoutine } from '../../frontend/src/lib/routines.js'
import { buildSessionExposures } from '../../frontend/src/lib/session-start.js'
import { entriesForExposures } from '../../frontend/src/lib/session-ui-adapter.js'
import { buildCompletedSession } from '../../frontend/src/lib/finish-session.js'

const bench='0025', other='0001'
const occurrence = (rid,id,exerciseId=bench,reps={min:6,max:8},preset='linear',sets=2) => ({
  occurrenceId:id,exerciseId,warmup:'none',
  rule:defaultPlanRule(preset,{id:'rule-'+id,routineId:rid,exerciseId,completion:[],target:{mode:'none'},
    sets:{min:sets,max:sets},reps,load:{mode:'absolute',value:100,unit:'kg'}})
})
const fixture = () => ({
  engineSchemaVersion:2,unit:'kg',startFrom:'plan',lastFrom:'routine',
  prescriptions:{},progression:{},oneRepMaxes:{},workouts:[],
  routines:[
    {id:'MON',name:'Monday',ex:[occurrence('MON','bench-mon')]},
    {id:'WED',name:'Wednesday',ex:[
      ...Array.from({length:4},(_,i)=>occurrence('WED','filler-'+i,other,{min:8,max:8},'manual',1)),
      occurrence('WED','bench-wed',bench,{min:10,max:12})]},
    {id:'FRI',name:'Friday',ex:[occurrence('FRI','bench-fri')]}
  ]
})
const grouped=()=>{const p=fixture();assert.equal(joinProgressionGroup(p,'bench-mon','bench-fri',()=> 'bench-main'),true);return p}
const slot=(p,id)=>p.routines.flatMap(r=>r.ex).find(o=>o.occurrenceId===id)
const exercise=(active,id)=>active.exposures.find(e=>e.occurrenceId===id)
const entry=(active,id)=>active.entries.find(e=>e.exposureId===exercise(active,id)?.exposureId)
let date=0
const start=(p,rid)=>{
  const now=Date.UTC(2026,10,10+date,12)
  const r=p.routines.find(x=>x.id===rid)
  const exposures=buildSessionExposures(p,r,{now,newId:s=>s})
  return {id:'group-test-'+date,d:new Date(now).toISOString().slice(0,10),start:now,routineIds:[rid],
    exposures,entries:entriesForExposures(exposures,p.prescriptions)}
}
const run=(p,rid)=>{
  const a=start(p,rid)
  for(const e of a.entries) for(const row of e.sets) if(!row.warmup) {row.r=rid==='WED'?12:8;row.done=true}
  const result=buildCompletedSession(a,p,{end:a.start+3600000,newId:s=>s,unit:'kg'})
  Object.assign(p.progression,result.progression);p.workouts.push(result.session)
  date++;return a
}
const weight=(a,id)=>entry(a,id).sets.find(x=>!x.warmup).w

test('explicit group joins Monday and Friday while Wednesday remains a separate track',()=>{
  date=0
  const p=grouped()
  assert.deepEqual([...validateProgressionGroups(p)], [['bench-mon','bench-main'],['bench-fri','bench-main']])
  assert.equal(validateCanonicalProfile(p).ok,true)
  assert.equal(progressionTrackId(p,slot(p,'bench-mon')),'progression-group:bench-main')
  assert.equal(progressionTrackId(p,slot(p,'bench-fri')),'progression-group:bench-main')
  assert.equal(progressionTrackId(p,slot(p,'bench-wed')),'bench-wed')
  const mon=run(p,'MON')
  assert.equal(weight(mon,'bench-mon'),100)
  assert.equal(p.progression['progression-group:bench-main'].values.load.value,102.5)
  const wed=run(p,'WED')
  assert.equal(weight(wed,'bench-wed'),100)
  assert.equal(wed.exposures[4].occurrenceId,'bench-wed')
  const fri=run(p,'FRI')
  assert.equal(weight(fri,'bench-fri'),102.5)
  assert.equal(p.progression['progression-group:bench-main'].values.load.value,105)
  const w2=run(p,'WED')
  assert.equal(weight(w2,'bench-wed'),102.5)
  const m2=start(p,'MON')
  assert.equal(weight(m2,'bench-mon'),105)
  assert.deepEqual(Object.keys(p.progression).filter(id=>id==='bench-wed'||id.startsWith('progression-group:')).sort(),['bench-wed','progression-group:bench-main'])
  for(const [key,s] of Object.entries(p.progression)){
    const replay=replayProgression({workouts:p.workouts,prescriptions:p.prescriptions,trackId:key})
    assert.equal(replay.lastCompletedLogId,s.lastCompletedLogId)
    assert.equal(replay.values.load.value,s.values.load.value)
  }
  const result=validateCanonicalProfile(p)
  assert.deepEqual(result,{ok:true,errors:[]})
  assert.deepEqual(unpackProfile(packProfile(p)).progressionGroups,p.progressionGroups)
  assert.deepEqual(validateCanonicalProfile(unpackProfile(packProfile(p))),{ok:true,errors:[]})
})
test('Any workout never mixes distinct explicitly selected progression tracks',()=>{
  date=0
  const p=grouped();p.lastFrom='any'
  run(p,'MON')
  const wed=start(p,'WED')
  assert.equal(weight(wed,'bench-wed'),100)
  run(p,'WED')
  const fri=start(p,'FRI')
  assert.equal(weight(fri,'bench-fri'),102.5)
  run(p,'FRI')
  assert.equal(weight(start(p,'MON'),'bench-mon'),105)
  assert.equal(weight(start(p,'WED'),'bench-wed'),102.5)
  const filtered=progressionHistoryForTrack(p,slot(p,'bench-wed'),null,'bench-wed',p.workouts)
  assert.equal(filtered.flatMap(w=>w.exposures).filter(x=>x.exerciseId===bench).every(x=>x.trackId==='bench-wed'),true)
  assert.equal(progressionAcrossRoutines(p,slot(p,'bench-wed'),null,true),false)
  assert.deepEqual(validateCanonicalProfile(p),{ok:true,errors:[]})
})
test('without configured grouping, every occurrence retains its original Engine v2 identity and fallback',()=>{
  const p=fixture();p.lastFrom='any'
  assert.equal(progressionTrackId(p,slot(p,'bench-mon')),'bench-mon')
  assert.equal(progressionAcrossRoutines(p,slot(p,'bench-mon'),null,true),true)
  assert.equal(progressionHistoryForTrack(p,slot(p,'bench-mon'),null,'bench-mon',p.workouts),p.workouts)
})
test('configuration validation rejects invalid rep ranges and different exercises / rules / sets',()=>{
  for(const [name,mutate,error] of [
    ['reps',p=>{p.routines[2].ex[0].rule=occurrence('FRI','bench-fri',bench,{min:8,max:10}).rule},/repetition ranges/],
    ['exercise',p=>{p.routines[2].ex[0].exerciseId=other},/different exercises/],
    ['rule',p=>{p.routines[2].ex[0].rule=occurrence('FRI','bench-fri',bench,{min:6,max:8},'greyskull').rule},/structure|rules/],
    ['sets',p=>{p.routines[2].ex[0].rule=occurrence('FRI','bench-fri',bench,{min:6,max:8},'linear',3).rule},/set and phase/],
    ['unknown',p=>{p.progressionGroups.groups[0].members[1]='missing'},/unknown occurrence/],
    ['dup',p=>{p.progressionGroups.groups[0].members[1]='bench-mon'},/multiple groups/],
    ['single',p=>{p.progressionGroups.groups[0].members=['bench-mon']},/at least two/],
    ['native',p=>{p.trainingControl={hybrid2Config:{enabled:true,adapter:{occurrences:[{occurrenceId:'bench-mon',progressionIdentity:'native'}]}}}},/HYBRID-2/]
  ]){
    const p=grouped();mutate(p)
    assert.throws(()=>validateProgressionGroups(p),error,name)
    assert.equal(validateCanonicalProfile(p).ok,false,name)
  }
})
test('adding and removing groups is clean-start only, and no partial edits occur on failure',()=>{
  date=0
  const p=fixture()
  assert.equal(joinProgressionGroup(p,'bench-mon','bench-fri',()=> 'bench-main'),true)
  assert.equal(joinProgressionGroup(p,'bench-mon','bench-fri',()=> 'unused'),false)
  assert.equal(leaveProgressionGroup(p,'bench-fri'),true)
  assert.deepEqual(p.progressionGroups.groups,[])
  assert.equal(joinProgressionGroup(p,'bench-mon','bench-fri',()=> 'bench-main'),true)
  run(p,'MON')
  const unchanged=structuredClone(p.progressionGroups)
  assert.throws(()=>leaveProgressionGroup(p,'bench-mon'),/after history/)
  assert.throws(()=>joinProgressionGroup(p,'bench-wed','bench-mon',()=> 'other'),/after history|repetition ranges/)
  assert.deepEqual(p.progressionGroups,unchanged)
})
test('pinned native HYBRID-2 identity remains authoritative without manual groups',()=>{
  const p=fixture()
  const hybrid={adapter:{occurrences:[{occurrenceId:'bench-mon',progressionIdentity:'native-source-key'}]}}
  assert.equal(progressionTrackId(p,slot(p,'bench-mon'),hybrid),'native-source-key')
  assert.equal(progressionAcrossRoutines(p,slot(p,'bench-mon'),hybrid,true),false)
})

test('progressionGroups is a stamped, durable profile setting across multi-device merges',()=>{
  const original=fixture()
  const laptop=structuredClone(original)
  assert.equal(joinProgressionGroup(laptop,'bench-mon','bench-fri',()=> 'bench-main'),true)
  stampEdits(original,laptop,100)
  laptop._ts=100
  const phone=structuredClone(original)
  phone.routines[1].name='Wednesday edited on phone'
  phone._ts=200
  // An unrelated later edit on the phone must not discard a group's earlier edit.
  const merged=mergeStates(laptop,phone)
  assert.deepEqual(merged.progressionGroups,laptop.progressionGroups)
  assert.deepEqual(validateCanonicalProfile(merged),{ok:true,errors:[]})
  assert.deepEqual(unpackProfile(packProfile(merged)).progressionGroups,laptop.progressionGroups)
  const phone2=structuredClone(phone)
  phone2.progressionGroups={version:1,groups:[]}
  stampEdits(phone,phone2,300)
  phone2._ts=300
  const newer=mergeStates(laptop,phone2)
  assert.deepEqual(newer.progressionGroups,{version:1,groups:[]})
  assert.deepEqual(validateCanonicalProfile(newer),{ok:true,errors:[]})
})

test('shared progression member cannot be deleted via the central routine deletion API',()=>{
  const p=grouped()
  const prior=structuredClone(p)
  assert.throws(()=>deleteRoutine(p,'MON'),/Separate progression first/)
  assert.deepEqual(p,prior)
  assert.equal(leaveProgressionGroup(p,'bench-mon'),true)
  assert.ok(deleteRoutine(p,'MON'))
  assert.deepEqual(validateCanonicalProfile(p),{ok:true,errors:[]})
})

test('two occurrences sharing one track in the same workout count only once',()=>{
  date=0
  const p=fixture()
  p.routines[0].ex.push(occurrence('MON','bench-extra'))
  assert.equal(joinProgressionGroup(p,'bench-mon','bench-extra',()=> 'bench-combined'),true)
  const active=run(p,'MON')
  const shared=active.exposures.filter(x=>x.trackId==='progression-group:bench-combined')
  assert.equal(shared.length,2)
  const state=p.progression['progression-group:bench-combined']
  assert.equal(state.values.load.value,102.5)
  assert.equal(state.lastCompletedLogId,shared.at(-1).exposureId)
  const replay=replayProgression({workouts:p.workouts,trackId:state.trackId,prescriptions:p.prescriptions})
  assert.equal(replay.lastCompletedLogId,state.lastCompletedLogId)
  assert.equal(replay.values.load.value,102.5)
  assert.deepEqual(validateCanonicalProfile(p),{ok:true,errors:[]})
})

test('shared groups reject difficulty ladders until effective rung identity can be grouped safely',()=>{
  const p=grouped()
  for (const rid of ['MON','FRI']) {
    p.routines.find(r=>r.id===rid).ex[0].rule.program.phases[0].progression.push({metric:'difficulty'})
  }
  assert.throws(()=>validateProgressionGroups(p),/difficulty ladder groups require separate support/)
  assert.equal(validateCanonicalProfile(p).ok,false)
})
test('adding a fresh occurrence to a progressed group must fail closed',()=>{
  date=0
  const p=grouped()
  run(p,'MON')
  p.routines[0].ex.push(occurrence('MON','bench-third'))
  const before=structuredClone(p.progressionGroups)
  assert.throws(()=>joinProgressionGroup(p,'bench-mon','bench-third',()=> 'unexpected'),/after history/)
  assert.deepEqual(p.progressionGroups,before)
})


test('completed performance-only history locks explicit progression identity without legacy actual counter',()=>{
  const completed = id => ({
    occurrenceId:id,exerciseId:bench,performance:{sets:[
      {role:'work',status:'completed',observations:[{metric:'repetitions',value:8}]}
    ]}
  })
  const p=fixture()
  p.workouts=[{exposures:[completed('bench-mon')]}]
  const original=structuredClone(p)
  assert.throws(()=>joinProgressionGroup(p,'bench-mon','bench-fri',()=> 'group-unsafe'),/after history/)
  assert.deepEqual(p,original,'failed join must not alter live profile')
  // A planned or skipped exposure alone is not a completed historical track.
  const empty=fixture()
  empty.workouts=[{exposures:[{...completed('bench-mon'),performance:{sets:[
    {role:'work',status:'skipped'}
  ]}}]}]
  assert.equal(joinProgressionGroup(empty,'bench-mon','bench-fri',()=> 'bench-safe'),true)

  const groupedProfile=grouped()
  groupedProfile.workouts=[{exposures:[completed('bench-mon')]}]
  const groupsBefore=structuredClone(groupedProfile.progressionGroups)
  assert.throws(()=>leaveProgressionGroup(groupedProfile,'bench-mon'),/after history/)
  assert.throws(()=>leaveProgressionGroup(groupedProfile,'bench-fri'),/after history/,
    'dissolving a two-member group must not orphan its completed track')
  assert.deepEqual(groupedProfile.progressionGroups,groupsBefore)
})
