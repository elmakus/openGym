import { describe, it, expect } from 'vitest'
import { mergeStates, stampDeletions } from './sync-merge.js'
import { reconcileHybridHistory } from './hybrid2-sync.js'
import { replayHybridHistory } from '../../../api/training-control/hybrid2/history.js'
import { convertStateUnit } from './units.js'
import { replayAtp2History } from '../../../api/training-control/history.js'
import { createHybridBootstrap } from '../../../api/training-control/hybrid2/bootstrap.js'
import { K5, M6, SYN4 } from '../../../api/training-control/hybrid2/fixtures/reference-adapters.js'
import { makeFixtureCycle, fixtureCycles } from '../../../api/training-control/hybrid2/fixtures/cycles.js'

const copy = x => JSON.parse(JSON.stringify(x))
const base = (fixture = K5, patch = {}) => ({
  engineSchemaVersion: 2, unit: 'kg', restSec: 90, lang: 'en',
  week: { 1: [fixture.routines[0].id] }, dayPlan: {},
  routines: copy(fixture.routines), workouts: [], prescriptions: {},
  bodyweight: [], customEx: [], favEx: [], gymCards: [],
  exWeights: {}, exNotes: {}, barWeights: {}, equipProfiles: [],
  trainingControl: { hybrid2Config: { version: 1, enabled: true, adapter: copy(fixture.adapter) },
    timedLoad: { sharedTimed: { initialized: true, target: 40, load: 8,
      futureOpaque: { hold: [1,2,3] } } } },
  _ts: 1000, ...patch
})
const history = () => fixtureCycles(K5, [
  {reps:15},{reps:15},{reps:15},{reps:15},{reps:8},{reps:8,frozen:true}
])

describe('HYBRID-2 across actual openGym two-device offline merge/replay', () => {
  it('converges the same native H1 cutover without LWW and keeps an offline divergence blocked', () => {
    const anchor = Object.fromEntries(M6.adapter.signals.map(s => [s.signalId, {
      perf1: 150, perf2: 150, perf3: 150, perfCount: 3,
      perfReference: 150, candidateGuard: 0
    }]))
    const checkpoint = createHybridBootstrap({
      adapter: M6.adapter, sourceId: 'reviewed-native-baseline',
      cutoverAt: '2025-12-31T20:00:00.000Z',
      importedAt: '2025-12-31T21:00:00.000Z', anchors: anchor
    })
    const A = base(M6)
    A.trainingControl.hybrid2Bootstrap = checkpoint
    const B = base(M6)
    const initial = mergeStates(A, B)
    expect(initial.trainingControl.hybrid2Bootstrap).toEqual(checkpoint)
    expect(initial.trainingControl.hybrid2BootstrapConflict).toBeUndefined()
    const synced = mergeStates(initial, A)
    expect(synced.trainingControl.hybrid2Bootstrap).toEqual(checkpoint)
    const offline = base(M6, {workouts: makeFixtureCycle(M6,0,8)})
    const collided = mergeStates(A, offline)
    expect(collided.trainingControl.hybrid2BootstrapConflict).toBeTruthy()
    expect(collided.trainingControl.hybrid2Diagnostics.status).toBe('INCOMPATIBLE')
    expect(collided.trainingControl.hybrid2).toBeUndefined()
    // A later merge with the original offline device must NOT clear conflict.
    const again = mergeStates(collided, offline)
    expect(again.trainingControl.hybrid2BootstrapConflict).toBeTruthy()
    expect(again.trainingControl.hybrid2).toBeUndefined()
    const other = base(M6)
    other.trainingControl.hybrid2Bootstrap = createHybridBootstrap({
      adapter: M6.adapter, sourceId: 'different-native-source',
      cutoverAt: '2025-12-31T20:00:00.000Z',
      importedAt: '2025-12-31T21:00:00.000Z', anchors: anchor
    })
    expect(mergeStates(A, other).trainingControl.hybrid2BootstrapConflict).toBeTruthy()
  })

  it('replays split offline training from chronological logs and ignores stale H1 snapshots', () => {
    const source = history().slice(0, K5.adapter.orderedCyclePositions.length*5)
    const shared = source.slice(0, 5)
    const A = base(K5,{ _ts:3000, workouts:copy([...shared,...source.slice(5,12)]),
      trainingControl: { ...base().trainingControl, hybrid2: { staleReference:99999 } } })
    const B = base(K5,{ _ts:2000, workouts:copy([...shared,...source.slice(12)]),
      trainingControl: { ...base().trainingControl, hybrid2: { staleReference:0 } } })
    const expected=replayHybridHistory({ workouts:source,adapter:K5.adapter })
    for(const merged of [mergeStates(A,B),mergeStates(B,A)]) {
      expect(merged.workouts).toHaveLength(source.length)
      expect(merged.trainingControl.hybrid2).toEqual(expected.state)
      expect(merged.trainingControl.hybrid2Diagnostics.status).toBe('QUEUED')
      expect(merged.trainingControl.hybrid2Error).toBeUndefined()
      expect(merged.trainingControl.hybrid2.staleReference).toBeUndefined()
      expect(merged.trainingControl.atp2).toEqual(replayAtp2History(source))
      expect(merged.trainingControl.timedLoad.sharedTimed.futureOpaque).toEqual({ hold:[1,2,3] })
    }
  })
  it('two devices record parallel incompatible structural positions: fail closed, not fake GOOD or deload', () => {
    const shared=makeFixtureCycle(K5,0,15)
    const parallel=copy(shared[2])
    parallel.id='parallel:new'
    parallel.start+=30000
    parallel.end=new Date(parallel.start+60000).toISOString()
    const A=base(K5,{workouts:copy(shared),_ts:2000})
    const B=base(K5,{workouts:copy([...shared,parallel]),_ts:2200})
    const out=mergeStates(A,B)
    expect(out.workouts).toHaveLength(6)
    expect(out.trainingControl.hybrid2Error).toMatch(/structural position/)
    expect(out.trainingControl.hybrid2Diagnostics.status).toBe('INCOMPATIBLE')
    expect(out.trainingControl.hybrid2).toBeUndefined()
  })
  it('concurrent edits of the same H1 workout retain both results for explicit review', () => {
    const source=fixtureCycles(K5,[{reps:15},{reps:15},{reps:15},{reps:15}])
    const stale=copy(source), corrected=copy(source)
    stale[6]._ts=400
    corrected[6]._ts=900
    corrected[6].exposures[0].performance.sets[0].observations[0].value=9
    const A=base(K5,{workouts:stale,_ts:3000})
    const B=base(K5,{workouts:corrected,_ts:2000})
    for(const out of [mergeStates(A,B),mergeStates(B,A)]) {
      expect(out.workouts).toHaveLength(source.length)
      const selected=out.workouts.find(w=>w.id===source[6].id)
      expect(selected.exposures[0].performance.sets[0].observations[0].value).toBe(9)
      expect(out.trainingControl.hybrid2HistoryConflict).toBeTruthy()
      expect(out.trainingControl.hybrid2HistoryConflict.entries.map(e => e.id)).toContain(source[6].id)
      expect(out.trainingControl.hybrid2).toBeUndefined()
      expect(out.trainingControl.hybrid2Diagnostics.status).toBe('INCOMPATIBLE')
    }
  })
  it('old workout deletion tombstone wins; missing structural evidence invalidates H1 instead of carrying stale reference', () => {
    const source=fixtureCycles(M6,[{reps:15},{reps:15},{reps:15}])
    const original=base(M6,{workouts:copy(source),_ts:1000})
    const removed=copy(original)
    removed._ts=4000
    removed.workouts=removed.workouts.filter(w=>w.id!==source[1].id)
    stampDeletions(original,removed,4000)
    const offline=copy(original)
    offline._ts=5000
    offline.trainingControl.hybrid2={ stale:true,anchors:{ fake:{ perfReference:200 } } }
    for(const out of [mergeStates(removed,offline),mergeStates(offline,removed)]) {
      expect(out.workouts.find(w=>w.id===source[1].id)).toBeUndefined()
      expect(out.deleted.workouts[source[1].id]).toBeGreaterThan(0)
      expect(out.trainingControl.hybrid2Diagnostics.status).toBe('INCOMPATIBLE')
      expect(out.trainingControl.hybrid2).toBeUndefined()
    }
  })
  it('historical edit before queued deload prevents silently replaying stale deload prescription', () => {
    const source=history()
    const A=base(K5,{workouts:copy(source),_ts:2000})
    const B=base(K5,{workouts:copy(source),_ts:3000})
    const weakIndex=K5.adapter.orderedCyclePositions.length*4
    for(let i=weakIndex;i<weakIndex+5;i++) {
      B.workouts[i]._ts=5000
      for(const x of B.workouts[i].exposures)
        x.performance.sets[0].observations[0].value=15
    }
    const out=mergeStates(A,B)
    expect(out.trainingControl.hybrid2Diagnostics.status).toBe('INCOMPATIBLE')
    expect(out.trainingControl.hybrid2Error).toMatch(/wrong deload shape/)
    expect(out.trainingControl.hybrid2).toBeUndefined()
    expect(out.workouts).toHaveLength(source.length)
  })
  it('duplicated sync merge or old H1 snapshots never advance an epoch twice', () => {
    const source=history()
    const A=base(K5,{_ts:4000,workouts:copy(source),
      trainingControl:{...base().trainingControl,hybrid2:{bad:'old'} } })
    const B=base(K5,{_ts:2000,workouts:copy(source.slice(0,15)),
      trainingControl:{...base().trainingControl,hybrid2:{bad:'staler'} } })
    const merged=mergeStates(A,B)
    expect(merged.trainingControl.hybrid2Diagnostics.status).toBe('LEARNING')
    expect(merged.trainingControl.hybrid2Error).toBeUndefined()
    const again=mergeStates(merged,B)
    expect(again.trainingControl.hybrid2).toEqual(merged.trainingControl.hybrid2)
    const twice=mergeStates(again,B)
    expect(twice.trainingControl.hybrid2).toEqual(merged.trainingControl.hybrid2)
    expect(twice.trainingControl.hybrid2Diagnostics.lastDecisions.filter(x=>x.epochReset)).toHaveLength(1)
  })
  it('different adapter versions or enabled flags from offline devices need explicit resolution', () => {
    const A=base(SYN4,{_ts:1000})
    const B=base(SYN4,{_ts:2000})
    B.trainingControl.hybrid2Config.adapter.planVersion='2'
    for(const out of [mergeStates(A,B),mergeStates(B,A)]) {
      expect(out.trainingControl.hybrid2Conflict).toBeTruthy()
      expect(out.trainingControl.hybrid2Error).toMatch(/Conflicting plan adapter/)
      expect(out.trainingControl.hybrid2).toBeUndefined()
    }
    const C=base(SYN4)
    C.trainingControl.hybrid2Config.enabled=false
    expect(mergeStates(A,C).trainingControl.hybrid2Conflict).toBeTruthy()
  })
  it('equivalent adapter JSON with different object key order does not create a false offline conflict', () => {
    const A=base(SYN4,{_ts:1000}), B=base(SYN4,{_ts:2000})
    const old=B.trainingControl.hybrid2Config.adapter
    B.trainingControl.hybrid2Config.adapter=Object.fromEntries(Object.entries(old).reverse())
    const out=mergeStates(A,B)
    expect(out.trainingControl.hybrid2Conflict).toBeUndefined()
    expect(out.trainingControl.hybrid2Error).toBeUndefined()
    expect(out.trainingControl.hybrid2Diagnostics.status).toBe('LEARNING')
  })
  it('editing only workout dates changes cycle chronology and stops unsafe H1 acceptance', () => {
    const source=fixtureCycles(SYN4,[{reps:15},{reps:15}])
    const A=base(SYN4,{workouts:copy(source),_ts:3000})
    const B=base(SYN4,{workouts:copy(source),_ts:4000})
    B.workouts[0]._ts=7000
    B.workouts[0].start+=6*86400000
    B.workouts[0].d=new Date(B.workouts[0].start).toISOString().slice(0,10)
    const out=mergeStates(A,B)
    expect(out.trainingControl.hybrid2Diagnostics.status).toBe('INCOMPATIBLE')
    expect(out.trainingControl.hybrid2Error).toMatch(/structural position/)
  })
  it('normalizes H1 load across kg/lb unit changes without resetting the epoch', () => {
    const source=base(K5,{workouts:fixtureCycles(K5,[{reps:15},{reps:15},{reps:15},{reps:15}])})
    const initial=reconcileHybridHistory(source)
    expect(initial.status).toBe('NORMAL')
    const lb=convertStateUnit(source,'lb')
    expect(lb.workouts[0].exposures[0].hybrid2.unit).toBe('lb')
    const result=replayHybridHistory({workouts:lb.workouts,adapter:K5.adapter})
    expect(result.status).toBe('NORMAL')
    for(const signal of K5.adapter.signals) {
      const original=initial.state.anchors[signal.signalId]
      const converted=result.state.anchors[signal.signalId]
      expect(converted.perfCount).toBe(3)
      expect(Math.abs(converted.perfReference-original.perfReference)).toBeLessThan(1)
    }
    const restored=convertStateUnit(lb,'kg')
    const last=replayHybridHistory({workouts:restored.workouts,adapter:K5.adapter})
    expect(last.status).toBe('NORMAL')
  })
  it('reconciliation from edited history is deterministic and disabled mode remains opt-out', () => {
    const profile=base(M6,{workouts:fixtureCycles(M6,[{reps:15},{reps:15},{reps:15}])})
    const first=reconcileHybridHistory(profile)
    expect(first.status).toBe('NORMAL')
    const snapshot=copy(profile.trainingControl.hybrid2)
    profile.trainingControl.hybrid2={ fake:'stale', anchors:{ fake:1 } }
    expect(reconcileHybridHistory(profile).state).toEqual(snapshot)
    profile.trainingControl.hybrid2Config.enabled=false
    reconcileHybridHistory(profile)
    expect(profile.trainingControl.hybrid2Diagnostics.status).toBe('DISABLED')
  })
})
