import test from 'node:test'
import assert from 'node:assert/strict'
import {planWarmupRows} from './warmup.js'

const work = weight => [{load:{value:weight,unit:'kg'}}]
const warmup = steps => ({mode:'template',steps})

test('a source-style cable fixed ladder is authoritative for warmup loads',()=>{
 const rows=planWarmupRows({
  rows:work(34), eq:'cable',
  warmup:warmup([{percent:55,reps:5},{percent:75,reps:3}]),
  rounding:{mode:'allowed_values',allowedValues:[2.5,10,17,18.125,22.5,24.75,28.75,34]}
 })
 assert.deepEqual(rows.map(x=>[x.load.value,x.reps]),[[18.125,5],[24.75,3]])
 assert(rows.every(x=>x.phase==='warmup'))
})
test('a machine with a fractional native stack rung never rounds to fictitious 2.5 kg grids',()=>{
 const rows=planWarmupRows({
  rows:work(22.5),eq:'machine',warmup:warmup([{percent:60,reps:6}]),
  rounding:{mode:'allowed_values',allowedValues:[0,6.25,12.5,13.125,17.5,22.5,26]}
 })
 assert.deepEqual(rows.map(x=>x.load.value),[13.125])
})
test('an assisted machine warms up using actual higher assisted equipment rungs',()=>{
 const rows=planWarmupRows({
  rows:work(22.5),eq:'leverage machine',assisted:true,
  warmup:warmup([{percent:40,reps:8}]),
  rounding:{mode:'allowed_values',allowedValues:[0,20,22.5,30,36.25,40,50]}
 })
 assert.deepEqual(rows.map(x=>x.load.value),[36.25])
})
test('ordinary non-equipment rounding retains its established step behavior',()=>{
 const rows=planWarmupRows({
  rows:work(40),eq:'barbell',warmup:warmup([{percent:60,reps:5}]),
  rounding:{mode:'nearest',step:2.5}
 })
 assert.deepEqual(rows.map(x=>x.load.value),[22.5])
})
