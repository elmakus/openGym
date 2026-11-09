// Differential ATP2 edge acceptance against original, unmodified Liftosaur Playground.
// Usage: node api/training-control/atp2-liftosaur-edges.mjs <runtime_api.cjs> <ATP2 candidate.liftoscript>
// External runtime and reference program are not bundled with openGym.
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { evaluateAtp2, normalizeAtp2State } from './atp2.js'

const [runtimePath, sourcePath] = process.argv.slice(2)
if (!runtimePath || !sourcePath) {
  console.error('Usage: node api/training-control/atp2-liftosaur-edges.mjs <runtime_api.cjs> <ATP2 candidate.liftoscript>')
  process.exit(2)
}
const require = createRequire(import.meta.url)
const { Playground_run, settings: base, defaultStats } = require(resolve(runtimePath))
const source = fs.readFileSync(resolve(sourcePath), 'utf8')
const sha = createHash('sha1').update('blob ' + Buffer.byteLength(source) + '\0').update(source).digest('hex')
if (sha !== '4d6452c2dd2a2ddd45f8b8d653d4ebcf3c37e170') throw new Error('ATP2 Liftoscript source does not match pinned Git blob')
const failures = [], counts = { native: 0, paired: 0, stale: 0 }
const maxFailures = 12
const reportFailure = (group, context) => failures.push({ group, ...context })
const settingsFor = (equipment, ladder) => {
  const s = structuredClone(base)
  s.units = 'kg'
  s.gyms[0].equipment[equipment] = {
    ...s.gyms[0].equipment[equipment],
    fixed: ladder.map(value => ({ value, unit: 'kg' })), isFixed: true
  }
  return s
}
const roundingFor = ladder => ({ mode: 'allowed_values', allowedValues: ladder })
const fixture = ({ candidate, floor = 5, probe = 0, name = 'Lat Pulldown', paired = false, left = 1 }) =>
  source.replace(/^Lat Pulldown \/.*$/m, line => line
    .replace('Lat Pulldown', name)
    .replace('maxTarget: 15', 'maxTarget: 12')
    .replace('candidate: 10kg', 'candidate: ' + candidate + 'kg')
    .replace('floorWeight: 5kg', 'floorWeight: ' + floor + 'kg')
    .replace('probeActive: 0)', 'probeActive: ' + probe + (paired ? ', paired: 1' : '') + ')')
    .replace('3x1+', '3x' + left + '+')
    .replace('/ 10kg 90s', '/ ' + candidate + 'kg 90s'))
const parsedState = (result, name) => {
  const line = result?.data?.updatedProgramText?.split('\n').find(s => s.startsWith(name + ' /'))
  if (!line) return null
  return {
    candidate: Number(line.match(/candidate: ([\d.]+)kg/)?.[1]),
    floorWeight: Number(line.match(/floorWeight: ([\d.]+)kg/)?.[1]),
    probeActive: Number(line.match(/probeActive: (\d+)/)?.[1] ?? 0)
  }
}
const plannedLoads = result => {
  const line = result?.data?.workout?.match(/target: ([^\n]+)/)?.[1] ?? ''
  return [...line.matchAll(/(\d+)x1\+\s+([\d.]+)kg/g)]
    .flatMap(([, count, weight]) => Array(Number(count)).fill(Number(weight)))
}
const finish = (programText, commands, settings) =>
  Playground_run({ programText, commands: [...commands, 'finish_workout()'] }, settings, defaultStats())

// A: native ladder changes, including non-uniform steps and top/bottom clamps.
const ladders = [
  [5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30],
  [5, 10, 12.5, 16, 20, 27, 35],
  [5, 6, 8, 10, 13, 17, 22, 30],
  [5, 7, 11, 12, 18, 23, 31],
  [5, 15, 25, 40, 60],
  [5, 7.5, 10, 11.5, 13, 17.5, 24, 29, 34],
  [5, 6, 7, 8, 9, 10, 12.5, 15, 17.5, 20]
]
const repsGrid = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 26, 30, 35, 40, 50]
for (let group = 0; group < ladders.length && failures.length < maxFailures; group++) {
  const ladder = ladders[group], settings = settingsFor('cable', ladder)
  for (const candidate of ladder) for (const reps of repsGrid) {
    const programText = fixture({ candidate })
    const commands = ['change_reps(1,1,' + reps + ')', 'complete_set(1,1)']
    const expected = evaluateAtp2({
      state: { candidate, floorWeight: 5, minTarget: 8, maxTarget: 12, paired: 0, probeActive: 0 },
      rounding: roundingFor(ladder), sets: [{ weight: candidate, reps, ordinal: 1, completed: true }], numberOfSets: 3
    })
    const live = Playground_run({ programText, commands }, settings, defaultStats())
    const done = finish(programText, commands, settings)
    const actual = parsedState(done, 'Lat Pulldown')
    counts.native++
    if (!live.success || !done.success || plannedLoads(live)[1] !== expected.nextSetLoad ||
      actual?.candidate !== expected.nextState.candidate ||
      actual?.probeActive !== expected.nextState.probeActive) {
      reportFailure('native', { group, ladder, candidate, reps, live: plannedLoads(live)[1],
        state: actual, expectedLoad: expected.nextSetLoad, expectedState: expected.nextState, error: live.error || done.error })
    }
    if (failures.length >= maxFailures) break
  }
}

// B: paired exercise. The Playground supports changing right-side completed reps after completion;
// the unilateral target's initial number seeds the left-side completed result.
const pairedLadder = ladders[0], pairedSettings = settingsFor('dumbbell', pairedLadder)
for (const left of [1, 2, 3, 6, 8, 10, 12, 16, 20]) {
  for (const right of [1, 2, 3, 4, 6, 8, 10, 12, 14, 16, 22, 30]) {
    for (const candidate of [10, 20]) {
      const name = 'Bent Over One Arm Row'
      const programText = fixture({ candidate, name, paired: true, left })
      const commands = ['complete_set(1,1)', 'change_reps(1,1,' + right + ')']
      const done = finish(programText, commands, pairedSettings)
      const actual = parsedState(done, name)
      const expected = evaluateAtp2({
        state: { candidate, floorWeight: 5, minTarget: 8, maxTarget: 12, paired: 1, probeActive: 0 },
        rounding: roundingFor(pairedLadder),
        sets: [{ weight: candidate, leftReps: left, reps: right, ordinal: 1, completed: true }],
        numberOfSets: 3
      })
      counts.paired++
      if (!done.success || actual?.candidate !== expected.nextState.candidate ||
        actual?.probeActive !== expected.nextState.probeActive) {
        reportFailure('paired', { left, right, candidate, actual, expected: expected.nextState, error: done.error })
      }
      if (failures.length >= maxFailures) break
    }
  }
}

// C: non-native historical floor/candidate, including stale provisional probes.
for (const ladder of [[5, 7.5, 10], [5, 6, 8, 11, 15, 20], [5, 10, 12.5, 20, 30]]) {
  const settings = settingsFor('cable', ladder), rounding = roundingFor(ladder)
  for (const floor of [5.5, 6, 9]) for (const candidate of [6, 9, 11, 25]) for (const reps of [1, 7, 12, 18]) {
    if (floor > ladder.at(-1)) continue
    const state = { candidate, floorWeight: floor, minTarget: 8, maxTarget: 12, paired: 0, probeActive: 1 }
    const normalized = normalizeAtp2State(state, rounding)
    const programText = fixture({ candidate, floor, probe: 1 })
    const commands = ['change_reps(1,1,' + reps + ')', 'complete_set(1,1)']
    const expected = evaluateAtp2({
      state, rounding, sets: [{ weight: normalized.candidate, reps, ordinal: 1, completed: true }],
      numberOfSets: 3
    })
    const live = Playground_run({ programText, commands }, settings, defaultStats())
    const done = finish(programText, commands, settings), actual = parsedState(done, 'Lat Pulldown')
    counts.stale++
    if (!live.success || !done.success || plannedLoads(live)[1] !== expected.nextSetLoad ||
      actual?.candidate !== expected.nextState.candidate ||
      actual?.probeActive !== expected.nextState.probeActive ||
      actual?.floorWeight !== expected.nextState.floorWeight) {
      reportFailure('stale', { ladder, floor, candidate, reps, actual,
        liveLoad: plannedLoads(live)[1], expectedLoad: expected.nextSetLoad, expectedState: expected.nextState,
        error: live.error || done.error })
    }
    if (failures.length >= maxFailures) break
  }
}
const report = { referenceBlob: sha, counts, total: Object.values(counts).reduce((a, b) => a + b, 0),
  failures: failures.slice(0, maxFailures) }
console.log(JSON.stringify(report, null, 2))
if (failures.length) process.exitCode = 1
