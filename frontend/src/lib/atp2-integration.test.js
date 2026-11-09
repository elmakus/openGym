import { describe, it, expect } from 'vitest'
import { editPlan, replayProgression } from './prescription/index.js'
import { ruleOccurrence } from './test-fixtures.js'
import { buildSessionExposures } from './session-start.js'
import { entriesForExposures } from './session-ui-adapter.js'
import { refreshAtp2Live } from './atp2-session.js'
import { buildCompletedSession } from './finish-session.js'
import { replayAtp2History } from '../../../api/training-control/history.js'

const ctx = { now: Date.UTC(2026, 10, 9), newId: s => s, unit: 'kg' }
const profile = () => ({ unit: 'kg', workouts: [], prescriptions: {}, progression: {}, oneRepMaxes: {}, trainingControl: {} })
const occ = () => {
  const o = ruleOccurrence('0025')
  return { ...o, atp2: { enabled: true, floorWeight: 5 },
    rule: editPlan(o.rule, { reps: { min: 8, max: 12 },
      sets: { min: 3, max: 3 }, load: { mode: 'absolute', value: 20, unit: 'kg' } }) }
}
const session = (S, o = occ(), when = ctx.now) => {
  const exposures = buildSessionExposures(S, { id: 'r1', ex: [o] }, { ...ctx, now: when })
  return { id: String(when), name: 'Demo', d: '2026-11-09', start: when,
    exposures, entries: entriesForExposures(exposures, S.prescriptions) }
}

describe('ATP2 end-to-end flow within Engine v2', () => {
  it('never double-advances standard Engine v2; persists and replays the same ATP2 state', () => {
    const S = profile()
    const active = session(S)
    const exposure = active.exposures[0]
    expect(exposure.atp2.initialState.candidate).toBe(20)
    expect(active.entries[0].sets.filter(s => !s.warmup).map(s => s.r)).toEqual([1, 1, 1])

    active.entries[0].sets[0].r = 18
    active.entries[0].sets[0].done = true
    const first = refreshAtp2Live(active, 0)
    expect(first.nextSetLoad).toBe(25)
    expect(active.entries[0].sets[1].w).toBe(25)

    active.entries[0].sets[1].r = 10
    active.entries[0].sets[1].done = true
    refreshAtp2Live(active, 0)
    const done = buildCompletedSession(active, S, {
      end: ctx.now + 60000, newId: s => s, unit: 'kg'
    })
    expect(done.progression).toEqual({})
    expect(done.atp2States[exposure.trackId]).toMatchObject({ candidate: 25, probeActive: 0 })
    expect(done.session.exposures[0].atp2.version).toBe(1)
    expect(replayProgression({ workouts: [done.session], trackId: exposure.trackId, prescriptions: S.prescriptions })).toBeNull()
    expect(replayAtp2History([done.session])[exposure.trackId]).toEqual(done.atp2States[exposure.trackId])

    S.workouts.push(done.session)
    S.trainingControl = { atp2: done.atp2States }
    const next = session(S, occ(), ctx.now + 86400000)
    expect(next.exposures[0].atp2.initialState.candidate).toBe(25)
    expect(next.entries[0].sets[0].w).toBe(25)
  })
})
