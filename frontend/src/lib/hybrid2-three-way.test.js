import { describe, it, expect } from 'vitest'
import { mergeStates, stampDeletions } from './sync-merge.js'
import { makeHybridHistoryWitness } from '../../../api/training-control/hybrid2/history-ancestry.js'
import { K5 } from '../../../api/training-control/hybrid2/fixtures/reference-adapters.js'
import { fixtureCycles } from '../../../api/training-control/hybrid2/fixtures/cycles.js'

const copy = value => structuredClone(value)
const workouts = () => fixtureCycles(K5, [{ reps: 15 }, { reps: 15 }])
const base = rows => ({
  engineSchemaVersion: 2, unit: 'kg', _ts: 100,
  routines: copy(K5.routines), workouts: copy(rows),
  prescriptions: {}, progression: {}, oneRepMaxes: {},
  trainingControl: { hybrid2Config: { enabled: true, version: 1,
    adapter: copy(K5.adapter) } }
})
const change = (profile, index, reps, stamp) => {
  profile.workouts[index].exposures[0].performance.sets[0].observations[0].value = reps
  profile.workouts[index]._ts = stamp
}
const reviewed = (original, left, right) => mergeStates(left, right, {
  hybrid2Ancestor: makeHybridHistoryWitness(original, 10, 'server-wid-10')
})

describe('three-way native H1 history revision merge', () => {
  it('accepts one sided correction when another device still has the exact ancestor', () => {
    const initial = base(workouts().slice(0, 5))
    const left = copy(initial), right = copy(initial)
    change(left, 1, 12, 200)
    right._ts = 9000
    const out = reviewed(initial, left, right)
    expect(out.trainingControl.hybrid2HistoryConflict).toBeUndefined()
    expect(out.trainingControl.hybrid2Diagnostics.status).not.toBe('INCOMPATIBLE')
    expect(out.workouts[1].exposures[0].performance.sets[0].observations[0].value).toBe(12)
  })

  it('accepts different edits of two H1 workouts in the same cycle', () => {
    const initial = base(workouts().slice(0, 5))
    const left = copy(initial), right = copy(initial)
    change(left, 0, 12, 200)
    change(right, 2, 11, 300)
    const out = reviewed(initial, left, right)
    expect(out.trainingControl.hybrid2HistoryConflict).toBeUndefined()
    expect(out.workouts[0].exposures[0].performance.sets[0].observations[0].value).toBe(12)
    expect(out.workouts[2].exposures[0].performance.sets[0].observations[0].value).toBe(11)
  })

  it('keeps both branches on concurrent edits of same completed set', () => {
    const initial = base(workouts().slice(0, 5))
    const left = copy(initial), right = copy(initial)
    change(left, 1, 11, 200)
    change(right, 1, 9, 300)
    const out = reviewed(initial, left, right)
    expect(out.trainingControl.hybrid2HistoryConflict?.entries.map(e => e.id))
      .toContain(initial.workouts[1].id)
    expect(out.trainingControl.hybrid2Diagnostics.status).toBe('INCOMPATIBLE')
    expect(out.trainingControl.hybrid2).toBeUndefined()
  })

  it('holds a deletion of a previous H1 workout when other device completed a successor', () => {
    const initial = base(workouts().slice(0, 5))
    const left = copy(initial), right = copy(initial)
    right.workouts.push(copy(workouts()[5]))
    left.workouts.splice(2, 1)
    stampDeletions(initial, left, 900)
    const out = reviewed(initial, left, right)
    expect(out.trainingControl.hybrid2Diagnostics.status).toBe('INCOMPATIBLE')
    expect(out.trainingControl.hybrid2HistoryConflict).toBeTruthy()
    expect(out.trainingControl.hybrid2).toBeUndefined()
    expect(out.trainingControl.hybrid2HistoryConflict.entries.find(
      e => e.id === initial.workouts[2].id
    )?.local).toBeNull()
  })

  it('does not silently accept a moved older H1 workout versus an offline successor', () => {
    const initial = base(workouts().slice(0, 5))
    const left = copy(initial), right = copy(initial)
    right.workouts.push(copy(workouts()[5]))
    left.workouts[1].start += 12 * 86400000
    left.workouts[1].d = new Date(left.workouts[1].start).toISOString().slice(0, 10)
    left.workouts[1]._ts = 900
    const out = reviewed(initial, left, right)
    expect(out.trainingControl.hybrid2Diagnostics.status).toBe('INCOMPATIBLE')
    expect(out.trainingControl.hybrid2HistoryConflict).toBeTruthy()
  })
})
