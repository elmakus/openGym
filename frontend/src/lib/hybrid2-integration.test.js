import { describe, expect, it } from 'vitest'
import { K5 } from '../../../api/training-control/hybrid2/fixtures/reference-adapters.js'
import { buildSessionExposures } from './session-start.js'
import { entriesForExposures } from './session-ui-adapter.js'
import { buildCompletedSession } from './finish-session.js'
import { ruleOccurrence } from './test-fixtures.js'
import { isWarmupRow } from './workout-model.js'
import { reconcileHybridHistory } from './hybrid2-sync.js'
import { replayAtp2History } from '../../../api/training-control/history.js'
import { replayTimedLoadHistory } from '../../../api/training-control/timed-load-history.js'
import { SIDE_PLANK_TIMED_CONFIG } from '../../../api/training-control/timed-load.js'
import { replayProgression } from './prescription/index.js'

const startAt = Date.UTC(2026, 10, 9, 10)
// Unlike generic controller fixtures, live openGym tracks use occurrenceId
// as their actual progression identity. Preserve topology and thresholds while
// explicitly binding identities to the real Engine v2 mapping.
const liveK5Adapter = structuredClone(K5.adapter)
for (const occurrence of liveK5Adapter.occurrences)
  if (occurrence.progressionIdentity !== null) occurrence.progressionIdentity = occurrence.occurrenceId
for (const signal of liveK5Adapter.signals) signal.progressionIdentity = signal.occurrence

const buildProfile = () => ({
  engineSchemaVersion: 2, unit: 'kg', restSec: 90, workouts: [],
  prescriptions: {}, progression: {}, oneRepMaxes: {}, bodyweight: [], exWeights: {},
  trainingControl: { hybrid2Config: { version: 1, enabled: true,
    adapter: structuredClone(liveK5Adapter) } },
  routines: K5.routines.map(r => ({ ...r, ex: r.ex.map(x => x.occurrenceId.endsWith(':closer')
    ? { ...ruleOccurrence('0089', { preset:'hold_seconds', occurrenceId: x.occurrenceId, routineId:r.id,
      options:{ sets:{ min:2, max:2 }, durationSeconds:{ min:30, max:30 } } }),
      side:true, warmup:'none', timedLoad:{...SIDE_PLANK_TIMED_CONFIG,enabled:true} }
    : { ...ruleOccurrence('0025', { occurrenceId: x.occurrenceId, routineId: r.id, options: {
      sets: { min: 3, max: 3 }, reps: { min: 8, max: 16 },
      load: { mode: 'absolute', value: 100, unit: 'kg' },
      completion: []
    } }),
    atp2: { enabled: true, floorWeight: 10 }
  }) }))
})
const trainPosition = (S, cycle, slot, reps) => {
  const now = startAt + (cycle * 5 + slot) * 86400000
  const routine = S.routines[slot]
  const exposures = buildSessionExposures(S, routine, { now, newId: s => s, unit: S.unit })
  const entries = entriesForExposures(exposures, S.prescriptions)
  const frozen = exposures.every(x => x.hybrid2?.deloadFrozen === true)
  if (frozen) {
    expect(exposures.every(x => x.excludedFromProgression)).toBe(true)
    expect(entries.every(x => x.noProg === true)).toBe(true)
    expect(entries.every(x => x.sets.filter(row => !isWarmupRow(row)).length === 2)).toBe(true)
  }
  for (const entry of entries) {
    const exposure=exposures.find(x=>x.exposureId===entry.exposureId)
    if (exposure?.timedLoad?.version===1) {
      for (const row of entry.sets.filter(row=>!isWarmupRow(row))) {
        row.done=true
        row.sec=entry.target?.sec || 30
      }
    } else {
      const first = entry.sets.find(row => !isWarmupRow(row))
      first.done = true
      first.r = reps
    }
  }
  const active = { id:'h2-ui-'+cycle+'-'+slot, start:now,
    d:new Date(now).toISOString().slice(0,10),
    name:routine.name, routineIds:[routine.id], exposures, entries }
  const result = buildCompletedSession(active, S, {
    end:now + 3600000, newId:s=>s, unit:S.unit
  })
  expect(result.session.exposures.length).toBe(exposures.length)
  if (frozen) {
    expect(result.progression).toEqual({})
    expect(result.atp2States).toEqual({})
    expect(result.timedLoadStates).toEqual({})
    expect(result.session.exposures.every(x=>x.excludedFromProgression)).toBe(true)
  }
  S.workouts.push(result.session)
  Object.assign(S.progression,result.progression)
  S.trainingControl.atp2={...S.trainingControl.atp2,...result.atp2States}
  S.trainingControl.timedLoad={...S.trainingControl.timedLoad,...result.timedLoadStates}
  const replayed=reconcileHybridHistory(S)
  expect(replayed).not.toBeNull()
  return { result, replayed, frozen }
}
const cycle = (S, index, reps) => {
  let last
  for(let position=0;position<5;position++) last=trainPosition(S,index,position,reps)
  return last
}

describe('HYBRID-2 actual Engine v2 session -> rows -> finish -> history -> next prescription', () => {
  it('does not opt in automatically; invalid adapters fail closed before creating a workout', () => {
    const s=buildProfile()
    s.trainingControl.hybrid2Config.enabled=false
    const regular=buildSessionExposures(s,s.routines[0],{now:startAt,newId:x=>x,unit:'kg'})
    expect(regular[0].hybrid2).toBeUndefined()
    s.trainingControl.hybrid2Config.enabled=true
    s.trainingControl.hybrid2Config.adapter.planVersion=''
    expect(()=>buildSessionExposures(s,s.routines[0],{now:startAt,newId:x=>x,unit:'kg'}))
      .toThrow(/HYBRID-2 adapter/)
    expect(s.workouts).toHaveLength(0)
  })

  it('keeps historical native progression identities when the HYBRID-2 monitor is paused', () => {
    const s = buildProfile()
    // Unlike the normal K5 test mapping, the source-native identity differs
    // from the routine occurrence ID (as it does for original M6 e.key groups).
    s.trainingControl.hybrid2Config.adapter = structuredClone(K5.adapter)
    const first = trainPosition(s, 0, 0, 12)
    const nativeId = K5.adapter.occurrences[0].progressionIdentity
    const occurrenceId = K5.adapter.occurrences[0].occurrenceId
    expect(nativeId).not.toBe(occurrenceId)
    expect(first.result.session.exposures[0].trackId).toBe(nativeId)
    s.trainingControl.hybrid2Config.enabled = false
    reconcileHybridHistory(s)
    const next = buildSessionExposures(s, s.routines[0], {
      now: startAt + 5 * 86400000, newId: x => x, unit: s.unit
    })
    expect(next[0].hybrid2).toBeUndefined()
    expect(next[0].trackId).toBe(nativeId)
    expect(s.prescriptions[next[0].prescriptionId].trackId).toBe(nativeId)
    // Wednesday has no completed native exposure yet, but it belongs to the
    // same pinned adapter and must not silently change identity on pause.
    const neverPerformed = buildSessionExposures(s, s.routines[1], {
      now: startAt + 6 * 86400000, newId: x => x, unit: s.unit
    })
    expect(neverPerformed[0].hybrid2).toBeUndefined()
    expect(neverPerformed[0].trackId).toBe(K5.adapter.occurrences[1].progressionIdentity)
  })

  it('runs full K5 cycles and freezes ATP2/Engine for the standard deload, then H1 relearns', () => {
    const s=buildProfile()
    for(let i=0;i<3;i++) {
      const c=cycle(s,i,14)
      expect(c.replayed.status).toBe(i===2?'NORMAL':'LEARNING')
    }
    const normal=cycle(s,3,14)
    expect(normal.replayed.status).toBe('NORMAL')
    const weak=cycle(s,4,10)
    expect(weak.replayed.status).toBe('QUEUED')
    const priorStates=structuredClone(s.trainingControl.atp2)
    const priorTimed=structuredClone(s.trainingControl.timedLoad)
    const priorEngine=structuredClone(s.progression)
    const preDeloadCount=s.workouts.length
    const deload=cycle(s,5,10)
    expect(deload.frozen).toBe(true)
    expect(deload.replayed.status).toBe('LEARNING')
    expect(s.trainingControl.atp2).toEqual(priorStates)
    expect(s.trainingControl.timedLoad).toEqual(priorTimed)
    expect(replayTimedLoadHistory(s.workouts)).toEqual(replayTimedLoadHistory(s.workouts.slice(0,preDeloadCount)))
    expect(s.progression).toEqual(priorEngine)
    expect(replayAtp2History(s.workouts)).toEqual(replayAtp2History(s.workouts.slice(0,preDeloadCount)))
    for(const sig of K5.adapter.signals) {
      expect(deload.replayed.state.anchors[sig.signalId].perfCount).toBe(0)
      expect(deload.replayed.state.anchors[sig.signalId].perfReference).toBe(0)
      const progressionState = replayProgression({
        workouts:s.workouts,trackId:sig.progressionIdentity,prescriptions:s.prescriptions
      })
      expect(progressionState).toBeNull() // all H1 signal exercises are exclusively ATP2
    }
    for(let i=6;i<9;i++) {
      const fresh=cycle(s,i,10)
      expect(fresh.replayed.status).toBe(i===8?'NORMAL':'LEARNING')
      expect(fresh.replayed.decisions.at(-1).evaluation?.queueDeload).toBe(false)
    }
    for(let i=9;i<12;i++) {
      const stable=cycle(s,i,10)
      expect(stable.replayed.status).toBe('NORMAL')
      expect(stable.replayed.decisions.at(-1).evaluation.weakCount).toBe(0)
    }
    const decline=cycle(s,12,6)
    expect(decline.replayed.status).toBe('QUEUED')
    const second=cycle(s,13,6)
    expect(second.replayed.status).toBe('LEARNING')
    expect(second.replayed.decisions.filter(x=>x.epochReset)).toHaveLength(2)
  })
})
