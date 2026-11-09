// Multi-session differential acceptance test for the frozen Liftosaur ATP2 engine.
// Usage: node api/training-control/atp2-liftosaur-multisession.mjs <runtime_api.cjs> <ATP2 candidate.liftoscript>
// Runs 25 independent trajectories x 12 sessions, re-parsing the Liftosaur updated program on every exposure.
import fs from 'node:fs'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { evaluateAtp2 } from './atp2.js'

const [runtimePath, sourcePath] = process.argv.slice(2)
if (!runtimePath || !sourcePath) {
  console.error('Usage: node api/training-control/atp2-liftosaur-multisession.mjs <runtime_api.cjs> <ATP2 candidate.liftoscript>')
  process.exit(2)
}
const require = createRequire(import.meta.url)
const { Playground_run, settings: defaults, defaultStats } = require(resolve(runtimePath))
const source = fs.readFileSync(resolve(sourcePath), 'utf8')
const sha = createHash('sha1').update('blob ' + Buffer.byteLength(source) + '\0').update(source).digest('hex')
if (sha !== '4d6452c2dd2a2ddd45f8b8d653d4ebcf3c37e170') throw new Error('Unpinned ATP2 Liftosaur source')
const settings = structuredClone(defaults)
settings.units = 'kg'
const ladder = [5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30]
settings.gyms[0].equipment.cable = {
  ...settings.gyms[0].equipment.cable,
  fixed: ladder.map(value => ({ value, unit: 'kg' })), isFixed: true
}
const rounding = { mode: 'allowed_values', allowedValues: ladder }
const initial = source.replace(/^Lat Pulldown \/.*$/m, line => line.replace('maxTarget: 15', 'maxTarget: 12'))
const stateOf = text => {
  const line = text?.split('\n').find(x => x.startsWith('Lat Pulldown /'))
  return {
    candidate: Number(line?.match(/candidate: ([\d.]+)kg/)?.[1]),
    probeActive: Number(line?.match(/probeActive: (\d+)/)?.[1] ?? 0)
  }
}
const targetRows = workout => {
  const rows = workout?.match(/target: ([^\n]+)/)?.[1] || ''
  return [...rows.matchAll(/(\d+)x1\+\s+([\d.]+)kg/g)]
    .flatMap(([, count, weight]) => Array(Number(count)).fill(Number(weight)))
}
let seed = 9012453
const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32)
const pick = values => values[Math.floor(rand() * values.length)]
const failures = []
let sessions = 0, checks = 0
for (let trajectory = 0; trajectory < 25; trajectory++) {
  let programText = initial
  let state = { candidate: 10, probeActive: 0, minTarget: 8, maxTarget: 12, floorWeight: 5, paired: 0 }
  let failed = false
  for (let day = 0; day < 12; day++) {
    const commands = [], observations = []
    let prescribedWeight = state.candidate
    for (let i = 0; i < 3; i++) {
      const override = i === 0 && rand() < 0.2
        ? pick(ladder.filter(value => value <= prescribedWeight)) : null
      const weight = override ?? prescribedWeight
      const reps = pick([1, 2, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 18, 21, 26, 34])
      if (override != null) commands.push('change_weight(1,' + (i + 1) + ',' + override + 'kg)')
      commands.push('change_reps(1,' + (i + 1) + ',' + reps + ')')
      commands.push('complete_set(1,' + (i + 1) + ')')
      const live = Playground_run({ programText, commands }, settings, defaultStats())
      if (!live.success) { failures.push({ trajectory, day, set: i, error: live.error }); failed = true; break }
      observations.push({ weight, reps, ordinal: i + 1, completed: true })
      const predicted = evaluateAtp2({ state, rounding, sets: observations, numberOfSets: 3 })
      const next = targetRows(live.data.workout)[i + 1]
      checks++
      if (i < 2 && Math.abs(next - predicted.nextSetLoad) > 0.001) {
        failures.push({ trajectory, day, set: i, next, expected: predicted.nextSetLoad })
        failed = true
        break
      }
      prescribedWeight = predicted.nextSetLoad
    }
    if (failed) break
    const finished = Playground_run({ programText, commands: [...commands, 'finish_workout()'] }, settings, defaultStats())
    if (!finished.success) { failures.push({ trajectory, day, error: finished.error }); break }
    const actual = stateOf(finished.data.updatedProgramText)
    const expected = evaluateAtp2({ state, rounding, sets: observations, numberOfSets: 3 }).nextState
    checks++
    if (actual.candidate !== expected.candidate || actual.probeActive !== expected.probeActive) {
      failures.push({ trajectory, day, actual, expected, observations })
      break
    }
    sessions++
    programText = finished.data.updatedProgramText
    state = expected
  }
}
const report = { sourceBlob: sha, runtime: 'ce75750bde4a190682fb5a6fa1984fc9184a9842',
  trajectories: 25, expectedSessions: 300, sessions, checks, failures: failures.slice(0, 25) }
console.log(JSON.stringify(report, null, 2))
if (failures.length) process.exitCode = 1
