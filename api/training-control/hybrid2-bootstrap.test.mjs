import test from 'node:test'
import assert from 'node:assert/strict'
import { M6 } from './hybrid2/fixtures/reference-adapters.js'
import { makeFixtureCycle } from './hybrid2/fixtures/cycles.js'
import { replayHybridHistory } from './hybrid2/history.js'
import { h1FromExposure } from './hybrid2/observation.js'
import { createHybridBootstrap, validateHybridBootstrap,
  assertHybridBootstrapHistory, validateHybridBootstrapTransition } from './hybrid2/bootstrap.js'

const source = () => ({
  adapter: M6.adapter,
  sourceId: 'reviewed-source-revision-1',
  cutoverAt: '2025-12-31T20:00:00.000Z',
  importedAt: '2025-12-31T21:00:00.000Z',
  anchors: Object.fromEntries(M6.adapter.signals.map(s => [s.signalId, {
    perf1: 150, perf2: 150, perf3: 150, perfCount: 3,
    perfReference: 150, candidateGuard: 0
  }]))
})
const copy = x => structuredClone(x)

test('reviewed historical H1 cutover seeds exact six anchors and changes first REAL replay decision', () => {
  const cp = createHybridBootstrap(source())
  assert.deepEqual(validateHybridBootstrap(copy(cp), M6.adapter), cp)
  assert.deepEqual(createHybridBootstrap(source()), cp, 'repeated identical import is deterministic')
  const cycle = makeFixtureCycle(M6, 0, 8)
  assert.equal(replayHybridHistory({workouts:cycle, adapter:M6.adapter}).status, 'LEARNING')
  const queued = replayHybridHistory({ workouts: cycle, adapter:M6.adapter, bootstrap:cp })
  assert.equal(queued.status, 'QUEUED')
  assert.equal(queued.state.runtime.deloadQueued, 1)
  assert.equal(queued.decisions.at(-1).event, 'BROAD_WEAK')
  assert.deepEqual(replayHybridHistory({workouts:copy(cycle),adapter:M6.adapter,bootstrap:copy(cp)}).state,queued.state)
  const deload = makeFixtureCycle(M6, 1, 8, {frozen:true})
  const closed = replayHybridHistory({workouts:[...cycle,...deload],adapter:M6.adapter,bootstrap:cp})
  assert.equal(closed.status, 'LEARNING')
  assert.equal(closed.decisions.at(-1).event, 'DELOAD_CLOSED')
  for (const s of M6.adapter.signals) assert.equal(closed.state.anchors[s.signalId].perfCount, 0)
})

test('tampered baseline, wrong adapter, migrated date, and untagged post-cutover work fail closed', () => {
  const cp = createHybridBootstrap(source())
  const wrong = copy(cp)
  wrong.anchors[M6.adapter.signals[0].signalId].perfReference += 10
  assert.throws(() => validateHybridBootstrap(wrong,M6.adapter), /checksum/)
  const invalid = source()
  invalid.anchors[M6.adapter.signals[0].signalId].perfCount = 2
  assert.throws(() => createHybridBootstrap(invalid), /invalid/)
  const other = copy(M6.adapter)
  other.planVersion = '2'
  assert.throws(() => validateHybridBootstrap(cp,other), /identity|checksum/)
  const logged = makeFixtureCycle(M6, 0, 8)
  assert.throws(() => replayHybridHistory({workouts:logged.slice(1),adapter:M6.adapter,bootstrap:cp}), /cycle start/)
  const early = copy(logged)
  early[0].start=Date.parse(cp.cutoverAt)-10000
  early[0].d=new Date(early[0].start).toISOString().slice(0,10)
  assert.throws(() => assertHybridBootstrapHistory(early,M6.adapter,cp), /cutover/)
  const gap = copy(logged)
  delete gap[1].hybrid2
  for (const x of gap[1].exposures) delete x.hybrid2
  assert.throws(() => replayHybridHistory({workouts:gap,adapter:M6.adapter,bootstrap:cp}), /untagged adapter/)
  const late = { ...source(), importedAt: '2026-02-01T00:00:00.000Z' }
  assert.throws(() => replayHybridHistory({workouts:logged,adapter:M6.adapter,
    bootstrap:createHybridBootstrap(late)}), /checkpoint must precede/)
})

test('server transition refuses silent overwrite or removal of immutable checkpoint', () => {
  const cp=createHybridBootstrap(source())
  const old={engineSchemaVersion:2,trainingControl:{hybrid2Bootstrap:cp},workouts:[]}
  assert.equal(validateHybridBootstrapTransition(old,copy(old)).ok,true)
  assert.match(validateHybridBootstrapTransition(old,{trainingControl:{}}).errors.join(' '), /immutable/)
  const modified=copy(old)
  modified.trainingControl.hybrid2Bootstrap=createHybridBootstrap({ ...source(), sourceId:'different' })
  assert.match(validateHybridBootstrapTransition(old,modified).errors.join(' '), /immutable/)
  assert.equal(validateHybridBootstrapTransition(old,{trainingControl:{},workouts:[],resetAt:100}).ok,true)
  const already={workouts:makeFixtureCycle(M6,0,8)}
  assert.match(validateHybridBootstrapTransition(already,{trainingControl:{hybrid2Bootstrap:cp}}).errors.join(' '),/before server/)
})

test('H1 native paired input uses saved setId order even for R,L interleaved history', () => {
  const row=(id,side,reps)=>({setId:id,side,role:'work',prescribed:true,status:'completed',
    resistance:{kind:'external-load',value:100,unit:'kg'},
    observations:[{metric:'repetitions',value:reps}]})
  const x={mode:'reps',performance:{sets:[
    row('r1','R',10),row('r0','R',12),row('r1','L',7),row('r0','L',8)
  ]}}
  const sample=h1FromExposure(x,{beforeCandidate:100,afterCandidate:100,baselineUnit:'kg'})
  assert.equal(sample.kind,'COMPARABLE')
  assert.equal(sample.performance,100*(1+8/30))
  const partial=copy(x)
  partial.performance.sets=partial.performance.sets.filter(r=>r.side==='R')
  assert.equal(h1FromExposure(partial,{beforeCandidate:100,baselineUnit:'kg'}).kind,'INVALID')
})
