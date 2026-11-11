// A persisted unilateral set has two physical limb rows with one prescribed
// setId. Imported / merged histories need not retain their array adjacency.
// Match only unambiguous L/R identities: duplicates and mismatched row roles
// stay separate rather than attributing a right limb to another set.
export function pairSavedSideRows(savedRows) {
  const rows = Array.isArray(savedRows) ? savedRows : []
  const groups = new Map()
  for (const [index, row] of rows.entries()) {
    if ((row?.side !== 'L' && row?.side !== 'R') ||
        typeof row.setId !== 'string' || !row.setId) continue
    const key = JSON.stringify([row.setId, row.role ?? null, row.prescribed ?? null])
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push({ row, index })
  }
  const pairs = new Map(), consumed = new Set()
  for (const group of groups.values()) {
    if (group.length !== 2 || group[0].row.side === group[1].row.side) continue
    const first = Math.min(group[0].index, group[1].index)
    const left = group.find(item => item.row.side === 'L').row
    const right = group.find(item => item.row.side === 'R').row
    pairs.set(first, { row: left, left, right, index: first, setId: left.setId })
    consumed.add(Math.max(group[0].index, group[1].index))
  }
  const out = []
  for (let i = 0; i < rows.length; i++) {
    if (consumed.has(i)) continue
    if (pairs.has(i)) { out.push(pairs.get(i)); continue }
    const row = rows[i], next = rows[i + 1]
    // Pre-setId legacy saves only pair adjacent L->R records. Ambiguous
    // same-setId duplicates never fall back to adjacency.
    if (row?.side === 'L' && next?.side === 'R' &&
        !row.setId && !next.setId &&
        row.role === next.role && row.prescribed === next.prescribed) {
      out.push({ row, left: row, right: next, index: i, setId: null })
      i++
      continue
    }
    out.push({ row, index: i, setId: row?.setId ?? null })
  }
  // Numeric prescribed set IDs recover the source order for both paired and
  // ordinary work rows. Sort only when every logical set has exactly one ID.
  // Duplicate or unnumbered manual rows are ambiguous: preserve storage order.
  const order = x => /^r(\d+)$/.exec(x.setId || '')
  if (out.length && out.every(x => order(x)) &&
      new Set(out.map(x => x.setId)).size === out.length) out.sort((a, b) =>
    Number(order(a)[1]) - Number(order(b)[1]) || a.index - b.index)
  return out
}
