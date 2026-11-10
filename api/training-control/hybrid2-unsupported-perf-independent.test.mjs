import test from 'node:test'
import assert from 'node:assert/strict'
import { h1FromExposure } from './hybrid2/observation.js'
import { loadedRepScore } from './hybrid2/h1.js'

test('300 completed repetitions remain comparable exactly as frozen original Liftosaur H1', () => {
  const record = {
    mode:'reps', hybrid2:{unit:'kg'}, performance:{sets:[{
      role:'work',status:'completed',
      resistance:{kind:'external-load',value:100,unit:'kg'},
      observations:[{metric:'repetitions',unit:'reps',value:300}]
    }]}
  }
  const result = h1FromExposure(record,{beforeCandidate:100,afterCandidate:100,baselineUnit:'kg'})
  assert.deepEqual(result,{kind:'COMPARABLE',performance:loadedRepScore(100,300),candidateRaised:false})
  assert.equal(result.performance,1100)
  const incompatibleLoad = structuredClone(record)
  incompatibleLoad.performance.sets[0].resistance.value = 50
  assert.equal(h1FromExposure(incompatibleLoad,{beforeCandidate:100,afterCandidate:100,baselineUnit:'kg'}).kind,
    'DISCONTINUITY', 'no high-rep exception to load comparability')
})
