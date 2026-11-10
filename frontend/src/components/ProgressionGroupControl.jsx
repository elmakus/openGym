import { t } from '../lib/i18n.js'
import { uid } from '../lib/format.js'
import { joinProgressionGroup, leaveProgressionGroup } from '../lib/prescription/index.js'
import { menuSheet } from '../sheets.jsx'
import Icon from './Icon.jsx'

// A per-occurrence control: identical exercise IDs are candidates, not implicit shared tracks.
// A candidate is clickable only if the canonical helper can validate the proposed group.
export default function ProgressionGroupControl({ profile, occurrence, update, toast }) {
  const id = occurrence.occurrenceId
  const current = profile.progressionGroups?.groups?.find(g=>g.members.includes(id))
  const matches = (profile.routines || []).flatMap(r=>(r.ex || []).map((o,i)=>({r,o,i})))
    .filter(x=>x.o.occurrenceId!==id && x.o.exerciseId===occurrence.exerciseId)
  if (!current && !matches.length) return null
  const open = () => {
    const entries = matches.map(({r,o,i}) => {
      let error = null
      try {
        // Preview only the small mutable grouping config, never mutate the user's profile.
        const trial={...profile,progressionGroups:profile.progressionGroups
          ? structuredClone(profile.progressionGroups) : undefined}
        joinProgressionGroup(trial,id,o.occurrenceId,()=> 'pg-preview')
      } catch(e) {error=e.message}
      const already = current?.members.includes(o.occurrenceId)
      const reps = o.rule?.program?.phases?.[0]?.parameters?.reps
      const name = r.name || t('Routine')
      return {
        icon: already ? 'check' : 'link',
        label: name+' · #'+(i+1),
        sub: already ? t('Shared progression') :
          error ? error.replace(/^Progression groups: /,'') :
            reps ? reps.min+'–'+reps.max+' '+t('Reps') : '',
        on: already,disabled:already || !!error,
        onClick:()=>{
          let failed = null
          update(s=>{try{joinProgressionGroup(s,id,o.occurrenceId,()=> 'pg-'+uid())}
            catch(e){failed=e.message}})
          if(failed) toast(failed)
        }
      }
    })
    const sections = [{items:entries}]
    if(current) sections.push({items:[{
      icon:'minus',label:t('Separate progression'),
      onClick:()=>{
        let failed=null
        update(s=>{try{leaveProgressionGroup(s,id)}catch(e){failed=e.message}})
        if(failed)toast(failed)
      }
    }]})
    menuSheet({title:t('Progression group'),sections})
  }
  return <button type="button" className="iconbtn re-progression"
    style={current ? { color:'var(--accent)' } : undefined}
    title={t('Progression group')} aria-label={t('Progression group')}
    aria-pressed={!!current} onClick={open}><Icon name="chart" /></button>
}
