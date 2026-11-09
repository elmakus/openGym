import { describe, expect, it } from 'vitest'
import { ruleOccurrence } from './test-fixtures.js'
import { editPlan } from './prescription/index.js'
import { buildSessionExposures } from './session-start.js'
import { entriesForExposures } from './session-ui-adapter.js'
import { buildCompletedSession } from './finish-session.js'
import { editCompletedSession, saveWorkoutEdit, deleteEditedWorkout, reconcileAtp2History } from './session-edit.js'
import { replayAtp2History } from '../../../api/training-control/history.js'

const start = 1_800_000_000_000
const occ = () => {
  const o = ruleOccurrence('0025')
  return { ...o, atp2: { enabled: true, floorWeight: 5 },
    rule: editPlan(o.rule, {
      reps: { min: 8, max: 12 }, sets: { min: 3, max: 3 },
      load: { mode: 'absolute', value: 20, unit: 'kg' }
    }) }
}
const setup = () => {
  const o = occ()
  const S = {
    active: null, unit: 'kg', workouts: [], prescriptions: {}, oneRepMaxes: {},
    progression: {}, trainingControl: {}, exWeights: {}, routines: [{ id: 'routine', ex: [o] }]
  }
  const exposures = buildSessionExposures(S, S.routines[0], {
    now: start, newId: x => x, unit: 'kg'
  })
  const entries = entriesForExposures(exposures, S.prescriptions)
  entries[0].sets[0].r = 12
  entries[0].sets[0].done = true
  const active = { id: 'logged', d: '2027-01-15', start, name: 'Test',
    routineIds: ['routine'], exposures, entries }
  const output = buildCompletedSession(active, S, {
    end: start + 360000, newId: x => x, unit: 'kg'
  })
  S.workouts.push(output.session)
  S.trainingControl.atp2 = output.atp2States
  return { S, trackId: exposures[0].trackId }
}

describe('ATP2 local history corrections', () => {
  it('edits a completed rep result and recomputes the persisted candidate immediately', () => {
    const { S, trackId } = setup()
    expect(S.trainingControl.atp2[trackId].candidate).toBe(22.5)
    editCompletedSession(S, 'logged')
    S.active.entries[0].sets[0].r = 10
    saveWorkoutEdit(S, start + 900000)
    expect(S.active).toBeNull()
    expect(S.trainingControl.atp2[trackId].candidate).toBe(20)
    expect(S.trainingControl.atp2).toEqual(replayAtp2History(S.workouts))
  })

  it('deletes an ATP2 workout and clears now-orphaned progression', () => {
    const { S, trackId } = setup()
    editCompletedSession(S, 'logged')
    expect(deleteEditedWorkout(S)).toBe(true)
    expect(S.trainingControl.atp2[trackId]).toBeUndefined()
    expect(S.trainingControl.atp2).toEqual({})
  })

  it('rebuilds ATP2 after chronological edits and remains idempotent', () => {
    const { S } = setup()
    const changed = structuredClone(S.workouts[0])
    changed.id = 'earlier'
    changed.start -= 86400000
    changed.exposures[0].exposureId = 'earlier-exp'
    changed.exposures[0].performance.sets[0].observations[0].value = 8
    S.workouts.push(changed)
    reconcileAtp2History(S)
    expect(S.trainingControl.atp2).toEqual(replayAtp2History(S.workouts))
    const once = structuredClone(S.trainingControl)
    reconcileAtp2History(S)
    expect(S.trainingControl).toEqual(once)
  })
})
