// Differential ATP2 verification against the actual frozen Liftosaur Playground.
// Usage: node api/training-control/atp2-liftosaur-parity.mjs <runtime_api.cjs> <ATP2 candidate.liftoscript>
// The external runtime and reference source are intentionally not committed to openGym.
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { evaluateAtp2 } from './atp2.js'

const [runtimePath, sourcePath] = process.argv.slice(2)
if (!runtimePath || !sourcePath) {
  console.error('Usage: node api/training-control/atp2-liftosaur-parity.mjs <runtime_api.cjs> <adaptive_rep_engine_turbo_probe_candidate.liftoscript>')
  process.exit(2)
}
const require = createRequire(import.meta.url)
const { Playground_run, settings: defaults, defaultStats } = require(resolve(runtimePath))
const source = fs.readFileSync(resolve(sourcePath), 'utf8')
const originalBlob = createHash('sha1').update('blob ' + Buffer.byteLength(source) + '\0').update(source).digest('hex')
if (originalBlob !== '4d6452c2dd2a2ddd45f8b8d653d4ebcf3c37e170') {
  throw new Error('Reference file is not the pinned elmakus/fitness ATP2-BOOK candidate (Git blob SHA mismatch)')
}
const settings = structuredClone(defaults)
settings.units = 'kg'
const ladder = [5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30]
settings.gyms[0].equipment.cable = {
  ...settings.gyms[0].equipment.cable,
  fixed: ladder.map(value => ({ value, unit: 'kg' })),
  isFixed: true
}
const rounding = { mode: 'allowed_values', allowedValues: ladder }
const tests = []
for (const candidate of [10, 20, 27.5, 30]) {
  for (const reps of [1, 2, 5, 7, 8, 10, 11, 12, 13, 14, 15, 16, 18, 20, 25, 30, 45]) {
    tests.push({ name: 'first_' + candidate + '_' + reps, candidate, sets: [[candidate, reps]] })
  }
}
for (const first of [5, 7, 8, 10, 12, 15, 16, 18, 24, 30]) {
  for (const second of [1, 6, 8, 12, 15, 18, 24]) {
    tests.push({ name: 'two_' + first + '_' + second, candidate: 10, sets: [[10, first], [null, second]] })
  }
}
for (const sets of [
  [[10, 24], [15, 21], [20, 10]], [[10, 24], [15, 20], [20, 18]],
  [[10, 24], [15, 7], [15, 20]], [[10, 15], [10, 8], [10, 8]],
  [[10, 16], [12.5, 15], [12.5, 6]], [[10, 18], [12.5, 18], [15, 18]],
  [[10, 18], [12.5, 7], [10, 23]], [[10, 1], [10, 16], [12.5, 22]],
  [[10, 1], [10, 1], [10, 16]], [[10, 6], [7.5, 30], [7.5, 30]],
  [[10, 15], [10, 30], [10, 5]]
]) tests.push({ name: 'triple_' + tests.length, candidate: 10, sets })
for (const [candidate, weight, reps] of [
  [20, 10, 30], [20, 15, 18], [20, 15, 8], [27.5, 20, 50], [10, 7.5, 15]
]) tests.push({ name: 'manual_' + candidate + '_' + weight + '_' + reps, candidate, sets: [[weight, reps]] })
for (const candidate of [10, 20]) for (const reps of [1, 5, 8, 11, 12, 13, 15, 16, 20]) {
  tests.push({ name: 'repeat_' + candidate + '_' + reps, candidate, sets: [[candidate, reps], [candidate, 1], [candidate, reps]] })
}
let seed = 0xA2702
const rand = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32
const pick = values => values[Math.floor(rand() * values.length)]
for (let i = 0; i < 500; i++) {
  const candidate = pick(ladder), sets = []
  const len = 1 + Math.floor(rand() * 3)
  for (let j = 0; j < len; j++) {
    const weight = j === 0 && rand() < 0.35 ? pick(ladder.filter(x => x <= candidate)) : null
    const reps = pick([1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 18, 21, 25, 30, 40])
    sets.push([weight, reps])
  }
  tests.push({ name: 'random_' + i, candidate, sets })
}
const targetRows = workout => {
  const plan = workout?.match(/target: ([^\n]+)/)?.[1] || ''
  return [...plan.matchAll(/(\d+)x1\+\s+([\d.]+)kg/g)].flatMap(
    ([, count, weight]) => Array.from({ length: Number(count) }, () => Number(weight)))
}
const nextState = text => {
  const line = text?.split('\n').find(x => x.startsWith('Lat Pulldown /'))
  const candidate = line?.match(/candidate: ([\d.]+)kg/)
  const probe = line?.match(/probeActive: (\d+)/)
  return candidate ? { candidate: Number(candidate[1]), probeActive: probe ? Number(probe[1]) : 0 } : null
}
const failures = []
let passed = 0
for (const test of tests) {
  // Change only the fixture's initial state/target. Both custom() algorithm bodies stay byte-identical.
  const programText = source.replace(/^Lat Pulldown \/.*$/m, line => line
    .replace('maxTarget: 15', 'maxTarget: 12')
    .replace('candidate: 10kg', 'candidate: ' + test.candidate + 'kg')
    .replace('/ 10kg 90s', '/ ' + test.candidate + 'kg 90s'))
  const initial = { minTarget: 8, maxTarget: 12, candidate: test.candidate,
    floorWeight: 5, paired: 0, probeActive: 0 }
  const commands = [], observations = []
  let failure = null
  for (let i = 0; i < test.sets.length; i++) {
    const [weight, reps] = test.sets[i]
    if (weight != null) commands.push('change_weight(1,' + (i + 1) + ',' + weight + 'kg)')
    commands.push('change_reps(1,' + (i + 1) + ',' + reps + ')')
    commands.push('complete_set(1,' + (i + 1) + ')')
    const live = Playground_run({ programText, commands }, settings, defaultStats())
    if (!live.success) { failure = { stage: 'live', error: live.error }; break }
    const actualWeights = targetRows(live.data.workout)
    observations.push({ weight: weight ?? actualWeights[i], reps, ordinal: i + 1, completed: true })
    const expected = evaluateAtp2({ state: initial, rounding, sets: observations, numberOfSets: 3 })
    if (actualWeights[i + 1] != null && Math.abs(actualWeights[i + 1] - expected.nextSetLoad) > 0.001) {
      failure = { stage: 'live', expected: expected.nextSetLoad,
        actual: actualWeights[i + 1], observations }
      break
    }
  }
  if (!failure) {
    const finished = Playground_run({ programText, commands: [...commands, 'finish_workout()'] },
      settings, defaultStats())
    if (!finished.success) failure = { stage: 'finish', error: finished.error }
    else {
      const actual = nextState(finished.data.updatedProgramText)
      const state = evaluateAtp2({ state: initial, rounding, sets: observations, numberOfSets: 3 }).nextState
      if (actual?.candidate !== state.candidate || actual?.probeActive !== state.probeActive) {
        failure = { stage: 'state', expected: { candidate: state.candidate, probeActive: state.probeActive },
          actual, observations }
      }
    }
  }
  if (failure) failures.push({ name: test.name, ...failure })
  else passed++
}
const report = { runtime: 'ce75750bde4a190682fb5a6fa1984fc9184a9842',
  referenceBlob: originalBlob, total: tests.length, passed, failed: failures.length,
  failures: failures.slice(0, 25) }
console.log(JSON.stringify(report, null, 2))
if (failures.length) process.exitCode = 1
