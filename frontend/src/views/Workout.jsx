import { Fragment, useEffect, useId, useRef, useState } from 'react'
import SwipeCards from '../components/SwipeCards.jsx'
import SwipeRow from '../components/SwipeRow.jsx'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { workoutControls } from '../lib/workout-controls.js'
import { useUI } from '../store/useUI.js'
import { autoHoldsFor, forecastHolds, nextAutoHold } from '../lib/auto-holds.js'
import { EXIDX, exOr, betterWeight, isAssisted, stepWeight } from '../lib/exercises.js'
import { bestsFor, lastRowFor, oddValues } from '../lib/typo-check.js'
import { usesBar } from '../lib/bar.js'
import { loadKindFor, baseWeightFor, inventoryFor, rowLoad, sameLoad, plateDelta, dropGrid } from '../lib/plates.js'
import { effectiveRoutines, effectiveRoutineIds, lastEntryFor, bestWeightFor, bestWeightForEntry, freestyleConfig, pickedExerciseConfig, defaultConfig, setsDoneActive, setUnitsTotal, supersetUnits, unitOf, setLabel, modeOf, isBw, isPerSide, repStep, EFFORT, effortOf, stepEffort, capEffort, cascadeWeight, liveReramp, insertWarmupRow, barFloor, makeWarmupAt, canBeWarmup, makeWorkAt, removeRowAt, removeLastSet, setSpanAt, copyRowAt, copySpanAt, insertRowAt, pairAdjacent, unpairSuperset, cleanupSg, applyIntensifierPlan, pinnedNoteFor, exNoteFor, setsRepsOf, sessionVolume } from '../lib/history.js'
import { cleanNum, fmtNum, fmtPlate, fmtVol, exerciseNameText, fmtDate, fmtDaysAgo, todayISO, exCount, DAYN, uid } from '../lib/format.js'
import { speedUnitOf, toSpeed, fromSpeed } from '../lib/speed.js'
import { clampIncline, hasIncline, inclineFits, inclineFrom, INCLINE_STEP } from '../lib/incline.js'
import { beep, vibrate, unlock } from '../lib/sound.js'
import { pinState } from '../lib/queue.js'
import { t, tn, exerciseNameFor, exerciseNameClass } from '../lib/i18n.js'
import { api, beacon } from '../lib/api.js'
import { pyramidRestFor, maxRecordAt, isPyramid, pyramidLabel } from '../lib/pyramid.js'
import { insertionIndexAfterCurrentUnit, nextUnfinishedUnit, setProgressHighWater, supersetFlowStep, restAfterSet, restOnRecheck, restSecFor, warmupRestSecFor, ownExerciseRest, ownSetRest, sideRestFor, stepUnitIndex, advanceAfterTimedRest } from '../lib/supersetFlow.js'
import Media from '../components/Media.jsx'
import WorkoutScrollAnchor from '../components/WorkoutScrollAnchor.jsx'
import WorkoutChips from '../components/WorkoutChips.jsx'
import { filmSetSheet, SetVideoBadge, ActiveSetVideo } from '../components/SetVideo.jsx'
import { setVideoOf, filmTarget } from '../lib/set-videos.js'
import { fmtClip } from '../lib/media-refs.js'
import { supersetMeta } from '../lib/superset-meta.js'
import WorkoutThumb, { hasWorkoutMedia } from '../components/WorkoutThumb.jsx'
import { workoutSettingsSheet } from '../components/WorkoutSettingsSheet.jsx'
import { durationSheet } from '../components/DurationWheel.jsx'
import { REST_MAX, fmtRest, restWheelValue } from '../lib/duration.js'
import { youtubeSearchUrl } from '../lib/youtube.js'
import { openExternal } from '../components/CustomMedia.jsx'
import { startFlow, exercisePicker, exConfigSheet, exerciseDetailSheet, finishWorkout, exitWorkoutEdit, workoutCompleteSheet, confirmSheet, exerciseNoteSheet, sessionNoteSheet, renameWorkoutSheet, swapActiveWorkoutExercise, barWeightSheet, menuSheet, effortPickerSheet, exerciseHistorySheet, addRoutineToSessionSheet, finishWorkoutSheet, finishWorkoutNow, quickOccurrence, swapActiveWorkoutToBackup, setNoteSheet } from '../sheets.jsx'
import { afterScrollRestore, scrollRestorePending } from '../components/Modals.jsx'
import { effortColor } from '../lib/effort.js'
import Elapsed from '../components/Elapsed.jsx'
import LiveHeartRate from '../components/LiveHeartRate.jsx'
import Icon from '../components/Icon.jsx'
import { Button, Check, NumberField } from '../components/ui.jsx'
import { buildSessionExposures, occurrenceFor } from '../lib/session-start.js'
import { legacyEntriesOf, missingReference, operatorFor, phaseOf, roundLoad, ruleOfPrescription, rungsOf } from '../lib/prescription/index.js'
import { entriesForExposures, loadStepFor, planSummary, rowFindings } from '../lib/session-ui-adapter.js'
import { refreshAtp2Live } from '../lib/atp2-session.js'
import { refreshTimedLoadLive } from '../lib/timed-load-session.js'
import { ownWarmupsChange, keepOwnWarmups } from '../lib/routines.js'
import { ownRowsLine } from '../lib/warmup-ramp.js'
import { useCoachGate } from '../lib/use-coach-gate.js'
import { workoutCoachSheet } from '../components/WorkoutCoachSheet.jsx'
import { hasConsent } from '../lib/coach.js'
import { PRESET_LABEL } from '../components/RuleEditor.jsx'
import { findingText } from '../lib/progression-copy.js'
import { sessionNoProg, setSessionNoProg, setEntryNoProg, syncExposureExclusion } from '../lib/session-noprog.js'
import { routineChangesFromEntry, updateRoutineFromEntry, routineSlotFor } from '../lib/routine-update.js'
import { glyphOf } from '../lib/glyphs.js'
import { markAllSetsDone, sessionHistory } from '../lib/backfill.js'
import { bindWatchActions, markDiscarded } from '../lib/watch-sync.js'
import { bestSetFor } from '../lib/exercise-history.js'
import { bindLiveActions } from '../lib/live-activity.js'
import { isWarmupRow, isFailureSet, toggleFailure, isDropSet, isRestPauseSet, dropsOf, clustersOf, addDrop, addCluster, removeDropAt, removeClusterAt, setDropAt, setClusterAt, nextDropWeight, nextBurstReps, isSideSet, makeSideSet, setSideField, toggleSide, addSideDrop, removeSideDropAt, setSideDropAt, addSideCluster, removeSideClusterAt, setSideClusterAt, WEIGHT_ORIGIN_MANUAL, markWarmupEdited } from '../lib/workout-model.js'
import { canMoveActiveWorkoutUnit, moveActiveWorkoutUnit, canMoveActiveWorkoutEntry, moveActiveWorkoutEntry } from '../lib/active-workout-order.js'
import { insertActiveOccurrence, replaceActiveOccurrence, syncActiveExposures } from '../lib/active-session.js'
import { nextOpenSet, workoutKeyAction } from '../lib/workout-keys.js'
import { MUSCLE_NAME } from '../lib/muscles.js'
import FocusView from './FocusView.jsx'
import { SeasonDeco } from '../components/Seasonal.jsx'
import { SessionMapButton } from '../components/SessionMuscles.jsx'
import { entryDbLoad, bellsIn, ownedWeightsFor, stepOwned } from '../lib/dumbbells.js'
import { sessionGymView, gymsOf, activeGym, gymLabel, switchGym, reRoundOpenSets } from '../lib/gym-inventory.js'
import { exView, viewEntry, inEntryUnit } from '../lib/ex-unit.js'
import { setTrendOn, setTrendsFor, trendGlyph, trendLabel } from '../lib/set-trend.js'
import { formulaOf } from '../lib/onerm.js'
import { setNoteOf } from '../lib/set-notes.js'
import { isOn } from '../lib/modules.js'

// How long after a key starts a hold the same key is not yet its "Done" (#133). A USB button
// that bounces, or a double press, sends two presses a moment apart: the first starts the hold,
// and the second logged it at one second.
const HOLD_KEY_GRACE_MS = 1500

/* ---------- start chooser (no active workout) ---------- */
function StartChooser() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const todayIds = effectiveRoutineIds(S, todayISO())
  const todayRoutines = effectiveRoutines(S, todayISO())
  const todayName = todayRoutines.map(r => r.name).join(' + ')
  const todayOvr = S.dayPlan[todayISO()] !== undefined && pinState(S, S.dayPlan[todayISO()]) !== 'done' // a fulfilled pin is no override
  const idSet = new Set(todayIds)
  const others = S.routines.filter(r => !idSet.has(r.id))
  return <div className="narrow">
    <div className="hdr"><div><h1>{t('Start workout')}</h1><div className="sub">{t(DAYN[new Date().getDay()])} · {todayRoutines.length ? t('today is {0}', todayName) : t('rest day, but no one’s stopping you')}</div></div></div>
    {todayRoutines.length > 0 && <div className="card" style={{ borderColor: 'var(--acc)' }}>
      <h2 className="accent">{t("Today's plan")}{todayOvr ? ' · ' + t('rescheduled') : ''}</h2>
      <div className="row between" style={{ marginBottom: 12 }}>
        <div><div className="big">{todayName}</div><div className="muted small">{exCount(todayRoutines.reduce((n, r) => n + r.ex.length, 0))}</div></div>
        <span className="lrow-i" style={{ width: 38, height: 38, borderRadius: 9, fontSize: 'var(--fs-title2)' }}><Icon name={glyphOf(todayRoutines[0].emoji)} /></span>
      </div>
      <Button variant="primary" icon="play" onClick={() => startFlow(todayIds)}>{t('Start {0}', todayName)}</Button>
    </div>}
    {others.length > 0 && <><h4 className="sec">{t('Other routines')}</h4>
      <div className="list">{others.map(r => <div key={r.id} className="item" onClick={() => startFlow([r.id])}>
        <span className="lrow-i"><Icon name={glyphOf(r.emoji)} /></span>
        <div className="grow"><div className="tt">{r.name}</div><div className="ss">{exCount(r.ex.length)}</div></div>
        <span className="tag acc">{t('Start')}</span></div>)}</div></>}
    <div style={{ height: 14 }} />
    <Button icon="shuffle" onClick={() => startFlow([])}>{t('Freestyle workout (pick as you go)')}</Button>
    {!S.routines.length && <><div style={{ height: 10 }} /><Button variant="primary" onClick={() => nav('/plan')}>{t('Build a plan first')}</Button></>}
  </div>
}


// The open warm-ups follow the first work set when its weight changes mid-workout (#156,
// lib/history.js liveReramp): 100 → 110 and the rungs not done yet move with it, on this gym's
// plates. A rung you typed yourself or already did stays. `e` is the entry in its own unit.
function rerampOpen(s, e, i) {
  if (!e?.sets || isWarmupRow(e.sets[i]) || e.sets.findIndex(x => !isWarmupRow(x)) !== i) return
  const cfg = { ...(e.target || {}), id: e.id }
  if (modeOf(cfg) !== 'reps') return
  const V = exView(s, e.id)
  e.sets = liveReramp(e.sets, dropGrid(V, cfg), barFloor(V, e.id), isAssisted(cfg))
}

// A set-row column's number as it is shown. Most columns show what is stored; one with a `view`
// (cardio speed, stored in km/h) converts it for the screen.
const viewOf = (col, value) => (col.view && value != null && value !== '' ? col.view(value) : value)

// Arabic and Hebrew letters, the presentation forms included. A set summary with one in it is a
// per-side set in Arabic ("يسار 15×8 · يمين 15×7"): forced left to right, its side words stood
// on the wrong side of their numbers and the numbers after them turned round (8×15).
const RTL_LETTER = /[֐-ࣿיִ-﷿ﹰ-﻿]/

/* ---------- one exercise block (reps: weight×reps · time: a held duration · cardio: duration+speed) ---------- */
// `compact` shrinks the block for a superset member; `dense` (compact view) goes further and
// drops everything that is not a set you are logging — media, tag chips, the note lines, the
// "last time" recap and the progression line — leaving the name, the ⋯ menu, the one-line plan
// the rows are measured against, and the sets.
// Nothing dropped is lost: it is all still on the ⋯ menu, or one ⋮ switch back to list/cards.
// The pause between the left and the right side of one timed per-side set (owner's call): long
// enough to turn over, far shorter than the rest the set earns once both sides are held.
const SWITCH_SIDES_SEC = 10
// A ladder rung's name; a rung past the end of the list reads as the last one.
const rungName = (p, i) => { const rungs = rungsOf(operatorFor(phaseOf(p), 'difficulty')); return rungs[Math.min(i ?? 0, rungs.length - 1)]?.name }

function ExerciseBlock({ entryIdx, compact, dense, editing, onToggle, onToggleSide, onField, onAddSet, onRemoveSet, onAddWarmup, onKeepWarmups, onAskCoach, onRemoveSetAt, onCopySetAt, onStartTimed, onPairPrev, onPairNext, onSetRowRef, onProgressionSettings, onRest, onNoProg, routineUpdate, onSwap, onSwapBackup, onMoveUp, onMoveDown, canMoveUp, canMoveDown, onRemoveExercise, busy }) {
  // The block reads the state as its exercise sees it (lib/ex-unit.js): in the exercise's own
  // weight unit when it has one (#657), so its rows, steppers, plates, owned weights, "last time"
  // and records all speak that unit. Every change goes through inEntryUnit or the parent's
  // onField (mutEntry), which store it back in the profile's unit.
  const live = useStore(s => s.S)
  const active = useStore(s => s.A)
  const S = exView(sessionGymView({ ...live, active }), active.entries[entryIdx]?.id)
  const A = S.active
  const update = useStore(s => s.update)
  const updateActive = useStore(s => s.updateActive)
  const working = useUI(s => s.work)
  const restEnds = useUI(s => s.timer?.endsAt)
  const swipeHint = useUI(s => (s.swipeHint?.idx === entryIdx ? s.swipeHint : null))
  const setFlash = useUI(s => (s.setFlash?.idx === entryIdx ? s.setFlash : null))
  const optsId = useId()
  const entry = S.active.entries[entryIdx]
  // The set whose form video plays under its row (SetVideo.jsx), by index; one at a time.
  const [videoAt, setVideoAt] = useState(null)
  // Rows are keyed by index: one added or removed above would put the player under another set.
  const rowCount = entry?.sets?.length
  useEffect(() => { setVideoAt(null) }, [rowCount])
  // Drops/bursts mutate the row in place — same card, not a new set with its own long rest.
  // A planned exercise (see the exercise's "Intensifier" config) arrives with these already
  // filled in by applyIntensifierPlan; these only add/edit/remove entries live from here on.
  const mutSet = (i, fn) => updateActive(a => inEntryUnit({ ...useStore.getState().S, active: a }, entryIdx, e => { e.sets[i] = fn(e.sets[i]) }))
  // A row as it is now in the store (not the render's copy), in the exercise's unit.
  const liveRow = i => { const st = useStore.getState(); return viewEntry(st.S, st.A?.entries[entryIdx])?.sets[i] }
  // Warm-up or work is the row's phase; switching it moves the row to the edge of the warm-ups.
  const setPhaseAt = (i, warm) => updateActive(A => {
    const e = A.entries[entryIdx]
    e.sets = warm ? makeWarmupAt(e.sets, i) : makeWorkAt(e.sets, i)
  })
  // One set's own rest for this session (#609): null takes it away, 0 is "No timer". It sits on
  // the set's first row, the one the rest flow reads (ownSetRest). The wheel may outlive the
  // set it was opened for, so a Done after the rows moved or the workout changed does nothing.
  const setRestAt = (i, sec) => {
    const at = useStore.getState().A
    const ref = { id: at?.id, entryId: at?.entries?.[entryIdx]?.id, rows: at?.entries?.[entryIdx]?.sets?.length }
    return () => updateActive(a => {
      const e = a?.entries?.[entryIdx]
      if (!e || a.id !== ref.id || e.id !== ref.entryId || e.sets.length !== ref.rows) return
      const row = e.sets[setSpanAt(e.sets, i)[0]]
      if (!row) return
      if (sec == null) delete row.restSec
      else row.restSec = Math.max(0, Math.min(REST_MAX, Math.round(sec)))
    }, true)
  }
  const toggleFailureAt = i => updateActive(A => {
    const e = A.entries[entryIdx]
    const [start, count] = setSpanAt(e.sets, i)
    const on = !isFailureSet(e.sets[i])
    for (let j = start; j < start + count; j++) if (isFailureSet(e.sets[j]) !== on) e.sets[j] = toggleFailure(e.sets[j])
  })
  const addDropRow = i => mutSet(i, row => {
    // A unilateral set drops per side (issue #60): addSideDrop seeds each side from its own weight.
    if (isSideSet(row)) {
      const pct = entry.target?.intensifier?.type === 'dropset' ? entry.target.intensifier.pct : undefined
      return addSideDrop(row, pct, dropGrid(S, { ...entry.target, id: entry.id }))
    }
    const drops = dropsOf(row)
    const base = drops.length ? drops[drops.length - 1].w : (row.w || 0)
    const pct = entry.target?.intensifier?.type === 'dropset' ? entry.target.intensifier.pct : undefined
    // On a weight you can load: the plates you own, else the exercise's step (lib/plates.js).
    return addDrop(row, { w: nextDropWeight(base, pct, dropGrid(S, { ...entry.target, id: entry.id })), r: row.r })
  })
  // A rest-pause row's own reps are always the total across every burst (see
  // applyIntensifierPlan/history.js) — clusters are the breakdown of that total, not extra on
  // top of it — so adding, removing or editing one keeps `r` in step by the same delta.
  const addBurstRow = i => mutSet(i, row => {
    const restSec = entry.target?.intensifier?.type === 'restpause' ? entry.target.intensifier.restSec : (S.restPauseSec || 15)
    if (isSideSet(row)) return addSideCluster(row, restSec)   // per side, each keeps its own r in step
    const clusters = clustersOf(row)
    const base = clusters.length ? clusters[clusters.length - 1].r : (row.r || 0)
    const added = nextBurstReps(base)
    return { ...addCluster(row, { r: added, restSec }), r: (row.r || 0) + added }
  })
  // Per-side weight/reps/effort edits (issue #60): patch one side of a unilateral row, keeping
  // the row's aggregate (r/w/done/effort) in step via the model helper so every other reader
  // stays right. The done tick goes through onToggleSide → toggle() instead, so ticking a side
  // still fires the rest timer / auto-advance / workout-complete flow.
  const setSide = (i, side, field, v) => {
    if (field !== 'w') return mutSet(i, row => markWarmupEdited(setSideField(row, side, field, v), field))
    updateActive(a => inEntryUnit({ ...useStore.getState().S, active: a }, entryIdx, e => {
      const row = setSideField(e.sets[i], side, field, v)
      row.sides[side].weightOrigin = WEIGHT_ORIGIN_MANUAL
      e.sets[i] = markWarmupEdited(row, field)
      e.sets = cascadeWeight(e.sets, i, v, side, e.target?.backoffStep)
      rerampOpen(S, e, i)
    }))
  }
  // Drop/burst edits accept an optional `side` ('L'|'R'): present for a per-side row (edits that
  // one limb's drop/burst), absent for a straight row (edits the row's own).
  const removeDrop = (i, di) => mutSet(i, row => isSideSet(row) ? removeSideDropAt(row, di) : removeDropAt(row, di))
  const removeCluster = (i, ci) => mutSet(i, row => {
    if (isSideSet(row)) return removeSideClusterAt(row, ci)
    const removed = clustersOf(row)[ci]?.r || 0
    return { ...removeClusterAt(row, ci), r: Math.max(0, (row.r || 0) - removed) }
  })
  const setDropField = (i, di, field, v, side) => mutSet(i, row =>
    isSideSet(row) ? setSideDropAt(row, side, di, { [field]: v }) : setDropAt(row, di, { [field]: v }))
  const setClusterField = (i, ci, v, side) => mutSet(i, row => {
    if (isSideSet(row)) return setSideClusterAt(row, side, ci, v)
    const delta = (Number(v) || 0) - (clustersOf(row)[ci]?.r || 0)
    return { ...setClusterAt(row, ci, { r: v }), r: Math.max(0, (row.r || 0) + delta) }
  })
  const ex = exOr(entry.id)
  const thumb = !dense && S.gifSize === 'mini' && hasWorkoutMedia(ex)
  const mode = modeOf({ ...(entry.target || {}), id: entry.id })
  const cardio = mode === 'cardio'
  const timed = mode === 'time'
  // The history the rows were built from: before the session's day when it is logged into the
  // past (sessionHistory), so "last time", the best set and the Best chip are not from later on.
  const H = sessionHistory(S, A)
  // The routine's own last session of this exercise (or any, for a routine that has none), the
  // same one the rows and the progression line were built from (#216).
  const last = lastEntryFor(H, entry.id, entry.rid)
  // Each finished set against the same set last time (#907, lib/set-trend.js): a small arrow on
  // the set's number, said in words to a screen reader. Settings → Workout can switch it off.
  const trends = setTrendOn(S) ? setTrendsFor(entry, last, { formula: formulaOf(S) }) : null
  const trendMark = i => {
    const tr = trends?.[i]
    return tr ? <span className={'settrend ' + (tr.dir > 0 ? 'up' : tr.dir < 0 ? 'down' : 'same')} aria-hidden="true">{trendGlyph(tr)}</span> : null
  }
  const trendSay = (i, label) => (trends?.[i] ? label + ', ' + trendLabel(trends[i], S.unit) : label)
  const standingNote = exNoteFor(S, entry.id)
  // Only worth surfacing while there is still work left: once the exercise is finished, a note
  // telling you what to do in it is behind you, and the block is already long.
  const pinnedNote = entry.sets.some(s => !s.done) ? pinnedNoteFor(S, entry.id, A.editingWorkoutId) : null
  // The number is the heaviest logged set, or the working weight you kept.
  // On an assistance machine the best is the least help, and a 0 on either side means "nothing
  // logged" rather than a record (issue #232).
  // Read in the meaning this session logs a dumbbell weight in (lib/dumbbells.js), so a past
  // "40 total" is not a record a "22 each" set has to beat.
  const meaning = entryDbLoad(entry)
  const bestHist = bestWeightFor(H, entry.id, meaning)
  const bestKept = (H.exWeights[entry.id] || {}).w || 0
  const best = cardio ? 0
    : bestHist > 0 && bestKept > 0 ? betterWeight(entry.id, bestHist, bestKept) : Math.max(bestHist, bestKept)
  const exposure = A.exposures?.find(x => x.exposureId === entry.exposureId)
  const prescription = S.prescriptions?.[exposure?.prescriptionId]
  // What the rows are held against (#173): the last time in this routine (#216), or the best set
  // of the exercise ever logged — after a bad day, "last time" puts the bad day on the screen as
  // the number to beat. Tapping the line switches between the two, and the choice is the
  // profile's (S.logRef), so every exercise and the next session follow it.
  const refBest = S.logRef === 'best'
  const ref = refBest ? bestSetFor(H, entry.id, mode, meaning) : last
  // An exercise logged before only in another mode (reps then, a hold today) has a last time but
  // no best set to hold today's rows against. The line stays and says so: gone, it took the
  // switch back to "Last time" with it, reachable then only from Settings or another card.
  // How long ago reads at a glance (#363): "3 days ago", counted from the session's own day, so a
  // workout logged into the past is not told its last time was "today". The date itself stays
  // in the hover title and in what a screen reader hears.
  const refLabel = refBest ? t('Best set') : t('Last time')
  const refAgo = ref ? fmtDaysAgo(ref.d, A.d || todayISO()) : ''
  const refSets = ref ? (refBest ? [ref.set] : ref.sets).map(s => setLabel(entry.id, s, ref.target, speedUnitOf(S))) : []
  const refText = ref ? `${refLabel} (${refAgo}, ${fmtDate(ref.d, true, true)}): ` + refSets.join(', ') : refBest && last ? t('Best set: nothing logged this way yet') : null
  const refAction = refBest ? t('Show last time instead') : t('Show your best set instead')
  // The button's text is the reference, which says nothing about what a tap does; its name
  // carries both, the reference first as it reads on screen, then the switch.
  const refLine = refText ? <button type="button" className="refline small dim"
    title={refAction} aria-label={`${refText}. ${refAction}`}
    onClick={() => update(s => { s.logRef = refBest ? 'last' : 'best' })}>
    {/* Each set on its own left-to-right island. In Arabic the first one followed the label's
        direction and read 8×60, while those after a Latin "RIR" read 60×8. A set that carries
        words of a right-to-left script keeps its own direction, still isolated (RTL_LETTER). */}
    <span>{ref ? <>{refLabel} (<time dateTime={ref.d} title={fmtDate(ref.d, true, true)}>{refAgo}</time>): {refSets.map((l, i) => <Fragment key={i}>{i ? ', ' : ''}<bdi dir={RTL_LETTER.test(l) ? 'auto' : 'ltr'}>{l}</bdi></Fragment>)}</> : refText}</span>
    <Icon name="history" />
  </button> : null
  // Zero added weight must stay editable: a bodyweight set can become weighted
  // later, or return to zero without losing its load control (issue #460).
  const cfg = { ...(entry.target || {}), id: entry.id }
  const bw = !cardio && isBw(cfg)
  // A unilateral exercise logs each side on its own (issue #60): work rows render as an L and an
  // R sub-row, each with its own weight/reps/effort and done tick. Warm-ups stay single.
  const perSide = mode === 'reps' && isPerSide(cfg)
  const loadStep = mode === 'reps' ? loadStepFor(prescription, S.unit) : 2.5
  // With the dumbbells you own listed (issue #376), + and − walk from bell to bell — 9, 11, 13 —
  // instead of along the increment's grid; an off-list weight goes to the nearest bell that way.
  // A machine's own stack (#688) is walked the same way: 5, 11.3, 18.1.
  const owned = mode === 'reps' ? ownedWeightsFor(S, cfg) : null
  // From the weight on screen: a stored 44.996 lb steps as the 45 it shows.
  const stepLoad = (v, step, dir) => { const c = cleanNum(v, step); return owned ? stepOwned(owned, c, dir) : stepWeight(c, step, dir) }
  // The weight column says what a dumbbell weight means when the exercise has said (#474): one
  // bell or both together. A one-arm exercise holds one bell, so its plain heading is already true.
  const bells = !bw && bellsIn(cfg) === 2 ? meaning : 'as'
  const loadCol = { f: 'w', step: loadStep, dec: true, hd: bw ? t('Added ({0})', S.unit)
    : bells === 'each' ? t('Each ({0})', S.unit) : bells === 'total' ? t('Both ({0})', S.unit) : t('Weight ({0})', S.unit) }
  // The reps column is the total in every mode, unilateral included — the stepper walks in
  // twos there so the number you land on is one you can actually split evenly.
  const repCol = { f: 'r', step: repStep(cfg), dec: false, hd: t('Reps') }
  const col1 = cardio ? { f: 'min', step: 1, dec: false, hd: t('Duration (min)') }
    : timed ? { f: 'sec', step: 5, dec: false, hd: t('Seconds') }
      : loadCol
  // Speed is stored in km/h and shown in the profile's unit (lib/speed.js): `view` turns the
  // stored number into the one on screen, `store` the one typed or stepped back into km/h.
  const speedUnit = speedUnitOf(S)
  const col2 = cardio ? { f: 'speed', step: 0.5, dec: true, hd: speedUnit === 'mph' ? t('Speed (mph)') : t('Speed (km/h)'),
    view: v => toSpeed(v, speedUnit), store: v => fromSpeed(v, speedUnit) }
    : timed ? loadCol : repCol
  // Effort (RIR or RPE, whichever the profile logs) only makes sense for weighted rep sets,
  // not cardio/timed holds, and is opt-in since it adds a third stepper to every row. `opt`
  // because an unlogged effort is not the same as 0 — RIR 0 says the set went to failure.
  const kind = effortOf(S)
  const eff = EFFORT[kind]
  // The effort column carries the scale key (`eff`) and its field name; unlike weight/reps it
  // is not a stepper — it opens a colour-coded picker (see effortCell). `f` is s.rir or s.rpe.
  // Cardio's third column is the treadmill's incline (lib/incline.js), on the exercises that have
  // one and on any whose rows already carry a grade. `opt` again: a cleared field is no incline,
  // and `store` keeps whatever is typed on the half percent between 0 and 40.
  const inclineCol = cardio && (inclineFits(ex) || entry.sets.some(hasIncline))
    ? { f: 'incline', step: INCLINE_STEP, dec: true, opt: true, hd: t('Incline (%)'), store: clampIncline } : null
  const col3 = cardio ? inclineCol : mode === 'reps' && eff ? { f: eff.f, eff: kind, hd: t(eff.hd) } : null
  const trackState = S.progression?.[exposure?.trackId] || null
  const findings = prescription ? rowFindings(prescription, entry, S.unit, trackState) : new Map()
  const rir = prescription?.parameters.rir
  const effortText = rir && kind === 'rir' ? ` · RIR ${rir.min}–${rir.max}` : rir && kind === 'rpe' ? ` · RPE ${10 - rir.max}–${10 - rir.min}` : ''
  // The effort column walks its own scale — see stepEffort. Weight and reps step up from 0
  // with no ceiling, as they always did.
  const bump = (s, i, col, dir) => {
    // Read the current value directly from the store rather than from the render-time snapshot.
    // In a superset both ExerciseBlock instances share the same store subscription, so when one
    // member's field changes the partner re-renders too, replacing the closure's `s` reference
    // with a fresh clone before the next tap fires. Reading from the store avoids that stale-
    // closure problem entirely and keeps every tap operating on the real current value.
    const fresh = liveRow(i)
    const cur = fresh ? fresh[col.f] : s[col.f]
    if (mode === 'reps' && col.f === 'w') return onField(i, col.f, stepLoad(cur, col.step, dir))
    // The step is in the unit on screen: +0.5 mph, not +0.5 km/h shown as +0.31.
    const next = Math.max(0, Math.round(((viewOf(col, cur) || 0) + dir * col.step) * 100) / 100)
    onField(i, col.f, col.store ? col.store(next) : next)
  }
  // Uses the shared stepper markup so a set row picks up the same control styling
  // as every other +/- field in the app.
  // Which of the optional control groups this profile wants on screen (Settings → During a
  // workout → Workout controls). The lean default keeps the sets and one "more" button; each
  // switch brings one of the old always-visible button rows back.
  const wc = workoutControls(S)
  const cell = (s, i, col, cls) => (
    <div className={'stp ' + cls + (wc.steppers ? '' : ' plain')}>
      {wc.steppers && <button aria-label={t('Decrease')} onClick={() => bump(s, i, col, -1)}><Icon name="minus" /></button>}
      <span className="val"><NumberField decimal={col.dec} nullable={col.opt} value={viewOf(col, s[col.f]) ?? ''}
        onChange={v => onField(i, col.f, col.store ? col.store(v) : v)} /></span>
      {wc.steppers && <button aria-label={t('Increase')} onClick={() => bump(s, i, col, 1)}><Icon name="plus" /></button>}
    </div>
  )
  // Plate loading, per set row (lib/plates.js): which plates make THIS row's weight, from the
  // plates you own. 'pairs' splits what is beyond the bar per side, 'single' is one stack (a
  // belt, a sled), 'none' shows nothing. A unilateral row logs each side's own weight; a bar is
  // the same bar for both legs, so the line uses the sides' weight while they agree (or only one
  // side has a number yet) and stays away once they differ. Only reps mode has a weight to load,
  // and a saved workout being corrected (#203) has nothing left to load, so its rows stay bare.
  // The rows and their drop-set sub-rows form one sequence in the order the bar sees them, keyed
  // `i` for a set and `i:dN` for its N-th drop; a rest-pause burst keeps the set's weight, so it
  // is not in the sequence.
  const plateLoading = mode === 'reps' && !editing
  const loadKind = plateLoading ? loadKindFor(S, cfg) : 'none'
  const base = baseWeightFor(S, entry.id)
  const loadSeq = loadKind === 'none' ? [] : (() => {
    const inv = inventoryFor(S)
    const out = []
    entry.sets.forEach((s, i) => {
      let w = s.w
      if (perSide && isSideSet(s)) {
        const L = s.sides.L?.w || 0, R = s.sides.R?.w || 0
        if (L && R && L !== R) return
        w = L || R
      }
      out.push({ key: String(i), load: rowLoad(loadKind, w, base, inv) })
      dropsOf(s).forEach((d, di) => out.push({ key: i + ':d' + di, load: rowLoad(loadKind, d.w, base, inv) }))
    })
    return out
  })()
  // Only a bar is named as one: a plate-loaded machine set to per side with its own weight is
  // not a "Bar 50 lb".
  const loadSummary = loadKind === 'none' ? t('Off')
    : loadKind === 'single' ? t('Single stack')
      : !usesBar(ex) ? t('Per side')
        : base > 0 ? t('Bar {0}', fmtNum(base) + ' ' + S.unit) : t('No bar')
  // The line under a set row (or a drop sub-row): shown on the first loaded row and whenever the
  // stack changes from the loaded row before it, so a run of equal weights shows its plates once.
  // What to strip and what to add rides along, except in the compact view.
  const loadLine = key => {
    if (!isOn(S, 'plates')) return null   // Settings → Modules: Plates and warm-ups off
    const at = loadSeq.findIndex(x => x.key === key)
    const L = at >= 0 ? loadSeq[at].load : null
    if (!L) return null
    let p = at - 1
    while (p >= 0 && !loadSeq[p].load) p--
    const prev = p >= 0 ? loadSeq[p].load : null
    if (prev && sameLoad(prev, L)) return null
    // "+" between plates: "45 + 5 per side" reads as a sum, a dot did not (Boris, 2026-09-13).
    const stack = L.plates.map(w => fmtPlate(w)).join(' + ')
    const text = L.barOnly ? t('Bar only')
      : L.kind === 'pairs' ? t('{0} per side', stack || '–') : t('Load {0}', stack || '–')
    const d = prev && !dense ? plateDelta(prev.plates, L.plates) : null
    const moves = d ? [...d.strip.map(w => '−' + fmtPlate(w)), ...d.add.map(w => '+' + fmtPlate(w))] : []
    return <div className="plateline">
      <Icon name="plate" />
      <span>{text}{L.missing > 0 && <> · <span className="short">{t('{0} short', fmtPlate(L.missing) + ' ' + S.unit)}</span></>}</span>
      {moves.length > 0 && <span className="moves">{moves.join(' ')}</span>}
    </div>
  }
  // Everything about this exercise that is not a set you are logging right now lives behind one
  // button. What used to be a row of buttons in the header, a chip under the bar, a strip of
  // three under the sets and four more below the card is a single list you open once a session.
  // Since v1.4.4 it leads with the handful you reach for at the gym (note, swap, warm-up, rest,
  // history) and folds the rest under one More row (MenuSheet's `more`): the exercise's
  // settings, the how-to, the order of the session and the progression toggle. Remove stays
  // last, on its own.
  // The exercise's own rest, or the default it falls back to (lib/supersetFlow.js restSecFor).
  const ownRest = ownExerciseRest(entry.target)
  const restSub = ownRest === 0 ? t('No timer') : ownRest ? fmtRest(ownRest) : t('Default ({0})', fmtRest(S.restSec))
  const backups = (entry.target?.subs || []).map(id => EXIDX[id]).filter(b => b && b.id !== entry.id)
  // Form videos are a module (Settings → Modules): off, nothing offers to film; filmed ones stay.
  const videosOn = isOn(S, 'videos')
  const filmAt = videosOn ? filmTarget(entry) : -1
  const setTitle = (s, i) => isWarmupRow(s) ? t('Warm-up') : sideTagOf(s) ? t('Set {0} ({1})', setNumOf(s, i), sideTagOf(s)) : t('Set {0}', setNumOf(s, i))
  // A timed per-side hold is one set over two rows; its video sits on the first of them.
  const filmSet = i => {
    const at = setSpanAt(entry.sets, i)[0]
    filmSetSheet({ entry: entryIdx, set: at }, t('Film {0}', setTitle(entry.sets[at], at)))
  }
  const openMore = () => menuSheet({
    title: exerciseNameFor(ex),
    titleClass: exerciseNameClass(ex),
    sections: [
      { items: [
        { icon: 'note', label: entry.note ? t('Edit note') : t('Add note'), sub: entry.note || undefined, onClick: () => exerciseNoteSheet(entryIdx) },
        onSwap && { icon: 'swap', label: t('Swap exercise'), onClick: onSwap, disabled: busy },
        // The slot's planned backups (#649), one tap each: the machine is taken, the plan says what next.
        ...(onSwapBackup ? backups.map(b => ({ icon: 'swap', label: t('Swap to {0}', exerciseNameText(b)), sub: t('Planned backup, same sets and reps'), onClick: () => onSwapBackup(b.id), disabled: busy })) : []),
        { icon: 'sunrise', label: t('Add warm-up set'), onClick: onAddWarmup },
        // Today's warm-ups as the routine's own from now on (#525, lib/warmup-ramp.js).
        onKeepWarmups && { icon: 'sunrise', label: t('Keep these warm-ups'), sub: t('Saved in the routine, scaled to your work weight'), onClick: onKeepWarmups },
        onRest && { icon: 'timer', label: t('Rest timer'), sub: restSub, onClick: onRest },
        { icon: 'history', label: t('History'), sub: last ? t('Last time') + ' ' + fmtDate(last.d) : undefined, onClick: () => exerciseHistorySheet(entry.id) },
        // The Coach on this exercise, for the rest of this workout (components/WorkoutCoachSheet.jsx).
        onAskCoach && { icon: 'sparkles', label: t('Ask the Coach'), sub: t('It hurts, it’s taken, no time, feeling great'), onClick: onAskCoach },
      ] },
      { more: [
        { title: t('Exercise'), items: [
          onProgressionSettings && { icon: 'slider', label: t('Exercise settings'), sub: prescription ? t(PRESET_LABEL[prescription.preset]) : t('Sets, reps, rest, progression'), onClick: onProgressionSettings },
          plateLoading && { icon: 'plate', label: t('Plate loading'), sub: loadSummary, onClick: () => barWeightSheet(entry.id, cfg) },
          { icon: 'info', label: t('How to do it'), onClick: () => exerciseDetailSheet(ex) },
          youtubeSearchUrl(ex) && { icon: 'play', label: t('Watch on YouTube'), sub: t('Opens a search for good form'), onClick: () => openExternal(youtubeSearchUrl(ex)) },
          routineUpdate && { icon: 'clipboard', label: t('Update routine'), sub: routineUpdate.sub, onClick: routineUpdate.run },
        ] },
        { title: t('Order and supersets'), items: [
          onPairPrev && { icon: 'link', label: t('Make superset with previous'), onClick: onPairPrev },
          onPairNext && { icon: 'link', label: t('Make superset with next'), onClick: onPairNext },
          onMoveUp && { icon: 'chevronUp', label: t('Move up'), onClick: onMoveUp, disabled: busy || !canMoveUp },
          onMoveDown && { icon: 'chevronDown', label: t('Move down'), onClick: onMoveDown, disabled: busy || !canMoveDown },
        ] },
        { title: t('This session'), items: [
          // Your own form video of the set about to be done (lib/set-videos.js filmTarget). Under
          // More here: the set's own menu has it on show, one tap from the set number.
          filmAt >= 0 && { icon: 'camera', label: t('Film a set'), sub: setTitle(entry.sets[filmAt], filmAt), onClick: () => filmSet(filmAt) },
          onNoProg && { icon: 'chartLineSlash', label: t('Don’t count for progression'), sub: t('This exercise, this session only'), on: entry.noProg === true, onClick: () => onNoProg(entry.noProg !== true) },
        ] },
      ] },
      { items: [
        onRemoveExercise && { icon: 'trash', label: t('Remove exercise'), onClick: onRemoveExercise, danger: true, disabled: busy },
      ] },
    ],
  })
  // The set number is the set's own menu: drop / burst / remove — three things that used to
  // sit as chips and an X on every single row.
  // A timed per-side exercise plans in L/R pairs (buildWorkSets, addSet below), so the two
  // halves of a pair read as one set number — "Set 1 — Left" then "Set 1 — Right" — rather than
  // counting every row and making the second half look like an extra set.
  const setNumOf = (s, i) => setNumberAt(entry.sets, i)
  const sideTagOf = s => s.side === 'L' ? t('Left') : s.side === 'R' ? t('Right') : null
  // What a set rests without a rest of its own, as the flow works it out (restSecFor,
  // warmupRestSecFor), so the set menu can name it.
  const setRestDefault = i => {
    const all = A.entries || []
    const unit = supersetUnits(all).find(u => u.includes(entryIdx)) || [entryIdx]
    const work = restSecFor(all, unit, S.restSec, { idx: entryIdx, sec: pyramidRestFor(entry.target, entry.sets, i) })
    return warmupRestSecFor(entry, i, work, S.warmupRestSec)
  }
  const openSetRest = i => {
    const start = setSpanAt(entry.sets, i)[0]
    const own = ownSetRest(entry.sets[start])
    const dflt = t('Default ({0})', fmtRest(setRestDefault(start)))
    menuSheet({
      title: t('Rest after this set'),
      items: [
        { icon: 'timer', label: dflt, on: own == null, onClick: setRestAt(start, null) },
        { icon: 'pause', label: t('No timer'), on: own === 0, onClick: setRestAt(start, 0) },
        { icon: 'clock', label: t('Pick a time'), on: own > 0, onClick: () => {
          const save = sec => setRestAt(start, sec > 0 ? sec : 0)()
          durationSheet({ title: t('Rest after this set'), value: own > 0 ? own : setRestDefault(start), max: REST_MAX, off: t('No timer'), onDone: save })
        } },
      ],
    })
  }
  const openSetMenu = (s, i) => {
    const warm = isWarmupRow(s)
    const sideTag = sideTagOf(s)
    const ownRestHere = ownSetRest(entry.sets[setSpanAt(entry.sets, i)[0]])
    const spanStart = setSpanAt(entry.sets, i)[0]
    const video = setVideoOf(entry.sets[spanStart])
    const noteHere = setNoteOf(entry.sets[spanStart])
    menuSheet({
      title: warm ? t('Warm-up') : sideTag ? t('Set {0} ({1})', setNumOf(s, i), sideTag) : t('Set {0}', setNumOf(s, i)),
      subtitle: setLabel(entry.id, s, entry.target, speedUnit),
      // What you do to a set mid-workout comes first (failure, a drop or a burst on top, a copy);
      // the phase and the set's own rest are rarer and fold under More (v1.4.4). Remove stays last.
      sections: [
        { items: [
          // Taken to failure: a toggle with its check, like the menu's other on/off rows. It counts
          // as RIR 0 wherever effort is read, unless a rating was logged on the set. A timed
          // per-side pair is one set, so both halves get it.
          !warm && mode !== 'cardio' && { icon: 'gauge', label: t('Taken to failure'), sub: t('Nothing left in the tank'), on: isFailureSet(s), onClick: () => toggleFailureAt(i) },
          // Cardio's effort lives here, not in a column (the third one is the incline): RPE only,
          // whatever the profile logs, since reps in reserve mean nothing on a treadmill. Stored as
          // `rpe` on the set, which the fatigue model already reads (recovery.js via rirOf).
          !warm && cardio && { icon: 'gauge', label: t('How hard it felt'), sub: s.rpe != null ? t(EFFORT.rpe.hd) + ' ' + fmtNum(s.rpe) : t('Not rated yet'), onClick: () => effortPickerSheet('rpe', s.rpe ?? null, nv => onField(i, 'rpe', nv), { cardio: true }) },
          !warm && mode === 'reps' && !isRestPauseSet(s) && { icon: 'arrowDown', label: t('Drop set'), sub: t('+ Drop'), onClick: () => addDropRow(i) },
          !warm && mode === 'reps' && !isDropSet(s) && { icon: 'bolt', label: t('Rest-pause burst'), sub: t('+ Burst'), onClick: () => addBurstRow(i) },
          onCopySetAt && { icon: 'copy', label: t('Copy this set'), onClick: () => onCopySetAt(i) },
          // Your own form video (v1.4.4). Up here rather than under More: it is filmed while the
          // set happens, one tap from the number; once there is one, the same row plays it.
          !videosOn ? null : video
            ? { icon: 'play', label: t('Watch your video'), sub: video.dur != null ? fmtClip(video.dur) : undefined, onClick: () => setVideoAt(spanStart) }
            : { icon: 'camera', label: t('Film this set'), sub: t('Check your form later'), onClick: () => filmSet(i) },
          // A word about this one set (lib/set-notes.js), kept with the workout.
          { icon: 'note', label: noteHere ? t('Edit note') : t('Note'), sub: noteHere || t('A word about this set'), onClick: () => setNoteSheet(entryIdx, spanStart, warm ? t('Warm-up') : t('Set {0}', setNumOf(s, i))) },
        ] },
        { more: [{ items: [
          // A warm-up logged as a work set (or the other way round) changes phase here. Reps sets
          // only, the kind a warm-up is added as; one work set always stays. A per-side set keeps
          // its two sides either way (#575), so it goes back and forth like any other.
          !warm && mode === 'reps' && canBeWarmup(s) && entry.sets.some((x, j) => j !== i && !isWarmupRow(x)) && { icon: 'sunrise', label: t('Make it a warm-up set'), onClick: () => setPhaseAt(i, true) },
          warm && mode === 'reps' && { icon: 'dumbbell', label: t('Count it as a working set'), onClick: () => setPhaseAt(i, false) },
          // Just this set's rest, this session (#609): a long one before the top set, none after a light one.
          !editing && { icon: 'timer', label: t('Rest after this set'), sub: ownRestHere == null ? t('Default ({0})', fmtRest(setRestDefault(i))) : ownRestHere === 0 ? t('No timer') : fmtRest(ownRestHere), onClick: () => openSetRest(i) },
        ] }] },
        { items: [
          { icon: 'trash', label: t('Remove this set'), danger: true, disabled: !editing && entry.sets.length <= setSpanAt(entry.sets, i)[1], onClick: () => onRemoveSetAt(i) },
        ] },
      ],
    })
  }
  // The effort cell is a single button, not a stepper: it shows the rating in the profile's
  // scale, tinted by how close to failure it was, and opens the picker on tap — to set a
  // rating or change one. rirOf-via-effortColor keeps the colour identical whether the value
  // is logged as RIR or RPE. With the +/- buttons switched off (Workout controls) a logged
  // rating is just the tinted value, which still opens the picker.
  const effortCell = (s, i, col) => {
    const v = s[col.f] ?? null
    const rir = col.eff === 'rpe' ? (v == null ? null : 10 - v) : v
    const color = effortColor(rir)
    // Logging an effort concludes the set (issue #64): once you rate how a set felt, it is done —
    // so picking a value also ticks the set and starts the rest timer, sparing the redundant
    // second confirmation. Clearing a rating (null) never un-ticks: ending a set stays a manual
    // undo via the checkmark. Reads `done` live from the store, since a superset re-render can
    // stale the closure's `s`, and only ticks a set that is not already done.
    const pickEffort = nv => {
      onField(i, col.f, nv)
      if (nv == null) return
      const fresh = useStore.getState().A?.entries[entryIdx]?.sets[i]
      if (fresh && !fresh.done) onToggle(i)
    }
    const open = () => effortPickerSheet(col.eff, v, pickEffort)
    if (v == null) return (
      <button className="effcell is-empty" aria-label={col.hd} onClick={open}>{col.hd}</button>
    )
    const step = dir => onField(i, col.f, stepEffort(col.eff, v, dir))
    return (
      <div className={'stp effcell-stp' + (wc.steppers ? '' : ' plain')}
        style={color ? { color, borderColor: color, background: `color-mix(in srgb, ${color} 20%, var(--surface-2))` } : undefined}>
        {wc.steppers && <button aria-label={t('Decrease')} onClick={() => step(-1)}><Icon name="minus" /></button>}
        <button className="val" aria-label={col.hd} onClick={open}>{fmtNum(v)}</button>
        {wc.steppers && <button aria-label={t('Increase')} onClick={() => step(1)}><Icon name="plus" /></button>}
      </div>
    )
  }
  // Per-side versions of the weight/reps stepper and the effort picker. Same markup and stepping
  // rules as the row-level `cell`/`effortCell`, but bound to one side of a unilateral row and
  // routed through setSide so the aggregate stays correct. Reads the live side value from the
  // store for the same stale-closure reason `bump` does.
  const sideBump = (i, side, col, dir) => {
    const fresh = liveRow(i)?.sides?.[side]
    const cur = fresh ? fresh[col.f] : 0
    if (col.f === 'w') return setSide(i, side, col.f, stepLoad(cur, col.step, dir))
    // Reps step by one per side: repCol's step of two keeps the *combined* total evenly
    // splittable, but here each side is logged directly, so one tap is one rep.
    const step = col.f === 'r' ? 1 : col.step
    setSide(i, side, col.f, Math.max(0, Math.round(((cur || 0) + dir * step) * 100) / 100))
  }
  const sideCell = (sd, i, side, col, cls) => (
    <div className={'stp ' + cls + (wc.steppers ? '' : ' plain')}>
      {wc.steppers && <button aria-label={t('Decrease')} onClick={() => sideBump(i, side, col, -1)}><Icon name="minus" /></button>}
      <span className="val"><NumberField decimal={col.dec} value={sd[col.f] ?? ''}
        onChange={v => setSide(i, side, col.f, v)} /></span>
      {wc.steppers && <button aria-label={t('Increase')} onClick={() => sideBump(i, side, col, 1)}><Icon name="plus" /></button>}
    </div>
  )
  const sideEffortCell = (sd, i, side, col) => {
    const v = sd[col.f] ?? null
    const rir = col.eff === 'rpe' ? (v == null ? null : 10 - v) : v
    const color = effortColor(rir)
    const open = () => effortPickerSheet(col.eff, v, nv => {
      setSide(i, side, col.f, nv)
      const fresh = useStore.getState().A?.entries[entryIdx]?.sets[i]?.sides?.[side]
      if (nv != null && fresh && !fresh.done) onToggleSide(i, side)
    })
    if (v == null) return <button className="effcell is-empty" aria-label={col.hd} onClick={open}>{col.hd}</button>
    const step = dir => setSide(i, side, col.f, stepEffort(col.eff, v, dir))
    return (
      <div className={'stp effcell-stp' + (wc.steppers ? '' : ' plain')}
        style={color ? { color, borderColor: color, background: `color-mix(in srgb, ${color} 20%, var(--surface-2))` } : undefined}>
        {wc.steppers && <button aria-label={t('Decrease')} onClick={() => step(-1)}><Icon name="minus" /></button>}
        <button className="val" aria-label={col.hd} onClick={open}>{fmtNum(v)}</button>
        {wc.steppers && <button aria-label={t('Increase')} onClick={() => step(1)}><Icon name="plus" /></button>}
      </div>
    )
  }
  // One side's row: the L or R badge, then the same weight/reps/effort controls as a straight
  // row but bound to that side, and the side's own done tick.
  const sideRow = (s, i, side, col1, col2, col3) => {
    const sd = (s.sides && s.sides[side]) || { w: 0, r: 0, done: false }
    return <div className={'setrow side' + (sd.done ? ' done' : '') + (col3 ? ' eff3' : '')}>
      <span className="sidetag" aria-hidden="true">{side === 'L' ? t('L') : t('R')}</span>
      {sideCell(sd, i, side, col1, 'w')}
      {col2 && sideCell(sd, i, side, col2, 'r')}
      {col3 && sideEffortCell(sd, i, side, col3)}
      <Check checked={sd.done} label={t('Set {0} ({1}) done', setNumOf(s, i), side === 'L' ? t('Left') : t('Right'))} onChange={() => onToggleSide(i, side)} />
    </div>
  }
  // A side's own drop-set/rest-pause sub-rows (issue #60): the intensifier is logged per limb, so
  // the drops and bursts hang under that side's row, each editable, exactly like a straight set's
  // do under its row. Reads the side object, not the aggregate.
  const sideExtras = (s, i, side) => {
    const sd = (s.sides && s.sides[side]) || {}
    return <>
      {dropsOf(sd).map((d, di) => (
        <div className="subrow" key={'d' + di}>
          <span className="subn">{t('Drop {0}', di + 1)}</span>
          {miniStepper(d.w, loadStep, true, v => setDropField(i, di, 'w', v, side), true)}
          {miniStepper(d.r, 1, false, v => setDropField(i, di, 'r', v, side))}
          <button className="iconbtn" aria-label={t('Remove drop')} onClick={() => removeDrop(i, di)}><Icon name="xmark" /></button>
        </div>
      ))}
      {clustersOf(sd).map((c, ci) => (
        <div className="subrow" key={'c' + ci}>
          <span className="subn">{t('Burst {0}', ci + 1)}</span>
          {miniStepper(c.r, 1, false, v => setClusterField(i, ci, v, side))}
          <span className="dim small">{c.restSec}s</span>
          <button className="iconbtn" aria-label={t('Remove burst')} onClick={() => removeCluster(i, ci)}><Icon name="xmark" /></button>
        </div>
      ))}
    </>
  }
  // A smaller stepper for a drop's weight/reps or a burst's reps — editing what the plan (or a
  // live "+ Drop"/"+ Burst" tap) already put on the row, not typing into a fresh field.
  const miniStepper = (value, step, dec, onChange, snapWeightStep = false) => (
    <div className="stp mini">
      <button aria-label={t('Decrease')} onClick={() => onChange(snapWeightStep ? stepLoad(value, step, -1) : Math.max(0, Math.round(((value || 0) - step) * 100) / 100))}><Icon name="minus" /></button>
      <span className="val"><NumberField decimal={dec} value={value ?? ''} onChange={onChange} /></span>
      <button aria-label={t('Increase')} onClick={() => onChange(snapWeightStep ? stepLoad(value, step, 1) : Math.max(0, Math.round(((value || 0) + step) * 100) / 100))}><Icon name="plus" /></button>
    </div>
  )
  // A plain set row (anything but a reps L/R stack). Its own function since a timed per-side
  // hold draws two of them, L then R, inside one swipe so the pair slides as the one set it is.
  // A set taken to failure wears a small "F" on its number, the button every row's menu opens
  // from. The button's own label speaks for it, so a screen reader hears it with the set number.
  const failMark = s => isFailureSet(s) ? <span className="failmark" aria-hidden="true">{t('F')}</span> : null
  const failSay = (s, label) => isFailureSet(s) ? label + ', ' + t('Taken to failure') : label
  const plainRow = (s, i) => (
    <div ref={el => onSetRowRef?.(i, el)} data-tour="set" className={'setrow' + (s.done ? ' done' : '') + (col3 ? ' eff3' : '') + (timed ? ' timed' : '')}>
      <button type="button" className="n" aria-label={trendSay(i, failSay(s, sideTagOf(s) ? t('Set {0} ({1})', setNumOf(s, i), sideTagOf(s)) : t('Set {0}', setNumOf(s, i))))} aria-describedby={optsId} title={t('More')} onClick={() => openSetMenu(s, i)}>{setNumOf(s, i)}{failMark(s)}{trendMark(i)}</button>
      {/* Both words sit in the pill's one grid cell (::before/::after, hidden), so Left and
          Right are as wide as the longer of the two in every language and the inputs
          after them line up (#322). */}
      {sideTagOf(s) && <span className="tag acc nocap sidepill" data-l={t('Left')} data-r={t('Right')}><span>{sideTagOf(s)}</span></span>}
      {cell(s, i, col1, 'w')}
      {col2 && cell(s, i, col2, 'r')}
      {col3 && (col3.eff ? effortCell(s, i, col3) : cell(s, i, col3, 'r inc'))}
      {/* A timed set is started, not typed: the timer counts the hold down and checks the
          set off itself. The checkbox stays for anyone who timed it on their own watch. */}
      {timed && !editing && <button className="setgo" aria-label={t('Start set')} disabled={s.done || !!working}
        onClick={() => onStartTimed(i)}><Icon name="play" /></button>}
      <Check checked={s.done} tour="tick" label={sideTagOf(s) ? t('Set {0} ({1}) done', setNumOf(s, i), sideTagOf(s)) : t('Set {0} done', setNumOf(s, i))} onChange={() => onToggle(i)} />
    </div>
  )
  // Swipe on sets (v1.3.11, Settings → Workout): a set row swiped toward the start of the line is
  // removed with an Undo, toward the end copied below itself. Off, the row is the plain row it
  // was, and the Cards swipe works from it again. The row closes whenever its exercise's rows
  // change, the row is ticked, or a rest or hold starts: rows are keyed by index, so an open row
  // could otherwise end up showing another set.
  const swipeOn = !!(wc.swipeSets && onCopySetAt && onRemoveSetAt)
  const dismissHint = () => { if (useUI.getState().swipeHint) setUI({ swipeHint: null }) }
  const swipeRow = (s, i, row) => {
    if (!swipeOn) return row
    // A timed per-side pair comes here once, at its L row, and stands for both rows.
    const [from, count] = setSpanAt(entry.sets, i)
    const mine = j => j != null && j >= from && j < from + count
    return <SwipeRow data-tour="swipe" canDelete={editing || entry.sets.length > count}
      onDelete={() => onRemoveSetAt(i)} onCopy={() => onCopySetAt(i)}
      onBlocked={() => useUI.getState().toast(t('Keep at least one set, champ'))}
      onStart={dismissHint}
      closeKey={[entry.sets.length, s.done ? 1 : 0, count === 2 && entry.sets[from + 1]?.done ? 1 : 0, s.sides?.L?.done ? 1 : 0, s.sides?.R?.done ? 1 : 0, restEnds || 0, working?.endsAt || 0, A.cur].join('|')}
      flash={setFlash && mine(setFlash.i) ? setFlash.id : 0}
      peek={swipeHint && mine(swipeHint.i) ? swipeHint.id : 0}>
      {row}
    </SwipeRow>
  }
  return <>
    {/* Animations set to Small: a thumbnail beside the name instead of a strip above it, so the
        first set is on screen without scrolling; a tap brings the full animation back. */}
    {!dense && !thumb && <Media ex={ex} notes={entry.target?.notes} key={entry.id} compact={compact} minimizable />}
    <div className="row between exhd" style={{ marginBottom: 6 }}>
      {thumb && <WorkoutThumb ex={ex} onExpand={() => update(s => { s.gifSize = 'full' })} />}
      <div style={{ flex: 1, minWidth: 0, fontSize: (compact || dense) ? 'var(--fs-body)' : 'var(--fs-title3)', fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1.2 }} className={exerciseNameClass(ex)}>{exerciseNameFor(ex)}</div>
      <div className="row" style={{ gap: 2, flex: 'none' }}>
        {entry.note && <button className="iconbtn" aria-label={t('Note')} title={t('Note')} style={{ color: 'var(--acc-ink)' }}
          onClick={() => exerciseNoteSheet(entryIdx)}><Icon name="note" /></button>}
        <button className="iconbtn" aria-label={t('More')} title={t('More')} onClick={openMore}><Icon name="more" /></button>
      </div>
    </div>
    {/* Kept out of progression: by hand for this session (the ⋯ menu, with its undo right here),
        or by a deload or rehab routine, which owns that choice and offers no undo. On in every
        view, compact included: it changes what the next session is built from. */}
    {entry.noProg === true && <div className="noprog">
      <Icon name="chartLineSlash" /><span>{t('Not counted for progression')}</span>
      {onNoProg && <button type="button" className="chip" onClick={() => onNoProg(false)}>{t('Undo')}</button>}
    </div>}
    {/* compact view keeps the plan line: it is what the rows are measured against */}
    {wc.pairButtons && !compact && !dense && (onPairPrev || onPairNext) && <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
      {onPairPrev && <Button size="xs" variant="tinted" icon="link" title={t('Make superset with previous')} onClick={onPairPrev}>{t('Make superset with previous')}</Button>}
      {onPairNext && <Button size="xs" variant="tinted" icon="link" title={t('Make superset with next')} onClick={onPairNext}>{t('Make superset with next')}</Button>}
    </div>}
    {/* compact view drops everything from here to the sets card — it is all still on the ⋯ menu
        (note, details, history, bar weight, progression) or is display-only (tags, "last time"). */}
    {!dense && <>
    <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
      {cardio && <span className="tag acc"><Icon name="figureRun" />{t('Cardio')}</span>}
      {/* A unilateral exercise is logged per side directly (the L/R rows below for reps, a
          "Left"/"Right" tag on each doubled row for a timed hold), so the old "{n} per side"
          chip — which halved the combined total for display — is gone: the split is no longer
          derived, it is what you enter. The tag only flags that this is per-side. */}
      {!cardio && isPerSide(cfg) && <span className="tag acc nocap"><Icon name="sides" />{t('Per side')}</span>}
      {(ex.tg || ex.bp) && <span className="tag">{t(MUSCLE_NAME[ex.tg] || ex.tg || ex.bp)}</span>}
      {ex.eq && <span className="tag">{t(ex.eq)}</span>}
      {best > 0 && <span className="tag nocap">{t('Best:')} {fmtNum(best)} {S.unit}</span>}
    </div>
    {/* Three notes can apply to one exercise and they are not interchangeable, so each keeps its
        own line and its own icon: the plan's instruction (cfg.note, from the routine), the
        standing fact about the movement (exNotes), and the message you pinned to yourself last
        session. Today's own note is edited through the button in the header and shown last. */}
    {cfg.note && <div className="exnote">{cfg.note}</div>}
    {standingNote && <div className="exnote"><Icon name="info" style={{ fontSize: 'var(--fs-footnote)', marginInlineEnd: 5, verticalAlign: '-2px' }} />{standingNote}</div>}
    {pinnedNote && <div className="exnote" style={{ color: 'var(--yellow)' }}>
      <Icon name="pin" style={{ fontSize: 'var(--fs-footnote)', marginInlineEnd: 5, verticalAlign: '-2px' }} />
      {t('From {0}:', fmtDate(pinnedNote.d, true))} {pinnedNote.note}
    </div>}
    {entry.note && <div className="exnote">{entry.note}</div>}
    {refLine}
    </>}
    {prescription && <div className="small" style={{ margin: '6px 0', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      <span className="dim">{t('Plan')}: {planSummary(prescription, fmtNum)} · {t('Rest {0} s', prescription.parameters.restSeconds)}{effortText}</span>
      {prescription.statusAtGeneration === 'completed' && <span className="tag acc">{t('Progression completed')}</span>}
      {prescription.ruleSnapshot.program.trainingMax && <span className="tag">{t('Phase {0} of {1}', prescription.ruleSnapshot.program.phases.findIndex(ph => ph.id === prescription.phaseId) + 1, prescription.ruleSnapshot.program.phases.length)}</span>}
      {operatorFor(phaseOf(prescription), 'difficulty') && <span className="tag">{t('Variation: {0}', rungName(prescription, prescription.values.difficulty))}</span>}
      {findings.size > 0 && <span className="tag" style={{ color: 'var(--yellow)' }}>{t('Out of plan')}</span>}
    </div>}
    {prescription && missingReference(prescription) && <div className="small dim" style={{ marginBottom: 6 }}>{t('No 1RM on file — enter the weight you lift.')}</div>}
    {prescription?.provenance.derivedFromOutOfPlan && <div className="small dim" style={{ marginBottom: 6 }}>{t('Suggested from a session logged out of plan.')}</div>}
    {prescription?.provenance.reviewTrainingMax && <div className="small" role="status" style={{ color: 'var(--yellow)', marginBottom: 6 }}>{t('progression.reviewTrainingMax')}</div>}
    {prescription?.provenance.deload && <div className="small dim" style={{ marginBottom: 6 }}>{t('Backed off after {0} sessions short of the plan: {1} → {2} {3}.',
      prescription.provenance.deload.stalls, fmtNum(prescription.provenance.deload.from), fmtNum(prescription.provenance.deload.to),
      prescription.provenance.deload.method === 'seconds' ? 's' : prescription.parameters.load.expression.mode === 'percent_1rm' ? '%' : S.unit)}</div>}
    {prescription?.provenance.rung && <div className="small dim" style={{ marginBottom: 6 }}>{prescription.provenance.rung.reason === 'promote' ? t('Moved up to {0}.', rungName(prescription, prescription.provenance.rung.to)) : t('Back to {0}.', rungName(prescription, prescription.provenance.rung.to))}</div>}
    <div className="card" style={{ marginTop: 10, marginBottom: 0 }}>
      {/* the header carries the same eff3/timed sizing as the rows, or the labels drift off their
          columns; over L/R rows it also has to skip the side badge that sits in front of the weight cell */}
      <div className={'sethead' + (col3 ? ' eff3' : '') + (timed ? ' timed' : '') + (perSide ? ' per-side' : '') + (wc.steppers ? '' : ' plain')}><span className="n-sp" /><span className="w-sp">{col1.hd}</span>{col2 && <span className="r-sp">{col2.hd}</span>}{col3 && <span className={col3.eff ? 'eff-sp' : 'r-sp'}>{col3.hd}</span>}{timed && <span className="ck-sp" />}<span className="ck-sp" /></div>
      <span id={optsId} className="vh">{t('Options: copy, remove')}</span>
      {entry.sets.map((s, i) => {
        const warm = isWarmupRow(s)
        const warmBefore = i > 0 && isWarmupRow(entry.sets[i - 1])
        const isFirstWarmup = warm && !warmBefore
        // Numbering restarts per phase: with two warm-ups the first work set reads 1, not 3.
        const phaseNum = entry.sets.slice(0, i + 1).filter(x => isWarmupRow(x) === warm).length
        // A timed per-side hold is an L row and an R row that delete and copy as one set, so they
        // also swipe as one: the L row's turn draws both, the R row's draws neither.
        const [spanStart, spanCount] = setSpanAt(entry.sets, i)
        const pairHead = spanCount === 2 && spanStart === i
        const pairTail = spanCount === 2 && spanStart !== i
        return <div key={i}>
          {isFirstWarmup && <div className="setph">{t('Warm-up')}</div>}
          {!warm && warmBefore && <div className="setsep" />}
          {/* A pyramid's Max set: the reps are what you managed, not a number to hit. */}
          {/* With the record to beat at this set's weight or heavier, from before this session. */}
          {!warm && s.max && <div className="setph">{t('Max: as many reps as you can')}{(() => {
            const rec = maxRecordAt(H.workouts, entry.id, s.w)
            if (!rec) return null
            return ' · ' + (rec.w > 0 ? tn('Record: {0} rep at {1}', 'Record: {0} reps at {1}', rec.r, fmtNum(rec.w) + ' ' + S.unit) : tn('Record: {0} rep', 'Record: {0} reps', rec.r))
          })()}</div>}
          {!pairTail && swipeRow(s, i, perSide && isSideSet(s) ? (
            // Unilateral set: the number sits beside a two-row L/R stack, each side logged and
            // ticked on its own (issue #60). Warm-ups split the same way as the work sets they
            // ramp toward, so a warm-up side set shows L/R too (#388).
            <div ref={el => onSetRowRef?.(i, el)} className={'setrow-side' + (s.done ? ' done' : '')}>
              <button type="button" className="n" aria-label={trendSay(i, failSay(s, t('Set {0}', phaseNum)))} aria-describedby={optsId} title={t('More')} onClick={() => openSetMenu(s, i)}>{phaseNum}{failMark(s)}{trendMark(i)}</button>
              <div className="side-rows">
                {sideRow(s, i, 'L', col1, col2, col3)}
                {sideExtras(s, i, 'L')}
                {sideRow(s, i, 'R', col1, col2, col3)}
                {sideExtras(s, i, 'R')}
              </div>
            </div>
          ) : pairHead ? <>{plainRow(s, i)}{plainRow(entry.sets[i + 1], i + 1)}</> : plainRow(s, i))}
          {swipeHint && swipeHint.i === i && swipeOn && <div className="swhint">
            <button type="button" onClick={() => setUI({ swipeHint: null })}>
              <Icon name="swap" /><span>{t('Psst: swipe a set. Left deletes, right copies.')}</span><Icon name="xmark" />
            </button>
          </div>}
          {loadLine(String(i))}
          {findings.has(i) && <div className="small" role="status" style={{ color: 'var(--yellow)', margin: '2px 0 4px 34px' }}>{findings.get(i).map(findingText).join(' · ')}</div>}
          {/* The set's own note (lib/set-notes.js): a quiet line under the row, a tap edits it. */}
          {!pairTail && setNoteOf(s) && <button type="button" className="setnote-line" aria-label={t('Edit note') + ': ' + setNoteOf(s)}
            onClick={() => setNoteSheet(entryIdx, i, isWarmupRow(s) ? t('Warm-up') : t('Set {0}', setNumOf(s, i)))}>
            <Icon name="note" /><span>{setNoteOf(s)}</span>
          </button>}
          {/* The set's own form video: a badge, and the player right under the row on a tap. */}
          {!pairTail && setVideoOf(s) && <>
            {videosOn && <SetVideoBadge m={setVideoOf(s)} open={videoAt === i} onToggle={() => setVideoAt(videoAt === i ? null : i)} />}
            {videosOn && videoAt === i && <ActiveSetVideo m={setVideoOf(s)} at={{ entry: entryIdx, set: i }} label={setTitle(s, i)} refilmTitle={t('Film {0}', setTitle(s, i))} />}
          </>}
          {/* Drop-sets and rest-pause bursts extend this same row — no long rest, no new set.
              A planned exercise arrives with these already filled in (applyIntensifierPlan);
              every value here is just as editable as the main row's own weight/reps. */}
          {!warm && mode === 'reps' && <>
            {dropsOf(s).map((d, di) => (
              <div className="subrow" key={'d' + di}>
                <span className="subn">{t('Drop {0}', di + 1)}</span>
                {miniStepper(d.w, loadStep, true, v => setDropField(i, di, 'w', v), true)}
                {miniStepper(d.r, 1, false, v => setDropField(i, di, 'r', v))}
                <button className="iconbtn" aria-label={t('Remove drop')} onClick={() => removeDrop(i, di)}><Icon name="xmark" /></button>
              </div>
            )).flatMap((el, di) => [el, <Fragment key={'dl' + di}>{loadLine(i + ':d' + di)}</Fragment>])}
            {clustersOf(s).map((c, ci) => (
              <div className="subrow" key={'c' + ci}>
                <span className="subn">{t('Burst {0}', ci + 1)}</span>
                {miniStepper(c.r, 1, false, v => setClusterField(i, ci, v))}
                <span className="dim small">{c.restSec}s</span>
                <button className="iconbtn" aria-label={t('Remove burst')} onClick={() => removeCluster(i, ci)}><Icon name="xmark" /></button>
              </div>
            ))}
            {wc.setShortcuts && <div className="setextra">
              {!isRestPauseSet(s) && <button className="chip add" onClick={() => addDropRow(i)}><Icon name="arrowDown" />{t('+ Drop')}</button>}
              {!isDropSet(s) && <button className="chip add" onClick={() => addBurstRow(i)}><Icon name="bolt" />{t('+ Burst')}</button>}
            </div>}
          </>}
        </div>
      })}
      <div style={{ height: 8 }} />
      {wc.setShortcuts ? <div className="row" style={{ flexWrap: 'wrap' }}>
        <Button size="sm" icon="sunrise" onClick={onAddWarmup}>{t('Add warm-up set')}</Button>
        <Button size="sm" icon="minus" disabled={entry.sets.length <= setSpanAt(entry.sets, entry.sets.length - 1)[1]} onClick={onRemoveSet}>{t('Remove set')}</Button>
        <Button size="sm" icon="plus" onClick={onAddSet}>{t('Add set')}</Button>
      </div> : <Button size="sm" icon="plus" onClick={onAddSet}>{t('Add set')}</Button>}
    </div>
  </>
}

/* ---------- swipe on sets: delete, undo, copy (v1.3.11) ---------- */
// The swipe, the set-number menu and the Undo on the toast all come through here, so a set is
// removed, put back and copied the same way whichever you used, and always through the store's
// normal update: the sync sees an ordinary edit (with its _rev/baseRev), never an old snapshot
// written back over newer state.
//
// Rows have no id of their own, so whatever points at a row by its index has to move with it:
// the running hold (its callback writes the seconds to a row) and the rest a set started
// (timer.forSet). Removing the set either one belongs to stops it first; Undo does not start it
// again. Rows above or below just shift.
let holdAt = null    // { owner, idx, i }: the row a running hold will write to (startTimed)
let flashSeq = 0
// UI state written from here and from effects; a test that stubs the UI store without setState
// simply does not see it.
const setUI = patch => useUI.setState?.(patch)
const shiftRowRefs = (idx, from, by) => {
  if (holdAt && holdAt.idx === idx && holdAt.i >= from) holdAt = { ...holdAt, i: holdAt.i + by }
  // The hold's saved owner (useUI.work.owner, what a reload brings it back to) moves with it.
  const wk = useUI.getState().work
  if (wk?.owner && wk.owner.idx === idx && wk.owner.i >= from) setUI({ work: { ...wk, owner: { ...wk.owner, i: wk.owner.i + by } } })
  const rest = useUI.getState().timer
  if (rest && rest.forIdx === idx && rest.forSet != null && rest.forSet >= from) setUI({ timer: { ...rest, forSet: rest.forSet + by } })
}
/** The number a set row shows: counted per phase (warm-ups and work sets each from 1), and a
 *  timed per-side L/R pair as one set. */
export function setNumberAt(sets, i) {
  const s = sets[i]
  const warm = isWarmupRow(s)
  const phaseNum = sets.slice(0, i + 1).filter(x => isWarmupRow(x) === warm).length
  return s?.side ? Math.ceil(phaseNum / 2) : phaseNum
}
/** Removes set `i` of active entry `idx`, with an Undo on the toast. In a live session one set
 *  always stays (removeRowAt); the editor of a saved workout may take them all. */
export function deleteActiveSet(idx, i, { editing = false } = {}) {
  const A = useStore.getState().A
  const e = A?.entries?.[idx]
  const row = e?.sets?.[i]
  if (!row) return false
  const ui = useUI.getState()
  // A timed per-side hold is an L row and an R row that read as one set: both go, and both come back.
  const [start, count] = setSpanAt(e.sets, i)
  if (!editing && e.sets.length <= count) { ui.toast(t('Keep at least one set, champ')); return false }
  const inSpan = j => j != null && j >= start && j < start + count
  let stopped = false
  const holdHere = ui.work && ((holdAt && holdAt.idx === idx && inSpan(holdAt.i)) || (ui.work.owner && ui.work.owner.idx === idx && inSpan(ui.work.owner.i)))
  if (holdHere) { holdAt = null; ui.stopWork(); stopped = true }
  const rest = ui.timer
  if (rest && rest.forIdx === idx && inSpan(rest.forSet)) { ui.stopRest(); stopped = !rest.ready || stopped }
  shiftRowRefs(idx, start + count, -count)
  const n = setNumberAt(e.sets, i)
  const warm = isWarmupRow(row)
  const token = { activeId: A.id, idx, entryId: e.id, i: start, rows: structuredClone(e.sets.slice(start, start + count)) }
  useStore.getState().updateActive(A => {
    const en = A.entries?.[idx]
    if (!en) return
    if (editing) en.sets.splice(start, count)
    else en.sets = removeRowAt(en.sets, i)
    if (Array.isArray(A.exposures)) syncActiveExposures(A)
  })
  const msg = warm ? t('Warm-up gone.') : stopped ? t('Set {0} gone. Its timer stopped too.', n) : t('Set {0} gone.', n)
  ui.toast(msg, { action: t('Undo'), onAction: () => undoDeleteSet(token) })
  return true
}
/** Puts a removed set back exactly as it was, at its old place in the same exercise. If the
 *  exercise moved, it is found by its id; if it is gone, or the workout is, there is nothing to
 *  put it back into. */
export function undoDeleteSet(token) {
  const A = useStore.getState().A
  const ui = useUI.getState()
  const at = !A || A.id !== token.activeId ? -1
    : A.entries[token.idx]?.id === token.entryId ? token.idx
      : A.entries.findIndex(en => en.id === token.entryId)
  if (at < 0) { ui.toast(t('Too late, that one’s gone')); return false }
  const rows = token.rows || [token.row]
  const i = Math.min(token.i, A.entries[at].sets.length)
  shiftRowRefs(at, i, rows.length)
  useStore.getState().updateActive(A => {
    const en = A.entries[at]
    en.sets = rows.reduce((acc, r, k) => insertRowAt(acc, i + k, r), en.sets)
    if (Array.isArray(A.exposures)) syncActiveExposures(A)
  })
  setUI({ setFlash: { idx: at, i, id: ++flashSeq } })
  return true
}
