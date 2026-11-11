import { describe, expect, it } from 'vitest'
import { M6 } from '../../../api/training-control/hybrid2/fixtures/reference-adapters.js'
import { createHybridBootstrap } from '../../../api/training-control/hybrid2/bootstrap.js'
import { buildSessionExposures } from './session-start.js'
import { buildCompletedSession } from './finish-session.js'
import { entriesForExposures } from './session-ui-adapter.js'
import { reconcileHybridHistory } from './hybrid2-sync.js'
import { editCompletedSession, saveWorkoutEdit, moveWorkoutInProfile, deleteEditedWorkout, deleteWorkoutFromProfile } from './session-edit.js'
import { ruleOccurrence } from './test-fixtures.js'
import { registerCustom } from './exercises.js'

const start = Date.UTC(2026, 10, 12, 12)
const makeState = () => {
  const adapter = structuredClone(M6.adapter)
  const customs = adapter.signals.map((sig, i) => ({
    id: 'm6_synced_' + i, n: 'Imported native machine ' + (i + 1),
    eq: 'machine', bp: i % 2 ? 'chest' : 'upper legs', custom: true
  }))
  const byOcc = new Map(adapter.signals.map((sig, i) => [sig.occurrence, customs[i]]))
  for (const o of adapter.occurrences) if (byOcc.has(o.occurrenceId))
    o.exerciseId = byOcc.get(o.occurrenceId).id
  const routines = M6.routines.map(r => ({
    ...r, ex: r.ex.map(x => {
      const custom = byOcc.get(x.occurrenceId)
      return ruleOccurrence(custom?.id || '0025', {
        occurrenceId: x.occurrenceId, routineId: r.id,
        options: { sets: {min:2,max:2}, reps:{min:8,max:8},
          load:{mode:'absolute',value:40,unit:'kg'}, completion:[] }
      })
    })
  }))
  const state = {
    engineSchemaVersion:2, unit:'kg', active:null,
    workouts:[], prescriptions:{}, progression:{}, oneRepMaxes:{},
    exWeights:{}, bodyweight:[], customEx:customs, routines,
    trainingControl:{hybrid2Config:{version:1,enabled:true,adapter}}
  }
  state.trainingControl.hybrid2Bootstrap = createHybridBootstrap({
    adapter,sourceId:'synthetic-native-m6',cutoverAt:'2026-11-11T20:00:00.000Z',
    importedAt:'2026-11-11T21:00:00.000Z',
    anchors:Object.fromEntries(adapter.signals.map(sig => [sig.signalId,
      {perf1:150,perf2:150,perf3:150,perfCount:3,perfReference:150,candidateGuard:0}]))
  })
  return state
}
const finish = (S, position, round = 0, reps = 8) => {
  const now = start + (round * 4 + position) * 86400000
  const routine = S.routines[position]
  const exposures = buildSessionExposures(S,routine,{now,newId:x=>x,unit:'kg'})
  const entries = entriesForExposures(exposures,S.prescriptions)
  for (const e of entries) for (const row of e.sets) {
    row.done = true
    row.r = reps
    row.w ||= 40
  }
  const out = buildCompletedSession({
    id:'m6-real-'+round+'-'+position, d:new Date(now).toISOString().slice(0,10),
    name:routine.name, start:now, routineIds:[routine.id], exposures, entries
  },S,{end:now+3600000,newId:x=>x,unit:'kg'})
  S.workouts.push(out.session)
  Object.assign(S.progression,out.progression)
  expect(reconcileHybridHistory(S)).not.toBeNull()
  return out.session
}
const threeDays = () => {
  registerCustom([])
  const S=makeState()
  for(let p=0;p<3;p++)finish(S,p)
  return S
}

describe('M6 actual custom sessions with source H1 and safety of history edits',()=>{
  it('replays a full native-style structural cycle without global custom registration',()=>{
    const S=threeDays()
    expect(S.workouts).toHaveLength(3)
    expect(S.workouts[0].exposures[0].exerciseNameSnapshot).toBe('Imported native machine 1')
    expect(S.workouts[0].exposures[0].trackId).toBe('fixture-m6:track:hip_a')
    expect(S.trainingControl.hybrid2Diagnostics.status).not.toBe('INCOMPATIBLE')
  })
  it('flows through native-style M6 RTT with real custom exercises and frozen Engine work',()=>{
    const S=threeDays()
    expect(S.trainingControl.hybrid2Diagnostics.status).toBe('QUEUED')
    const priorProgression=structuredClone(S.progression)
    for(let pos=0;pos<3;pos++){
      const session=finish(S,pos,1,8)
      expect(session.exposures.every(x=>x.hybrid2?.deloadFrozen===true)).toBe(true)
      expect(session.exposures.every(x=>x.excludedFromProgression===true)).toBe(true)
    }
    expect(S.progression).toEqual(priorProgression)
    expect(S.trainingControl.hybrid2Diagnostics.status).toBe('LEARNING')
    for(let round=2;round<5;round++) for(let pos=0;pos<3;pos++)
      finish(S,pos,round,8)
    expect(S.trainingControl.hybrid2Diagnostics.status).toBe('NORMAL')
  })
  it('allows corrections to completed custom rows, still replaying genuine H1',()=>{
    const S=threeDays()
    editCompletedSession(S,'m6-real-0-0')
    S.active.entries[0].sets[0].r=10
    const saved=saveWorkoutEdit(S,start+10*86400000)
    expect(saved.exposures[0].performance.sets[0].observations[0].value).toBe(10)
    expect(S.trainingControl.hybrid2Diagnostics.status).not.toBe('INCOMPATIBLE')
  })
  it('prevents moving a structural day behind its native H1 cutover, with no side effects',()=>{
    const S=threeDays()
    const before=structuredClone(S)
    expect(()=>moveWorkoutInProfile(S,S.workouts[0],'2026-11-10','12:00',start+8*86400000))
      .toThrow(/HYBRID-2 history edit blocked/)
    expect(S).toEqual(before)
  })
  it('prevents deleting an earlier structural day, preserving the edit draft and history',()=>{
    const S=threeDays()
    editCompletedSession(S,'m6-real-0-0')
    const before=structuredClone(S)
    expect(()=>deleteEditedWorkout(S)).toThrow(/HYBRID-2 history edit blocked/)
    expect(S).toEqual(before)
  })
  it('protects History detail deletion too, but allows deleting an unrelated custom workout',()=>{
    const S=threeDays()
    const before=structuredClone(S)
    expect(()=>deleteWorkoutFromProfile(S,S.workouts[0]))
      .toThrow(/HYBRID-2 history edit blocked/)
    expect(S).toEqual(before)
    S.workouts.push({id:'unrelated-custom-session',d:'2026-11-16',
      start:start+5*86400000,end:start+5*86400000+3600000,
      exposures:[{exposureId:'misc',exerciseId:'other_custom'}]})
    expect(deleteWorkoutFromProfile(S,S.workouts.at(-1))).toBe(true)
    expect(S.workouts).toHaveLength(3)
    expect(S.trainingControl.hybrid2Diagnostics.status).not.toBe('INCOMPATIBLE')
  })
  it('prevents adding an undeclared structural occurrence in a saved workout',()=>{
    const S=threeDays()
    editCompletedSession(S,'m6-real-0-0')
    const duplicate=structuredClone(S.active.exposures[0])
    duplicate.exposureId='m6-dupe-exposure'
    S.active.exposures.push(duplicate)
    const entry=structuredClone(S.active.entries[0])
    entry.exposureId='m6-dupe-exposure'
    S.active.entries.push(entry)
    const before=structuredClone(S)
    expect(()=>saveWorkoutEdit(S,start+10*86400000)).toThrow(/HYBRID-2 history edit blocked/)
    expect(S).toEqual(before)
  })
})
