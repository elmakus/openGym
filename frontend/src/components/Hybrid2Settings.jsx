// Explicit opt-in only. A reviewed static adapter is assigned as JSON, not
// synthesized from exercise names or automatically attached to an existing plan.
import { useState } from 'react'
import { Button, Row, Switch, TextArea } from './ui.jsx'
import { t } from '../lib/i18n.js'
import { validatePlanAdapter } from '../../../api/training-control/hybrid2/adapter.js'
import { assertHybridResumeContinuity } from '../../../api/training-control/hybrid2/history.js'
import { createHybridBootstrap, validateHybridBootstrap, assertHybridBootstrapHistory } from '../../../api/training-control/hybrid2/bootstrap.js'
import { canonicalJSON } from '../../../api/engine/canonical.js'
import { reconcileHybridHistory, resolveHybridHistoryConflict } from '../lib/hybrid2-sync.js'

export default function Hybrid2Settings({ profile, update }) {
  const cfg = profile.trainingControl?.hybrid2Config
  const diagnostics = profile.trainingControl?.hybrid2Diagnostics
  const conflict = profile.trainingControl?.hybrid2Conflict
  const checkpoint = profile.trainingControl?.hybrid2Bootstrap
  const checkpointConflict = profile.trainingControl?.hybrid2BootstrapConflict
  const historyConflict = profile.trainingControl?.hybrid2HistoryConflict
  const [historyChoices, setHistoryChoices] = useState({})
  const [bootstrapDraft, setBootstrapDraft] = useState('')
  const [bootstrapOpen, setBootstrapOpen] = useState(false)
  const [draft, setDraft] = useState(() => cfg?.adapter ? JSON.stringify(cfg.adapter, null, 2) : '')
  const [editorOpen, setEditorOpen] = useState(false)
  const [error, setError] = useState('')
  const active = cfg?.enabled === true
  const isValid = () => {
    if (!cfg?.adapter) return false
    try {
      validatePlanAdapter(cfg.adapter, profile.routines)
      if (checkpoint) validateHybridBootstrap(checkpoint, cfg.adapter)
      return !conflict && !checkpointConflict && !historyConflict
    } catch { return false }
  }
  const assignAdapter = () => {
    try {
      const adapter = JSON.parse(draft)
      validatePlanAdapter(adapter, profile.routines)
      if (checkpoint) validateHybridBootstrap(checkpoint, adapter)
      update(s => {
        s.trainingControl ||= {}
        s.trainingControl.hybrid2Config = { version: 1, enabled: false, adapter }
        delete s.trainingControl.hybrid2Conflict
        reconcileHybridHistory(s)
      })
      setError('')
      setEditorOpen(false)
    } catch (err) {
      setError(String(err.message))
    }
  }
  const setEnabled = enabled => {
    try {
      if (enabled && !isValid()) throw new Error('Assign a valid, reviewed adapter before enabling HYBRID-2')
      if (enabled) {
        assertHybridResumeContinuity(profile.workouts, cfg.adapter)
        assertHybridBootstrapHistory(profile.workouts, cfg.adapter, checkpoint)
      }
      update(s => {
        s.trainingControl ||= {}
        s.trainingControl.hybrid2Config = { ...s.trainingControl.hybrid2Config, enabled }
        reconcileHybridHistory(s)
      })
      setError('')
    } catch (err) { setError(String(err.message)) }
  }
  const resolve = choice => {
    try {
      const selected = conflict?.[choice]
      if (!selected?.adapter) throw new Error('No adapter configuration to resolve')
      validatePlanAdapter(selected.adapter, profile.routines)
      if (checkpoint) validateHybridBootstrap(checkpoint, selected.adapter)
      // Resolving a conflict is a user action. Fail safe: leave disabled until re-enabled.
      update(s => {
        s.trainingControl.hybrid2Config = { version: 1, enabled: false, adapter: selected.adapter }
        delete s.trainingControl.hybrid2Conflict
        reconcileHybridHistory(s)
      })
      setDraft(JSON.stringify(selected.adapter, null, 2))
      setError('')
    } catch (err) { setError(String(err.message)) }
  }
  const resolveHistory = () => {
    try {
      update(s => resolveHybridHistoryConflict(s, historyChoices))
      setHistoryChoices({})
      setError('')
    } catch (err) { setError(String(err.message)) }
  }
  const importCheckpoint = () => {
    try {
      if (!cfg?.adapter || active || conflict || checkpointConflict)
        throw new Error('Disable HYBRID-2 and resolve adapter conflicts before importing H1')
      validatePlanAdapter(cfg.adapter, profile.routines)
      // User supplies only reviewed source metadata and six native H1 anchors;
      // the app binds them to the current exact adapter and computes the seal.
      const input = JSON.parse(bootstrapDraft)
      const sameImport = checkpoint && canonicalJSON({
        sourceId: input.sourceId, cutoverAt: input.cutoverAt, anchors: input.anchors
      }) === canonicalJSON({
        sourceId: checkpoint.sourceId, cutoverAt: checkpoint.cutoverAt,
        anchors: checkpoint.anchors
      })
      const next = sameImport ? checkpoint : createHybridBootstrap({
        ...input, adapter: cfg.adapter, importedAt: new Date().toISOString()
      })
      if (checkpoint && !sameImport)
        throw new Error('Native H1 checkpoint already exists; it cannot be replaced')
      assertHybridBootstrapHistory(profile.workouts, cfg.adapter, next)
      update(s => {
        s.trainingControl ||= {}
        s.trainingControl.hybrid2Bootstrap = next
        reconcileHybridHistory(s)
      })
      setError('')
      setBootstrapOpen(false)
    } catch (err) { setError(String(err.message)) }
  }
  const state = profile.trainingControl?.hybrid2
  const status = diagnostics?.status || (active ? 'NOT_INITIALIZED' : 'DISABLED')
  return <section className="sect-b" aria-label={t('HYBRID-2 recovery controller')}
    style={{ marginTop: 16, marginBottom: 20 }}>
    <Row icon="activity" title={t('HYBRID-2 recovery controller')}
      subtitle={t('Optional plan-wide fatigue monitoring and one-cycle deload. Off by default.')}>
      <Switch checked={active} onChange={setEnabled} />
    </Row>
    <div style={{ padding: '6px 16px 16px' }}>
      <div className="small" role="status">
        <strong>{t('Controller status')}: {status}</strong>
        {cfg?.adapter && <div className="dim">{t('Adapter')}: {cfg.adapter.namespace} / {cfg.adapter.planVersion}</div>}
        {diagnostics?.reason && <div style={{ color: 'var(--orange)' }}>{diagnostics.reason}</div>}
        {profile.trainingControl?.hybrid2Error && <div style={{ color: 'var(--orange)' }}>{profile.trainingControl.hybrid2Error}</div>}
        {error && <div role="alert" style={{ color: 'var(--orange)' }}>{error}</div>}
      </div>
      {conflict && <div role="alert" style={{ marginTop: 8 }}>
        <div className="small">{t('Two devices changed the HYBRID-2 adapter. Resolve explicitly before training.')}</div>
        <div className="row" style={{ gap: 8 }}>
          <Button size="sm" onClick={() => resolve('local')}>{t('Keep local (disabled)')}</Button>
          <Button size="sm" onClick={() => resolve('remote')}>{t('Keep remote (disabled)')}</Button>
        </div>
      </div>}
      <div style={{ marginTop: 10 }}>
        <Button size="sm" variant="tinted" onClick={() => setEditorOpen(v => !v)}>
          {t('Assign reviewed Static Plan Adapter')}
        </Button>
      </div>
      {editorOpen && <div style={{ marginTop: 10 }}>
        <p className="small dim">{t('Paste a reviewed plan adapter JSON. Exact routine IDs, occurrence order, progression identities, system groups, terminal closer, and thresholds are required. Timed Load cannot be an H1 loaded-reps signal. Assigning never enables the controller automatically.')}</p>
        <TextArea value={draft} rows={10} spellCheck={false}
          aria-label={t('Static Plan Adapter JSON')}
          onChange={e => { setDraft(e.target.value); setError('') }} />
        <div style={{ marginTop: 8 }}>
          <Button size="sm" onClick={assignAdapter}>{t('Validate and assign (disabled)')}</Button>
        </div>
      </div>}
      {checkpoint && <div className="small dim" style={{ marginTop: 10 }}>
        {t('Imported H1 cutover')}: {checkpoint.cutoverAt} · {t('Source')}: {checkpoint.sourceId}
      </div>}
      {checkpointConflict && <div role="alert" className="small" style={{ marginTop: 10 }}>
        {t('Native H1 checkpoint conflict: explicit review is required before training.')}
      </div>}
      {historyConflict && <div role="alert" style={{ marginTop: 12 }}>
        <strong>HYBRID-2 history sync is blocked pending review</strong>
        <p className="small">{historyConflict.reason}</p>
        <p className="small dim">Neither device history is discarded automatically. Sync is paused on this device. Review each original version and choose the evidence to retain. The controller remains disabled after approval.</p>
        {historyConflict.alternatives
          ? <p className="small">More than one unresolved review exists. Export a local backup and reconcile the independent evidence before continuing.</p>
          : <>
            {(historyConflict.entries || []).map(entry => <details key={entry.id} style={{ marginTop: 8 }}>
              <summary className="small">{entry.id} · {entry.local?.d || entry.remote?.d || entry.merged?.d || 'unknown date'}</summary>
              <label className="small" htmlFor={'h2-review-' + entry.id}>Choose workout evidence</label>
              <select id={'h2-review-' + entry.id} value={historyChoices[entry.id] || ''}
                onChange={e => setHistoryChoices(v => ({ ...v, [entry.id]: e.target.value }))}>
                <option value="">Review required</option>
                <option value="local">Local device {entry.local ? '(workout)' : '(no workout)'}</option>
                <option value="remote">Other device {entry.remote ? '(workout)' : '(no workout)'}</option>
                <option value="merged">Original merged version {entry.merged ? '(workout)' : '(no workout)'}</option>
                <option value="current">Current History after manual correction</option>
              </select>
              <details className="small" style={{ marginTop: 6 }}>
                <summary>Show full original records and deletion markers</summary>
                <pre style={{ overflowX: 'auto', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                  {JSON.stringify(entry, null, 2)}
                </pre>
              </details>
            </details>)}
            <div style={{ marginTop: 10 }}>
              <Button size="sm" onClick={resolveHistory}>Validate selected history and resolve (disabled)</Button>
            </div>
          </>}
      </div>}
      <div style={{ marginTop: 10 }}>
        <Button size="sm" variant="tinted" onClick={() => setBootstrapOpen(v => !v)}>
          {t('Import reviewed native H1 checkpoint')}
        </Button>
      </div>
      {bootstrapOpen && <div style={{ marginTop: 10 }}>
        <p className="small dim">{t('Disable HYBRID-2 first. Paste JSON with sourceId, UTC cutoverAt and exact signal anchors. The original source is not automatically verified. An imported checkpoint cannot be replaced after synchronization.')}</p>
        <TextArea value={bootstrapDraft} rows={9} spellCheck={false}
          aria-label="Reviewed native H1 checkpoint JSON"
          onChange={e => { setBootstrapDraft(e.target.value); setError('') }} />
        <div style={{ marginTop: 8 }}>
          <Button size="sm" onClick={importCheckpoint}>{t('Validate and import H1 checkpoint')}</Button>
        </div>
      </div>}
      {state && <details style={{ marginTop: 12 }}>
        <summary className="small">{t('H1 signals and trigger diagnostics')}</summary>
        <div className="small dim" style={{ marginTop: 8 }}>
          {t('Last cycle')}: {['INDETERMINATE', 'GOOD', 'BROAD_WEAK'][state.runtime.lastCycleClass]} ·
          {t('Weak cycle streak')}: {state.runtime.badCycleStreak}
          <div>{t('Deload queued')}: {String(!!state.runtime.deloadQueued)} ·
            {t('Deload active')}: {String(!!state.runtime.deloadActive)}</div>
          {Object.entries(state.anchors || {}).map(([id, anchor]) => <div key={id}
            style={{ marginTop: 5, overflowWrap: 'anywhere' }}>
            <strong>{id}</strong>: {anchor.perfCount}/3 ·
            {t('Reference')}: {anchor.perfReference ? anchor.perfReference.toFixed(2) : '–'} ·
            {t('Candidate guard')}: {anchor.candidateGuard}
          </div>)}
          {(diagnostics?.lastDecisions || []).map((decision, index) => <div key={index}
            style={{ overflowWrap: 'anywhere', marginTop: 4 }}>
            {decision.workoutId}: {decision.event}
            {decision.evaluation && (' · ' + decision.evaluation.weakCount + ' weak / ' +
              decision.evaluation.validCount + ' valid')}
          </div>)}
        </div>
      </details>}
    </div>
  </section>
}
