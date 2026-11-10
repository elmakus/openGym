#!/usr/bin/env node
// Isolated real-source frontend regression and legacy-history fail-closed test.
// Reads previously recorded original pinned-Liftosaur M6 evidence: NO new native workout.
// Safe output: counts, booleans, hashes and error categories; never native loads/sets.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { buildSessionExposures } from '../../frontend/src/lib/session-start.js'
import { entriesForExposures } from '../../frontend/src/lib/session-ui-adapter.js'
import { buildCompletedSession } from '../../frontend/src/lib/finish-session.js'
import { replayHybridHistory } from '../../api/training-control/hybrid2/history.js'
import { reconcileHybridHistory } from '../../frontend/src/lib/hybrid2-sync.js'
import { validateCanonicalProfile } from '../../api/migration/profile-validation.js'
import { contentHash } from '../../api/engine/index.js'
import { replayProgression } from '../../api/engine/context.js'

const root = process.env.H2_PARITY_ROOT
const out = process.env.H2_PARITY_OUT
if (!root || !out) throw Error('H2_PARITY_ROOT / H2_PARITY_OUT required')
const sha = s => crypto.createHash('sha256').update(s).digest('hex')
const read = p => fs.readFileSync(p, 'utf8')
const ref = root + '/evidence-m6-full-36/profiles'
const sourcePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/src/lib/session-start.js')
const moduleText = read(sourcePath)
const sourceSha = sha(moduleText)
if (sourceSha !== 'f8d0575f047e04155531aab00a536f7f97ff1e0267cac2413c5919d3c6310ed1') throw Error('Unpinned source')
const needle = 'const trackId = occ.occurrenceId'
if (moduleText.split(needle).length !== 2) throw Error('Unexpected materializer seam')
const overlayText = moduleText.replace(needle,
  'const trackId = hybrid?.adapter?.occurrences?.find(x => x.occurrenceId === original.occurrenceId)?.progressionIdentity ?? occ.occurrenceId')
const tmp = path.join(path.dirname(sourcePath), 'session-start-validation-followup-' + process.pid + '.mjs')
let patchedStart
fs.writeFileSync(tmp, overlayText, { mode: 0o600 })
try { ({ buildSessionExposures: patchedStart } = await import(pathToFileURL(tmp).href)) }
finally { fs.unlinkSync(tmp) }
const nativeTrace = read(root + '/evidence/m6-post-deload-native-private.json')
if (sha(nativeTrace) !== '2b4a0747d39890dfb3c89a49e4df8c3229e39c390713a8a58d42e66284d25c95') throw Error('Native trace drift')
if (sha(read(root + '/private-live/qtwbbqff.liftoscript')) !== '7b1c7d114229b4d1cf86093409d7d89ae4e7d88e6a0c1c4c89bcba30a4a425df') throw Error('M6 source drift')
if (!read(root + '/liftosaur/README.txt').includes('ce75750bde4a190682fb5a6fa1984fc9184a9842')) throw Error('Runtime drift')
const snapshots = Array.from({length:9}, (_,i) => JSON.parse(read(ref + '/profile-' + String(i+1).padStart(2,'0') + '.json')))
const full = snapshots.at(-1), adapter = full.trainingControl.hybrid2Config.adapter
const evidence = {
 schema: 'HYBRID2-M6-SHARED-IDENTITY-LEGACY-EDIT-REGRESSION-1',
 provenance: { frontendSourceSha256:sourceSha, isolatedSourceSha256:sha(overlayText),
   nativeSourceSha256:'7b1c7d114229b4d1cf86093409d7d89ae4e7d88e6a0c1c4c89bcba30a4a425df',
   nativeTraceSha256:sha(nativeTrace), originalFitnessCommit:'9f2deb6c345643d7c0c793c52d358e496c2710d2',
   originalLiftosaurCommit:'ce75750bde4a190682fb5a6fa1984fc9184a9842',
   openGymBaselineCommit:'8529b2d41b28fea8ae96a50325aaf28e864a0160',
   newOriginalLiftosaurWorkouts:0, priorOriginalLiftosaurWorkoutsReused:9,
   productionFileChanges:0, productionDatabaseWrites:0, nativeWeightsIncluded:false },
 checks:0, failures:[], expectedRed:[], findings:[], scenarios:[],
 priorNativeSessions:9, newOriginalNativeSessions:0, generatedFrontendSessions:0,
 storedFrontendSnapshots:9, editedHistoricalCopies:0
}
const check = (name, ok, scope, detail = '') => {
  evidence.checks++
  if (!ok) evidence.failures.push({name,scope,detail:String(detail).slice(0,130)})
}
const expectReject = (name, f, pattern, scope) => {
  let message = ''
  try { f() } catch (e) { message = String(e.message) }
  check(name + ':rejected-as-required', pattern.test(message), scope, message ? 'typed-expected-error' : 'unexpected-success')
  if (pattern.test(message)) evidence.expectedRed.push({name,scope,classification:'original-source legacy identity mismatch; fail closed',errorClass:message.replace(/:.*$/, '')})
}
const adapters = new Map(adapter.occurrences.map(a => [a.occurrenceId, a]))
const groups = new Map()
for (const o of adapter.occurrences) {
  if (!groups.has(o.progressionIdentity)) groups.set(o.progressionIdentity, [])
  groups.get(o.progressionIdentity).push(o.occurrenceId)
}
const shared = [...groups.entries()].filter(([id, ids]) => id !== null && ids.length > 1)
check('six-real-native-shared-key-groups', shared.length === 6, 'source')
check('thirteen-shared-native-occurrences', shared.reduce((s, [,ids]) => s + ids.length, 0) === 13, 'source')
check('one-three-occurrence-native-key', shared.filter(([,ids]) => ids.length === 3).length === 1, 'source')
let checkedPrescriptions = 0, checkedProgressStates = 0, checkedHistoryExposures = 0
let engineReplayDivergences = 0
for (const [i, p] of snapshots.entries()) {
  const stage = 'snapshot-' + (i+1)
  const validation = validateCanonicalProfile(p)
  check('canonical-persisted-profile', validation.ok, stage, validation.errors?.length)
  let replay
  try { replay = replayHybridHistory({workouts:p.workouts,adapter,prescriptions:p.prescriptions}) }
  catch(e) { evidence.failures.push({name:'snapshot-original-replay',scope:stage,detail:String(e.message)}) }
  check('replay-history-prefix-count', replay?.sourceCount === i+1, stage)
  const copy = structuredClone(p), reconciled = reconcileHybridHistory(copy)
  check('reconcile-idempotent-state', reconciled && JSON.stringify(reconciled.state) === JSON.stringify(replay?.state), stage)
  const ex = p.workouts.flatMap(w => w.exposures)
  for (const x of ex) {
    checkedHistoryExposures++
    check('persisted-track-equals-static-identity', x.trackId === adapters.get(x.occurrenceId)?.progressionIdentity, stage)
    check('persisted-metadata-identity-equals-static', x.hybrid2.progressionIdentity === adapters.get(x.occurrenceId)?.progressionIdentity, stage)
    check('prescription-track-equals-exposure', p.prescriptions[x.prescriptionId]?.trackId === x.trackId, stage)
  }
  for (const [id,prescription] of Object.entries(p.prescriptions)) {
    checkedPrescriptions++
    const {contentHash:found,...body} = prescription
    check('unmodified-engine-prescription-content-hash', found === contentHash(body), stage)
    check('prescription-key-matches-record', id === prescription.id, stage)
  }
  for (const [track,state] of Object.entries(p.progression)) {
    checkedProgressStates++
    const lastP = p.prescriptions[state.lastPrescriptionId]
    const lastE = ex.find(x=>x.exposureId===state.lastCompletedLogId)
    check('engine-state-index-is-track',state.trackId===track,stage)
    check('engine-lastPrescriptionId-resolves-own-track',lastP?.trackId===track,stage)
    check('engine-lastCompletedLogId-resolves-own-track',lastE?.trackId===track,stage)
    const re = replayProgression({workouts:p.workouts,trackId:track,prescriptions:p.prescriptions})
    if (re?.lastCompletedLogId !== state.lastCompletedLogId ||
        re?.lastPrescriptionId !== state.lastPrescriptionId) engineReplayDivergences++
  }
}
evidence.findings.push({type:'existing-snapshot-integrity',snapshots:9,historyExposureAssertions:checkedHistoryExposures,
  prescriptionChecks:checkedPrescriptions,progressStateChecks:checkedProgressStates,
  replayPointerDisagreements:engineReplayDivergences})
check('engine-replayed-last-id-pointers-match', engineReplayDivergences===0, '9-history-snapshots')
const now = Date.UTC(2026, 11, 9)
const idGen = s => s
for (const scenario of ['without-hybrid-config','disabled-hybrid-config','enabled-hybrid-unrelated-routine']) {
  const old = structuredClone(full)
  old.workouts=[]; old.prescriptions={}; old.progression={}
  old.trainingControl = {...old.trainingControl}
  if (scenario==='without-hybrid-config') delete old.trainingControl.hybrid2Config
  if (scenario==='disabled-hybrid-config') old.trainingControl.hybrid2Config.enabled=false
  let routine=old.routines[0]
  if (scenario==='enabled-hybrid-unrelated-routine') {
    routine = {...structuredClone(routine),id:'ordinary-unrelated-validation'}
    routine.ex = [{...structuredClone(routine.ex[0]),occurrenceId:'ordinary-independent-track', rule:{...structuredClone(routine.ex[0].rule),routineId:routine.id}}]
    old.routines.push(routine)
  }
  const fresh=structuredClone(old)
  const ctx={now,newId:idGen,unit:'kg'}
  const a=buildSessionExposures(old,routine,ctx)
  const b=patchedStart(fresh,routine,ctx)
  evidence.generatedFrontendSessions += 2
  check('unrelated-plan-unchanged-exposures',JSON.stringify(a)===JSON.stringify(b),scenario)
  check('unrelated-plan-unchanged-prescriptions',JSON.stringify(old.prescriptions)===JSON.stringify(fresh.prescriptions),scenario)
  check('unrelated-plan-uses-original-occurrence-id',a.every(e=>e.trackId===e.occurrenceId),scenario)
  check('unrelated-plan-canonical-valid',validateCanonicalProfile(fresh).ok,scenario)
  evidence.scenarios.push({scenario,materializedExposures:a.length,identical:true})
}
// Current 9-workout M6 profile -> next structural A from real source adapter (no native workout simulated).
const beforeNext = structuredClone(full), next = patchedStart(beforeNext, full.routines[0],{now,newId:idGen,unit:'kg'})
evidence.generatedFrontendSessions++
check('next-A-materializes-all-eleven-native-slots',next.length===11,'next')
for (const x of next) {
  check('next-workout-original-shared-track',x.trackId===adapters.get(x.occurrenceId)?.progressionIdentity,'next')
  const p=beforeNext.prescriptions[x.prescriptionId]
  check('next-workout-track-before-engine-hash',p?.trackId===x.trackId,'next')
  const {contentHash:h,...body}=p||{}
  check('next-workout-hash-valid',h===contentHash(body),'next')
}
check('next-A-with-prescriptions-is-canonical',validateCanonicalProfile(beforeNext).ok,'next')
const serial = JSON.parse(JSON.stringify(beforeNext))
check('next-A-after-JSON-same-track-keys',next.every(x=>serial.prescriptions[x.prescriptionId]?.trackId===x.trackId),'next')
evidence.scenarios.push({scenario:'source-backed-next-A-from-nine-native-input-sessions',materializedExposures:next.length})

// Genuine previous materializer: create a new, isolated legacy HYBRID-2 workout with old track IDs.
// This is a controlled reproduction using the same original rule, not a claim that any real
// user profile predates the change. Native kg training values are NEVER committed.
const legacy = structuredClone(full)
legacy.workouts=[];legacy.prescriptions={};legacy.progression={}
legacy.trainingControl={hybrid2Config:structuredClone(full.trainingControl.hybrid2Config)}
const firstTime = snapshots[0].workouts[0].start
const oldExposures=buildSessionExposures(legacy,legacy.routines[0],{now:firstTime,newId:idGen,unit:'kg'})
const oldEntries=entriesForExposures(oldExposures,legacy.prescriptions)
const actualFirst = snapshots[0].workouts[0].exposures[0].performance.sets.find(x=>x.role==='work'&&x.status==='completed')
const target=oldEntries[0].sets.find(s=>!s.warmup)
if (!actualFirst || !target) throw Error('Native source first working row unavailable')
target.w=actualFirst.resistance.value
target.r=actualFirst.observations.find(o=>o.metric==='repetitions').value
target.done=true
const legacyActive={id:'legacy-source-only-validation-1',start:firstTime,d:new Date(firstTime).toISOString().slice(0,10),
  name:'isolated history identity legacy',routineIds:[legacy.routines[0].id],exposures:oldExposures,entries:oldEntries}
const oldFinished=buildCompletedSession(legacyActive,legacy,{end:firstTime+3600000,newId:idGen,unit:'kg'})
legacy.workouts.push(JSON.parse(JSON.stringify(oldFinished.session)))
Object.assign(legacy.progression,oldFinished.progression)
evidence.generatedFrontendSessions++
const canon=validateCanonicalProfile(legacy)
check('old-shape-still-passes-general-canonical-validation',canon.ok,'legacy')
const oldMismatch=oldExposures.filter(x=>x.trackId!==adapters.get(x.occurrenceId)?.progressionIdentity).length
check('old-materializer-positive-identity-mismatches',oldMismatch>0,'legacy')
expectReject('legacy-snapshot-replay',()=>replayHybridHistory({workouts:legacy.workouts,adapter,prescriptions:legacy.prescriptions}),
  /exposure track identity metadata mismatch/,'legacy')
const failed=reconcileHybridHistory(legacy)
check('legacy-reconcile-must-fail-closed',failed===null&&legacy.trainingControl.hybrid2Diagnostics?.status==='INCOMPATIBLE'&&
  !legacy.trainingControl.hybrid2&&!!legacy.trainingControl.hybrid2Error,'legacy')
expectReject('legacy-next-session-blocked',()=>patchedStart(legacy,legacy.routines[1],{now:now+86400000,newId:idGen,unit:'kg'}),
  /unresolved HYBRID-2 configuration or history conflict/,'legacy')
const rekeyOnly=structuredClone(legacy)
const originalTrack=rekeyOnly.workouts[0].exposures[0].trackId
rekeyOnly.workouts[0].exposures[0].trackId=adapters.get(rekeyOnly.workouts[0].exposures[0].occurrenceId).progressionIdentity
const invalidRekey=validateCanonicalProfile(rekeyOnly)
check('old-history-one-field-rekey-rejected',!invalidRekey.ok&&invalidRekey.errors.some(e=>e.includes('prescription belongs to another track')),'legacy')
check('legacy-rekey-reproduced-different-track',originalTrack!==rekeyOnly.workouts[0].exposures[0].trackId,'legacy')
evidence.expectedRed.push({name:'legacy-naive-track-rewrite',scope:'legacy',classification:'post-hoc track rewrite invalidates prescription relationship',errorClass:'canonical-validation'})
evidence.scenarios.push({scenario:'actual-unmodified-legacy-materializer',materializedExposures:oldExposures.length,
  originalMismatchCount:oldMismatch,canonicalBeforeHybridReplay:canon.ok, hybridReplay:'RED_EXPECTED_FAIL_CLOSED',
  naiveSingleFieldRekey:'CANONICAL_REJECTED'})

// A real earlier-workout edit using original stored source-backed data; never mutate source snapshots.
const edited = structuredClone(full)
const firstWorkout=edited.workouts[0]
const editTarget=firstWorkout.exposures.find(x=>x.hybrid2?.signalId==null && x.actual?.sets>0 &&
  x.performance?.sets?.some(s=>s.role==='work'&&s.status==='completed'&&s.observations?.some(o=>o.metric==='repetitions')))
if (!editTarget) throw Error('No eligible non-H1 historical native work set')
const editRow=editTarget.performance.sets.find(s=>s.role==='work'&&s.status==='completed'&&s.observations?.some(o=>o.metric==='repetitions'))
editRow.observations.find(o=>o.metric==='repetitions').value += 1
editTarget.actual.reps += 1
evidence.editedHistoricalCopies++
check('edited-earlier-canonical-shape',validateCanonicalProfile(edited).ok,'history-edit')
let editedReplay
try { editedReplay=replayHybridHistory({workouts:edited.workouts,adapter,prescriptions:edited.prescriptions}) }
catch(e) { evidence.failures.push({name:'edited-history-replay',scope:'history-edit',detail:e.message}) }
const rec=reconcileHybridHistory(edited)
check('edited-history-structural-replay-valid',!!editedReplay && !!rec && editedReplay.sourceCount===9,'history-edit')
check('edited-non-H1-history-h1-replay-invariant',JSON.stringify(editedReplay?.state)===JSON.stringify(
  replayHybridHistory({workouts:full.workouts,adapter,prescriptions:full.prescriptions}).state),'history-edit')
check('edited-history-preserves-shared-ids',edited.workouts.flatMap(w=>w.exposures).every(x=>x.trackId===adapters.get(x.occurrenceId)?.progressionIdentity),'history-edit')
let editedNext
try {editedNext=patchedStart(edited,edited.routines[0],{now,newId:idGen,unit:'kg'})}
catch(e) {evidence.failures.push({name:'edited-next-start',scope:'history-edit',detail:e.message})}
check('edited-past-allows-next-source-backed-start',editedNext?.length===11,'history-edit')
check('edited-past-next-track-id-stable',editedNext?.every(x=>x.trackId===adapters.get(x.occurrenceId)?.progressionIdentity),'history-edit')
evidence.generatedFrontendSessions++
evidence.scenarios.push({scenario:'independent-earlier-non-H1-native-history-edit',editedRecords:1,
  persistedIdentityChanged:false,subsequentExposures:editedNext?.length||0})
evidence.findings.push({type:'legacy-seam',oldMaterializerIdentityMismatches:oldMismatch,
  unchangedOldMaterializerCanonicallyValid:canon.ok,
  semanticReplayRejects:!!legacy.trainingControl.hybrid2Error,
  naiveTrackOnlyRewriteRejected:!invalidRekey.ok})
evidence.outcome=evidence.failures.length?'REGRESSION_RED':'VARIANT_PASS_ORIGINAL_AND_LEGACY_RED'
fs.mkdirSync(out,{recursive:true,mode:0o700})
const targetFile=path.join(out,'m6-shared-identity-legacy-edit-regression-sanitized.json')
fs.writeFileSync(targetFile,JSON.stringify(evidence,null,2)+'\n',{mode:0o600})
console.log(JSON.stringify({outcome:evidence.outcome,positiveChecks:evidence.checks,unexpectedFailures:evidence.failures,
  expectedRed:evidence.expectedRed.length,generatedFrontendSessions:evidence.generatedFrontendSessions,
  newNativeWorkouts:0,priorNativeSnapshots:evidence.storedFrontendSnapshots,editedHistoricalCopies:evidence.editedHistoricalCopies,
  findings:evidence.findings,scenarios:evidence.scenarios},null,2))
if(evidence.failures.length)process.exitCode=1
