// Test-only Static Plan Adapters. They are NOT real user plan assignments.
// K5 and M6 structural signal/group layouts from fitness@9f2deb6;
// SYN4 policy is an explicit test fixture based on fitness Python oracle SYN4,
// never an automatic production threshold choice.
const shape = (namespace, positions, signals, minValid, broad, fast, closer) => {
  const occ = []
  const routines = positions.map(position => {
    const ex = signals.filter(s => s.position === position)
      .map(s => ({ occurrenceId: namespace + ':' + s.id, exerciseId: '0025' }))
    if (position === positions.at(-1))
      ex.push({ occurrenceId: namespace + ':closer', exerciseId: '0025' })
    return { id: namespace + ':r:' + position, name: 'Fixture ' + position, ex }
  })
  for (const [i, r] of routines.entries()) for (const x of r.ex) {
    const s = signals.find(s => namespace + ':' + s.id === x.occurrenceId)
    occ.push({
      occurrenceId: x.occurrenceId, cyclePosition: positions[i], routineId: r.id,
      progressionIdentity: s ? namespace + ':track:' + s.id : null,
      optional: false, controllerTagged: true, canRaiseCandidate: !!s
    })
  }
  const adapter = {
    controllerTag: namespace === 'fixture-k5' ? 900 : namespace === 'fixture-m6' ? 920 : 940,
    namespace, planVersion: '1', segmentationMode: 'STATIC_ORDERED',
    controllerPersistence: 'HYBRID-WRITE-THROUGH-1', comparabilityStatus: 'UNCHANGED',
    orderedCyclePositions: positions, cycleStartPosition: positions[0],
    closerOccurrence: namespace + ':closer',
    occurrences: occ,
    signals: signals.map(s => ({
      signalId: s.id, occurrence: namespace + ':' + s.id, cyclePosition: s.position,
      performanceIdentity: namespace + ':perf:' + s.id,
      progressionIdentity: namespace + ':track:' + s.id,
      systemGroup: s.group, signalClass: 'LOADED_REPS',
      candidateChangeVisibility: 'LOCAL_ONLY'
    })),
    thresholds: {
      minValidSignals: minValid, broadWeakMin: broad, fastWeakMin: fast,
      slowBroadCycles: 2, weakRatio: 0.95
    },
    zeroOverrides: []
  }
  return { adapter, routines }
}
export const K5 = shape('fixture-k5', ['TUE', 'WED', 'THU', 'FRI', 'SAT'], [
  { id: 'chest', position: 'TUE', group: 'upper' },
  { id: 'squat', position: 'WED', group: 'lower' },
  { id: 'row', position: 'THU', group: 'upper' },
  { id: 'incline', position: 'FRI', group: 'upper' },
  { id: 'leg_press', position: 'SAT', group: 'lower' }
], 4, 3, 4)
export const M6 = shape('fixture-m6', ['A', 'B', 'C'], [
  { id: 'hip_a', position: 'A', group: 'lower' },
  { id: 'chest_a', position: 'A', group: 'upper' },
  { id: 'hip_b', position: 'B', group: 'lower' },
  { id: 'row_b', position: 'B', group: 'upper' },
  { id: 'hip_c', position: 'C', group: 'lower' },
  { id: 'row_c', position: 'C', group: 'upper' }
], 5, 3, 4)
export const SYN4 = shape('fixture-s4', ['U1', 'L1', 'U2', 'L2'], [
  { id: 'u1', position: 'U1', group: 'upper' },
  { id: 'l1', position: 'L1', group: 'lower' },
  { id: 'u2', position: 'U2', group: 'upper' },
  { id: 'l2', position: 'L2', group: 'lower' }
], 4, 2, 3)
