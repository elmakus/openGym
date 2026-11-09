import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  SIDE_PLANK_TIMED_CONFIG as side, SYNTHETIC_HOLD_TIMED_CONFIG as alternate,
  validateTimedConfig, validateTimedState, initialTimedState,
  nextTimedLoadUp, nextTimedLoadDown, transitionTimedLoad,
  evaluateTimedLoad, timedExposureSuccess, adaptTimedState
} from './timed-load.js'

const source = JSON.parse(readFileSync(new URL('./fixtures/timed-load-oracle-v1.json', import.meta.url)))
const decode = s => ({ initialized: true, load: s.load, target: s.target,
  fails: s.fails, provenance: s.provenance, emergency: s.emergency,
  bridgeTarget: s.bridge_target, bridgeProvenance: s.bridge_provenance })

test('original Python oracle parity on ALL generated Side Plank and synthetic traces', () => {
  assert.equal(source.oracle_git_blob, '9caa4778c291a652e08ed1342e2acef7ca83702b')
  assert.equal(source.cases.length, 4976)
  const byReason = new Set()
  for (const [index, x] of source.cases.entries()) {
    const cfg = x.config === 'side_plank' ? side : alternate
    const actual = transitionTimedLoad(decode(x.initial), x.success, cfg)
    try {
      assert.deepEqual(actual.state, decode(x.final))
      assert.equal(actual.reason, x.reason)
    } catch (e) { throw new Error('Oracle mismatch at case '+index+' '+x.config+': '+e.message) }
    byReason.add(x.reason)
  }
  for (const reason of ['top_success_load_increase', 'equipment_top_hold', 'normal_time_success',
    'new_load_emergency', 'emergency_failure_bridge', 'emergency_success_retry_normal_floor',
    'established_floor_bridge', 'bridge_return', 'second_failure_time_backoff',
    'first_failure_retry', 'absolute_floor_clamp', 'new_load_direct_backoff_bridge'])
    assert(byReason.has(reason), 'Missing oracle coverage for '+reason)
})

test('native asymmetric ladder: logical zero, odd lower steps, 9->10, maximum clamps', () => {
  for (const [a, b] of [[0,2],[1,3],[6,8],[9,10],[10,12.5],[12.5,15],[30,30]])
    assert.equal(nextTimedLoadUp(a, side), b)
  for (const [a, b] of [[0,0],[6,5],[10,9],[12.5,10],[30,27.5]])
    assert.equal(nextTimedLoadDown(a, side), b)
  assert.equal(nextTimedLoadUp(2, alternate), 5)
  assert.equal(nextTimedLoadDown(9, alternate), 2)
})

test('all 2x2 unilateral work sets must be complete and technically valid; no AMRAP bonus', () => {
  const s = { ...initialTimedState(side), initialized:true, load:6 }
  const complete = [0,1,2,3].map(i => ({ completed:true, side:i%2?'R':'L', seconds:30, weightKg:6 }))
  assert.equal(timedExposureSuccess(complete,s,side),true)
  assert.equal(timedExposureSuccess(complete.map(x => ({ ...x, seconds:120 })),s,side),true)
  for (let i=0;i<complete.length;i++) {
    const truncated=structuredClone(complete); truncated[i].completed=false
    assert.equal(timedExposureSuccess(truncated,s,side),false)
    const short=structuredClone(complete);short[i].seconds=29
    assert.equal(timedExposureSuccess(short,s,side),false)
    const bad=structuredClone(complete);bad[i].techniqueValid=false
    assert.equal(timedExposureSuccess(bad,s,side),false)
  }
  assert.equal(timedExposureSuccess(complete.slice(0,3),s,side),false)
  assert.equal(evaluateTimedLoad({ config:side,state:s,rows:[] }).counted,false)
  assert.equal(evaluateTimedLoad({ config:side,state:s,rows:complete.slice(0,2) }).nextState.fails,1)
  assert.equal(evaluateTimedLoad({ config:side,state:s,rows:complete.map(x=>({...x,seconds:1000})) }).nextState.target,35)
})

test('first exposure calibrates from actual native starting load and conservative override never promotes', () => {
  const rows = [0,1,2,3].map(i=>({completed:true,side:i%2?'R':'L',seconds:30,weightKg:6}))
  const result=evaluateTimedLoad({config:side,rows})
  assert.equal(result.nextState.load,6)
  assert.equal(result.nextState.target,35)
  assert.equal(result.nextState.initialized,true)
  const state={...result.nextState,load:8,target:45}
  const down=evaluateTimedLoad({config:side,state,rows})
  assert.equal(down.nextState.load,6)
  assert.equal(down.nextState.target,45)
  assert.equal(down.nextState.bridgeTarget,null)
})

test('configuration and state never invent intermediate loads', () => {
  assert.throws(()=>validateTimedConfig({...side,ladderKg:[1,2]}),/ladder/)
  assert.throws(()=>validateTimedConfig({...side,ladderKg:[0,1,1,2]}),/ladder/)
  assert.throws(()=>validateTimedConfig({...side,emergencyTime:30}),/emergency/)
  assert.throws(()=>validateTimedState({...initialTimedState(side),load:6.5},side),/native/)
  assert.deepEqual(adaptTimedState({...initialTimedState(side),load:6.5},side),initialTimedState(side))
  assert.deepEqual(JSON.parse(JSON.stringify(initialTimedState(side))),initialTimedState(side))
  const original={...initialTimedState(side),initialized:true,load:12.5,bridgeTarget:15,bridgeProvenance:'new'}
  assert.deepEqual(adaptTimedState(original,side),original)
  assert.deepEqual(adaptTimedState(original,{...side,ladderKg:[0,1,2]}),initialTimedState({...side,ladderKg:[0,1,2]}))
})

test('first logical set gates calibration and conservative manual downshift', () => {
  const fresh = initialTimedState(side)
  const outOfOrder = [0, 1, 2, 3].map(i => ({ side: i%2 ? 'R':'L',
    completed: i === 1, seconds:30, weightKg:7 }))
  let result=evaluateTimedLoad({config:side,state:fresh,rows:outOfOrder})
  assert.equal(result.counted,false)
  assert.equal(result.nextState.initialized,false)
  const established={...fresh,initialized:true,load:8,target:35}
  result=evaluateTimedLoad({config:side,state:established,rows:outOfOrder})
  assert.equal(result.counted,true)
  assert.equal(result.nextState.load,8)
  assert.equal(result.nextState.fails,1)
  assert.equal(result.reason,'first_failure_retry')
  // Calibration accepts the first complete L/R set and ignores later unfinished ones.
  outOfOrder[0]={...outOfOrder[0],completed:true}
  result=evaluateTimedLoad({config:side,state:fresh,rows:outOfOrder})
  assert.equal(result.counted,true)
  assert.equal(result.nextState.load,7)
  assert.equal(result.nextState.target,30)  // second logical set missing
})

test('manual downshift retains new/established bridge isolation and no same-session Turbo', () => {
  const rows = [0,1,2,3].map(i=>({completed:true,side:i%2?'R':'L',seconds:45,weightKg:5}))
  const s={...initialTimedState(side),initialized:true,load:6,target:45,bridgeTarget:8,bridgeProvenance:'new'}
  const next=evaluateTimedLoad({config:side,state:s,rows})
  assert.equal(next.reason,'manual_conservative_downshift')
  assert.equal(next.nextState.load,5)
  assert.equal(next.nextState.bridgeTarget,null)
  assert.equal(next.nextState.target,45)
})
