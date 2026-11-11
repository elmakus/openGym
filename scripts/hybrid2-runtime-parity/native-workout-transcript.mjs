// Lossless parser for the real Liftosaur Playground workout transcript.
// The source can render 'Exercise / ...' or 'Exercise, Cable / ...'.
// Bilateral entries are serialized 'right|left', each retained separately.
export function nativeTranscriptSets(workoutText, exerciseName) {
  if (typeof workoutText !== 'string' || typeof exerciseName !== 'string' ||
      !exerciseName.trim()) return []
  const lines = workoutText.split(/\r?\n/).map(line => line.trim())
  const matches = lines.filter(line => line.startsWith(exerciseName) &&
    /^(?:\s*,\s*[^/\n]+)?\s*\/\s*/.test(line.slice(exerciseName.length)))
  if (!matches.length) return []
  if (matches.length !== 1) throw new Error('Ambiguous original-native exercise transcript')
  const header = matches[0].slice(exerciseName.length)
  const slash = header.indexOf('/')
  const body = header.slice(slash + 1)
  const re = /(\d+)x(\d+)(?:\|(\d+))?\s+([0-9]+(?:\.[0-9]+)?)kg\b/g
  const sets = []
  for (const match of body.matchAll(re)) {
    const count = Number(match[1]), reps = Number(match[2])
    const leftReps = match[3] === undefined ? null : Number(match[3])
    const weight = Number(match[4])
    if (!Number.isInteger(count) || count < 1 || count > 100 ||
        !Number.isInteger(reps) || reps < 0 ||
        (leftReps !== null && (!Number.isInteger(leftReps) || leftReps < 0)) ||
        !Number.isFinite(weight) || weight < 0)
      throw new Error('Invalid native transcript set')
    for (let index = 0; index < count; index++)
      sets.push({ ordinal: sets.length + 1, completed: true, weight, reps,
        ...(leftReps !== null ? { leftReps } : {}) })
  }
  return sets
}
