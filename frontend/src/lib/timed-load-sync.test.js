import { describe, it, expect } from 'vitest'
import { mergeStates, stampWorkout, stampDeletions } from './sync-merge.js'
import { reconcileTimedLoadHistory } from './session-edit.js'
import { convertStateUnit } from './units.js'
import { replayTimedLoadHistory } from '../../../api/training-control/timed-load-history.js'
import { SIDE_PLANK_TIMED_CONFIG as c } from '../../../api/training-control/timed-load.js'
import { ruleOccurrence } from './test-fixtures.js'
import { buildSessionExposures } from './session-start.js'
import { entriesForExposures } from './session-ui-adapter.js'
import { buildCompletedSession } from './finish-session.js'

const clone = x => JSON.parse(JSON.stringify(x))
const base=()=>({engineSchemaVersion:2,unit:'kg',workouts:[],routines:[],prescriptions:{},
  progression:{},trainingControl:{timedLoad:{}},exWeights:{},oneRepMaxes:{},
  bodyweight:[],favEx:[],customEx:[],gymCards:[],_ts:1})
const work=(id,time,seconds=30,load=6,trackId='plank',unit='kg')=>({
  id,start:time,end:new Date(time+50000).toISOString(),d:'2026-11-09',exposures:[{
    exposureId:id+'x',trackId,exerciseId:'0089',mode:'time',
    timedLoad:{version:1,unit,config:c},
    performance:{sets:[0,1,2,3].map(i=>({
      role:'work',setId:'r'+Math.floor(i/2),side:i%2?'R':'L',status:'completed',
      observations:[{metric:'duration',unit:'s',value:seconds}],
      resistance:load?{kind:'external-load',unit,value:load}:{kind:'bodyweight'}
    }))}
  }]
})
const snap=w=>replayTimedLoadHistory(w).plank
const merged=(a,b)=>mergeStates(a,b)

describe('Timed Load reconciliation: physical sync conflict scenarios',()=>{
  it('two offline devices each log a distinct exposure; replay progresses exactly once',()=>{
    const origin=base()
    const a={...clone(origin),workouts:[work('a',1000,30)]}
    const b={...clone(origin),workouts:[work('b',2000,35)]}
    const ab=merged(a,b),ba=merged(b,a)
    for(const state of [ab,ba]){
      expect(state.workouts).toHaveLength(2)
      expect(state.trainingControl.timedLoad.plank).toEqual(snap(state.workouts))
      expect(state.trainingControl.timedLoad.plank.target).toBe(40)
      expect(state.progression).toEqual({})
      expect(merged(state,state).trainingControl.timedLoad.plank).toEqual(state.trainingControl.timedLoad.plank)
    }
  })
  it('both offline devices edit SAME workout; newer stamped edit wins and replays',()=>{
    const original=base()
    original.workouts=[work('one',1000)]
    const a=clone(original),b=clone(original)
    a.workouts[0].exposures[0].performance.sets[3].observations[0].value=20
    b.workouts[0].exposures[0].performance.sets[3].observations[0].value=30
    stampWorkout(a.workouts[0],7000)
    stampWorkout(b.workouts[0],8000)
    for(const state of [merged(a,b),merged(b,a)]) {
      expect(state.workouts).toHaveLength(1)
      expect(state.workouts[0].exposures[0].performance.sets[3].observations[0].value).toBe(30)
      expect(state.trainingControl.timedLoad.plank.target).toBe(35)
    }
  })
  it('deleted on one device while the other was offline remains deleted; no phantom progress',()=>{
    const original=base()
    original.workouts=[work('a',1000),work('b',2000,35)]
    const gone=clone(original)
    gone.workouts=gone.workouts.filter(x=>x.id!=='b')
    stampDeletions(original,gone,9000)
    const offline=clone(original)
    offline.workouts.push(work('c',3000,35))
    for(const state of [merged(gone,offline),merged(offline,gone)]){
      expect(state.workouts.map(x=>x.id).sort()).toEqual(['a','c'])
      expect(state.trainingControl.timedLoad.plank).toEqual(snap(state.workouts))
      expect(state.trainingControl.timedLoad.plank.target).toBe(40)
    }
  })
  it('a historical correction or date move replays by current chronology, not cached candidate',()=>{
    const s=base()
    s.workouts=[work('a',1000),work('b',2000,35),work('c',3000,40)]
    reconcileTimedLoadHistory(s)
    expect(s.trainingControl.timedLoad.plank.target).toBe(45)
    s.workouts[1].exposures[0].performance.sets[1].observations[0].value=20
    reconcileTimedLoadHistory(s)
    expect(s.trainingControl.timedLoad.plank.target).toBe(40)
    s.workouts[1].exposures[0].performance.sets[1].observations[0].value=35
    s.workouts[2].start=1500
    reconcileTimedLoadHistory(s)
    expect(s.trainingControl.timedLoad.plank.target).toBe(40)
    expect(s.trainingControl.timedLoad.plank).toEqual(snap(s.workouts))
  })
  it('kg to lb to kg preserves canonical controller state and native load mapping',()=>{
    const s=base()
    s.workouts=[work('a',1000,30,6)]
    s.trainingControl.timedLoad=replayTimedLoadHistory(s.workouts)
    const lb=convertStateUnit(s,'lb')
    expect(lb.trainingControl.timedLoad.plank).toEqual(s.trainingControl.timedLoad.plank)
    expect(lb.workouts[0].exposures[0].timedLoad.unit).toBe('lb')
    expect(replayTimedLoadHistory(lb.workouts).plank).toEqual(s.trainingControl.timedLoad.plank)
    const back=convertStateUnit(lb,'kg')
    expect(replayTimedLoadHistory(back.workouts).plank).toEqual(s.trainingControl.timedLoad.plank)
  })
  it('ordinary ATP2 and Engine v2 unrelated states survive Timed Load-only sync',()=>{
    const a=base(),b=base()
    a.trainingControl.atp2={squat:{candidate:20}}
    a.progression={other:{values:{load:{mode:'absolute',value:50,unit:'kg'}}}}
    b.workouts=[work('a',1000)]
    const m=merged(a,b)
    expect(m.trainingControl.timedLoad.plank.target).toBe(35)
    // The ATP2 state must not be replaced by a Timed Load state.
    expect(m.trainingControl.atp2.squat).toEqual({candidate:20})
  })
  it('an actual completed Engine v2 session can be backfilled then replayed without duplicate progression',()=>{
    const s=base()
    const occ={ ...ruleOccurrence('0089',{preset:'hold_seconds',occurrenceId:'plank',
      options:{sets:{min:2,max:2},durationSeconds:{min:30,max:30}}}),
      side:true,warmup:'none',timedLoad:{...c,enabled:true} }
    const r={id:'r1',ex:[occ]}
    s.routines=[r]
    const exposures=buildSessionExposures(s,r,{now:1000,newId:x=>x})
    const entries=entriesForExposures(exposures,s.prescriptions)
    entries[0].sets.forEach(row=>{row.done=true;row.sec=30;row.w=6})
    const done=buildCompletedSession({id:'w0',start:1000,d:'2026-11-09',exposures,entries},s,
      {end:51000,newId:x=>x,unit:'kg'})
    s.workouts=[done.session]
    reconcileTimedLoadHistory(s)
    expect(s.trainingControl.timedLoad.plank).toEqual(done.timedLoadStates.plank)
    const back=work('older',500,30,0)
    s.workouts.unshift(back)
    reconcileTimedLoadHistory(s)
    expect(s.trainingControl.timedLoad.plank).toEqual(snap(s.workouts))
    expect(replayTimedLoadHistory(s.workouts)).toEqual(replayTimedLoadHistory(s.workouts))
  })
})
