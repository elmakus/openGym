import { describe, it, expect } from 'vitest'
import { slotTimedConfig, timedConfigError } from './TimedLoadConfigFields.jsx'
import { SIDE_PLANK_TIMED_CONFIG as side } from '../../../api/training-control/timed-load.js'

describe('Timed Load exercise setting controls',()=>{
  it('derives side/set count from actual occurrence instead of keeping stale configuration',()=>{
    const c=slotTimedConfig(side,3,false)
    expect(c).toMatchObject({setsPerSide:3,unilateral:false})
    expect(timedConfigError(c,3,false)).toBeNull()
    expect(timedConfigError(c,2,true)).toBeNull()
  })
  it('rejects malformed ladders and a starting load unavailable on actual equipment',()=>{
    const broken={...side,ladderKg:[0,2,5],startLoadKg:3}
    expect(timedConfigError(broken,2,true)).toContain('startLoadKg')
    expect(timedConfigError({...side,ladderKg:[0,2,2]},2,true)).toContain('ladder')
  })
  it('normal 30/35/40/45 ladder and 25s emergency are coherent',()=>{
    expect(timedConfigError(side,2,true)).toBeNull()
    expect(timedConfigError({...side,emergencyTime:30},2,true)).toContain('emergencyTime')
  })
})
