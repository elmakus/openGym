#!/usr/bin/env node
// Read-only source-native H1 checkpoint extraction. All inputs and output must
// be on a trusted local machine. Never publish the resulting JSON: it contains
// actual athlete H1 performance values and provenance.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { bootstrapFromNativeExercises } from '../../api/training-control/hybrid2/native-bootstrap.js'
import { assertHybridBootstrapHistory } from '../../api/training-control/hybrid2/bootstrap.js'

const req = createRequire(import.meta.url)
const flags = {}
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i]
  if (!key?.startsWith('--') || !process.argv[i + 1] || Object.hasOwn(flags, key))
    throw new Error('Every option must appear exactly once with a value')
  flags[key] = process.argv[i + 1]
}
const required = ['--runtime', '--settings-module', '--settings-directory',
  '--source', '--profile', '--mapping', '--source-sha256', '--cutover-at',
  '--imported-at', '--out']
if (Object.keys(flags).length !== required.length || required.some(key => !flags[key]))
  throw new Error('Specify exactly: ' + required.join(' '))
const input = fs.readFileSync(flags['--source'])
const sourceSha = crypto.createHash('sha256').update(input).digest('hex')
if (!/^[a-f0-9]{64}$/.test(flags['--source-sha256']) ||
    sourceSha !== flags['--source-sha256'])
  throw new Error('Original Liftosaur source SHA-256 mismatch')
const runtime = req(path.resolve(flags['--runtime']))
const buildSettings = req(path.resolve(flags['--settings-module'])).buildSettings
assert.equal(typeof buildSettings, 'function', 'approved settings builder is required')
const settings = buildSettings(path.resolve(flags['--settings-directory']))
const weeks = runtime.PlannerProgram_evaluateText(input.toString('utf8'))
if (!Array.isArray(weeks) || weeks.length !== 1)
  throw new Error('Single frozen source week required for unambiguous native H1 import')
const model = {
  vtype: 'program', id: 'h1-readonly-bootstrap', name: 'h1-readonly-bootstrap',
  url: '', author: '', shortDescription: '', description: '', nextDay: 1,
  exercises: [], days: [], weeks: [], isMultiweek: false, tags: [], clonedAt: 0,
  planner: { vtype: 'planner', name: 'h1-readonly-bootstrap', weeks }
}
const evaluated = runtime.Program_evaluate(model, settings)
const exercises = evaluated.weeks?.[0]?.days?.flatMap(day => day.exercises || [])
if (!Array.isArray(exercises)) throw new Error('Native runtime did not evaluate an exercise list')
const sourceProfile = JSON.parse(fs.readFileSync(flags['--profile'], 'utf8'))
const profile = sourceProfile.profile || sourceProfile
const adapter = profile.trainingControl?.hybrid2Config?.adapter
if (!adapter || profile.trainingControl?.hybrid2Bootstrap)
  throw new Error('Provide a reviewed target adapter without an existing H1 checkpoint')
const signalToNativeId = JSON.parse(fs.readFileSync(flags['--mapping'], 'utf8'))
const checkpoint = bootstrapFromNativeExercises({
  exercises, adapter, signalToNativeId, sourceId: 'sha256:' + sourceSha,
  cutoverAt: flags['--cutover-at'], importedAt: flags['--imported-at']
})
assertHybridBootstrapHistory(profile.workouts || [], adapter, checkpoint)
const out = path.resolve(flags['--out'])
const fd = fs.openSync(out, 'wx', 0o600)
try {
  fs.fchmodSync(fd, 0o600)
  fs.writeFileSync(fd, JSON.stringify(checkpoint, null, 2) + '\n')
} finally { fs.closeSync(fd) }
console.log(JSON.stringify({
  result: 'PASS', nativeH1Signals: Object.keys(checkpoint.anchors).length,
  checkpointCreated: true, liveAccountWrites: 0, nativeSourceModified: false
}))
