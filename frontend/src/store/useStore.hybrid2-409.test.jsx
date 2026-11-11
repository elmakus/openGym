// @vitest-environment happy-dom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { unpackProfile } from '../../../api/migration/profile-pack.js'
import { fixtureCycles } from '../../../api/training-control/hybrid2/fixtures/cycles.js'
import { K5 } from '../../../api/training-control/hybrid2/fixtures/reference-adapters.js'
import { replayHybridHistory } from '../../../api/training-control/hybrid2/history.js'
import { resolveHybridHistoryConflict } from '../lib/hybrid2-sync.js'
vi.mock('../lib/api.js', () => ({ setAccessHeaders: vi.fn(), api: vi.fn() }))
vi.mock('./useUI.js', () => ({ useUI: { getState: () => ({ toast: vi.fn() }) } }))
import { api } from '../lib/api.js'
import { DEF, useStore } from './useStore.js'

const copy = x => JSON.parse(JSON.stringify(x))
const error409 = state => Object.assign(new Error('conflict'), {
  status: 409, data: { error: 'conflict', rev: 2, state }
})
const puts = () => api.mock.calls.filter(([, options]) => options?.method === 'PUT')
function makeProfile(workouts, time) {
  return { ...copy(DEF), engineSchemaVersion: 2, unit: 'kg', _ts: time,
    routines: copy(K5.routines), workouts: copy(workouts), prescriptions: {},
    trainingControl: { hybrid2Config: { version: 1, enabled: true,
      adapter: copy(K5.adapter) } } }
}
beforeEach(() => {
  localStorage.clear()
  api.mockReset()
  useStore.setState({ S: copy(DEF), A: null, user: null, ready: false })
})
afterEach(() => {
  vi.useRealTimers()
  localStorage.clear()
  useStore.setState({ S: copy(DEF), A: null, user: null, ready: false })
})
describe('real store 409 HYBRID-2 structural conflict', () => {
  it('holds a valid-but-incompatible union locally, then pushes only explicit reviewed repair', async () => {
    const source = fixtureCycles(K5, [{ reps: 15 }, { reps: 15 }])
    const local = makeProfile(source.slice(0, 6), 3000)
    const anotherA = copy(source[5])
    anotherA.id = 'offline:another-day-a'
    anotherA.start += 12000
    const remote = makeProfile([...source.slice(0, 5), anotherA], 4000)
    expect(replayHybridHistory({ workouts: local.workouts, adapter: K5.adapter })).toBeTruthy()
    expect(replayHybridHistory({ workouts: remote.workouts, adapter: K5.adapter })).toBeTruthy()
    useStore.setState({ S: local, user: { id: 'account-1' }, ready: true })
    localStorage.setItem('gym_sync', JSON.stringify({ rev: 1, ts: 2000 }))
    api.mockRejectedValueOnce(error409(remote))
    await useStore.getState().pushState()
    expect(puts()).toHaveLength(1) // never retries the invalid merged H1 profile
    const pending = useStore.getState().S.trainingControl.hybrid2HistoryConflict
    expect(pending).toBeDefined()
    expect(pending.entries.map(e => e.id)).toContain(anotherA.id)
    expect(useStore.getState().sync).toMatchObject({
      pending: true, lastError: { code: 'hybrid2-review' }
    })
    expect(localStorage.getItem('gym_dirty')).toBe('1')
    // A repeated automatic push must remain blocked with the original records intact.
    await useStore.getState().pushState()
    expect(puts()).toHaveLength(1)
    const choices = Object.fromEntries(pending.entries.map(e => [e.id, 'local']))
    useStore.getState().update(s => resolveHybridHistoryConflict(s, choices))
    expect(useStore.getState().S.trainingControl.hybrid2HistoryConflict).toBeUndefined()
    expect(useStore.getState().S.trainingControl.hybrid2HistoryReviews[0].entries)
      .toEqual(pending.entries)
    api.mockResolvedValueOnce({ ok: true, rev: 3 })
    await useStore.getState().pushState()
    expect(puts()).toHaveLength(2)
    const sent = unpackProfile(JSON.parse(puts()[1][1].body).state)
    expect(sent.trainingControl.hybrid2Config.enabled).toBe(false)
    expect(sent.trainingControl.hybrid2HistoryReviews).toHaveLength(1)
    expect(sent.workouts).toHaveLength(6)
    expect(sent.workouts.some(w => w.id === anotherA.id)).toBe(false)
    expect(replayHybridHistory({ workouts: sent.workouts, adapter: K5.adapter })).toBeTruthy()
  })
})
