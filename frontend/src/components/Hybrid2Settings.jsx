// Explicit opt-in only. A reviewed static adapter is assigned as JSON, not
// synthesized from exercise names or automatically attached to an existing plan.
import { useState } from 'react'
import { Button, Row, Switch, TextArea } from './ui.jsx'
import { t } from '../lib/i18n.js'
import { validatePlanAdapter } from '../../../api/training-control/hybrid2/adapter.js'
import { reconcileHybridHistory } from '../lib/hybrid2-sync.js'

export default function Hybrid2Settings({ profile, update }) {
  const cfg = profile.trainingControl?.hybrid2Config
  const diagnostics = profile.trainingControl?.hybrid2Diagnostics
  const conflict = profile.trainingControl?.hybrid2Conflict
  const [draft, setDraft] = useState(() => cfg?.adapter ? JSON.stringify(cfg.adapter, null, 2) : '')
  const [editorOpen, setEditorOpen] = useState(false)
  const [error, setError] = useState('')
  const active = cfg?.enabled === true
  const isValid = () => {
    if (!cfg?.adapter) return false
    try { validatePlanAdapter(cfg.adapter, profile.routines); return !conflict } catch { return false }
  }
  const assignAdapter = () => {
    try {
      const adapter = JSON.parse(draft)
      validatePlanAdapter(adapter, profile.routines)
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
