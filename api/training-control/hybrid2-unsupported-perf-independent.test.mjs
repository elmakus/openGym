import test from 'node:test'
import assert from 'node:assert/strict'
import { h1FromExposure } from './hybrid2/observation.js'
test('unsupported extreme performed repetitions must not seed accepted loaded-rep H1 envelope', () => {
  const record = {
    mode:'reps', hybrid2:{unit:'kg'}, performance:{sets:[{
      role:'work',status:'completed',
      resistance:{kind:'external-load',value:100,unit:'kg'},
      observations:[{metric:'repetitions',unit:'reps',value:300}]
    }]}
  }
  const result = h1FromExposure(record,{beforeCandidate:100,afterCandidate:100,baselineUnit:'kg'})
  assert.notEqual(result.kind,'COMPARABLE', '300 reps is materially beyond the accepted approximately 5..20 rep envelope')
})
