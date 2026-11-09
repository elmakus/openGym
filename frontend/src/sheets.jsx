import { Fragment, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from './store/useStore.js'
import { exView, exUnitPin, exUnitOf, exUnitTag, withExUnit, profileUnit, viewTarget, storedTarget, storedBar, viewEntry, viewRow, shownWeight } from './lib/ex-unit.js'
import { useUI } from './store/useUI.js'
import { EXDB, EXIDX, BODYPARTS, isCardio, isBodyweightEq, allExercises, equipmentOf, byCategory, smOf, searchExercises, similarExercises, exOr, isAssisted, betterWeight, beatsWeight, isCustomEx } from './lib/exercises.js'
import { activeProfile, exAvailable, ALL_EQUIPMENT, newProfile, profileEquipment, ACC_V } from './lib/equipment.js'
import { activeGym, gymsOf, gymLabel, copyInventory, gymHasStack } from './lib/gym-inventory.js'
import { autoGymHere } from './lib/gym-auto.js'
import { fmtDate, fmtDateRange, fmtNum, fmtPlate, fmtSpread, exerciseNameText, fmtVol, fmtDur, durPart, todayISO, isoOf, uid, exCount, routineCount, setsWorkCount, weightDecimals, DAYN, DAYS, weekOrder, weekStartOf, weekDayOffset, MONTHS_LONG, ACCENTS } from './lib/format.js'
import { lastEntryFor, bestWeightFor, bestWeightForEntry, effectiveRoutineIds, volumeOf, workoutDay, workoutVolume, sessionVolume, countsWarmups, setsDone, setsDoneActive, setUnitsTotal, lastBW, sessionSections, setLabel, defaultConfig, pickedExerciseConfig, cleanupSg, modeOf, effortOf, EFFORT, capEffort, stepEffort, isBw, isPerSide, sideReps, workSetsDone, applyIntensifierPlan, MAX_PLANNED_WARMUPS, NOTE_MAX } from './lib/history.js'
import { usesBar, hasBarOverride, isNoBar, barTypeWeight, ownBarDefault, barPicks, withBarDefault, withStandardBars, defaultBarWeight, BAR_TYPES } from './lib/bar.js'
import { PLATE_SIZES, pairsOf, ownsPlates, withPlatePairs, withStandardPlates, withLoadKind, loadKindFor, baseWeightFor, dropGrid } from './lib/plates.js'
import { toScale, rirOf, EFFORT_PRESETS, effortColor } from './lib/effort.js'
import { beep, vibrate } from './lib/sound.js'
import { t, tn, dateLocale, instrFor, instrTranslated, descFor, exerciseNameFor, exerciseNameClass, getLang, useLang } from './lib/i18n.js'
import { nav, closeThenNav, navToWorkout } from './lib/nav.js'
import { buildStarterPlan, starterPlanDays, starterPlanOptions } from './lib/starter.js'
import Media, { Thumb } from './components/Media.jsx'
import CustomMediaField from './components/CustomMediaField.jsx'
import WorkoutMediaSection, { workoutMediaCount } from './components/WorkoutMedia.jsx'
import { FormVideosSection } from './components/SetVideo.jsx'
import { workoutSetVideos } from './lib/set-videos.js'
import { mediaOf, normalizeMediaRef, cleanUrl, workoutMediaOf } from './lib/media-refs.js'
import { syncMedia } from './lib/media-sync.js'
import LineChart from './components/LineChart.jsx'
import Stepper from './components/Stepper.jsx'
import DateField from './components/DateField.jsx'
import { durationSheet } from './components/DurationWheel.jsx'
import { cleanBackups, withBackups, MAX_BACKUPS, backupSlotConfig } from './lib/routine-backups.js'
import { SG_NAME_MAX } from './lib/superset-meta.js'
import { REST_MAX, fmtRest, restWheelValue } from './lib/duration.js'
import Icon from './components/Icon.jsx'
import { SeasonDeco } from './components/Seasonal.jsx'
import ExerciseAliasesEditor, { ExerciseAliasesField, ExerciseAliasesLink } from './components/ExerciseAliases.jsx'
import { useNfcSupported, nfcExerciseSheet } from './components/Nfc.jsx'
import { Button, Slider, Switch, Segmented, SelectRow, Row, TextField, NumberField, MultiSelectRow } from './components/ui.jsx'
import { glyphOf, GLYPH_GROUPS, DEFAULT_GLYPH } from './lib/glyphs.js'
import BodyMap from './components/BodyMap.jsx'
import MuscleExplorer from './components/MuscleExplorer.jsx'
import ExerciseViewToggle from './components/ExerciseViewToggle.jsx'
import { sameMuscleFirst, swapMuscleOf } from './lib/similar-exercises.js'
import { suggestedSubstitutes, relatedSubstitutes } from './lib/exercise-substitutes.js'
import { exerciseMuscleSnapshot, loadOfWorkouts, MUSCLES, MUSCLE_NAME, muscleWeightsOf, muscleGroupsOf, hasExplicitMuscleMetadata, inMuscleOrder } from './lib/muscles.js'
import { mergeImport, importHasWeighIn } from './lib/import-csv.js'
import { addWeighIn, editWeighIn, removeWeighIn, restoreWeighIn, readingsOf, readingTime, allReadings, defaultTimeFor, cleanTime, timeOf, dailyModeOf, DEFAULT_TIME } from './lib/weigh-ins.js'
import { parseImportFile, mergeImportedRoutines, freshRoutines } from './lib/import-apps.js'
import { importHevyData, HevyApiError, HEVY_DEV_SETTINGS, mergeHevyRoutines, hevySummaryCounts } from './lib/import-hevy.js'
import { buildPlanBundle, buildProgrammeBundle, parsePlan, mergePlan } from './lib/plan-share.js'
import PrintPlanSheet from './components/PrintPlanSheet.jsx'
import { printWorkout } from './lib/report-print.js'
import { estimate1RMRange, best1RM, is1RMRecord, oneRmForMeaning, repCapOf, formulaOf, FORMULA_NAMES } from './lib/onerm.js'
import { setTrendOn, setTrendsFor, lastTimeBefore, trendGlyph, trendLabel } from './lib/set-trend.js'
import { mergeExercise, undoMerge, mergePreview, mergeBlocked } from './lib/exercise-merge.js'
import { setNoteOf, withSetNote, SET_NOTE_MAX } from './lib/set-notes.js'
import { StrengthLevelBlock } from './components/StrengthLevel.jsx'
import { exerciseHistory } from './lib/exercise-history.js'
import { relativeSeries } from './lib/relative-strength.js'
import { isBellEx, dbLoadOf, dbLoadFor, withDbLoad, entryDbLoad, currentDbLoad, isOneArm, dumbbellsOf, ownsDumbbells, withDumbbells, ownsNoDumbbells, withNoDumbbells, presetWeights, cleanWeights, canHaveStack, stackOf, withStack, stackFromStep } from './lib/dumbbells.js'
import { normalizeAliases } from './lib/exercise-aliases.js'
import { normalizeRepRange } from './lib/rep-range.js'
import { backoffWeights } from './lib/backoff.js'
import { isPyramid, normalizePyramid, normalizePyramidRest, normalizePyramidWeight, pyramidFromFlat, flatFromPyramid, pyramidLabel, PYRAMID_MAX, MAX_PYRAMID_SETS, PYRAMID_PRESETS } from './lib/pyramid.js'
import { MOBILE, shareExport, shareExportBlob, printHtml } from './lib/mobile.js'
import { speedUnitOf, toSpeed, fromSpeed } from './lib/speed.js'
import { clampIncline, inclineFits, INCLINE_MAX, INCLINE_STEP } from './lib/incline.js'
import { refillAfter } from './lib/rotation.js'
import { isWarmupRow, hasCompletedWork } from './lib/workout-model.js'
import { buildCompletedSession, recordsOf, workLoadOf } from './lib/finish-session.js'
import { sessionNoProg } from './lib/session-noprog.js'
import { sessionEnd } from './lib/session-end.js'
import { ownExerciseRest, nextUnfinishedUnit } from './lib/supersetFlow.js'
import { entryTimes } from './lib/exercise-time.js'
import { saveSessionAsRoutine, routineFromSession, routineAdditions, addToRoutine } from './lib/session-routines.js'
import { shareRoutineSheet } from './components/RoutineShare.jsx'
import { youtubeSearchUrl } from './lib/youtube.js'
import { openExternal } from './components/CustomMedia.jsx'
import { repeatSessionExposures } from './lib/session-repeat.js'
import { swapActiveExercise } from './lib/active-exercise-swap.js'
import WarmupConfig from './components/WarmupConfig.jsx'
import { warmupModeOf, ownRowsOf } from './lib/warmup-ramp.js'
import { useSheetKeyboard, useRevealActiveChip, tappable } from './lib/use-sheet-keyboard.js'
import { useAutoMore } from './lib/use-auto-more.js'
import { isFav, toggleFav, sortFavouritesFirst, sortYoursFirst } from './lib/favourites.js'
import { buildSessionExposures, effectiveExerciseId, missingOneRms, occurrenceFor } from './lib/session-start.js'
import { buildCombinedExposures, deriveSessionName } from './lib/session-merge.js'
import { entriesForExposures, planSummary, exposuresWithPerformance } from './lib/session-ui-adapter.js'
import { reconcileSessionHistory, reconcileAtp2History, reconcileTimedLoadHistory, editCompletedSession, editChangesNothing, editLeftEmpty, editedRecord } from './lib/session-edit.js'
import { finishCompare, finishCardio } from './lib/finish-compare.js'
import { workoutFit, fitFileName } from './lib/fit-export.js'
import { workoutsOn, backfillStart, backfillEnd, completeBackfill, historyAsOf, sessionHistory } from './lib/backfill.js'
import { legacyEntriesOf, appendOneRm, canonicalJSON, cardioParameters, defaultPlanRule, editPlan, planOptions, planPhase, presetForPolicy, planWarmupRows, supports, validatePlanRule, validateWarmup, warmupMaxCount, warmupSteps, withRest } from './lib/prescription/index.js'
import RuleEditor, { Disclosure, PRESET_LABEL } from './components/RuleEditor.jsx'
import FailureSets from './components/FailureSets.jsx'
import TimedLoadConfigFields, { slotTimedConfig, timedConfigError } from './components/TimedLoadConfigFields.jsx'
import { SIDE_PLANK_TIMED_CONFIG } from '../../api/training-control/timed-load.js'
import { failureFieldsOf, failureSetRange, failureSetsOf } from './lib/failure-selection.js'
import { occurrenceTargets } from './lib/occurrence-view.js'
import { profileRule } from './lib/prescription/vocabulary.js'
import { auditFields, badgeFor } from './views/history-outcome.js'
import { findingText } from './lib/progression-copy.js'
import { moveWorkout, sameWorkout, startTimeOf, durationMinOf, setWorkoutDuration, rebuildPrHistory, MAX_DURATION_MIN, endsInFuture } from './lib/workout-date.js'
import { stampWorkout } from './lib/sync-merge.js'
import { hrLabel } from './lib/heart-rate.js'
import { weeklyWeights } from './lib/bodyweight.js'
import { workoutText } from './lib/workout-text.js'
import { workoutCardModel, layoutWorkoutCard, drawWorkoutCard, viewAspect, CARD_FONT } from './lib/workout-card.js'
import { cardPalette } from './lib/card-draw.js'
import { makeCanvas, toPng, currentAccent, isRtl } from './lib/share-image.js'
import ShareCardSheet from './components/ShareCard.jsx'
import { streakInfo } from './lib/streak.js'
import { copyText } from './lib/clipboard.js'
import { queueRemaining, pinState } from './lib/queue.js'
import { DAY_NOTE_TAGS, DAY_NOTE_LABEL, DAY_NOTE_ICON, dayNoteOf, dayNoteLine, canNoteDay, withDayNote } from './lib/day-notes.js'
import { isOn } from './lib/modules.js'

const S = () => useStore.getState().S
const update = (...a) => useStore.getState().update(...a)
const updateActive = (...a) => useStore.getState().updateActive(...a)
const ui = () => useUI.getState()
const toast = m => ui().toast(m)
const snd = () => S().sound

/* ============================ custom confirm dialog ============================ */
// `noCancel`: one button only, for an explainer that must lead straight to the phone's own
// permission dialog (App Review 5.1.1(iv)); pass `locked` with it so the sheet can't be swiped away.
function ConfirmDialog({ title, message, confirmText, cancelText, danger, noCancel, onConfirm, onCancel, close }) {
  return <div style={{ textAlign: 'center', padding: '4px 0' }}>
    {title && <h3 style={{ marginBottom: 8 }}>{title}</h3>}
    <div className="muted" style={{ marginBottom: 18, lineHeight: 1.5 }}>{message}</div>
    <button className={'btn ' + (danger ? 'danger' : 'primary')} onClick={() => { close(); onConfirm && onConfirm() }}>{confirmText || t('Confirm')}</button>
    {!noCancel && <>
      <div style={{ height: 8 }} />
      <Button variant="ghost" className="dim" onClick={() => { close(); onCancel && onCancel() }}>{cancelText || t('Cancel')}</Button>
    </>}
  </div>
}
// "1 workouts and 1 weigh-ins" read wrong: a count of one takes the singular, per noun. Four
// whole sentences rather than two spliced counts, so every language keeps its own word order.
export function addDeviceDataMessage(workouts, weighIns) {
  const one = n => Number(n) === 1
  return one(workouts)
    ? one(weighIns)
      ? t('{0} workout and {1} weigh-in were logged on this device while signed out. Add them to your profile, or keep the profile exactly as it is on the server.', workouts, weighIns)
      : t('{0} workout and {1} weigh-ins were logged on this device while signed out. Add them to your profile, or keep the profile exactly as it is on the server.', workouts, weighIns)
    : one(weighIns)
      ? t('{0} workouts and {1} weigh-in were logged on this device while signed out. Add them to your profile, or keep the profile exactly as it is on the server.', workouts, weighIns)
      : t('{0} workouts and {1} weigh-ins were logged on this device while signed out. Add them to your profile, or keep the profile exactly as it is on the server.', workouts, weighIns)
}
// Sign-in found workouts on this device that the profile does not have (logged while signed
// out). The profile is the truth — settings and plan come from the server either way — the
// question is only whether these entries are added to it or dropped. Resolves true to add.
// Routines and the rest of a plan made here while signed out: asked about as well (they come along
// with "Add them"), in their own words when there is nothing else.
export function addDeviceSetupMessage(routines) {
  const n = Number(routines) || 0
  return n === 0
    ? t('Your plan, notes or gym cards on this device were set up while signed out. Add them to your profile, or keep the profile exactly as it is on the server.')
    : n === 1
      ? t('{0} routine was made on this device while signed out. Add it to your profile, or keep the profile exactly as it is on the server.', n)
      : t('{0} routines were made on this device while signed out. Add them to your profile, or keep the profile exactly as it is on the server.', n)
}
export function askAddDeviceData(extras) {
  const logged = extras.workouts || extras.bodyweight || extras.customEx
  return new Promise(resolve => confirmSheet({
    title: logged ? t('Add this device\'s workouts to your profile?') : t('Add this device\'s plan to your profile?'),
    message: logged ? addDeviceDataMessage(extras.workouts, extras.bodyweight) : addDeviceSetupMessage(extras.routines),
    confirmText: t('Add them'), cancelText: t('Keep profile as is'),
    onConfirm: () => resolve(true), onCancel: () => resolve(false), locked: true
  }))
}
/* ============================ menu sheet ============================ */
// A list of actions, one per row, closing on tap. This is where the workout screen parks
// everything that is not a set you are about to log: the point of a single "more" button is
// that the ten things you do once a session stop competing with the two you do every set.
// items: [{ icon, label, sub, onClick, danger, disabled, on }] — `on` draws a check for toggles.
// sections: [{ title, items }] instead of `items` splits a longer menu into groups, each with an
// optional small header; a group whose items are all falsy is left out, header and all.
// `accent` tints a row's icon, for the one entry a menu leads with.
// A title is shown as written: most are sentences ("Convert to lb?", "Set 2"), which a default
// title-casing turned into "Convert To Lb?". An exercise name passes exerciseNameClass as
// titleClass, which title-cases the lower-case packs and leaves a cased one alone.
// A section can also be `{ more: [sections], label }`: the rarely used part of a menu, folded
// into one "More" row (v1.4.4, "the ⋯ menu has a lot lot lot"). Its sub names what is inside,
// so nothing is hidden without a hint; a tap opens the groups right there, in place of the row,
// and moves focus to the first of them. A fold with a single item left in it is not worth a
// tap and shows that item as is; with none it is left out like any empty group.
const menuGroups = list => (list || [])
  .map(g => g.more ? g : { title: g.title, items: (g.items || []).filter(Boolean) })
  .filter(g => g.more || g.items.length)
function MenuSheet({ title, titleClass = '', subtitle, items, sections, close }) {
  const [open, setOpen] = useState(false)
  const firstMore = useRef(null)
  useEffect(() => { if (open) firstMore.current?.focus() }, [open])
  const groups = []
  for (const g of menuGroups(sections || [{ items }])) {
    if (!g.more) { groups.push(g); continue }
    const inner = menuGroups(g.more)
    const all = inner.flatMap(x => x.items)
    if (!all.length) continue
    if (all.length === 1) { groups.push({ items: all }); continue }
    if (open) { inner.forEach((x, i) => groups.push({ ...x, first: i === 0 })); continue }
    groups.push({ items: [{ icon: 'more', label: g.label || t('More'), sub: all.map(x => x.label).join(', '),
      fold: true, expanded: false, onClick: () => setOpen(true) }] })
  }
  return <>
    {title && <h3 className={titleClass || undefined} style={{ marginBottom: subtitle ? 2 : 10 }}>{title}</h3>}
    {subtitle && <div className="muted small" style={{ marginBottom: 10 }}>{subtitle}</div>}
    {groups.map((g, gi) => <div key={gi} className={'menu-group' + (sections ? ' grouped' : '')}>
      {g.title && <div className="menu-sec">{g.title}</div>}
      <div className="list menu-list">
        {g.items.map((it, i) => <div key={i} ref={g.first && i === 0 ? firstMore : undefined}
          className={'item menu-item' + (it.danger ? ' danger' : '') + (it.disabled ? ' disabled' : '') + (it.accent ? ' accent' : '') + (it.fold ? ' menu-more' : '')}
          aria-disabled={it.disabled || undefined}
          aria-expanded={it.fold ? false : undefined}
          {...tappable(it.disabled ? null : it.fold ? it.onClick : () => { close(); it.onClick && it.onClick() })}>
          {it.icon && <span className="lrow-i"><Icon name={it.icon} /></span>}
          <div className="grow"><div className="tt">{it.label}</div>{it.sub && <div className="ss">{it.sub}</div>}</div>
          {it.on != null && <span className={'menu-on' + (it.on ? ' is-on' : '')}><Icon name="check" /></span>}
          {it.chevron && <Icon name="chevronRight" className="menu-chev" />}
          {it.fold && <Icon name="chevronDown" className="menu-chev" />}
        </div>)}
      </div>
    </div>)}
  </>
}
export function menuSheet(opts) {
  ui().openSheet(close => <MenuSheet {...opts} close={close} />)
}

// Themed replacement for window.confirm — callback-based (no blocking).
export function confirmSheet(opts) {
  ui().openSheet(close => <ConfirmDialog {...opts} close={close} />, { kind: 'center', ...(opts.locked ? { locked: true } : {}) })
}

/* ============================ starter plan ============================ */
// Plan names and blurbs live here, not in lib/starter.js: check-source-strings.mjs only finds
// string literals written inside a t() call, so copy parked in the catalog and passed in as a
// variable is invisible to it — it would quietly stay English in every language.
const PLAN_COPY = {
  ppl: () => ({ name: t('Push / Pull / Legs'), about: t('Push, pull and legs each get their own day.') }),
  'upper-lower': () => ({ name: t('Upper / Lower'), about: t('Upper body twice, lower body twice.') }),
  'full-body': () => ({ name: t('Full Body'), about: t('Three sessions, the whole body each time.') }),
  '5x5': () => ({ name: t('5×5'), about: t('Five sets of five on the main barbell lifts.') })
}

// Adds the plan's routines (reusing one you already have under the same name) and puts them on
// its weekdays. Existing routines are never touched
// and only the weekdays the plan asks for are reassigned; an id with no plan behind it changes
// nothing at all. planId is deliberately required — a default invites `onClick={loadStarterPlan}`,
// which hands the click event in as the plan and silently loads nothing.
export function loadStarterPlan(planId, profile) {
  const plan = buildStarterPlan(planId, profile ? profileEquipment(profile) : undefined, S().unit)
  if (!plan) return false
  update(st => {
    // Loading the same plan again reuses the routines it added last time (same name, same
    // exercises) for the weekdays instead of a second Upper A, Lower A, ... under the same names.
    // A plan fitted to different equipment has other exercises, so it is added alongside.
    const idOf = {}
    const sameLift = (a, b) => a.ex.length === b.ex.length && a.ex.every((e, i) => (e.exerciseId ?? e.id) === (b.ex[i].exerciseId ?? b.ex[i].id))
    plan.routines.forEach(r => {
      const have = st.routines.find(x => x.name === r.name && sameLift(x, r))
      if (have) idOf[r.id] = have.id
      else { st.routines.push(r); idOf[r.id] = r.id }
    })
    plan.schedule.forEach(({ day, routineId }) => { st.week[day] = [idOf[routineId]] })
  })
  if (plan.fit) toast(t('{0} loaded, fitted to "{1}": {2} swapped, {3} dropped', PLAN_COPY[planId]().name, profile.name, plan.fit.swapped, plan.fit.dropped))
  else toast(t('{0} loaded', PLAN_COPY[planId]().name))
  return true
}

// Intl joins the days the way each language does it — "and" vs "und", "、" in Chinese.
const dayList = days => new Intl.ListFormat(dateLocale()).format(days.map(d => t(DAYN[d])))

function StarterPlanChooser({ close }) {
  const week = useStore(s => s.S.week)
  const routines = useStore(s => s.S.routines)
  const profiles = useStore(s => s.S.equipProfiles) || []
  // Fitting starts on for the profile you already filter by; '' leaves the plan as written.
  const [fitId, setFitId] = useState(() => activeProfile(useStore.getState().S)?.id || '')
  const fit = profiles.find(p => p.id === fitId) || null
  const choose = (id, name) => {
    const days = starterPlanDays(id)
    close()
    // A confirmation is only worth showing when one of those days is actually occupied — by a
    // routine that still exists, not by a stale id the Plan already shows as "Rest".
    const taken = day => [].concat(week[day] || []).some(id => routines.some(r => r.id === id))
    if (!days.some(taken)) { loadStarterPlan(id, fit); return }
    confirmSheet({
      title: t('Load {0}?', name),
      message: t('The new plan goes on {0}. Your existing routines stay; only those days of the weekly plan change.', dayList(days)),
      confirmText: t('Load plan'),
      onConfirm: () => loadStarterPlan(id, fit)
    })
  }
  return <>
    <h3>{t('Choose starter plan')}</h3>
    {profiles.length > 0
      ? <div className="chips" style={{ margin: '0 0 10px' }}>
          <div className="small dim" style={{ width: '100%' }}>{t('Fit to my equipment')}</div>
          <button className={'chip nocap' + (!fit ? ' on' : '')} onClick={() => setFitId('')}>{t('As written')}</button>
          {profiles.map(p => <button key={p.id} className={'chip nocap' + (fit?.id === p.id ? ' on' : '')} onClick={() => setFitId(p.id)}>{p.name}</button>)}
        </div>
      : <div className="small dim" style={{ margin: '0 0 10px' }}>{t('Add an equipment profile in Settings to fit a plan to what you own.')}</div>}
    <div className="list">
      {starterPlanOptions().map(({ id, days }) => {
        const { name, about } = PLAN_COPY[id]()
        return <div key={id} className="item" {...tappable(() => choose(id, name))}>
          <span className="lrow-i" style={{ background: 'var(--surface-3)' }}><Icon name="clipboard" /></span>
          <div className="grow"><div className="tt">{name}</div><div className="ss">{t('{0} days per week', days)} · {about}</div></div>
          <Icon name="chevronRight" className="chev" />
        </div>
      })}
    </div>
  </>
}

export const starterPlanSheet = () => ui().openSheet(close => <StarterPlanChooser close={close} />)

/* ============================ weight picker (shared: body weight + goal) ============================ */
// Fixed range, not a moving window — a window that resizes itself mid-drag (the previous
// attempt) makes the thumb's position unpredictable: every time it grows, everything already
// placed on it shifts toward one side. A static range never has that problem, at the cost of
// coarser precision per pixel — the +/- buttons, and typing straight into the read-out, cover
// exact values.
// The ceiling follows the profile's unit: 300 covers a body weight or a working weight in
// kg, but as pounds it cut off at 136 kg — below plenty of people's body weight, and well
// below an everyday squat.
const W_LO = 1
const wHi = unit => (unit === 'lb' ? 660 : 300)
// A typed body weight may sit past the slider (a 320 kg lifter is real), but not past any
// person: 9999 saved, drew the chart from -0 to 10,000 and set a goal 9,922 kg away.
const bwMax = unit => (unit === 'lb' ? 1500 : 700)
const bwTooHeavy = (n, unit) => {
  if (n <= bwMax(unit)) return false
  toast(t('That looks too heavy. Keep it at {0} or less.', fmtNum(bwMax(unit)) + ' ' + unit))
  return true
}
function WeightInput({ value, setValue, unit }) {
  const W_HI = wHi(unit)
  const clamp = x => Math.max(W_LO, Math.min(W_HI, Math.round((x || 0) * 10) / 10))
  const sv = Math.max(W_LO, Math.min(W_HI, value))
  const onSlide = v => setValue(clamp(v))
  const onType = v => setValue(v)

  return <>
    <div className="bwstep">
      <button className="bw-pm" onClick={() => onSlide(value - 0.1)} aria-label={t('Decrease by {0}', fmtNum(0.1))}><Icon name="minus" /></button>
      <label className="bw-read">
        <NumberField fit value={value} onChange={onType} aria-label={t('Weight ({0})', unit)} enterKeyHint="done"
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }} />
        <span className="u"> {unit}</span>
      </label>
      <button className="bw-pm" onClick={() => onSlide(value + 0.1)} aria-label={t('Increase by {0}', fmtNum(0.1))}><Icon name="plus" /></button>
    </div>
    <div className="chips" style={{ justifyContent: 'center', margin: '8px 0' }}>
      <button className="chip" onClick={() => onSlide(value - 1)}>−1</button>
      <button className="chip" onClick={() => onSlide(value - 0.5)}>−0.5</button>
      <button className="chip" onClick={() => onSlide(value + 0.5)}>+0.5</button>
      <button className="chip" onClick={() => onSlide(value + 1)}>+1</button>
    </div>
    <Slider value={sv} min={W_LO} max={W_HI} step={0.5} onChange={onSlide} />
  </>
}

/* ============================ body weight ============================ */
// A weigh-in has a time (#859): a day can hold several, and the profile's daily value
// (Settings → Units, lib/weigh-ins.js) picks the one the charts and the trend use. `edit` opens
// one weigh-in ({ d, id }) to change; `initial` is a weight an assistant heard (lib/voice.js).
function BwSheet({ required, onDone, close, initial, edit }) {
  const st = useStore(s => s.S)
  const unit = st.unit
  const bw = lastBW(st)
  const editing = useMemo(() => (edit ? readingsOf(st.bodyweight.find(b => b.d === edit.d)).find(r => r.id === String(edit.id)) || null : null), []) // eslint-disable-line react-hooks/exhaustive-deps
  const [v, setV] = useState(editing ? editing.w : Number(initial) > 0 ? Math.round(Number(initial) * 10) / 10 : bw ? bw.w : 70)
  const [date, setDate] = useState(editing ? edit.d : todayISO())
  // Now for today; another day starts on the time of its first weigh-in, or 08:00. Once picked
  // by hand, the time stays when the date changes.
  const [time, setTime] = useState(editing ? (editing.at || DEFAULT_TIME) : timeOf(Date.now()))
  const [timeSet, setTimeSet] = useState(!!editing)
  const pickDate = d => { setDate(d); if (!timeSet) setTime(defaultTimeFor(st, d, todayISO())) }
  const save = () => {
    const n = Math.round((v || 0) * 10) / 10
    if (!n || n <= 0) { toast(t('Enter a valid weight')); return }
    if (bwTooHeavy(n, unit)) return
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > todayISO()) { toast(t('Choose a valid date')); return }
    // The check-in before a workout is now; a weigh-in at the same time of a day corrects it.
    const at = required ? timeOf(Date.now()) : cleanTime(time) || (date === todayISO() ? timeOf(Date.now()) : DEFAULT_TIME)
    update(s => {
      if (editing) editWeighIn(s, edit.d, edit.id, { d: date, at, w: n })
      else addWeighIn(s, { d: date, at, w: n })
    })
    close()
    if (onDone) onDone(n); else toast(editing ? t('Weigh-in updated') : t('Weight saved'))
  }
  const recent = useMemo(() => allReadings(st.bodyweight).reverse().slice(0, 3), [st.bodyweight])
  return <>
    {/* This sheet opens `locked` — swipe/backdrop/Escape/Android-back all no-op on it (see
        Modals.jsx) so an accidental tap on "Start" can't be walked back by reflex the way
        every other sheet in the app can. The two buttons below already cover leaving it
        deliberately; this is the same close a normal sheet gets everywhere else, just
        opted back in explicitly instead of by omission. Plain close() — no onDone, no
        nav — so it's a true no-op: the screen underneath is exactly where you left it. */}
    {required
      ? <div className="row between" style={{ marginBottom: 14 }}>
          <h3 style={{ marginBottom: 0 }}>{t('Quick check-in')}</h3>
          <button className="iconbtn" aria-label={t('Cancel')} onClick={() => close()}><Icon name="xmark" /></button>
        </div>
      : <h3>{editing ? t('Edit weigh-in') : t('Log body weight')}</h3>}
    {required
      ? <div className="muted small">{t('Slide or tap to set your weight. We ask before every workout so your curve stays honest.')}</div>
      : <div className="row bw-when">
          <label className="measure-date">
            <span>{t('Date')}</span>
            <DateField value={date} max={todayISO()} onChange={pickDate} label={t('Date')} />
          </label>
          <label className="measure-date bw-time">
            <span>{t('Time')}</span>
            <input type="time" className="timef" value={time} aria-label={t('Time')}
              onChange={e => { setTime(e.target.value); setTimeSet(true) }} />
          </label>
        </div>}
    <WeightInput value={v} setValue={setV} unit={unit} />
    <div style={{ height: 14 }} />
    <Button variant="primary" onClick={save}>{required ? t('Save & start workout') : t('Save')}</Button>
    {required && <>
      <div style={{ height: 8 }} /><Button variant="ghost" className="dim" onClick={() => { close(); onDone && onDone(null) }}>{t('Start without weighing in')}</Button>
      <div style={{ height: 2 }} /><Button variant="ghost" className="dim" icon="swap" onClick={() => closeThenNav(close, '/workout')}>{t('Choose a different workout')}</Button>
    </>}
    {!required && !editing && recent.length > 0 && <>
      <h4 className="sec">{t('Recent weigh-ins')}</h4>
      <div className="list" style={{ gap: 0 }}>
        {recent.map(r => <WeighInRow key={r.d + '|' + r.id} d={r.d} r={r} unit={unit} />)}
      </div>
      {allReadings(st.bodyweight).length > recent.length && <div className="row" style={{ justifyContent: 'flex-end', marginTop: 6 }}>
        <Button size="sm" variant="ghost" trailingIcon="chevronRight" onClick={weighInsSheet}>{t('All weigh-ins')}</Button>
      </div>}
    </>}
  </>
}
export function bwSheet(opts = {}) {
  const h = ui().openSheet(close => <BwSheet {...opts} close={close} />, { locked: !!opts.required })
  return h
}

// One weigh-in with its delete button, in the log sheet's recent three and in the full list.
// Tapping the date and time opens it to change its weight, time or day (#859).
// The full list asks first (`confirm`): it is months of history scrolled through on a phone, and a
// stray tap on one of its trash buttons took a past weigh-in with nothing to bring it back. The log
// sheet's three are the ones just typed, where taking back a typo in one tap is the point.
// Either way the toast offers Undo (#756): the weigh-in comes back as it was, and the store
// records it as added back (stampDeletions, or the reading stamped anew), so a device that synced
// the removal keeps it too. `dayShown` false leaves the date out (it heads the day's group).
function WeighInRow({ d, r, unit, confirm = false, dayShown = true }) {
  const time = readingTime(r)
  const delEntry = () => {
    let undo = null
    update(s => { undo = removeWeighIn(s, d, r.id) })
    if (!undo) return
    ui().toast(t('Weigh-in deleted'), {
      action: t('Undo'),
      onAction: () => update(s => { restoreWeighIn(s, undo) }),
    })
  }
  const when = [dayShown ? fmtDate(d, true) : '', time].filter(Boolean).join(' · ') || fmtDate(d, true)
  const ask = () => confirmSheet({
    title: t('Delete weigh-in?'), message: `${[fmtDate(d, true), time].filter(Boolean).join(' · ')} · ${fmtNum(r.w)} ${unit}`,
    confirmText: t('Delete'), danger: true, onConfirm: delEntry,
  })
  return <div className={'row between bw-row' + (dayShown ? '' : ' bw-sub')} data-reading={r.id}>
    <button type="button" className="bw-when-btn small muted" onClick={() => bwSheet({ edit: { d, id: r.id } })} aria-label={t('Edit weigh-in') + ', ' + when}>
      {when}{r.src && r.src !== 'import' && <Icon name="heart" className="bw-src" />}
    </button>
    <span className="row" style={{ gap: 12 }}><b>{fmtNum(r.w)} {unit}</b>
      <button className="iconbtn" data-tour="weighin-del" style={{ width: 32, height: 30, borderRadius: 8, fontSize: 'var(--fs-subhead)', color: 'var(--red)' }} onClick={confirm ? ask : delEntry} aria-label={t('Delete weigh-in')}><Icon name="trash" /></button></span>
  </div>
}

/* ============================ weigh-ins ============================ */
// Every weigh-in, week by week (Discord 'Weight'): each week under its mean and how far that
// moved from the week before, the numbers behind the curve on the card. The chart plots the
// weekly means, since the swing from one morning to the next is what makes a single weigh-in
// hard to read. The weeks start on the profile's first day of the week. A day with several
// weigh-ins (#859) lists them all with their times, under the day's value.
function WeighIns() {
  const st = useStore(s => s.S)
  const ws = weekStartOf(st)
  const weeks = useMemo(() => weeklyWeights(st.bodyweight, ws), [st.bodyweight, ws])
  const points = useMemo(() => [...weeks].reverse()
    .map(w => ({ t: new Date(w.key + 'T12:00:00').getTime(), y: Math.round(w.avg * 100) / 100, d: w.key })), [weeks])
  const n = useMemo(() => allReadings(st.bodyweight).length, [st.bodyweight])
  const mode = dailyModeOf(st)
  if (!n) return <>
    <h3>{t('Weigh-ins')}</h3>
    <div className="empty"><div className="ico"><Icon name="scale" /></div>{t('No weigh-ins yet. Log your weight to start the curve.')}</div>
  </>
  return <>
    <h3 style={{ marginBottom: 2 }}>{t('Weigh-ins')}</h3>
    <div className="muted small" style={{ marginBottom: 10 }}>{tn('{0} weigh-in', '{0} weigh-ins', n)}</div>
    <div className="chart"><LineChart points={points} h={140} unit={st.unit} goal={st.targetW} /></div>
    <div className="small dim" style={{ marginTop: 6 }}>{t('Weekly average')}</div>
    {weeks.map(w => {
      // Only a change the display can show: at one decimal, 0.02 kg is "0", and an arrow over a
      // zero says something moved when, as far as the screen goes, nothing did.
      const moved = w.delta != null && fmtNum(Math.abs(w.delta)) !== fmtNum(0)
      return <div key={w.key} data-week={w.key}>
        <div className="row between" style={{ margin: '16px 2px 4px', gap: 8 }}>
          <span className="small" style={{ fontWeight: 600 }}>{t('Week of {0}', fmtDate(w.key))}</span>
          <span className="small row" style={{ gap: 8 }}>
            {moved && <span className="row" style={{ gap: 2, fontWeight: 500, color: bwDeltaColor(w.delta, w.avg) }}>
              <Icon name={w.delta > 0 ? 'arrowUp' : 'arrowDown'} style={{ fontSize: 'var(--fs-caption)' }} />{fmtNum(Math.abs(w.delta))}
            </span>}
            <span className="muted" style={{ whiteSpace: 'nowrap' }}>{t('Average {0}', fmtNum(w.avg) + ' ' + st.unit)}</span>
          </span>
        </div>
        <div className="list" style={{ gap: 0 }}>{w.entries.map(b => {
          const rs = readingsOf(b)
          if (rs.length <= 1) return rs.map(r => <WeighInRow key={b.d + '|' + r.id} d={b.d} r={r} unit={st.unit} confirm />)
          return <div key={b.d} data-day={b.d}>
            <div className="row between bw-day">
              <span className="small muted">{fmtDate(b.d, true)}</span>
              <span className="small dim">{dailyLabel(mode, fmtNum(b.w) + ' ' + st.unit)}</span>
            </div>
            {rs.map(r => <WeighInRow key={b.d + '|' + r.id} d={b.d} r={r} unit={st.unit} confirm dayShown={false} />)}
          </div>
        })}</div>
      </div>
    })}
  </>
}
// The line over a day with several weigh-ins: which one the day's value is.
const dailyLabel = (mode, w) => (mode === 'avg' ? t('Day average {0}', w) : mode === 'last' ? t('Last value {0}', w) : t('Morning value {0}', w))
export const weighInsSheet = () => ui().openSheet(close => <WeighIns close={close} />)

/* ============================ import from another app ============================ */
// "12 sets bring an RPE with them": the file rated its sets. The column is off by default, so
// with it off the line says where to switch it on.
const effortLine = (effort, n, scale) => effort === 'none'
  ? tn('{0} set brings an {1} with it. Switch on Effort per set in Settings to see it.', '{0} sets bring an {1} with them. Switch on Effort per set in Settings to see it.', n, scale)
  : tn('{0} set brings an {1} with it.', '{0} sets bring an {1} with them.', n, scale)
// Shows what a parsed export would actually do before anything is written. An import is
// the one action where "just try it" is expensive — it's someone's entire training
// history — so the numbers, the unit conversion and the exercises we couldn't recognise
// are all on screen before the confirm button.
function ImportSummary({ parsed, close }) {
  const st = useStore(s => s.S)
  const isBW = parsed.kind === 'bodyweight'
  // Our own body CSV brings measurement check-ins along (#718); a day that has one keeps it.
  const checkIns = isBW ? parsed.measurements || [] : []
  const haveM = checkIns.filter(m => (st.measurements || []).some(x => x.d === m.d)).length
  const have = (isBW
    ? parsed.bodyweight.filter(b => importHasWeighIn(st, b)).length
    : parsed.workouts.filter(w => st.workouts.some(x => x.d === w.d)).length) + haveM
  // Liftosaur and Liftoff bring plans as well (lib/import-apps.js); one already imported stays as it is.
  const plans = !isBW && parsed.routines?.routines?.length ? parsed.routines : null
  const newPlans = plans ? freshRoutines(st, plans) : 0
  const fresh = (isBW ? parsed.bodyweight.length + checkIns.length : parsed.workouts.length) - have + newPlans
  const hasWorkouts = isBW || parsed.workouts.length > 0
  const unmatched = [...new Set([...(isBW ? [] : parsed.unmatchedNames), ...(plans?.unmatchedNames || [])])].sort()

  const doImport = () => {
    let res, planRes
    update(s => {
      res = mergeImport(s, parsed)
      if (plans) planRes = mergeImportedRoutines(s, plans)
    })
    close()
    const measured = res.measurements ? tn('{0} measurement check-in imported', '{0} measurement check-ins imported', res.measurements) : ''
    const routinesLine = planRes?.added ? tn('{0} routine imported', '{0} routines imported', planRes.added) : ''
    toast(isBW
      ? (res.added || !measured ? tn('{0} weigh-in imported', '{0} weigh-ins imported', res.added) + (measured ? ' · ' + measured : '') : measured)
      : [res.added || !routinesLine ? tn('{0} workout imported', '{0} workouts imported', res.added) : '', routinesLine].filter(Boolean).join(' · '))
  }

  return <>
    <h3>{parsed.source ? t('Import from {0}', parsed.source) : t('Import history')}</h3>
    <div className="muted small" style={{ marginBottom: 12 }}>
      {hasWorkouts && fmtDateRange(parsed.from, parsed.to, true)}
    </div>

    <div className="tiles" style={{ textAlign: 'start' }}>
      {isBW ? <>
        <div className="tile"><div className="l">{t('Weigh-ins')}</div><div className="v v-sm">{parsed.bodyweight.length}</div></div>
        {checkIns.length > 0 && <div className="tile"><div className="l">{t('Body measurements')}</div><div className="v v-sm">{checkIns.length}</div></div>}
        <div className="tile"><div className="l">{t('New')}</div><div className="v v-sm">{fresh}</div></div>
      </> : <>
        {hasWorkouts && <>
          <div className="tile"><div className="l">{t('Workouts')}</div><div className="v v-sm">{parsed.workouts.length}</div></div>
          <div className="tile"><div className="l">{t('Sets')}</div><div className="v v-sm">{parsed.sets}</div></div>
        </>}
        {plans && <div className="tile"><div className="l">{t('Routines')}</div><div className="v v-sm">{plans.routines.length}</div></div>}
        <div className="tile"><div className="l">{t('Exercises matched')}</div><div className="v v-sm">{plans ? new Set([...(parsed.matchedIds || []), ...plans.matchedIds]).size : parsed.matched}</div></div>
        <div className="tile"><div className="l">{t('Added as your own')}</div><div className="v v-sm">{plans ? unmatched.length : parsed.created}</div></div>
      </>}
    </div>

    {parsed.mixedUnits ? <div className="small" style={{ color: 'var(--gold-ink)', marginBottom: 10 }}>
      {t('The file mixes kg and lb, so each set is converted to {0}.', st.unit)}
    </div> : parsed.converted ? <div className="small" style={{ color: 'var(--gold-ink)', marginBottom: 10 }}>
      {t('The file is in {0} and your profile is in {1}, so weights get converted.', parsed.fileUnit, st.unit)}
    </div> : null}
    {hasWorkouts && !isBW && !parsed.fileUnit && !parsed.mixedUnits && <div className="small dim" style={{ marginBottom: 10 }}>
      {t('The file doesn’t say which unit it uses, so numbers are imported as they are.')}
    </div>}
    {have > 0 && <div className="small dim" style={{ marginBottom: 10 }}>
      {t('{0} days already have data here and will be left alone.', have)}
    </div>}
    {/* The file rated its sets. Say so: the column is off by default, so the ratings would
        otherwise arrive invisibly and look like they had been dropped. */}
    {!isBW && (parsed.rirSets + parsed.rpeSets) > 0 && <div className="small dim" style={{ marginBottom: 10 }}>
      {effortLine(effortOf(st), parsed.rirSets || parsed.rpeSets, parsed.rirSets ? 'RIR' : 'RPE')}
    </div>}
    {/* Rows the parser could not use (no date or name, nothing measured, impossible numbers)
        are left out; say how many, so a short history does not look like a lost one. */}
    {!isBW && parsed.skipped > 0 && <div className="small dim" style={{ marginBottom: 10 }}>
      {tn('{0} row skipped (couldn’t read it)', '{0} rows skipped (couldn’t read them)', parsed.skipped)}
    </div>}
    {/* A Liftosaur plan's progression is a script; it arrives as a note on each exercise. */}
    {plans?.scripted > 0 && <div className="small dim" style={{ marginBottom: 10 }}>
      {t('Liftoscript progressions come along as notes on the exercises. openGym doesn’t run them.')}
    </div>}
    {plans && newPlans < plans.routines.length && <div className="small dim" style={{ marginBottom: 10 }}>
      {tn('{0} routine is already here and will be left alone.', '{0} routines are already here and will be left alone.', plans.routines.length - newPlans)}
    </div>}
    {!isBW && unmatched.length > 0 && <>
      <h4 className="sec">{t('Not in the library, so they’re added as your own exercises')}</h4>
      <div className="mchips" style={{ marginBottom: 12 }}>
        {unmatched.slice(0, 12).map(n => <span key={n} className="mchip capitalize">{n}</span>)}
        {unmatched.length > 12 && <span className="mchip">+{unmatched.length - 12}</span>}
      </div>
    </>}

    <Button variant="primary" onClick={doImport} disabled={!fresh}>
      {fresh ? t('Import') : t('Nothing new to import')}
    </Button>
    <div style={{ height: 8 }} />
    <Button variant="ghost" className="dim" onClick={close}>{t('Cancel')}</Button>
  </>
}

/** Read a CSV/XML/JSON export, then show what it would do. */
export function importFromApp(file, onDone) {
  const rd = new FileReader()
  rd.onload = () => {
    let parsed
    try { parsed = parseImportFile(String(rd.result), { unit: S().unit, customEx: S().customEx }) }
    catch (e) { toast(t('Could not read that file')); return }
    if (parsed.error === 'empty') { toast(t('That file is empty')); return }
    // It looks like that app's export but does not read as one: say so rather than guess.
    if (parsed.error === 'format') { toast(t('This looks like a {0} export, but we couldn’t read it. Nothing was imported.', parsed.app)); return }
    if (parsed.error === 'opengym') { toast(t('That’s an openGym backup or plan file. Use Import backup, or import it on the Plan screen.')); return }
    if (parsed.error) { toast(t("We don't recognise that file's columns. Check the docs for supported apps.")); return }
    if (parsed.kind === 'bodyweight' ? !parsed.bodyweight.length && !parsed.measurements?.length : !parsed.workouts.length && !parsed.routines?.routines?.length) {
      toast(t('Nothing to import from that file')); return
    }
    ui().openSheet(close => <ImportSummary parsed={parsed} close={close} />)
    onDone && onDone()
  }
  rd.onerror = () => toast(t('Could not read that file'))
  rd.readAsText(file)
}

/* ============================ import from Hevy API ============================ */
// The key lives in React state for this sheet only — dismissed with the sheet, never
// written to the store / localStorage / the server. After a successful fetch the user
// picks workouts and/or weigh-ins before anything is merged.

export function importFromHevy() {
  ui().openSheet(close => <HevyImportSheet close={close} />)
}

function hevyProgressLabel(p) {
  if (!p) return t('Fetching from Hevy…')
  if (p.stage === 'templates') return t('Fetching exercises… ({0}/{1})', p.page, p.pageCount)
  if (p.stage === 'workouts') return t('Fetching workouts… ({0}/{1})', p.page, p.pageCount)
  if (p.stage === 'routines') return t('Fetching routines… ({0}/{1})', p.page, p.pageCount)
  if (p.stage === 'body') return t('Fetching weigh-ins… ({0}/{1})', p.page, p.pageCount)
  if (p.stage === 'parse') return t('Matching exercises…')
  return t('Fetching from Hevy…')
}

function HevyImportSheet({ close }) {
  const st = useStore(s => s.S)
  const [apiKey, setApiKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(null)
  const [payload, setPayload] = useState(null) // { workouts, routines, bodyweight }
  const [wantWorkouts, setWantWorkouts] = useState(true)
  const [wantRoutines, setWantRoutines] = useState(true)
  const [wantBody, setWantBody] = useState(true)
  const keyRef = useRef(null)

  // Drop the key from memory when the sheet goes away (unmount or successful import).
  useEffect(() => () => { setApiKey('') }, [])

  const wipeKey = () => { setApiKey(''); if (keyRef.current) keyRef.current.value = '' }

  const fetchAccount = async () => {
    const key = apiKey.trim()
    if (!key) { toast(t('Paste your Hevy API key first')); return }
    setBusy(true)
    setProgress({ stage: 'templates', page: 1, pageCount: 1 })
    setPayload(null)
    try {
      const data = await importHevyData(key, { unit: st.unit, customEx: st.customEx, onProgress: setProgress })
      wipeKey()
      const empty = !data.workouts.workouts.length && !data.routines.routines.length && !data.bodyweight.bodyweight.length
      if (empty) {
        toast(t('Nothing to import from Hevy'))
        return
      }
      setWantWorkouts(!!data.workouts.workouts.length)
      setWantRoutines(!!data.routines.routines.length)
      setWantBody(!!data.bodyweight.bodyweight.length)
      setPayload(data)
    } catch (e) {
      if (e instanceof HevyApiError && e.message === 'auth') toast(t('That Hevy API key was refused'))
      else if (e instanceof HevyApiError && e.message === 'rate-limit') toast(t('Hevy is rate-limiting requests. Wait a minute and try again'))
      else if (e instanceof HevyApiError && e.message === 'empty') toast(t('Paste your Hevy API key first'))
      else toast(t('Couldn’t reach Hevy. Check the key and try again'))
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  const doImport = () => {
    if (!payload) return
    const parts = []
    let addedW = 0, addedR = 0, addedB = 0
    update(s => {
      if (wantWorkouts && payload.workouts.workouts.length) {
        const res = mergeImport(s, payload.workouts)
        addedW = res.added
        parts.push(tn('{0} workout imported', '{0} workouts imported', res.added))
      }
      if (wantRoutines && payload.routines.routines.length) {
        const res = mergeHevyRoutines(s, payload.routines)
        addedR = res.added
        parts.push(tn('{0} routine imported', '{0} routines imported', res.added))
      }
      if (wantBody && payload.bodyweight.bodyweight.length) {
        const res = mergeImport(s, payload.bodyweight)
        addedB = res.added
        parts.push(tn('{0} weigh-in imported', '{0} weigh-ins imported', res.added))
      }
    })
    close()
    if (!addedW && !addedR && !addedB) toast(t('Nothing new to import'))
    else toast(parts.join(' · '))
  }

  if (!payload) {
    return <>
      <h3>{t('Import from Hevy')}</h3>
      <div className="muted small" style={{ marginBottom: 14, lineHeight: 1.5 }}>
        {t('Pull your history with a Hevy Pro API key. The key is only used for this import and is not saved.')}
      </div>
      <label className="small dim" style={{ display: 'block', marginBottom: 6 }}>{t('Hevy API key')}</label>
      <TextField
        ref={keyRef}
        type="password"
        autoComplete="off"
        spellCheck={false}
        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        value={apiKey}
        disabled={busy}
        onChange={e => setApiKey(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !busy) fetchAccount() }}
      />
      <div className="small" style={{ margin: '10px 0 16px', lineHeight: 1.45 }}>
        <a href={HEVY_DEV_SETTINGS} target="_blank" rel="noopener noreferrer">{t('Get your API key')}</a>
        <span className="dim"> · {t('Hevy → Settings → Developer')}</span>
      </div>
      {busy && <div className="small dim" style={{ marginBottom: 12 }}>{hevyProgressLabel(progress)}</div>}
      <Button variant="primary" onClick={fetchAccount} disabled={busy || !apiKey.trim()}>
        {busy ? t('Fetching from Hevy…') : t('Fetch from Hevy')}
      </Button>
      <div style={{ height: 8 }} />
      <Button variant="ghost" className="dim" onClick={close} disabled={busy}>{t('Cancel')}</Button>
    </>
  }

  const w = payload.workouts
  const r = payload.routines
  const b = payload.bodyweight
  const haveW = w.workouts.filter(x => st.workouts.some(y => y.d === x.d)).length
  const freshW = w.workouts.length - haveW
  const haveB = b.bodyweight.filter(x => importHasWeighIn(st, x)).length
  const freshB = b.bodyweight.length - haveB
  // Routines are always added as new copies (same as plan import).
  const freshR = r.routines.length
  const canImport = (wantWorkouts && freshW > 0) || (wantRoutines && freshR > 0) || (wantBody && freshB > 0)
  const unmatched = [...new Set([
    ...(wantWorkouts ? w.unmatchedNames : []),
    ...(wantRoutines ? r.unmatchedNames : []),
  ])].sort()
  const counts = hevySummaryCounts(w, r, { workouts: wantWorkouts, routines: wantRoutines })

  return <>
    <h3>{t('Import from Hevy')}</h3>
    <div className="muted small" style={{ marginBottom: 12 }}>
      {w.from && (w.from === w.to ? fmtDate(w.from, true) : fmtDate(w.from, true) + ' – ' + fmtDate(w.to, true))}
      {!w.from && b.from && (b.from === b.to ? fmtDate(b.from, true) : fmtDate(b.from, true) + ' – ' + fmtDate(b.to, true))}
    </div>

    <div className="tiles" style={{ textAlign: 'start' }}>
      <div className="tile"><div className="l">{t('Workouts')}</div><div className="v v-sm">{w.workouts.length}</div></div>
      <div className="tile"><div className="l">{t('Routines')}</div><div className="v v-sm">{r.routines.length}</div></div>
      <div className="tile"><div className="l">{t('Exercises matched')}</div><div className="v v-sm">{counts.matched}</div></div>
      <div className="tile"><div className="l">{t('Added as your own')}</div><div className="v v-sm">{counts.created}</div></div>
    </div>

    {w.workouts.length > 0 && <div className="row between" style={{ padding: '10px 2px', borderTop: '1px solid var(--sep)', gap: 12 }}>
      <div>
        <div className="tt" style={{ fontSize: 'var(--fs-subhead)' }}>{t('Import workouts')}</div>
        <div className="small dim">{t('{0} new · {1} days already here', freshW, haveW)}</div>
      </div>
      <Switch checked={wantWorkouts} onChange={setWantWorkouts} />
    </div>}
    {r.routines.length > 0 && <div className="row between" style={{ padding: '10px 2px', borderTop: '1px solid var(--sep)', gap: 12 }}>
      <div>
        <div className="tt" style={{ fontSize: 'var(--fs-subhead)' }}>{t('Import routines')}</div>
        <div className="small dim">{t('{0} routines · {1} exercises, added as new plans', freshR, r.exerciseCount)}</div>
      </div>
      <Switch checked={wantRoutines} onChange={setWantRoutines} />
    </div>}
    {b.bodyweight.length > 0 && <div className="row between" style={{ padding: '10px 2px', borderTop: '1px solid var(--sep)', borderBottom: '1px solid var(--sep)', gap: 12, marginBottom: 8 }}>
      <div>
        <div className="tt" style={{ fontSize: 'var(--fs-subhead)' }}>{t('Import weigh-ins')}</div>
        <div className="small dim">{t('{0} new · {1} days already here', freshB, haveB)}</div>
      </div>
      <Switch checked={wantBody} onChange={setWantBody} />
    </div>}
    {!b.bodyweight.length && <div style={{ borderBottom: '1px solid var(--sep)', marginBottom: 8 }} />}

    {(w.converted || r.converted) && <div className="small" style={{ color: 'var(--gold-ink)', marginBottom: 10 }}>
      {t('Hevy stores weights in kg, so they’ll be converted to {0}.', st.unit)}
    </div>}
    {wantWorkouts && (w.rirSets + w.rpeSets) > 0 && <div className="small dim" style={{ marginBottom: 10 }}>
      {effortLine(effortOf(st), w.rirSets || w.rpeSets, w.rirSets ? 'RIR' : 'RPE')}
    </div>}
    {unmatched.length > 0 && <>
      <h4 className="sec">{t('Not in the library, so they’re added as your own exercises')}</h4>
      <div className="mchips" style={{ marginBottom: 12 }}>
        {unmatched.slice(0, 12).map(n => <span key={n} className="mchip capitalize">{n}</span>)}
        {unmatched.length > 12 && <span className="mchip">+{unmatched.length - 12}</span>}
      </div>
    </>}

    <Button variant="primary" onClick={doImport} disabled={!canImport}>
      {canImport ? t('Import') : t('Nothing new to import')}
    </Button>
    <div style={{ height: 8 }} />
    <Button variant="ghost" className="dim" onClick={() => { setPayload(null); wipeKey() }}>{t('Back')}</Button>
  </>
}

/* ============================ target weight ============================ */
export function bwDeltaColor(delta, currentW) {
  if (!delta) return 'var(--label-2)'
  if (!S().targetW) return 'var(--label)'
  const up = S().targetW > currentW
  return (delta > 0) === up ? 'var(--acc)' : 'var(--red)'
}
function GoalSheet({ close }) {
  const st = S()
  const bw = lastBW(st)
  const [v, setV] = useState(st.targetW || (bw ? bw.w : 70))
  return <>
    <h3>{t('Target weight')}</h3>
    <div className="muted small">{t('Your goal is drawn as a line through the weight charts, and gains/losses are colored by whether they move toward it.')}</div>
    <WeightInput value={v} setValue={setV} unit={st.unit} />
    <div style={{ height: 14 }} />
    <Button variant="primary" onClick={() => {
      const n = Math.round((v || 0) * 10) / 10
      if (!n || n <= 0) { toast(t('Enter a valid weight')); return }
      if (bwTooHeavy(n, st.unit)) return
      update(s => { s.targetW = n }); close()
      const b = lastBW(S()); toast(t('Goal set: {0}', fmtNum(n) + ' ' + st.unit) + (b ? ' (' + t('{0} to go', fmtNum(Math.abs(n - b.w))) + ')' : ''))
    }}>{t('Save goal')}</Button>
    {st.targetW && <><div style={{ height: 8 }} /><Button variant="danger" onClick={() => { update(s => { s.targetW = null }); close(); toast(t('Goal removed')) }}>{t('Remove goal')}</Button></>}
  </>
}
export const goalSheet = () => ui().openSheet(close => <GoalSheet close={close} />)

/* ============================ weight unit ============================ */
// An exercise's own weight unit (#657, lib/ex-unit.js): lb dumbbells next to kg plates. Per
// exercise, not per plan, so it writes straight to S.exUnit like the plate loading below it.
// `onChange` hears the old and the new state's unit, for a sheet that holds numbers in it.
function ExUnitRow({ ex, onChange }) {
  const st = useStore(s => s.S)
  const pin = exUnitPin(st, ex.id)
  const set = v => {
    const before = S()
    update(s => { s.exUnit = withExUnit(s.exUnit, ex.id, v || null) })
    onChange?.(before, S())
  }
  return <>
    <div className="sect-b" style={{ marginBottom: 8 }}>
      <SelectRow icon="scale" iconTint="var(--acc)" title={t('Weight unit')} sheetTitle={t('Weight unit')} value={pin || ''} onChange={set}
        options={[
          { value: '', label: t('Profile default ({0})', profileUnit(st)) },
          { value: 'kg', label: 'kg' },
          { value: 'lb', label: 'lb' },
        ]} />
    </div>
    <div className="small dim" style={{ marginBottom: 18 }}>
      {t('For gyms that mix kg and lb. This exercise is shown and typed in it everywhere, plates and steps included. Totals in Stats stay in {0}.', profileUnit(st))}
    </div>
  </>
}

/* ============================ plate loading ============================ */
// One editor for every place an exercise's loading shows up (exercise detail, exercise config,
// mid-workout sheet). Three things, all per exercise and display-only (lib/plates.js):
//   • how the weight is loaded — per side of a bar, one stack, or not plate-loaded at all
//     (S.loadKind; absent = derived from the equipment, so most exercises never store it);
//   • the base weight before any plate goes on — the bar (S.barWeights, profile unit, lib/bar.js;
//     stepping down to 0 clears the override and falls back to the bar type's default), or a
//     sled's / machine's own weight for anything else;
//   • "No bar" for a bar exercise: an explicit 0 (issue #138 — a counterbalanced Smith machine),
//     so the whole total is plates. Distinct from the stepper's 0, which means "default".
// `cfg` is the routine/session config the caller has (its `bodyweight` flag turns a dumbbell
// exercise into "added weight", i.e. a single stack) — the default kind is derived from the
// same thing the workout screen derives it from, so what the editor shows as chosen is what
// the rows do. Without one, the equipment alone decides.
const LOAD_KIND_LABEL = { pairs: () => t('Per side'), single: () => t('Single stack'), none: () => t('Off') }
function BarWeightEditor({ ex, cfg, extra }) {
  // In the exercise's own unit (#657): a pinned barbell's bar is 45 lb on a kg profile.
  const st = exView(useStore(s => s.S), ex.id)
  const bar = usesBar(ex)
  const ctx = { ...(cfg || {}), id: ex.id }
  const kind = loadKindFor(st, ctx)
  const explicit = hasBarOverride(st, ex.id)
  const noBar = bar && isNoBar(st, ex.id)
  // What "default" means for this bar: your bar for the type (Settings > Equipment > Your bars),
  // else the built-in one.
  const def = barTypeWeight(st, ex.eq)
  const mine = bar && ownBarDefault(st, ex.eq) !== null
  const base = baseWeightFor(st, ex)
  // The kinds a pick would only be restating. With a `cfg` there is one: the same default the
  // rows derive. Without one the equipment decides — and for body-weight equipment that answer
  // ('single', the load being whatever you hang on) is not the one a routine logging the total
  // derives ('none', bodyweight: false), so the segment sits lit on a kind the rows do not use
  // and the pick that would fix it is the only way to say so: both readings are consulted, and
  // it is stored unless it is the default under either. Everything else keeps the plain rule —
  // a dumbbell's cfg-less 'none' is what a dumbbell row derives, and storing it would freeze
  // 'none' onto the exercise everywhere, override the 'single' an added-weight entry derives,
  // and leave no pick that takes the key off again.
  const defaults = cfg ? [loadKindFor(null, ctx)]
    : isBodyweightEq(ex.id) ? [true, false].map(b => loadKindFor(null, { id: ex.id, bodyweight: b }))
    : [loadKindFor(null, ctx)]
  // Picking what the equipment already implies puts the exercise back on it (a stamped null,
  // lib/plates.js), so a later change of the equipment's own default still reaches it.
  const setKind = k => update(s => {
    s.loadKind = withLoadKind(s.loadKind, ex.id, defaults.every(d => d === k) ? null : k)
  })
  const setBar = v => update(s => {
    s.barWeights = s.barWeights || {}
    const n = Math.max(0, Math.round((v || 0) * 100) / 100)
    if (n > 0) s.barWeights[ex.id] = storedBar(s, ex.id, n); else delete s.barWeights[ex.id]
  })
  // A quick pick of the type's own weight takes the override off, so the exercise keeps following
  // your bars instead of freezing today's number onto it.
  const pickBar = v => (v === def ? setBar(0) : setBar(v))
  // "No bar" is a stored 0, which is a different thing from no entry at all: a counterbalanced
  // Smith carriage weighs nothing in your hands, so the plate math and the drop-set steps must
  // start from what you logged (issue #138). Clearing it goes back to the bar type's default.
  const setNoBar = on => update(s => {
    s.barWeights = s.barWeights || {}
    if (on) s.barWeights[ex.id] = 0; else delete s.barWeights[ex.id]
  })
  return <>
    <Segmented className="seg-inline" value={kind} onChange={setKind}
      options={[{ value: 'pairs', label: t('Per side') }, { value: 'single', label: t('Single stack') }, { value: 'none', label: t('Off') }]} />
    <div className="small dim" style={{ margin: '8px 0 12px' }}>
      {kind === 'pairs' ? t('Plates split over both sides of a bar.')
        : kind === 'single' ? t('One stack: a belt, a landmine, a plate-loaded machine, a sled.')
          : t('No plate line under the sets.')}
    </div>
    {kind !== 'none' && <>
      {bar && <div className="list menu-list" style={{ marginBottom: 6 }}>
        <Row icon="barbell" title={t('No bar')} subtitle={t('The weight you log is all plates.')}>
          <Switch checked={noBar} onChange={setNoBar} />
        </Row>
      </div>}
      {!noBar && <div className="row cfgrow" style={{ marginBottom: 6 }}>
        <Stepper label={bar ? t('Bar ({0})', st.unit) : t('Base weight ({0})', st.unit)} value={base} step={2.5} onChange={setBar} />
      </div>}
      {bar && !noBar && <div className="chips" style={{ flexWrap: 'wrap', overflow: 'visible', touchAction: 'auto', marginBottom: 6 }}>
        {[...new Set([def, ...barPicks(st.unit)])].map(w => <button key={w} className={'chip nocap' + (base === w ? ' on' : '')}
          aria-pressed={base === w} onClick={() => pickBar(w)}>{fmtNum(w) + ' ' + st.unit}</button>)}
      </div>}
      <div className="small dim" style={{ marginBottom: bar ? 10 : 18 }}>
        {noBar ? t('Plates are counted from 0. Turn this off for the default ({0}).', fmtNum(def) + ' ' + st.unit)
          : bar ? (explicit ? t('Set to 0 to go back to the default ({0}).', fmtNum(def) + ' ' + st.unit) : mine ? t('Your bar for this type, set in Your bars.') : t('Default for this bar type.'))
            : t('The machine or sled itself, before any plate goes on. 0 if it is all plates.')}
        {extra ? ' ' + extra : ''}
      </div>
