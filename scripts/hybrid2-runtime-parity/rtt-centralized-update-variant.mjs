// Private in-memory Liftoscript construction, never an active-program patch.
// Source-independent controller behavior is kept in ONE template update.
// Occurrences retain only numeric INTRO set-shape metadata, no duplicate Adaptive body.
export function centralizeRttUpdate(source) {
  const marker=' / update: custom() {~', end='~} / progress: custom('
  const a=source.indexOf(marker),b=source.indexOf(end,a)
  if(a<0||b<0)throw Error('Adaptive template update was not found')
  const adaptive=source.slice(a+marker.length,b)
  const original=source.slice(0,a)+marker+'\nvar.rttMode = 0\nif (var.rttMode == 2) {\n' +
    '  if (setIndex == 0) {\n' +
    '    if (dayInWeek == 1 && state.rttIntroA > 0) { numberOfSets = state.rttIntroA }\n' +
    '    else if (dayInWeek == 2 && state.rttIntroB > 0) { numberOfSets = state.rttIntroB }\n' +
    '    else if (dayInWeek == 3 && state.rttIntroC > 0) { numberOfSets = state.rttIntroC }\n' +
    '  }\n' +
    '} else {\n'+adaptive+'\n}\n'+end+
    'rttIntroA: 0, rttIntroB: 0, rttIntroC: 0, '+source.slice(b+end.length)
  let n=0
  const byDay={}
  const rewritten=original.replace(/ \/ update: custom\(\) \{~([\s\S]*?)~\} \/ progress: custom\(/g,(match,body)=>{
    if(!body.includes('RTT-MODE-SEAM:')||!body.includes('exercise-'))return match
    const id=body.match(/exercise-(\d+)/)?.[1]
    if(!id||!body.includes('var.rttMode = 0'))throw Error('Unknown RTT local override structure')
    const map={1:0,2:0,3:0}
    const pattern=/dayInWeek == ([123])\) \{\s*numberOfSets = ([123])/g
    let m
    while((m=pattern.exec(body)))map[Number(m[1])]=Number(m[2])
    if(!Object.values(map).some(Boolean))throw Error('No local INTRO set-shape declaration')
    const allowed=body.replace(/\/\/[^\n]*/g,'').replace(/\s+/g,' ')
    if(!allowed.includes('if (var.rttMode == 2 && setIndex == 0)'))throw Error('Nonstandard local override not safe for centralization')
    byDay[id]=map
    n++
    return ' / progress: custom(rttIntroA: '+map[1]+', rttIntroB: '+map[2]+', rttIntroC: '+map[3]+', '
  })
  if(n!==29)throw Error('Expected 29 RTT local overrides, got '+n)
  return {source:rewritten,merged:n,byDay}
}
