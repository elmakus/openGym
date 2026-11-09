// Timed Load has its own immutable logical kilogram ladder, including true 0 kg.
// Display weights can change units; the controller's state and history never change units.
const LB_PER_KG = 2.2046226218
export const displayTimedWeight = (kg, unit) =>
  unit === 'lb' ? Math.round(kg * LB_PER_KG * 1000) / 1000 : kg

/** Accept native display or an existing profile-converted (0.5 lb rounded) row. */
export function nativeTimedKg(weight, unit, nativeKg) {
  if (!Number.isFinite(weight)) return null
  const exact = nativeKg.find(kg => Math.abs(displayTimedWeight(kg, unit) - weight) <= 0.001)
  if (exact != null) return exact
  if (unit === 'lb') return nativeKg.find(kg =>
    Math.abs(Math.round(kg * LB_PER_KG * 2) / 2 - weight) < 1e-6) ?? null
  return null
}
