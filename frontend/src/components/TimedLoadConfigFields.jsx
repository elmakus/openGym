import { useState } from 'react'
import Stepper from './Stepper.jsx'
import { validateTimedConfig } from '../../../api/training-control/timed-load.js'

/** Slot set count and side handling are owned by the existing routine editor. */
export const slotTimedConfig = (value, setsPerSide, unilateral) =>
  ({ ...value, setsPerSide, unilateral })

export function timedConfigError(value, setsPerSide, unilateral) {
  try { validateTimedConfig(slotTimedConfig(value, setsPerSide, unilateral)); return null }
  catch (e) { return e.message }
}

export default function TimedLoadConfigFields({ value, onChange, setsPerSide, unilateral }) {
  const [ladderText, setLadderText] = useState(() => (value.ladderKg || []).join(', '))
  const change = (key, v) => onChange(current => ({ ...current, [key]: v }))
  const error = timedConfigError(value, setsPerSide, unilateral)
  const number = (label, key, { step = 1, min = 0, unit = '' } = {}) =>
    <Stepper label={label} unit={unit} value={Number(value[key]) || 0}
      onChange={v => change(key, v)} step={step} min={min} />

  return <div style={{ padding: '6px 16px 14px' }}>
    <div className="small dim" style={{ marginBottom: 12 }}>
      Timed Load owns hold-duration and native-load progression, separately from Engine v2.
      {unilateral ? ' Each left/right pair shares one target; the weaker side gates progression.' :
        ' Every prescribed set must succeed before progression.'}
      {' '}{setsPerSide} {unilateral ? 'sets per side' : 'sets'}.
    </div>
    {number('Minimum hold time', 'minTime', { unit: 's', min: 1 })}
    {number('Maximum hold time', 'maxTime', { unit: 's', min: 1 })}
    {number('Time increment', 'timeStep', { unit: 's', min: 1 })}
    <label style={{ display: 'block', marginTop: 12, marginBottom: 12 }}>
      <span className="small">Native load ladder (kg, including 0)</span>
      <input className="inp" type="text" aria-label="Native load ladder in kilograms"
        value={ladderText} onChange={e => {
          const text = e.target.value
          setLadderText(text)
          change('ladderKg', text.split(/[,\s;]+/).filter(Boolean).map(Number))
        }} style={{ display: 'block', width: '100%', marginTop: 4 }} />
    </label>
    {number('Starting native load', 'startLoadKg', { unit: 'kg', step: 0.5 })}
    {number('Low-load switch', 'lowLoadSwitchKg', { unit: 'kg', step: 0.5 })}
    {number('Upward step below switch', 'lowLoadUpStepKg', { unit: 'kg', step: 0.5, min: 0.5 })}
    {number('Backoff native ladder steps', 'downwardLadderSteps', { min: 1 })}
    <label style={{ display: 'block', margin: '12px 0' }}>
      <span className="small">New-load failure policy</span>
      <select className="inp" aria-label="Emergency behavior"
        value={value.emergencyBehavior} style={{ display: 'block', width: '100%', marginTop: 4 }}
        onChange={e => onChange(v => ({ ...v, emergencyBehavior: e.target.value,
          emergencyTime: e.target.value === 'timed_bridge' ? (v.emergencyTime || 25) : null }))}>
        <option value="timed_bridge">Temporary emergency hold (Side Plank)</option>
        <option value="direct_backoff">Direct native-load backoff</option>
      </select>
    </label>
    {value.emergencyBehavior === 'timed_bridge' &&
      number('Emergency hold time', 'emergencyTime', { unit: 's', min: 1 })}
    {error && <div className="small" role="alert" style={{ color: 'var(--red, #d9534f)', marginTop: 10 }}>{error}</div>}
    <p className="small dim">Loads must exist on this physical equipment ladder.
      Progression is disabled unless a complete exposure meets its hold target with sound technique.
      Manual conservative downshifts are never automatically reversed in that session.</p>
  </div>
}
