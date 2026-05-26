// ============================================================
// GLAZE LAB CHEMISTRY ENGINE
// Unity Molecular Formula (UMF) calculator
// ============================================================

// Molecular weights of all common glaze oxides
export const MOLECULAR_WEIGHTS = {
  SiO2:  60.09,
  Al2O3: 101.96,
  CaO:   56.08,
  MgO:   40.30,
  K2O:   94.20,
  Na2O:  61.98,
  ZnO:   81.38,
  TiO2:  79.87,
  B2O3:  69.62,
  Fe2O3: 159.69,
  MnO:   70.94,
  CoO:   74.93,
  Li2O:  29.88,
  BaO:   153.33,
  SrO:   103.62,
  P2O5:  141.94,
  CuO:   79.55,
  Cr2O3: 152.00,
  NiO:   74.69,
}

// Flux oxides (RO + R2O group) — these sum to 1.0 in UMF
export const FLUX_OXIDES = ['K2O', 'Na2O', 'Li2O', 'CaO', 'MgO', 'ZnO', 'BaO', 'SrO', 'MnO']

// Amphoteric oxides
export const AMPHOTERIC_OXIDES = ['Al2O3', 'B2O3']

// Glass former oxides
export const GLASS_FORMER_OXIDES = ['SiO2', 'TiO2', 'P2O5']

// ============================================================
// MATERIAL DATABASE
// Each material lists oxide composition by weight %
// LOI (loss on ignition) is excluded — only fired oxides listed
// ============================================================
export const MATERIALS = {
  'Custer Feldspar':     { SiO2: 68.5, Al2O3: 17.0, K2O: 10.0, Na2O: 3.0, CaO: 0.3 },
  'Potash Feldspar':     { SiO2: 64.8, Al2O3: 18.3, K2O: 16.9 },
  'Soda Feldspar':       { SiO2: 68.0, Al2O3: 19.5, Na2O: 11.8, CaO: 0.7 },
  'Cornwall Stone':      { SiO2: 72.0, Al2O3: 15.0, K2O: 3.7, Na2O: 3.4, CaO: 1.5, MgO: 0.1 },
  'Nepheline Syenite':   { SiO2: 60.4, Al2O3: 23.3, K2O: 9.8, Na2O: 14.0, CaO: 0.7 },
  'Whiting':             { CaO: 56.1 },
  'Dolomite':            { CaO: 30.4, MgO: 21.9 },
  'Talc':                { SiO2: 58.3, MgO: 31.7 },
  'Zinc Oxide':          { ZnO: 100.0 },
  'Barium Carbonate':    { BaO: 77.7 },
  'Strontium Carbonate': { SrO: 70.2 },
  'Lithium Carbonate':   { Li2O: 40.4 },
  'EPK Kaolin':          { SiO2: 45.7, Al2O3: 37.3, K2O: 0.4, Na2O: 0.1, CaO: 0.1, MgO: 0.1, TiO2: 0.3 },
  'Grolleg Kaolin':      { SiO2: 47.0, Al2O3: 36.5, K2O: 1.8, Na2O: 0.1, TiO2: 0.02 },
  'OM4 Ball Clay':       { SiO2: 51.0, Al2O3: 28.0, K2O: 0.5, Na2O: 0.3, TiO2: 1.6, Fe2O3: 1.0 },
  'Silica 325':          { SiO2: 100.0 },
  'Silica 200':          { SiO2: 100.0 },
  'Flint':               { SiO2: 99.5 },
  'Ferro Frit 3134':     { SiO2: 23.9, Al2O3: 1.9, CaO: 20.0, Na2O: 10.2, B2O3: 23.0, K2O: 0.3, MgO: 0.3 },
  'Ferro Frit 3124':     { SiO2: 56.0, Al2O3: 9.0, CaO: 14.0, Na2O: 4.0, B2O3: 16.0 },
  'Ferro Frit 3195':     { SiO2: 41.0, Al2O3: 7.0, CaO: 12.0, Na2O: 9.0, B2O3: 23.0, ZnO: 6.0 },
  'Ferro Frit 3110':     { SiO2: 67.0, Al2O3: 2.0, Na2O: 15.0, K2O: 3.5, CaO: 0.5, B2O3: 8.0 },
  'Titanium Dioxide':    { TiO2: 100.0 },
  'Rutile':              { TiO2: 80.0, Fe2O3: 18.0 },
  'Tin Oxide':           { },
  'Zircopax':            { SiO2: 35.0 },
  'Bentonite':           { SiO2: 60.0, Al2O3: 20.0, MgO: 3.0, Na2O: 2.5, CaO: 1.5, Fe2O3: 3.0 },
  'Red Iron Oxide':      { Fe2O3: 85.0, SiO2: 10.0, Al2O3: 5.0 },
  'Yellow Iron Oxide':   { Fe2O3: 85.0, SiO2: 10.0, Al2O3: 5.0 },
  'Black Iron Oxide':    { Fe2O3: 96.0 },
  'Cobalt Carbonate':    { CoO: 63.0 },
  'Cobalt Oxide':        { CoO: 78.7 },
  'Copper Carbonate':    { CuO: 57.5 },
  'Copper Oxide':        { CuO: 100.0 },
  'Manganese Dioxide':   { MnO: 63.2 },
  'Manganese Carbonate': { MnO: 47.8 },
  'Chrome Oxide':        { Cr2O3: 100.0 },
  'Nickel Oxide':        { NiO: 100.0 },
  'Bone Ash':            { CaO: 54.0, P2O5: 42.0 },
  'Spodumene':           { SiO2: 64.6, Al2O3: 27.4, Li2O: 8.0 },
  'Wollastonite':        { SiO2: 51.7, CaO: 48.3 },
  'Petalite':            { SiO2: 77.6, Al2O3: 16.7, Li2O: 4.9 },
}

// ============================================================
// CALCULATION FUNCTIONS
// ============================================================

/**
 * Calculate oxide weight % from a recipe
 * recipe: array of { material, parts, additive }
 * Returns: object of { oxide: weight_percent }
 */
export function calcOxideWeights(recipe) {
  if (!recipe || recipe.length === 0) return {}

  // Split base and additive materials
  const base = recipe.filter(r => !r.additive)
  const additives = recipe.filter(r => r.additive)

  const baseTotal = base.reduce((sum, r) => sum + (parseFloat(r.parts) || 0), 0)
  const additiveTotal = additives.reduce((sum, r) => sum + (parseFloat(r.parts) || 0), 0)
  const grandTotal = baseTotal + additiveTotal

  if (grandTotal === 0) return {}

  const oxides = {}

  recipe.forEach(({ material, parts }) => {
    const composition = MATERIALS[material]
    if (!composition) return
    const pct = (parseFloat(parts) || 0) / grandTotal
    Object.entries(composition).forEach(([oxide, wt]) => {
      oxides[oxide] = (oxides[oxide] || 0) + pct * wt
    })
  })

  return oxides
}

/**
 * Convert oxide weights to Unity Molecular Formula
 * Returns: { unity, fluxSum }
 */
export function calcUMF(oxideWeights) {
  // Convert weight % to moles
  const moles = {}
  Object.entries(oxideWeights).forEach(([oxide, wt]) => {
    if (MOLECULAR_WEIGHTS[oxide]) {
      moles[oxide] = wt / MOLECULAR_WEIGHTS[oxide]
    }
  })

  // Sum flux moles
  const fluxSum = FLUX_OXIDES.reduce((sum, ox) => sum + (moles[ox] || 0), 0)

  if (fluxSum === 0) return { unity: {}, fluxSum: 0 }

  // Normalize to flux sum = 1.0
  const unity = {}
  Object.entries(moles).forEach(([oxide, mol]) => {
    unity[oxide] = Math.round((mol / fluxSum) * 1000) / 1000
  })

  return { unity, fluxSum }
}

/**
 * Calculate key glaze ratios from UMF
 */
export function calcRatios(unity) {
  const si = unity.SiO2 || 0
  const al = unity.Al2O3 || 0
  const k = unity.K2O || 0
  const na = unity.Na2O || 0
  const ca = unity.CaO || 0
  const mg = unity.MgO || 0

  const silicaAlumina = al > 0 ? Math.round((si / al) * 100) / 100 : 0
  const knaCamg = (ca + mg) > 0 ? Math.round(((k + na) / (ca + mg)) * 1000) / 1000 : 0

  let foodSafety = 'excellent'
  if (knaCamg > 1.0) foodSafety = 'caution'
  else if (knaCamg > 0.5) foodSafety = 'acceptable'
  else if (knaCamg > 0.3) foodSafety = 'good'

  return { silicaAlumina, knaCamg, foodSafety }
}

/**
 * Determine Stull chart zone from UMF coordinates
 */
export function getStullZone(al2o3, sio2) {
  if (al2o3 < 0.2 && sio2 < 1.5) return 'underfired'
  if (sio2 < 2.5 && al2o3 < 0.35) return 'matte'
  if (al2o3 >= 0.15 && al2o3 <= 0.35 && sio2 >= 1.5 && sio2 <= 3.5) return 'microcrystalline'
  if (sio2 >= 2.5 && al2o3 >= 0.3) return 'glossy'
  return 'unknown'
}

/**
 * Run full chemistry calculation on a recipe
 * Returns everything needed for display and storage
 */
export function analyseRecipe(recipe) {
  const oxideWeights = calcOxideWeights(recipe)
  const { unity } = calcUMF(oxideWeights)
  const ratios = calcRatios(unity)
  const al = unity.Al2O3 || 0
  const si = unity.SiO2 || 0
  const stullZone = getStullZone(al, si)

  return {
    oxideWeights,
    unity,
    ratios,
    stull: {
      x: Math.round(al * 1000) / 1000,
      y: Math.round(si * 1000) / 1000,
      zone: stullZone
    }
  }
}