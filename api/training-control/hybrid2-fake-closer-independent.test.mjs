import test from 'node:test'
import assert from 'node:assert/strict'
import { K5 } from './hybrid2/fixtures/reference-adapters.js'
import { fixtureCycles, makeFixtureCycle } from './hybrid2/fixtures/cycles.js'
import { replayHybridHistory } from './hybrid2/history.js'
test('an altered non-closer identity cannot impersonate a missing terminal closer and reset H1', () => {
  const prior = fixtureCycles(K5,[{reps:15},{reps:15},{reps:15},{reps:15},{reps:8}])
  const deload = makeFixtureCycle(K5,5,8,{frozen:true,omitCloser:true})
  const before = replayHybridHistory({workouts:[...prior,...deload],adapter:K5.adapter})
  assert.equal(before.status,'DELOAD')
  assert.equal(before.decisions.filter(d=>d.epochReset).length,0)
  const other = deload.at(-1).exposures[0]
  other.occurrenceId = K5.adapter.closerOccurrence // other H1 metadata still identifies leg_press!
  assert.throws(
    () => replayHybridHistory({workouts:[...prior,...deload],adapter:K5.adapter}),
    /HYBRID-2 replay:.*(closer|identity|occurrence|metadata)/i
  )
})
