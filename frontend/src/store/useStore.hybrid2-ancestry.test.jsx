// @vitest-environment happy-dom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { makeHybridHistoryWitness } from '../../../api/training-control/hybrid2/history-ancestry.js'
import { K5 } from '../../../api/training-control/hybrid2/fixtures/reference-adapters.js'
import { fixtureCycles } from '../../../api/training-control/hybrid2/fixtures/cycles.js'
vi.mock('../lib/api.js', () => ({ setAccessHeaders: vi.fn(), api: vi.fn() }))
vi.mock('./useUI.js', () => ({ useUI: { getState: () => ({ toast: vi.fn() }) } }))
import { api } from '../lib/api.js'
import { DEF, useStore } from './useStore.js'

const copy = value => structuredClone(value)
function profile() {
  return { ...copy(DEF), engineSchemaVersion: 2, unit: 'kg', _ts: 1000,
    routines: copy(K5.routines),
    workouts: fixtureCycles(K5, [{ reps: 15 }]),
    trainingControl: { hybrid2Config: { enabled: true, version: 1,
      adapter: copy(K5.adapter) } } }
}
const changed = (profile, index, reps) => {
  profile.workouts[index].exposures[0].performance.sets[0].observations[0].value = reps
  profile.workouts[index]._ts = 2500
  profile._ts = 3000
}
const puts = () => api.mock.calls.filter(([, opts]) => opts?.method === 'PUT')
const gets = () => api.mock.calls.filter(([path]) => path === '/api/data' && !api.mock.calls.find(([p,o]) => p === path && o?.method === 'PUT'))
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
describe('explicit H1 workout authorization before the server accepts edits', () => {
  it('shows server-confirmed preview IDs and cannot approve a different changed set', async () => {
    const initial=profile(),local=copy(initial)
    changed(local,0,13)
    useStore.setState({ S: local, user: { id: 'account-1' }, ready: true })
    localStorage.setItem('gym_sync', JSON.stringify({ rev: 9, wid: 'wid-9', ts: 1000 }))
    const reviewed=[{id:initial.workouts[0].id,from:'old-sha',to:'new-sha'}]
    api.mockResolvedValueOnce({ requiresExplicitApproval:true,
      changedWorkoutIds:[initial.workouts[0].id],changes:reviewed })
    const expected=await useStore.getState().previewH1HistoryChanges()
    expect(expected).toEqual({changedWorkoutIds:[initial.workouts[0].id],changes:reviewed})
    const previewBody=JSON.parse(api.mock.calls[0][1].body)
    expect(previewBody.confirmed).toBe('PREVIEW_EXISTING_H1_HISTORY_CHANGES')
    expect(api.mock.calls.some(([url,opts])=>url==='/api/data'&&opts?.method==='PUT')).toBe(false)
    api.mockResolvedValueOnce({ token:'TOKEN',
      changedWorkoutIds:[initial.workouts[0].id],
      changes:[{id:initial.workouts[0].id,from:'old-sha',to:'CHANGED-SHA'}] })
    await expect(useStore.getState().approveH1HistoryChanges(expected))
      .rejects.toThrow('review again')
    expect(puts()).toHaveLength(0)
  })

  it('never auto-mints a token; owner can explicitly approve the exact edits once', async () => {
    const initial=profile(), local=copy(initial)
    changed(local,1,12)
    useStore.setState({ S: local, user: { id: 'account-1' }, ready: true })
    localStorage.setItem('gym_sync', JSON.stringify({ rev: 9, wid: 'wid-9', ts: 1000 }))
    api.mockRejectedValueOnce({status:428,data:{error:'h1-approval-required'}})
    await useStore.getState().pushState()
    expect(useStore.getState().sync.lastError?.code).toBe('hybrid2-review')
    expect(api.mock.calls.some(([url])=>url==='/api/data/h1-authorize')).toBe(false)
    expect(puts()).toHaveLength(1)
    api.mockResolvedValueOnce({token:'SIGNED-ONE-TIME-TOKEN',
      changedWorkoutIds:[initial.workouts[1].id]})
    api.mockResolvedValueOnce({ok:true,rev:10,wid:'wid-10'})
    const approved=await useStore.getState().approveH1HistoryChanges()
    expect(approved).toEqual([initial.workouts[1].id])
    const calls=api.mock.calls
    const authorize=calls.find(([path])=>path==='/api/data/h1-authorize')
    expect(authorize[1].method).toBe('POST')
    expect(JSON.parse(authorize[1].body)).toMatchObject({
      confirmed:'APPROVE_EXISTING_H1_HISTORY_CHANGES',
      baseRev:9,baseWid:'wid-9'
    })
    expect(puts()).toHaveLength(2)
    expect(JSON.parse(puts()[1][1].body)).toMatchObject({
      h1Authorization:'SIGNED-ONE-TIME-TOKEN',baseRev:9,baseWid:'wid-9'
    })
    expect(useStore.getState().sync.status).toBe('ok')
    await useStore.getState().pushState()
    expect(puts()).toHaveLength(3)
    expect(JSON.parse(puts()[2][1].body).h1Authorization).toBeUndefined()
  })
})

describe('dirty GET refresh must use server-verified H1 revision witness', () => {
  it('merges an unopposed H1 result correction on pull and PUTs against refreshed revision', async () => {
    const ancestor=profile(), local=copy(ancestor), remote=copy(ancestor)
    changed(local, 1, 12)
    remote.restSec = 75
    remote._ts = 9000
    remote._wid = 'wid-2'
    useStore.setState({ S: local, user: { id: 'account-1' }, ready: true })
    localStorage.setItem('gym_sync', JSON.stringify({ rev: 1, wid: 'wid-1', ts: 1000 }))
    localStorage.setItem('gym_dirty', '1')
    api.mockResolvedValueOnce({ state: remote, rev: 2, hybrid2Ancestor:
      makeHybridHistoryWitness(ancestor, 1, 'wid-1') })
    api.mockResolvedValueOnce({ ok: true, rev: 3, wid: 'wid-3' })
    await useStore.getState().pullState()
    const request = api.mock.calls.find(([path]) => path === '/api/data')
    expect(request[1].headers).toMatchObject({
      'x-opengym-h1-base-rev': '1', 'x-opengym-h1-base-wid': 'wid-1'
    })
    expect(puts()).toHaveLength(1)
    expect(JSON.parse(puts()[0][1].body).baseRev).toBe(2)
    const result=useStore.getState().S
    expect(result.trainingControl.hybrid2HistoryConflict).toBeUndefined()
    expect(result.workouts[1].exposures[0].performance.sets[0].observations[0].value).toBe(12)
    expect(result.restSec).toBe(75)
  })

  it('does not trust a 409 or GET ancestry witness with the wrong original write ID', async () => {
    const ancestor=profile(), local=copy(ancestor), remote=copy(ancestor)
    changed(local,1,12)
    remote._ts=9000
    remote._wid='wid-2'
    useStore.setState({ S: local, user: { id: 'account-1' }, ready: true })
    localStorage.setItem('gym_sync', JSON.stringify({ rev: 1, wid: 'wid-1', ts: 1000 }))
    localStorage.setItem('gym_dirty', '1')
    api.mockResolvedValueOnce({ state: remote, rev: 2, hybrid2Ancestor:
      makeHybridHistoryWitness(ancestor, 1, 'wrong-wid') })
    await useStore.getState().pullState()
    expect(puts()).toHaveLength(0)
    expect(useStore.getState().S.trainingControl.hybrid2HistoryConflict).toBeDefined()
    expect(useStore.getState().sync.lastError?.code).toBe('hybrid2-review')
  })
})
