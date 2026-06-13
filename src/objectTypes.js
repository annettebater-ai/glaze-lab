// ── Object Types — surface area calculation and defaults ──────

// All dimensions stored in inches internally
// Surface area calculated in square inches, converted to cm² for glaze volume

export const DEFAULT_OBJECT_TYPES = [
  // Mugs (with handle)
  { id: 'mug-sm', category: 'Mug', variant: 'SM', height: 3, maxDiameter: 3, openingDiameter: 2.5 },
  { id: 'mug-md', category: 'Mug', variant: 'MD', height: 4, maxDiameter: 3.5, openingDiameter: 3 },
  { id: 'mug-lg', category: 'Mug', variant: 'LG', height: 5, maxDiameter: 4, openingDiameter: 3.5 },

  // Cups (no handle)
  { id: 'cup-espresso', category: 'Cup', variant: 'Espresso', height: 2, maxDiameter: 2, openingDiameter: 1.75 },
  { id: 'cup-tea', category: 'Cup', variant: 'Tea', height: 3, maxDiameter: 3, openingDiameter: 2.75 },
  { id: 'cup-drinking', category: 'Cup', variant: 'Drinking', height: 4, maxDiameter: 3.25, openingDiameter: 3 },
  { id: 'cup-travel', category: 'Cup', variant: 'Travel', height: 5, maxDiameter: 3.5, openingDiameter: 2 },

  // Bowls
  { id: 'bowl-sm', category: 'Bowl', variant: 'SM', height: 3, maxDiameter: 5.5, openingDiameter: 5 },
  { id: 'bowl-md', category: 'Bowl', variant: 'MD', height: 3.5, maxDiameter: 7, openingDiameter: 6.5 },
  { id: 'bowl-lg', category: 'Bowl', variant: 'LG', height: 4.5, maxDiameter: 9, openingDiameter: 8.5 },

  // Plates
  { id: 'plate-dessert', category: 'Plate', variant: 'Dessert', height: 1, maxDiameter: 6.5, openingDiameter: 6 },
  { id: 'plate-salad', category: 'Plate', variant: 'Salad', height: 1.5, maxDiameter: 8.5, openingDiameter: 8 },
  { id: 'plate-dinner', category: 'Plate', variant: 'Dinner', height: 1.5, maxDiameter: 11, openingDiameter: 10.5 },

  // Vases
  { id: 'vase-bud', category: 'Vase', variant: 'Bud', height: 7, maxDiameter: 3, openingDiameter: 1 },
  { id: 'vase-medium', category: 'Vase', variant: 'Medium', height: 10, maxDiameter: 5.5, openingDiameter: 2.5 },
  { id: 'vase-large', category: 'Vase', variant: 'Large', height: 12, maxDiameter: 8, openingDiameter: 3 },
]

/**
 * Calculate approximate exterior surface area in square inches
 * Uses truncated cone approximation for the body
 * Adds interior rim area for open vessels
 */
export function calcSurfaceArea(obj) {
  const { height, maxDiameter, openingDiameter } = obj
  const r1 = maxDiameter / 2  // base radius
  const r2 = openingDiameter / 2  // opening radius
  const h = height

  // Lateral surface area of truncated cone
  const slantHeight = Math.sqrt(h * h + (r1 - r2) * (r1 - r2))
  const lateralArea = Math.PI * (r1 + r2) * slantHeight

  // Base area (exterior bottom)
  const baseArea = Math.PI * r1 * r1

  // Interior rim area (rough estimate — 1 inch depth inside)
  const rimDepth = Math.min(1, h * 0.25)
  const interiorArea = 2 * Math.PI * r2 * rimDepth

  return lateralArea + baseArea + interiorArea
}

/**
 * Convert square inches to square centimetres
 */
export function sqInToCm2(sqIn) {
  return sqIn * 6.4516
}

/**
 * Estimate glaze volume needed in mL for one dip
 * Based on surface area and average glaze layer thickness (0.5mm)
 * Bisque absorption factor ~1.2
 */
export function calcGlazeVolume(surfaceAreaSqIn) {
  const surfaceCm2 = sqInToCm2(surfaceAreaSqIn)
  const thicknessCm = 0.05  // 0.5mm in cm
  const absorptionFactor = 1.2
  return surfaceCm2 * thicknessCm * absorptionFactor  // mL
}

/**
 * Calculate cost per dip given glaze cost per mL
 */
export function calcDipCost(surfaceAreaSqIn, costPerMl) {
  const volumeMl = calcGlazeVolume(surfaceAreaSqIn)
  return volumeMl * costPerMl
}

/**
 * Convert inches to cm
 */
export function inToCm(inches) {
  return inches * 2.54
}

/**
 * Convert cm to inches
 */
export function cmToIn(cm) {
  return cm / 2.54
}

/**
 * Group object types by category
 */
export function groupByCategory(objectTypes) {
  return objectTypes.reduce((acc, obj) => {
    if (!acc[obj.category]) acc[obj.category] = []
    acc[obj.category].push(obj)
    return acc
  }, {})
}