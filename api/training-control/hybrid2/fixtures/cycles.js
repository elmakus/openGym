// Synthetic and K5/M6 cycle training logs for isolated HYBRID-2 tests.
// Never used to assign a real plan or access any athlete's history.
import { compilePlanAdapter } from '../adapter.js'
const DAY = 86400000
export function makeFixtureCycle({ adapter }, cycle, reps, { frozen = false,
  startAt = Date.UTC(2026,0,1), omitCloser = false, includeTimed = false } = {}) {
  const compiled = compilePlanAdapter(adapter)
  return compiled.orderedCyclePositions.map((position, idx) => {
    const iso = startAt + (cycle * compiled.orderedCyclePositions.length + idx) * DAY
    const occurrences = compiled.occurrences.filter(o => o.cyclePosition === position)
    const exposures = occurrences.filter(x => !omitCloser || !x.isCloser).map((o, i) => {
      const isSignal = !!o.signalId
      const record = {
        exposureId: 'c'+cycle+':'+o.occurrenceId, trackId: o.progressionIdentity || o.occurrenceId,
        occurrenceId: o.occurrenceId, routineId: o.routineId, exerciseId: '0025',
        mode: 'reps', completedAt: new Date(iso + 3000).toISOString(),
        excludedFromProgression: frozen,
        hybrid2: {
          version:1, namespace:compiled.namespace, planVersion:compiled.planVersion,
          controllerVersion: 'HYBRID-2', metricVersion:compiled.metricVersion,
          referenceVersion:compiled.referenceVersion,
          cyclePosition:position, progressionIdentity:o.progressionIdentity,
          signalId:o.signalId, signalClass: isSignal ? 'LOADED_REPS' : null,
          deloadFrozen:frozen, unit:'kg'
        },
        ...(isSignal ? {
          atp2: {
            version:1,
            initialState: { candidate:100, floorWeight:10, minTarget:2, maxTarget:16,
              probeActive:0, paired:0 },
            rounding: { mode:'step', step:2.5 }
          }
        } : {}),
        performance: { sets: [{
          setId:'r0', role:'work', status:'completed',
          observations:[{ metric:'repetitions', unit:'reps', value:reps }],
          resistance:{kind:'external-load',value:100,unit:'kg'}
        }] }
      }
      return record
    })
    if (includeTimed) exposures.push({
      exposureId:'c'+cycle+':timed:'+idx, trackId:'timed:'+position,
      occurrenceId:'timed:'+position, routineId:'timed:fixture',
      completedAt: new Date(iso+3000).toISOString(),
      mode:'time', excludedFromProgression:frozen,
      hybrid2:{ version:1, namespace:compiled.namespace, planVersion:compiled.planVersion,
        cyclePosition:position, progressionIdentity:null, signalId:null,
        deloadFrozen:frozen, unit:'kg' },
      timedLoad:{version:1, config:{}, initialState:{}, unit:'kg'}, performance:{sets:[]}
    })
    return {
      id: 'h2:'+compiled.namespace+':'+cycle+':'+idx,
      d:new Date(iso).toISOString().slice(0,10),
      start:iso, end:new Date(iso+3600000).toISOString(),
      hybrid2:{version:1, controllerVersion:'HYBRID-2',
        stateSchemaVersion:'HYBRID-STATE-2', namespace:compiled.namespace,
        planVersion:compiled.planVersion, positions:[position]},
      exposures
    }
  })
}
export const fixtureCycles = (fixture, specs) =>
  specs.flatMap((x,i) => makeFixtureCycle(fixture,i,x.reps,{frozen:!!x.frozen}))
