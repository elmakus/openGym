import test from 'node:test'
import assert from 'node:assert/strict'
import { nativeTranscriptSets } from './native-workout-transcript.mjs'

test('preserves original normal exercise set-load groups and ordinals', () => {
  assert.deepEqual(nativeTranscriptSets('  Source Squat / 2x10 20kg 1x12 21.25kg / target: 3x10+ 20kg 90s', 'Source Squat'), [
    {ordinal:1,completed:true,weight:20,reps:10},
    {ordinal:2,completed:true,weight:20,reps:10},
    {ordinal:3,completed:true,weight:21.25,reps:12}
  ])
})
test('accepts native selected equipment suffix without guessing its load ladder', () => {
  assert.deepEqual(nativeTranscriptSets('  Example Curl, Cable / 1x20 12.5kg 1x10 15kg / target: 2x10+ 12.5kg 90s', 'Example Curl'), [
    {ordinal:1,completed:true,weight:12.5,reps:20},
    {ordinal:2,completed:true,weight:15,reps:10}
  ])
})
test('retains both independent native paired right|left repetitions', () => {
  assert.deepEqual(nativeTranscriptSets(' One Sided Press / 2x10|9 17.5kg / target: 2x10+ 17.5kg', 'One Sided Press'), [
    {ordinal:1,completed:true,weight:17.5,reps:10,leftReps:9},
    {ordinal:2,completed:true,weight:17.5,reps:10,leftReps:9}
  ])
})
test('rejects ambiguous duplicate labels and prefix lookalikes do not match', () => {
  assert.deepEqual(nativeTranscriptSets('Example Curling / 1x10 12.5kg', 'Example Curl'), [])
  assert.throws(() => nativeTranscriptSets('Example Curl / 1x10 10kg\nExample Curl, Cable / 1x10 12.5kg', 'Example Curl'),/Ambiguous/)
  assert.deepEqual(nativeTranscriptSets('Other Curl, Cable / 1x10 10kg','Example Curl'),[])
})
test('does not guess non-kg or non-exercise records', () => {
  assert.deepEqual(nativeTranscriptSets('Example Curl, Cable / 2x45s', 'Example Curl'), [])
  assert.deepEqual(nativeTranscriptSets('Example Curl, Cable / 2x10 20lb', 'Example Curl'), [])
  assert.deepEqual(nativeTranscriptSets(null, 'Example Curl'), [])
})
