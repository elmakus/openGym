import test from 'node:test'
import assert from 'node:assert/strict'
import { compilePlanAdapter, validatePlanAdapter } from './hybrid2/adapter.js'
import { K5, M6, SYN4 } from './hybrid2/fixtures/reference-adapters.js'
import { initialHybridState, observeSignal, absentSignal,
  evaluateNormalCloser, startStructuralCycle, closeDeload,
  resetH1, settleStructuralRollover, hybridStatus, validateHybridState } from './hybrid2/controller.js'
import { evaluateCycle } from './hybrid2/trigger.js'
import { deloadSetBudget } from './hybrid2/lifecycle.js'

const json = o => JSON.parse(JSON.stringify(o))
const edit = (v, fn) => { const x = json(v); fn(x); return x }

test('K5/M6/SYN4 adapters statically compile with independent generic H1 identities', () => {
  for (const { adapter, routines } of [K5, M6, SYN4]) {
    const compiled = compilePlanAdapter(adapter, routines)
    assert.equal(compiled.controllerVersion, 'HYBRID-2')
    assert.equal(compiled.stateSchemaVersion, 'HYBRID-STATE-2')
    assert.equal(compiled.signals.length, adapter.signals.length)
    assert.ok(compiled.signals.every(x => x.performanceIdentity !== x.progressionIdentity))
    assert.equal(compiled.occurrences.at(-1).isCloser, true)
    const state = initialHybridState(compiled)
    assert.equal(hybridStatus(state), 'LEARNING')
    assert.deepEqual(Object.keys(state.anchors), compiled.signals.map(x => x.signalId))
  }
})
test('Static Plan Adapter fails closed on ambiguous topology, candidate visibility, class and change', () => {
  const a = K5.adapter
  const invalid = [
    edit(a, x => { x.orderedCyclePositions[1] = 'TUE' }),
    edit(a, x => { x.closerOccurrence = x.occurrences.at(-2).occurrenceId }),
    edit(a, x => { x.occurrences.at(-1).optional = true }),
    edit(a, x => { x.signals[0].signalClass = 'TIMED_LOAD' }),
    edit(a, x => { x.signals[0].performanceIdentity = x.signals[1].performanceIdentity }),
    edit(a, x => { x.signals[0].systemGroup = '' }),
    edit(a, x => { x.thresholds.fastWeakMin = 99 }),
    edit(a, x => { x.thresholds.weakRatio = 0.91 }),
    edit(a, x => { x.comparabilityStatus = 'UNKNOWN' }),
    edit(a, x => { x.signals[0].candidateChangeVisibility = '' }),
    edit(a, x => { x.signals[0].progressionIdentity = 'other' }),
    edit(a, x => { x.occurrences[1].progressionIdentity = x.occurrences[0].progressionIdentity }),
    edit(a, x => { x.zeroOverrides = [x.closerOccurrence] })
  ]
  for (const [i, bad] of invalid.entries())
    assert.throws(() => validatePlanAdapter(bad), /HYBRID-2 adapter:/, 'invalid adapter ' + i)
  const editedPlan = edit(K5.routines, x => { x.at(-1).ex.reverse() })
  assert.throws(() => compilePlanAdapter(a, editedPlan), /catalog no longer matches/)
  const incomplete = edit(K5.routines, x => { x[0].ex.pop() })
  assert.throws(() => compilePlanAdapter(a, incomplete), /missing bound occurrence/)
})
test('flat cross-system weak confirmation, fast and slow exactly follow threshold contract', () => {
  const policy = K5.adapter.thresholds
  const projections = K5.adapter.signals.map(s => ({
    signalId: s.signalId, systemGroup: s.systemGroup, ready: true,
    seen: true, valid: true, weak: false
  }))
  const local = projections.map((p,i) => ({ ...p, weak: [0,2,3].includes(i) }))
  const notBroad = evaluateCycle(local, policy)
  assert.equal(notBroad.cycleClass, 'GOOD')
  assert.equal(notBroad.queueDeload, false)
  const broad = projections.map((p,i) => ({ ...p, weak: [0,1,2].includes(i) }))
  const c1 = evaluateCycle(broad, policy)
  assert.equal(c1.cycleClass, 'BROAD_WEAK')
  assert.equal(c1.state.badCycleStreak, 1)
  assert.equal(c1.queueDeload, false)
  assert.equal(c1.fastTrigger, false)
  const c2 = evaluateCycle(broad, policy, c1.state)
  assert.equal(c2.slowTrigger, true)
  assert.equal(c2.queueDeload, true)
  const fast = evaluateCycle(projections.map((p,i)=>({ ...p, weak:i!==4 })), policy)
  assert.equal(fast.fastTrigger, true)
  const missing = evaluateCycle(projections.map((p,i)=>({
    ...p, seen:i!==4, valid:i!==4, weak:i<4
  })),policy)
  assert.equal(missing.cycleClass, 'INDETERMINATE')
  assert.equal(missing.queueDeload, false)
  const invalid = evaluateCycle(projections.map((p,i)=>({
    ...p, valid:i<3, weak:i<3
  })),policy)
  assert.equal(invalid.cycleClass, 'INDETERMINATE')
  const badCycle = evaluateCycle(broad.map(p => ({ ...p, ready:false })), policy)
  assert.equal(badCycle.allReady, false)
  assert.equal(badCycle.queueDeload, false)
})
test('standard deload set budget and transient downward-only safety policy', () => {
  for (const n of [1,2,3,4,5,6,7]) {
    assert.equal(deloadSetBudget(n,true),Math.ceil(n/2))
    assert.equal(deloadSetBudget(n,false),n)
    assert.equal(deloadSetBudget(n,true,true),0)
  }
  assert.throws(()=>deloadSetBudget(0,true),/invalid/)
})

const drive = (adapter, state, performances, frozen = false) => {
  const compiled = compilePlanAdapter(adapter)
  const started = startStructuralCycle(state, compiled, { reducedSetShape: frozen })
  let next = started.state, closure = null
  for (const signal of compiled.signals) {
    if (!frozen) {
      const result = observeSignal(next, compiled, signal.signalId,
        { kind: 'COMPARABLE', performance: performances[signal.signalId] })
      next = result.state
    }
  }
  if (frozen) closure = closeDeload(next, compiled, 1)
  else {
    const evaluated = evaluateNormalCloser(next, compiled)
    closure = { ...evaluated, epochReset: false }
  }
  return {
    state: json(closure.state), started, evaluation: closure.evaluation || null,
    epochReset: closure.epochReset || false
  }
}
const all = (adapter, value) =>
  Object.fromEntries(adapter.signals.map(s => [s.signalId, value]))
const ready = (s, adapter) => adapter.signals.every(x => s.anchors[x.signalId].perfCount === 3)

for (const { adapter } of [K5, M6, SYN4]) test(
  'multi-cycle '+adapter.namespace+': LEARNING -> weak -> deload -> all-H1 reset -> LEARNING -> stable -> second decline',
  () => {
    const a=compilePlanAdapter(adapter)
    let state=initialHybridState(a)
    const history=[]
    const advance = (value, frozen=false) => {
      const out=drive(adapter,state,all(adapter,value),frozen)
      state=out.state
      validateHybridState(state,a)
      history.push(json(out))
      return out
    }
    for (let i=0;i<3;i++) {
      const x=advance(100)
      assert.equal(x.evaluation.cycleClass,'INDETERMINATE')
      assert.equal(x.evaluation.weakCount,0)
    }
    assert.ok(ready(state,a))
    assert.equal(state.anchors[a.signals[0].signalId].perfReference,100)
    let x=advance(100)
    assert.equal(x.evaluation.cycleClass,'GOOD')
    assert.equal(x.evaluation.weakCount,0)
    assert.equal(hybridStatus(state),'NORMAL')
    x=advance(70)
    assert.equal(x.evaluation.fastTrigger,true)
    assert.equal(hybridStatus(state),'QUEUED')
    x=advance(70,true)
    assert.equal(x.started.event,'DELOAD_STARTED')
    assert.equal(x.epochReset,true)
    assert.equal(hybridStatus(state),'LEARNING')
    for (const signal of a.signals) {
      assert.equal(state.anchors[signal.signalId].perfReference,0)
      assert.equal(state.anchors[signal.signalId].perfCount,0)
      assert.equal(state.windows[signal.signalId].weak,false)
    }
    for (let i=0;i<3;i++) {
      x=advance(70)
      assert.equal(x.evaluation.queueDeload,false)
    }
    assert.ok(ready(state,a))
    assert.equal(state.anchors[a.signals[0].signalId].perfReference,70)
    for (let i=0;i<6;i++) {
      x=advance(70)
      assert.equal(x.evaluation.cycleClass,'GOOD')
      assert.equal(x.evaluation.queueDeload,false)
      assert.equal(hybridStatus(state),'NORMAL')
    }
    x=advance(45)
    assert.equal(x.evaluation.fastTrigger,true)
    assert.equal(hybridStatus(state),'QUEUED')
    x=advance(45,true)
    assert.equal(x.epochReset,true)
    assert.equal(hybridStatus(state),'LEARNING')
    assert.ok(history.length >= 16)
    // Replay/serialize each full structural-cycle boundary exactly, not only the endpoint.
    for (const item of history) assert.doesNotThrow(()=>validateHybridState(item.state,a))
  }
)

test('queued-but-never-started cannot reset; active-stale resets exactly once', () => {
  const a=compilePlanAdapter(K5.adapter)
  let state=initialHybridState(a)
  for(let i=0;i<3;i++) state=drive(K5.adapter,state,all(K5.adapter,100)).state
  state=drive(K5.adapter,state,all(K5.adapter,70)).state
  assert.equal(hybridStatus(state),'QUEUED')
  const queued=closeDeload(state,a,3)
  assert.equal(queued.epochReset,false)
  assert.deepEqual(queued.state,state)
  const started=startStructuralCycle(state,a,{reducedSetShape:true})
  assert.equal(started.epochReset,false)
  const stale=startStructuralCycle(started.state,a,{reducedSetShape:false})
  assert.equal(stale.event,'STALE_ROLLOVER')
  assert.equal(stale.epochReset,true)
  assert.equal(stale.state.runtime.rolloverClear,1)
  assert.ok(a.signals.every(s => stale.state.anchors[s.signalId].perfCount === 0))
  const synced=startStructuralCycle(stale.state,a,{reducedSetShape:false})
  assert.equal(synced.epochReset,false)
  const settled=settleStructuralRollover(synced.state,a)
  assert.equal(settled.runtime.rolloverClear,0)
  assert.deepEqual(settleStructuralRollover(settled,a),settled)
})

test('H1 reset never copies, drops or mutates opaque future subordinate state', () => {
  const a=compilePlanAdapter(M6.adapter)
  const state=drive(M6.adapter,initialHybridState(a),all(M6.adapter,100)).state
  const subordinate=Object.freeze({ atp2: { x: { candidate: 75, probeActive: 1, future: { nested: [1,2,3] }}},
    timedLoad: { b: { target: 40, load: 12, future: [99] } },
    progression: { e: { future: 'opaque' } } })
  const before=JSON.stringify(subordinate)
  const reset=resetH1(state,a)
  assert.ok(a.signals.every(s=>reset.anchors[s.signalId].perfCount===0))
  assert.equal(JSON.stringify(subordinate),before)
  assert.equal(Object.hasOwn(reset,'atp2'),false)
  assert.equal(Object.hasOwn(reset,'timedLoad'),false)
})

test('missing/invalid evidence cannot fake a broad weak vote in LEARNING', () => {
  const a=compilePlanAdapter(SYN4.adapter)
  let state=initialHybridState(a)
  for(const sig of a.signals.slice(0,2)) state=absentSignal(state,a,sig.signalId,'INVALID').state
  for(const sig of a.signals.slice(2)) state=observeSignal(state,a,sig.signalId,{kind:'COMPARABLE',performance:5}).state
  const x=evaluateNormalCloser(state,a)
  assert.equal(x.evaluation.cycleClass,'INDETERMINATE')
  assert.equal(x.evaluation.weakCount,0)
  assert.equal(x.evaluation.queueDeload,false)
})
