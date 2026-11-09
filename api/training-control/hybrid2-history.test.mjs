import test from 'node:test'
import assert from 'node:assert/strict'
import { replayHybridHistory } from './hybrid2/history.js'
import { currentHybridPlan, deloadPrescription, verifyFrozenHistory } from './hybrid2/supervisor.js'
import { K5, M6, SYN4 } from './hybrid2/fixtures/reference-adapters.js'
import { makeFixtureCycle, fixtureCycles } from './hybrid2/fixtures/cycles.js'
import { replayAtp2History } from './history.js'
import { replayTimedLoadHistory } from './timed-load-history.js'
import { h1FromExposure } from './hybrid2/observation.js'

const json = x => JSON.parse(JSON.stringify(x))
const timeline = [
  {reps:15},{reps:15},{reps:15},{reps:15}, {reps:8},
  {reps:8,frozen:true}, {reps:8},{reps:8},{reps:8},
  {reps:8},{reps:8},{reps:8},{reps:8},{reps:8},{reps:8},
  {reps:3},{reps:3,frozen:true}
]
for(const fixture of [K5,M6,SYN4]) test(
  'replay '+fixture.adapter.namespace+': all structural cycle boundaries, exact two resets and post-deload relearn',
  () => {
    const {adapter}=fixture
    const source=fixtureCycles(fixture,timeline)
    const n=adapter.orderedCyclePositions.length
    assert.equal(source.length,n*timeline.length)
    const history=[]
    let resets=0, lastResult
    for(const [i,w] of source.entries()) {
      history.push(w)
      if ((i+1)%n!==0) continue
      const result=replayHybridHistory({workouts:history,adapter})
      assert.equal(result.sourceCount,history.length)
      assert.deepEqual(replayHybridHistory({workouts:json(history),adapter}).state,result.state)
      assert.ok(result.state.anchors[adapter.signals[0].signalId])
      const cycle=Math.floor(i/n)
      const previous=lastResult?.decisions.filter(x=>x.epochReset).length||0
      const current=result.decisions.filter(x=>x.epochReset).length
      if (current>previous) resets+=current-previous
      lastResult=result
      if(cycle < 3) assert.equal(result.state.runtime.lastCycleClass,0)
      if(cycle===3) assert.equal(result.state.runtime.lastCycleClass,1)
      if(cycle===4) assert.equal(result.status,'QUEUED')
      if(cycle===5) {
        assert.equal(result.status,'LEARNING')
        assert.equal(result.decisions.at(-1).event,'DELOAD_CLOSED')
        assert.ok(adapter.signals.every(s=>result.state.anchors[s.signalId].perfCount===0))
      }
      if(cycle>=6&&cycle<=8) {
        assert.equal(result.status,cycle===8?'NORMAL':'LEARNING')
        assert.equal(result.decisions.at(-1).evaluation.weakCount,0)
      }
      if(cycle>=9&&cycle<=14) {
        assert.equal(result.status,'NORMAL')
        assert.equal(result.decisions.at(-1).evaluation.weakCount,0)
        assert.equal(result.decisions.at(-1).evaluation.queueDeload,false)
      }
      if(cycle===15) assert.equal(result.status,'QUEUED')
      if(cycle===16) assert.equal(result.status,'LEARNING')
    }
    assert.equal(resets,2)
    assert.equal(lastResult.decisions.filter(x=>x.event==='DELOAD_CLOSED').length,2)
    assert.equal(lastResult.decisions.filter(x=>x.event==='DELOAD_STARTED').length,2)
    const upToFirstDeload=source.slice(0,n*5)
    const withFirstDeload=source.slice(0,n*6)
    assert.deepEqual(replayAtp2History(withFirstDeload),replayAtp2History(upToFirstDeload),
      'deload cannot raise ATP2 candidate, Turbo or future state')
  }
)
test('normal loaded-reps H1 score uses first completed set, strict external candidate comparability and paired sentinels', () => {
  const fixture=makeFixtureCycle(K5,0,10)
  const sample=fixture[0].exposures[0]
  const base=h1FromExposure(sample,{beforeCandidate:100,afterCandidate:105,baselineUnit:'kg'})
  assert.equal(base.kind,'COMPARABLE')
  assert.equal(base.candidateRaised,true)
  assert.equal(base.performance,100*(1+10/30))
  const skip=json(sample)
  skip.performance.sets[0].status='skipped'
  skip.performance.sets.push({
    ...sample.performance.sets[0],setId:'r1',status:'completed',
    observations:[{metric:'repetitions',value:8}]
  })
  const second=h1FromExposure(skip,{beforeCandidate:100,afterCandidate:100,baselineUnit:'kg'})
  assert.equal(second.kind,'COMPARABLE')
  assert.equal(second.performance,100*(1+8/30))
  const override=json(sample)
  override.performance.sets[0].resistance.value=90
  assert.equal(h1FromExposure(override,{beforeCandidate:100,afterCandidate:100,baselineUnit:'kg'}).kind,'DISCONTINUITY')
  assert.equal(h1FromExposure(sample,{beforeCandidate:100,baselineUnit:'kg',afterCandidate:100}).candidateRaised,false)
  assert.equal(h1FromExposure({ ...sample,timedLoad:{version:1}},{beforeCandidate:100}).kind,'INDETERMINATE')
  assert.equal(h1FromExposure({ ...sample,mode:'time'},{beforeCandidate:100}).kind,'INDETERMINATE')
})
test('queue never started cannot induce H1 reset through a replayed closer', () => {
  const works=fixtureCycles(K5,timeline.slice(0,5))
  const queued=replayHybridHistory({workouts:works,adapter:K5.adapter})
  assert.equal(queued.status,'QUEUED')
  assert.ok(queued.state.anchors[K5.adapter.signals[0].signalId].perfCount===3)
  assert.ok(queued.decisions.every(x=>!x.epochReset))
  // Repeating the exact same completed log after canonical de-duplication cannot reset.
  assert.deepEqual(replayHybridHistory({workouts:works,adapter:K5.adapter}).state,queued.state)
  assert.throws(()=>replayHybridHistory({workouts:[...works,works.at(-1)],adapter:K5.adapter}),
    /duplicate workout id/)
})
test('missing terminal closer during active deload triggers one stale rollover on next structural start', () => {
  const first=fixtureCycles(SYN4,timeline.slice(0,5))
  const deload=makeFixtureCycle(SYN4,5,8,{frozen:true,omitCloser:true})
  const normalStart=makeFixtureCycle(SYN4,6,8)[0]
  const history=[...first,...deload]
  let result=replayHybridHistory({workouts:history,adapter:SYN4.adapter})
  assert.equal(result.status,'DELOAD')
  assert.equal(result.decisions.filter(x=>x.epochReset).length,0)
  history.push(normalStart)
  result=replayHybridHistory({workouts:history,adapter:SYN4.adapter})
  assert.equal(result.decisions.filter(x=>x.event==='STALE_ROLLOVER').length,1)
  assert.equal(result.decisions.filter(x=>x.epochReset).length,1)
  assert.ok(SYN4.adapter.signals.every(s=>result.state.anchors[s.signalId].perfCount===0))
  assert.equal(result.status,'LEARNING')
  assert.deepEqual(replayHybridHistory({workouts:json(history),adapter:SYN4.adapter}).state,result.state)
})
test('historical edit before a deload recomputes decisions, invalidating stale deload shape fail-closed', () => {
  const source=fixtureCycles(K5,timeline.slice(0,6))
  const edited=json(source)
  for (const w of edited.slice(K5.adapter.orderedCyclePositions.length*4, K5.adapter.orderedCyclePositions.length*5))
    for (const x of w.exposures) x.performance.sets[0].observations[0].value=15
  assert.throws(()=>replayHybridHistory({workouts:edited,adapter:K5.adapter}),
    /wrong deload shape at cycle start/)
})
test('backfill, invalid structural order, missing data, duplicate event and adapter versions fail-closed', () => {
  const first=makeFixtureCycle(M6,0,15)
  const replayed=replayHybridHistory({workouts:first,adapter:M6.adapter})
  assert.equal(replayed.decisions.at(-1).event,'INDETERMINATE')
  const backfilled=json(first)
  backfilled[0].start=backfilled[1].start+1000000 // chronological order breaks
  backfilled[0].d=new Date(backfilled[0].start).toISOString().slice(0,10)
  assert.throws(()=>replayHybridHistory({workouts:backfilled,adapter:M6.adapter}),
    /missing or reordered structural position/)
  const adapterVersion=json(first)
  adapterVersion[0].exposures[0].hybrid2.planVersion='2'
  assert.throws(()=>replayHybridHistory({workouts:adapterVersion,adapter:M6.adapter}),
    /adapter version\/fingerprint drift/)
  const silentlyEdited=json(first)
  const changedAdapter=json(M6.adapter)
  changedAdapter.thresholds.fastWeakMin=5
  assert.throws(()=>replayHybridHistory({workouts:silentlyEdited,adapter:changedAdapter}),
    /adapter version\/fingerprint drift/)
  const badEvent=json(first)
  badEvent[0].hybrid2.positions=['B']
  assert.throws(()=>replayHybridHistory({workouts:badEvent,adapter:M6.adapter}),
    /structural event metadata mismatch/)
  const skipped=json(first)
  skipped[0].exposures[0].performance.sets[0].status='skipped'
  const noSample=replayHybridHistory({workouts:skipped,adapter:M6.adapter})
  assert.equal(noSample.state.anchors[M6.adapter.signals[0].signalId].perfCount,0)
})
test('deload prescription preserves normal external candidate and effort, halves only sets', () => {
  const source={
    id:'p1',parameters:{reps:{min:8,max:12}},rows:Array.from({length:5},(_,i)=>({
      reps:{min:8,max:12},load:{value:42.5,unit:'kg'},restSeconds:100
    })),prefill:{load:{value:42.5,unit:'kg'},reps:10},provenance:{method:'engine-v2'},
    ruleSnapshot:{dummy:'opaque'}
  }
  const original=json(source)
  const result=deloadPrescription(source,{normalLoad:50})
  assert.equal(result.workingSets,3)
  assert.equal(result.prescription.rows.length,3)
  assert.equal(result.prescription.rows[0].load.value,50)
  assert.equal(result.prescription.prefill.load.value,50)
  assert.equal(result.prescription.rows[0].reps.min,8)
  assert.equal(result.prescription.rows[0].restSeconds,100)
  assert.deepEqual(source,original)
  assert.equal(result.permissions.persistentProgressionWrites,false)
  assert.equal(result.permissions.h1Updates,false)
  const opt=deloadPrescription(source,{zeroOverride:true})
  assert.equal(opt.prescription,null)
  assert.equal(opt.workingSets,0)
})
test('controller supervisor does not auto-enable and freezes queued plan only on validated cycle start', () => {
  const base={ routines:K5.routines, workouts:fixtureCycles(K5,timeline.slice(0,5)),
    prescriptions:{}, trainingControl:{ hybrid2Config:{version:1,enabled:true,adapter:K5.adapter} } }
  const normal={...base,trainingControl:{...base.trainingControl,
    hybrid2Config:{...base.trainingControl.hybrid2Config,enabled:false}}}
  assert.equal(currentHybridPlan(normal,K5.routines[0],Date.UTC(2027,0,1)),null)
  const queued=currentHybridPlan(base,K5.routines[0],Date.UTC(2027,0,1))
  assert.equal(queued.frozen,true)
  assert.equal(queued.status,'QUEUED')
  assert.throws(()=>currentHybridPlan(base,K5.routines[1],Date.UTC(2027,0,1)),
    /deload queued but structural start missing/)
  const corrupted=json(base)
  corrupted.trainingControl.hybrid2Conflict={ reason:'concurrent' }
  assert.throws(()=>currentHybridPlan(corrupted,K5.routines[0],Date.UTC(2027,0,1)),/unresolved/)
})
test('frozen logs cannot be modified or counted as ATP2 or Timed Load progression', () => {
  const frozen=makeFixtureCycle(M6,0,8,{frozen:true,includeTimed:true})
  assert.deepEqual(replayAtp2History(frozen),{})
  assert.deepEqual(replayTimedLoadHistory(frozen),{})
  verifyFrozenHistory(frozen,M6.adapter)
  frozen[0].exposures[0].excludedFromProgression=false
  assert.throws(()=>verifyFrozenHistory(frozen,M6.adapter),/persistent progression exclusion/)
})
