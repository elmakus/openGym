import test from 'node:test'
import assert from 'node:assert/strict'
import { SIDE_PLANK_TIMED_CONFIG as c, initialTimedState } from './timed-load.js'
import { historicalTimedRows, replayTimedLoadHistory } from './timed-load-history.js'
const config={...c,enabled:true}
const exposure=(id,secs=[30,30,30,30],{load=6,exclude=false,unit='kg'}={})=>({
  exposureId:id+'-x',trackId:'side-plank',excludedFromProgression:exclude,
  timedLoad:{version:1,unit,config,initialState:initialTimedState(c)},
  performance:{sets:secs.map((seconds,i)=>({
    role:'work',setId:'r'+Math.floor(i/2),side:i%2?'R':'L',status:'completed',
    observations:[{metric:'duration',value:seconds,unit:'s'}],
    resistance:load===0?{kind:'bodyweight'}:{kind:'external-load',unit,value:load}
  }))}})
const event=(id,start,sec=30,options={})=>({id,start,end:new Date(start).toISOString(),exposures:[exposure(id,[sec,sec,sec,sec],options)]})
const state=(w)=>replayTimedLoadHistory(w)['side-plank']

test('chronological replay is deterministic and ignores duplicates as a single exposure',()=>{
  const e1=event('w1',1000),e2=event('w2',2000,35),e3=event('w3',3000,40)
  assert.equal(state([e3,e1,e2]).target,45)
  assert.deepEqual(replayTimedLoadHistory([e3,e1,e2]),replayTimedLoadHistory([e1,e2,e3]))
  assert.deepEqual(replayTimedLoadHistory([e3,e1,e2]),replayTimedLoadHistory(JSON.parse(JSON.stringify([e3,e1,e2]))))
})

test('missing side, skipped row or technical failure gates; no completed work does not count',()=>{
  let w=event('w1',1000)
  w.exposures[0].performance.sets[3].status='skipped'
  assert.equal(state([w]).fails,1)
  w=event('w1',1000)
  w.exposures[0].performance.sets[3].techniqueValid=false
  assert.equal(state([w]).fails,1)
  w=event('w1',1000)
  w.exposures[0].performance.sets.forEach(x=>x.status='skipped')
  assert.deepEqual(replayTimedLoadHistory([w]),{})
})

test('historical edit, delete, changed chronology and backfill replay correct target',()=>{
  const w1=event('a',1000),w2=event('b',2000,35),w3=event('c',3000,40)
  assert.equal(state([w1,w2,w3]).target,45)
  w2.exposures[0].performance.sets[3].observations[0].value=33
  assert.equal(state([w1,w2,w3]).target,40)
  assert.equal(state([w1,w3]).target,40)
  w2.exposures[0].performance.sets[3].observations[0].value=35
  w2.start=3500
  assert.equal(state([w1,w2,w3]).target,40)
  const backfill=event('back',500,30,{load:0})
  assert.equal(state([backfill,w1,w2,w3]).load,0)
})

test('per-track last counted exposure in a workout advances only once; explicit exclusion isolated',()=>{
  const a=event('a',1000),b=event('b',2000,35)
  a.exposures.push(exposure('a2'))
  assert.equal(state([a]).target,35)
  const excluded=event('excluded',3000,45,{exclude:true})
  assert.deepEqual(replayTimedLoadHistory([a,b,excluded]),replayTimedLoadHistory([a,b]))
})

test('unit switch history maps only native loads; 0kg remains logical zero',()=>{
  const kg=event('w1',1000,30,{load:6})
  const lb=JSON.parse(JSON.stringify(kg))
  lb.exposures[0].timedLoad.unit='lb'
  for(const x of lb.exposures[0].performance.sets){
    x.resistance.unit='lb'
    x.resistance.value=13.228
  }
  assert.deepEqual(state([lb]),state([kg]))
  const floor=event('w2',2000,30,{load:0})
  assert.equal(historicalTimedRows(floor.exposures[0])[0].weightKg,0)
})
