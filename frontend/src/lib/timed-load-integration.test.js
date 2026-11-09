import { describe, it, expect } from 'vitest'
import { ruleOccurrence } from './test-fixtures.js'
import { buildSessionExposures } from './session-start.js'
import { entriesForExposures, rowsOfPerformance } from './session-ui-adapter.js'
import { buildCompletedSession } from './finish-session.js'
import { replayProgression } from './prescription/index.js'
import { replayTimedLoadHistory } from '../../../api/training-control/timed-load-history.js'
import { SIDE_PLANK_TIMED_CONFIG as config } from '../../../api/training-control/timed-load.js'
import { refreshTimedLoadLive } from './timed-load-session.js'

const T0 = Date.UTC(2026,10,9,10)
const uid = s => s
const slot = () => ({ ...ruleOccurrence('0089', {
  preset:'hold_seconds', occurrenceId:'side-plank-timed', routineId:'r1',
  options:{sets:{min:2,max:2},durationSeconds:{min:30,max:30}}
}), side:true, warmup:'none', timedLoad:{...config,enabled:true} })
const S = () => ({unit:'kg',workouts:[],prescriptions:{},progression:{},oneRepMaxes:{},
  routines:[{id:'r1',ex:[slot()]}],trainingControl:{},exWeights:{},bodyweight:[] })
const start = (s,time) => {
  const exposures=buildSessionExposures(s,s.routines[0],{now:time,newId:uid,unit:s.unit})
  return {id:'w'+time,start:time,d:'2026-11-09',name:'Side Plank',
    routineIds:['r1'],exposures,entries:entriesForExposures(exposures,s.prescriptions)}
}
const finish = (s,a) => {
  const result=buildCompletedSession(a,s,{end:a.start+50000,newId:uid,unit:s.unit})
  s.workouts.push(result.session)
  s.trainingControl.timedLoad={...s.trainingControl.timedLoad,...result.timedLoadStates}
  return result
}
const fill = (a,sec,load=null) => a.entries[0].sets.forEach(r=>{
  r.done=true; r.sec=sec; if(load!=null)r.w=load
})

describe('Timed Load: actual Engine v2 session→rows→finish→persist→next session route',()=>{
  it('starts at logical 0 kg, advances all four sides, and bypasses standard progression',()=>{
    const s=S();const a=start(s,T0),x=a.exposures[0]
    expect(x.timedLoad.version).toBe(1)
    expect(a.entries[0].sets.map(r=>r.side)).toEqual(['L','R','L','R'])
    expect(a.entries[0].sets.map(r=>r.w)).toEqual([0,0,0,0])
    expect(a.entries[0].sets.map(r=>r.sec)).toEqual([30,30,30,30])
    fill(a,30)
    const done=finish(s,a)
    expect(done.progression).toEqual({})
    expect(done.atp2States).toEqual({})
    expect(done.timedLoadStates['side-plank-timed']).toMatchObject({load:0,target:35,initialized:true})
    expect(replayProgression({workouts:s.workouts,trackId:'side-plank-timed',prescriptions:s.prescriptions})).toBeNull()
    expect(replayTimedLoadHistory(s.workouts)).toEqual(done.timedLoadStates)
    const b=start(s,T0+86400000)
    expect(b.exposures[0].timedLoad.initialState.target).toBe(35)
    expect(b.entries[0].sets.map(r=>r.sec)).toEqual([35,35,35,35])
    fill(b,35);finish(s,b)
    const c=start(s,T0+2*86400000);expect(c.entries[0].target.sec).toBe(40)
    fill(c,40);finish(s,c)
    const fourth=start(s,T0+3*86400000);expect(fourth.entries[0].target.sec).toBe(45)
    fill(fourth,45);finish(s,fourth)
    const fifth=start(s,T0+4*86400000)
    expect(fifth.entries[0].sets.map(r=>r.w)).toEqual([2,2,2,2])
    expect(fifth.entries[0].sets.map(r=>r.sec)).toEqual([30,30,30,30])
    expect(fifth.exposures[0].timedLoad.initialState.provenance).toBe('new')
  })
  it('weakest/failing side gates; two failures regress time and keep state across replay',()=>{
    const s=S()
    const a=start(s,T0);fill(a,30,6);finish(s,a)
    const second=start(s,T0+86400000)
    expect(second.entries[0].target.sec).toBe(35)
    fill(second,35);second.entries[0].sets[3].sec=34
    const failed1=finish(s,second);expect(failed1.timedLoadStates['side-plank-timed'].fails).toBe(1)
    const third=start(s,T0+2*86400000)
    fill(third,35);third.entries[0].sets[1].sec=29
    const failed2=finish(s,third)
    expect(failed2.timedLoadStates['side-plank-timed']).toMatchObject({load:6,target:30,fails:0})
    expect(replayTimedLoadHistory(s.workouts)['side-plank-timed']).toEqual(failed2.timedLoadStates['side-plank-timed'])
  })
  it('deliberate first set decrease is propagated to uncompleted rows only, no same-session promotion',()=>{
    const s=S();s.trainingControl.timedLoad={'side-plank-timed':{
      initialized:true,load:8,target:45,fails:0,provenance:'established',emergency:false,
      bridgeTarget:null,bridgeProvenance:null
    }}
    const a=start(s,T0);expect(a.entries[0].sets[0].w).toBe(8)
    a.entries[0].sets[0].w=7;a.entries[0].sets[0].done=true
    refreshTimedLoadLive(a,0)
    expect(a.entries[0].sets.map(r=>r.w)).toEqual([7,7,7,7])
    a.entries[0].sets.slice(1).forEach(r=>{r.done=true;r.sec=45})
    const result=finish(s,a)
    expect(result.timedLoadStates['side-plank-timed']).toMatchObject({load:7,target:45})
    expect(start(s,T0+86400000).entries[0].sets[0].w).toBe(7)
  })
  it('regression #1: first logical L/R set at 6 kg calibrates remaining uncompleted sets from 0',()=>{
    const s=S(), a=start(s,T0)
    expect(a.entries[0].sets.map(r=>r.w)).toEqual([0,0,0,0])
    // One Liftosaur setIndex == 1 corresponds to the completed L and R pair.
    a.entries[0].sets[0].w=6
    a.entries[0].sets[0].done=true
    refreshTimedLoadLive(a,0)
    expect(a.entries[0].sets.map(r=>r.w)).toEqual([6,0,0,0])
    a.entries[0].sets[1].w=6
    a.entries[0].sets[1].done=true
    refreshTimedLoadLive(a,0)
    expect(a.entries[0].sets.map(r=>r.w)).toEqual([6,6,6,6])
    expect(a.entries[0].sets.slice(2).every(r=>!r.done)).toBe(true)
    a.entries[0].sets.slice(2).forEach(r=>r.done=true)
    const result=finish(s,a)
    expect(result.timedLoadStates['side-plank-timed']).toMatchObject({initialized:true,load:6,target:35})
    expect(replayTimedLoadHistory(s.workouts)).toEqual(result.timedLoadStates)
  })

  it('opt-out keeps old Engine behaviour and no Timed Load state',()=>{
    const s=S();s.routines[0].ex[0].timedLoad={...config,enabled:false}
    const a=start(s,T0)
    expect(a.exposures[0].timedLoad).toBeUndefined()
    fill(a,30)
    expect(Object.keys(finish(s,a).timedLoadStates)).toHaveLength(0)
  })
})
