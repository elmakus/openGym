// @vitest-environment happy-dom
// Timed Load: the row's menu records an explicitly invalid hold despite Done+target time.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Workout from './Workout.jsx'
import { DEF, useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { SIDE_PLANK_TIMED_CONFIG as config, initialTimedState } from '../../../api/training-control/timed-load.js'
import { exposuresWithPerformance } from '../lib/session-ui-adapter.js'
import { replayTimedLoadHistory } from '../../../api/training-control/timed-load-history.js'

vi.mock('../lib/sound.js', () => ({ beep: vi.fn(), vibrate: vi.fn(), alertBuzz: vi.fn(), unlock: vi.fn(), restOver: vi.fn() }))
vi.mock('../lib/api.js', () => ({ api: vi.fn(() => Promise.resolve({})), appBase: () => '/' }))
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const copy = x => JSON.parse(JSON.stringify(x))
let root,container
const sheets = []

beforeEach(() => { useUI.setState({ sheets: [], toastMsg: '', timer: null, work: null }) })
afterEach(() => {
  act(() => { sheets.splice(0).forEach(x => x.unmount()) })
  if(root)act(()=>root.unmount())
  container?.remove()
  root=container=null
})
function mount() {
  const S=copy(DEF)
  S.unit='kg';S.workoutView='list'
  S.workouts=[];S.prescriptions={};S.trainingControl={timedLoad:{}}
  const exposure={
    exposureId:'x-timed',exerciseId:'0089',mode:'time',trackId:'plank',
    timedLoad:{version:1,config,initialState:{...initialTimedState(config),initialized:true,load:0,target:30},unit:'kg'}
  }
  const A={id:'timed-test',d:'2026-11-09',start:Date.now(),name:'Timed Load',
    cur:0,routineId:null,exposures:[exposure],
    entries:[{id:'0089',exposureId:'x-timed',target:{mode:'time',sec:30,sets:2,side:true},
      sets:[0,1,2,3].map(i=>({sec:30,w:0,done:true,side:i%2?'R':'L'}))}]}
  useStore.setState({S,A,user:null})
  container=document.createElement('div');document.body.appendChild(container)
  root=createRoot(container)
  act(()=>root.render(<MemoryRouter><Workout /></MemoryRouter>))
}
function topSheet() {
  const sheet=useUI.getState().sheets.at(-1)
  expect(sheet).toBeTruthy()
  const host=document.createElement('div');document.body.appendChild(host)
  const node=createRoot(host);sheets.push(node)
  act(()=>node.render(sheet.render(()=>useUI.getState().closeSheet(sheet.id))))
  return host
}
describe('Timed Load technique recording UI',()=>{
  it('marks a finished hold as technique-invalid and keeps that failure through saved history',()=>{
    mount()
    const row=container.querySelectorAll('.setrow .n')[3]
    expect(row).toBeTruthy()
    act(()=>row.click())
    const menu=topSheet()
    const button=[...menu.querySelectorAll('button, [role="button"], .menu-item')]
      .find(el=>el.textContent.includes('Technique valid'))
    expect(button).toBeTruthy()
    act(()=>button.click())
    const active=useStore.getState().A
    expect(active.entries[0].sets[3]).toMatchObject({done:true,sec:30,techniqueValid:false})
    expect(container.querySelectorAll('.setrow .n')[3].getAttribute('aria-label')).toContain('Technique invalid')
    expect(active.entries[0].timedLoadPreview.nextTarget).toBe(30)
    const saved=exposuresWithPerformance(active.exposures,active.entries,'kg')
    expect(saved[0].performance.sets[3].techniqueValid).toBe(false)
    const workout={id:'w1',start:1000,end:new Date(2000).toISOString(),exposures:saved}
    expect(replayTimedLoadHistory([workout]).plank).toMatchObject({target:30,fails:1})
  })
})
