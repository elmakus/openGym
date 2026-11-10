// Validation-only source-level stale readback barrier appended once to inherited progress.
// Does not change global H1 reset logic or retry the global reset sweep.
// The barrier reasserts ONLY the executing anchor's reset fields into otherStates,
// protecting them from the older completed entry.state in native finish-day merge.
export function addStaleH1WriteBarrier(source) {
 const marker=' / progress: custom('
 const at=source.indexOf(marker)
 if(at<0)throw Error('Adaptive template progress missing')
 const begin=source.indexOf('{~',at)
 const end=source.indexOf('~}',begin)
 if(begin<0||end<0||!source.slice(begin,end).includes('state[92002].perfCount = 0'))throw Error('Expected genuine six-tag H1 reset body')
 const guard=`
 // VALIDATION-ONLY H1-STALE-ENTRY-WRITE-BARRIER
 if (dayInWeek == 1 && state.anchorId > 0 && state.rolloverClear == 1 && state.deloadActive == 0 && state.deloadStarted == 0 && (var.rttMode == 2 || numberOfSets >= programNumberOfSets)) {
   var.h1StaleTag = 92000 + state.anchorId
   state[var.h1StaleTag].perf1 = 0kg
   state[var.h1StaleTag].perf2 = 0kg
   state[var.h1StaleTag].perf3 = 0kg
   state[var.h1StaleTag].perfCount = 0
   state[var.h1StaleTag].perfReference = 0kg
   state[var.h1StaleTag].candidateGuard = 0
 }
 `
 return source.slice(0,end)+guard+source.slice(end)
}
