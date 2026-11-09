import { describe, expect, it } from 'vitest'
import { mergeStates } from './sync-merge.js'
import { convertStateUnit } from './units.js'
import { replayAtp2History } from '../../../api/training-control/history.js'

const weights = [5, 10, 15, 17.5, 20, 22.5, 25, 27.5, 30]
const spec = { version: 1, initialState: {
  candidate: 20, floorWeight: 5, minTarget: 8, maxTarget: 12,
  probeActive: 0, paired: 0
}, rounding: { mode: 'allowed_values', allowedValues: weights } }
const row = (weight, reps) => ({
  setId: 'r0', role: 'work', status: 'completed',
  observations: [{ metric: 'repetitions', value: reps }],
  resistance: { kind: 'external-load', value: weight, unit: 'kg' }
})
const workout = (id, start, weight, reps, initial = spec) => ({
  id, d: '2026-11-09', start, end: new Date(start + 3000).toISOString(),
  exposures: [{ trackId: 'track-atp2', exposureId: id + '-x',
    exerciseId: '0025', atp2: initial, performance: { sets: [row(weight, reps)] } }]
})
const base = over => ({
  unit: 'kg', restSec: 90, lang: 'en', week: { 1: ['r1'] }, dayPlan: {},
  workouts: [], routines: [], bodyweight: [], customEx: [], favEx: [],
  exWeights: {}, exNotes: {}, barWeights: {}, equipProfiles: [], gymCards: [],
  _ts: 0, ...over
})

describe('ATP2 after full openGym account sync', () => {
  it('merges workouts from separate devices and replays, never chooses stale candidates', () => {
    const a = base({ _ts: 2000,
      workouts: [workout('a', 1000, 20, 18)],
      trainingControl: { atp2: { 'track-atp2': { ...spec.initialState, candidate: 30 } } }
    })
    const b = base({ _ts: 1000,
      workouts: [workout('b', 2000, 25, 10, { ...spec,
        initialState: { ...spec.initialState, candidate: 25, probeActive: 1 } })],
      trainingControl: { atp2: { 'track-atp2': { ...spec.initialState, candidate: 5 } } }
    })
    const merged = mergeStates(a, b)
    expect(merged.workouts).toHaveLength(2)
    expect(merged.trainingControl.atp2['track-atp2']).toEqual(replayAtp2History(merged.workouts)['track-atp2'])
    expect(merged.trainingControl.atp2['track-atp2']).toMatchObject({ candidate: 25, probeActive: 0 })
    const reverse = mergeStates(b, a)
    expect(reverse.trainingControl.atp2['track-atp2']).toMatchObject({ candidate: 25, probeActive: 0 })
  })

  it('converts persistent state and historical ATP2 snapshots between kg and lb', () => {
    const source = base({
      workouts: [workout('a', 1000, 20, 18)],
      trainingControl: { atp2: { 'track-atp2': { ...spec.initialState, candidate: 25 } } },
      routines: [{ id: 'r1', name: 'Demo', ex: [{ occurrenceId: 'track-atp2', exerciseId: '0025' }] }]
    })
    const lb = convertStateUnit(source, 'lb')
    expect(lb.unit).toBe('lb')
    expect(lb.trainingControl.atp2['track-atp2'].candidate).toBeGreaterThan(50)
    expect(lb.workouts[0].exposures[0].atp2.initialState.candidate).toBeGreaterThan(40)
    expect(lb.workouts[0].exposures[0].atp2.rounding.allowedValues).not.toEqual(weights)
  })
})
