// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'

const mocks=vi.hoisted(()=>({
  exConfigSheet:vi.fn(), exercisePicker:vi.fn(),glyphPicker:vi.fn(),
  confirmSheet:vi.fn(), menuSheet:vi.fn(), quickOccurrence:vi.fn(),
  supersetSheet:vi.fn(),printPlanSheet:vi.fn()
}))
vi.mock('../lib/api.js',()=>({api:vi.fn(()=>Promise.resolve({}))}))
vi.mock('../sheets.jsx',()=>mocks)
vi.mock('../components/Media.jsx',()=>({Thumb:()=>null}))
vi.mock('../components/BodyMap.jsx',()=>({default:()=>null}))
import RoutineEdit,{removeRoutineExercise} from './RoutineEdit.jsx'
import { DEF, useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { defaultPlanRule,joinProgressionGroup,validateProgressionGroups } from '../lib/prescription/index.js'

globalThis.IS_REACT_ACT_ENVIRONMENT=true
const BENCH='0025'
const clone=x=>JSON.parse(JSON.stringify(x))
const occ=(id,rid)=>({occurrenceId:id,exerciseId:BENCH,rule:
  defaultPlanRule('linear',{id:'rule-'+id,routineId:rid,exerciseId:BENCH,
    sets:{min:2,max:2},reps:{min:6,max:8},load:{mode:'absolute',value:100,unit:'kg'},
    completion:[],target:{mode:'none'}})})
let host,root
function mount(){
  const S=clone(DEF)
  S.routines=[{id:'MON',name:'Monday',ex:[occ('bench-mon','MON')]},
    {id:'FRI',name:'Friday',ex:[occ('bench-fri','FRI')]}]
  joinProgressionGroup(S,'bench-mon','bench-fri',()=> 'bench-main')
  useStore.setState({S,user:null})
  host=document.createElement('div')
  document.body.appendChild(host)
  root=createRoot(host)
  act(()=>root.render(<MemoryRouter initialEntries={['/plan/r/MON']}>
    <Routes><Route path="/plan/r/:id" element={<RoutineEdit/>}/></Routes>
  </MemoryRouter>))
}
beforeEach(()=>{
  localStorage.clear()
  Object.values(mocks).forEach(m=>m.mockReset())
  useUI.setState({toastMsg:''})
})
afterEach(()=>{if(root)act(()=>root.unmount());host?.remove();root=null;host=null})

describe('RoutineEdit grouped progression safety',()=>{
  it('refuses a repetition-range change that would silently invalidate a shared group',()=>{
    mount()
    const before=clone(useStore.getState().S.routines[0].ex[0])
    act(()=>host.querySelector('[data-routine-row] .tap-main').click())
    const save=mocks.exConfigSheet.mock.lastCall[2]
    const modified=clone(before)
    modified.rule.program.phases[0].parameters.reps={min:8,max:10}
    act(()=>save(modified))
    expect(useStore.getState().S.routines[0].ex[0]).toEqual(before)
    expect(useUI.getState().toastMsg).toMatch(/repetition ranges must match/)
    expect(()=>validateProgressionGroups(useStore.getState().S)).not.toThrow()
  })
  it('requires explicit unlink before deleting a grouped exercise',()=>{
    mount()
    let removed
    act(()=>{removed=removeRoutineExercise('MON',0)})
    expect(removed).toBe(false)
    expect(useStore.getState().S.routines[0].ex).toHaveLength(1)
    expect(useUI.getState().toastMsg).toBe('Separate progression first')
  })
  it('prevents deleting a whole routine that still has a grouped member',()=>{
    mount()
    act(()=>host.querySelector('.re-bar [aria-label="More"]').click())
    const menu=mocks.menuSheet.mock.lastCall[0]
    const del=menu.sections.flatMap(s=>s.items).find(i=>i.label==='Delete routine')
    act(()=>del.onClick())
    expect(mocks.confirmSheet).not.toHaveBeenCalled()
    expect(useStore.getState().S.routines).toHaveLength(2)
    expect(useUI.getState().toastMsg).toBe('Separate progression first')
  })
  it('stores an unlink/relink through the real profile draft and sync edit-stamping path',()=>{
    mount()
    const open=()=>{act(()=>host.querySelector('[aria-label="Progression group"]').click());return mocks.menuSheet.mock.lastCall[0]}
    const before=useStore.getState().S
    act(()=>open().sections.at(-1).items[0].onClick())
    expect(useStore.getState().S.progressionGroups.groups).toEqual([])
    expect(useStore.getState().S.edited?.progressionGroups).toBeGreaterThan(0)
    const choices=open().sections[0].items
    expect(choices).toHaveLength(1)
    expect(choices[0].disabled).toBe(false)
    act(()=>choices[0].onClick())
    const after=useStore.getState().S
    expect(after.progressionGroups.groups[0].members).toEqual(['bench-mon','bench-fri'])
    expect(after).not.toBe(before)
    expect(()=>validateProgressionGroups(after)).not.toThrow()
  })
})
