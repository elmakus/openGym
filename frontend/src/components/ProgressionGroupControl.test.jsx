// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { defaultPlanRule } from '../lib/prescription/index.js'

const mock=vi.hoisted(()=>({menuSheet:vi.fn()}))
vi.mock('../sheets.jsx',()=>({menuSheet:mock.menuSheet}))
import ProgressionGroupControl from './ProgressionGroupControl.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT=true
const bench='0025'
const make=(id,rid,reps={min:6,max:8},exerciseId=bench)=>({
  occurrenceId:id,exerciseId,
  rule:defaultPlanRule('linear',{id:'rule-'+id,routineId:rid,exerciseId,
    sets:{min:2,max:2},reps,load:{mode:'absolute',value:100,unit:'kg'},completion:[],target:{mode:'none'}})
})
const fixture=()=>({
  routines:[
    {id:'MON',name:'Monday',ex:[make('bench-mon','MON')]},
    {id:'WED',name:'Wednesday',ex:[make('other','WED',{min:8,max:8},'0001'),
      make('bench-wed','WED',{min:10,max:12})]},
    {id:'FRI',name:'Friday',ex:[make('bench-fri','FRI')]}
  ],workouts:[],prescriptions:{},progression:{}
})
let host,root,profile,toast,update
const occur=id=>profile.routines.flatMap(r=>r.ex).find(x=>x.occurrenceId===id)
function mount(id='bench-mon'){
  if(!host){host=document.createElement('div');document.body.appendChild(host);root=createRoot(host)}
  act(()=>root.render(<ProgressionGroupControl profile={profile} occurrence={occur(id)}
    toast={toast} update={update}/>))
}
const menu=()=>{
  act(()=>host.querySelector('[aria-label="Progression group"]').click())
  return mock.menuSheet.mock.lastCall[0]
}
beforeEach(()=>{
  profile=fixture();mock.menuSheet.mockReset()
  toast=vi.fn();update=vi.fn(fn=>fn(profile))
})
afterEach(()=>{if(root)act(()=>root.unmount());host?.remove();host=null;root=null})

describe('selective progression group control',()=>{
  it('shows only matching catalogue movements and disables a different repetition range',()=>{
    mount()
    const m=menu()
    expect(m.title).toBe('Progression group')
    expect(m.sections[0].items.map(x=>x.label)).toEqual(['Wednesday · #2','Friday · #1'])
    expect(m.sections[0].items[0].disabled).toBe(true)
    expect(m.sections[0].items[0].sub).toMatch(/repetition ranges must match/)
    expect(m.sections[0].items[1].disabled).toBe(false)
    act(()=>m.sections[0].items[1].onClick())
    expect(profile.progressionGroups.groups).toEqual([
      expect.objectContaining({members:['bench-mon','bench-fri']})
    ])
    expect(toast).not.toHaveBeenCalled()
  })
  it('allows removing a clean-start member, restoring independent progression',()=>{
    mount()
    act(()=>menu().sections[0].items[1].onClick())
    mount()
    const m=menu()
    expect(m.sections.at(-1).items[0].label).toBe('Separate progression')
    act(()=>m.sections.at(-1).items[0].onClick())
    expect(profile.progressionGroups.groups).toEqual([])
    expect(toast).not.toHaveBeenCalled()
  })
  it('never offers a link when there is no other occurrence of that exercise',()=>{
    mount('other')
    expect(host.querySelector('[aria-label="Progression group"]')).toBeNull()
  })
})
