import { useState, useEffect, useRef } from 'react'
import { analyseRecipe, MATERIALS as CHEMISTRY_MATERIALS } from './chemistry'
import { Modal, BlockStack, Text, TextField, Select, InlineStack } from '@shopify/polaris'
import StullChart from './StullChart'
import './RecipeForm.css'

const RECIPE_TYPES = [
  'Glaze', 'Underglaze', 'Engobe', 'Flashing Slip',
  'Wash', 'Overglaze', 'Terra Sigillata', 'Other'
]

const GLAZE_TYPE_LABELS = {
  microcrystalline: 'Microcrystalline',
  glossy: 'Glossy',
  matte: 'Matte',
  underfired: 'Underfired / Dry',
  unknown: 'Unknown'
}

const GLAZE_TYPE_COLORS = {
  microcrystalline: '#2d6a9f',
  glossy: '#1a7a1a',
  matte: '#aa7700',
  underfired: '#aa2200',
  unknown: '#888888'
}

const UNITS = [
  { label: 'grams (g)', value: 'g' },
  { label: 'kilograms (kg)', value: 'kg' },
  { label: 'pounds (lb)', value: 'lb' },
  { label: 'ounces (oz)', value: 'oz' },
]

// Autocomplete ingredient input
function IngredientAutocomplete({ value, onChange, materials, placeholder }) {
  const [query, setQuery] = useState(value || '')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => { setQuery(value || '') }, [value])

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const libraryNames = (materials || []).map(m => m.name)
  const chemNames = Object.keys(CHEMISTRY_MATERIALS)
  const allNames = [...new Set([...libraryNames, ...chemNames])].sort()

  const filtered = query.length > 0
    ? allNames.filter(n => n.toLowerCase().includes(query.toLowerCase()))
    : []

  const inLibrary = (name) => libraryNames.some(n => n.toLowerCase() === name.toLowerCase())

  const handleSelect = (name) => {
    setQuery(name)
    onChange(name)
    setOpen(false)
  }

  const handleChange = (val) => {
    setQuery(val)
    onChange(val)
    setOpen(true)
  }

  return (
    <div ref={ref} style={{position: 'relative', flex: 1}}>
      <input
        className="form-input material-input"
        type="text"
        placeholder={placeholder || 'Search materials...'}
        value={query}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => query.length > 0 && setOpen(true)}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="material-dropdown">
          {filtered.slice(0, 8).map(name => (
            <button
              key={name}
              type="button"
              className="material-dropdown-item"
              onClick={() => handleSelect(name)}
            >
              <span>{name}</span>
              {!inLibrary(name) && (
                <span className="not-in-library">not in library</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function RecipeForm({ recipe, onSave, onCancel, materials, onAddMaterial }) {
  const isEdit = !!recipe

  const [activeTab, setActiveTab] = useState('details')
  const [recipeType, setRecipeType] = useState(recipe?.recipeType || 'Glaze')
  const [name, setName] = useState(recipe?.name || '')
  const [cone, setCone] = useState(recipe?.cone || '6')
  const [atmosphere, setAtmosphere] = useState(recipe?.atmosphere || 'oxidation')
  const [status, setStatus] = useState(recipe?.status || 'testing')
  const [baseIngredients, setBaseIngredients] = useState(
    recipe?.baseIngredients?.length > 0
      ? recipe.baseIngredients.map(i => ({ material: i.material, percent: String(i.percent) }))
      : [{ material: '', percent: '' }, { material: '', percent: '' }, { material: '', percent: '' }]
  )
  const [additives, setAdditives] = useState(
    recipe?.additives?.length > 0
      ? recipe.additives.map(i => ({ material: i.material, percent: String(i.percent) }))
      : [{ material: '', percent: '' }]
  )
  const [chemistry, setChemistry] = useState(null)
  const [showStull, setShowStull] = useState(false)
  const [notes, setNotes] = useState(recipe?.notes || '')

  // Add to library modal
  const [addMaterialModal, setAddMaterialModal] = useState(false)
  const [pendingMaterialName, setPendingMaterialName] = useState('')
  const [newMatAmount, setNewMatAmount] = useState('0')
  const [newMatUnit, setNewMatUnit] = useState('g')
  const [newMatApprox, setNewMatApprox] = useState(false)
  const [pendingIngredient, setPendingIngredient] = useState(null) // { section, index, name }

  useEffect(() => {
    const valid = baseIngredients.filter(i => i.material && parseFloat(i.percent) > 0)
    if (valid.length > 0) {
      const total = valid.reduce((sum, i) => sum + parseFloat(i.percent), 0)
      const normalised = valid.map(i => ({
        material: i.material,
        parts: (parseFloat(i.percent) / total) * 100,
        additive: false
      }))
      const result = analyseRecipe(normalised)
      setChemistry(result)
    } else {
      setChemistry(null)
      setShowStull(false)
    }
  }, [baseIngredients])

  const addBaseIngredient = () => {
    setBaseIngredients([...baseIngredients, { material: '', percent: '' }])
  }

  const removeBaseIngredient = (index) => {
    setBaseIngredients(baseIngredients.filter((_, i) => i !== index))
  }

  const handleBaseIngredientChange = (index, field, value) => {
    const updated = [...baseIngredients]
    updated[index] = { ...updated[index], [field]: value }
    setBaseIngredients(updated)

    // Check if material is in library when name changes
    if (field === 'material' && value) {
      const inLibrary = (materials || []).some(
        m => m.name.toLowerCase() === value.toLowerCase()
      )
      const inChemistry = Object.keys(CHEMISTRY_MATERIALS).some(
        m => m.toLowerCase() === value.toLowerCase()
      )
      if (!inLibrary && inChemistry === false && value.trim().length > 2) {
        // Will be caught on save
      }
    }
  }

  const handleBaseIngredientBlur = (index, value) => {
    if (!value || !value.trim()) return
    const inLibrary = (materials || []).some(
      m => m.name.toLowerCase() === value.toLowerCase()
    )
    if (!inLibrary) {
      setPendingMaterialName(value)
      setPendingIngredient({ section: 'base', index })
      setAddMaterialModal(true)
    }
  }

  const addAdditive = () => {
    setAdditives([...additives, { material: '', percent: '' }])
  }

  const removeAdditive = (index) => {
    setAdditives(additives.filter((_, i) => i !== index))
  }

  const handleAdditiveChange = (index, field, value) => {
    const updated = [...additives]
    updated[index] = { ...updated[index], [field]: value }
    setAdditives(updated)
  }

  const handleAdditiveBlur = (index, value) => {
    if (!value || !value.trim()) return
    const inLibrary = (materials || []).some(
      m => m.name.toLowerCase() === value.toLowerCase()
    )
    if (!inLibrary) {
      setPendingMaterialName(value)
      setPendingIngredient({ section: 'additive', index })
      setAddMaterialModal(true)
    }
  }

  const handleAddMaterialConfirm = () => {
    if (onAddMaterial) {
      onAddMaterial({
        name: pendingMaterialName,
        amount: parseFloat(newMatAmount) || 0,
        startingAmount: parseFloat(newMatAmount) || 0,
        unit: newMatUnit,
        isApproximate: newMatApprox,
        id: Date.now().toString(),
        created: new Date().toISOString().split('T')[0],
      })
    }
    setAddMaterialModal(false)
    setPendingMaterialName('')
    setNewMatAmount('0')
    setNewMatUnit('g')
    setNewMatApprox(false)
    setPendingIngredient(null)
  }

  const baseTotal = baseIngredients.reduce((sum, i) => sum + (parseFloat(i.percent) || 0), 0)
  const getNormalisedPercent = (percent) => {
    if (!percent || baseTotal === 0) return ''
    return ((parseFloat(percent) / baseTotal) * 100).toFixed(1)
  }

  const handleSave = () => {
    if (!name.trim()) { alert('Please enter a recipe name'); return }
    const validBase = baseIngredients.filter(i => i.material && parseFloat(i.percent) > 0)
    if (validBase.length === 0) { alert('Please add at least one base ingredient'); return }
    const total = validBase.reduce((sum, i) => sum + parseFloat(i.percent), 0)
    const normalisedBase = validBase.map(i => ({
      material: i.material,
      percent: Math.round((parseFloat(i.percent) / total) * 1000) / 10
    }))
    onSave({
      ...(isEdit ? recipe : {}),
      name: name.trim(),
      recipeType,
      cone,
      atmosphere,
      status,
      baseIngredients: normalisedBase,
      additives: additives.filter(i => i.material && parseFloat(i.percent) > 0),
      chemistry,
      notes
    })
  }

  const foodSafetyColor = (r) => {
    if (r === 'excellent') return '#1a7a1a'
    if (r === 'good') return '#2d7a2d'
    if (r === 'acceptable') return '#aa7700'
    return '#aa2200'
  }

  return (
    <div className="recipe-form">

      {/* Recipe Type */}
      <div className="form-section">
        <label className="form-label">Recipe Type</label>
        <div className="type-pills">
          {RECIPE_TYPES.map(t => (
            <button
              key={t}
              type="button"
              className={`type-pill ${recipeType === t ? 'active' : ''}`}
              onClick={() => setRecipeType(t)}
            >{t}</button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div className="form-section">
        <label className="form-label">Recipe Name</label>
        <input
          className="form-input"
          type="text"
          placeholder="e.g. Zinc-Titanium Microcrystalline White"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </div>

      {/* Cone + Atmosphere */}
      <div className="form-row">
        <div className="form-section half">
          <label className="form-label">Cone</label>
          <select className="form-select" value={cone} onChange={e => setCone(e.target.value)}>
            {['04','03','02','01','1','2','3','4','5','6','7','8','9','10','11','12'].map(c => (
              <option key={`cone-${c}`} value={c}>Cone {c}</option>
            ))}
          </select>
        </div>
        <div className="form-section half">
          <label className="form-label">Atmosphere</label>
          <select className="form-select" value={atmosphere} onChange={e => setAtmosphere(e.target.value)}>
            <option value="oxidation">Oxidation</option>
            <option value="reduction">Reduction</option>
            <option value="neutral">Neutral</option>
          </select>
        </div>
      </div>

      {/* Status */}
      <div className="form-section">
        <label className="form-label">Status</label>
        <select className="form-select" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="testing">Testing</option>
          <option value="stable">Stable</option>
          <option value="retired">Retired</option>
        </select>
      </div>

      {/* Tabs */}
      <div className="form-tabs">
        <button
          type="button"
          className={`form-tab ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >Recipe</button>
        <button
          type="button"
          className={`form-tab ${activeTab === 'layering' ? 'active' : ''}`}
          onClick={() => setActiveTab('layering')}
        >Layering</button>
      </div>

      {activeTab === 'details' && (
        <>
          {/* Base Glaze */}
          <div className="form-section">
            <div className="section-header">
              <label className="form-label">Base</label>
              <span className="section-hint">
                Total: {baseTotal.toFixed(1)} → normalised to 100%
              </span>
            </div>
            {baseIngredients.map((ing, index) => (
              <div key={index} className="ingredient-row">
                <IngredientAutocomplete
                  value={ing.material}
                  materials={materials}
                  placeholder="Search or add material..."
                  onChange={(val) => handleBaseIngredientChange(index, 'material', val)}
                  onBlur={() => handleBaseIngredientBlur(index, ing.material)}
                />
                <input
                  className="form-input parts-input"
                  type="number"
                  placeholder="0"
                  value={ing.percent}
                  onChange={e => handleBaseIngredientChange(index, 'percent', e.target.value)}
                />
                <span className="normalised-pct">
                  {getNormalisedPercent(ing.percent) ? `${getNormalisedPercent(ing.percent)}%` : '—'}
                </span>
                <button
                  type="button"
                  className="remove-btn"
                  onClick={() => removeBaseIngredient(index)}
                >✕</button>
              </div>
            ))}
            <button
              type="button"
              className="add-ingredient-btn"
              onClick={addBaseIngredient}
            >+ Add Ingredient</button>
          </div>

          {/* Additives */}
          <div className="form-section">
            <div className="section-header">
              <label className="form-label">Additives</label>
              <span className="section-hint">% on top of base</span>
            </div>
            {additives.map((add, index) => (
              <div key={index} className="ingredient-row">
                <IngredientAutocomplete
                  value={add.material}
                  materials={materials}
                  placeholder="Search or add material..."
                  onChange={(val) => handleAdditiveChange(index, 'material', val)}
                  onBlur={() => handleAdditiveBlur(index, add.material)}
                />
                <input
                  className="form-input parts-input"
                  type="number"
                  placeholder="0"
                  value={add.percent}
                  onChange={e => handleAdditiveChange(index, 'percent', e.target.value)}
                />
                <span className="normalised-pct"></span>
                <button
                  type="button"
                  className="remove-btn"
                  onClick={() => removeAdditive(index)}
                >✕</button>
              </div>
            ))}
            <button
              type="button"
              className="add-ingredient-btn"
              onClick={addAdditive}
            >+ Add Additive</button>
          </div>

          {/* Live Chemistry */}
          {chemistry && (
            <div className="chemistry-panel">
              <h3 className="chemistry-title">Live Chemistry</h3>
              <div className="chemistry-grid">
                <div className="chem-card">
                  <div className="chem-label">Glaze Type</div>
                  <div className="chem-value" style={{color: GLAZE_TYPE_COLORS[chemistry.stull.zone]}}>
                    {GLAZE_TYPE_LABELS[chemistry.stull.zone]}
                  </div>
                </div>
                <div className="chem-card">
                  <div className="chem-label">Food Safety</div>
                  <div className="chem-value" style={{color: foodSafetyColor(chemistry.ratios.foodSafety)}}>
                    {chemistry.ratios.foodSafety}
                  </div>
                </div>
                <div className="chem-card">
                  <div className="chem-label">SiO₂ : Al₂O₃</div>
                  <div className="chem-value">{chemistry.ratios.silicaAlumina} : 1</div>
                </div>
                <div className="chem-card">
                  <div className="chem-label">KNa : CaMg</div>
                  <div className="chem-value">{chemistry.ratios.knaCamg}</div>
                </div>
              </div>

              <div className="umf-section">
                <h4 className="umf-title">Unity Molecular Formula</h4>
                <div className="umf-columns">
                  <div className="umf-group">
                    <div className="umf-group-label">Fluxes</div>
                    {['K2O','Na2O','Li2O','CaO','MgO','ZnO','BaO','SrO','MnO'].map(ox =>
                      chemistry.unity[ox] > 0.001 ? (
                        <div key={ox} className="umf-row">
                          <span className="umf-oxide">{ox}</span>
                          <span className="umf-val">{chemistry.unity[ox].toFixed(3)}</span>
                        </div>
                      ) : null
                    )}
                  </div>
                  <div className="umf-group">
                    <div className="umf-group-label">Amphoteric</div>
                    {['Al2O3','B2O3'].map(ox =>
                      chemistry.unity[ox] > 0.001 ? (
                        <div key={ox} className="umf-row">
                          <span className="umf-oxide">{ox}</span>
                          <span className="umf-val">{chemistry.unity[ox].toFixed(3)}</span>
                        </div>
                      ) : null
                    )}
                    <div className="umf-group-label" style={{marginTop: '12px'}}>Glass Formers</div>
                    {['SiO2','TiO2','P2O5'].map(ox =>
                      chemistry.unity[ox] > 0.001 ? (
                        <div key={ox} className="umf-row">
                          <span className="umf-oxide">{ox}</span>
                          <span className="umf-val">{chemistry.unity[ox].toFixed(3)}</span>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="stull-btn"
                onClick={() => setShowStull(!showStull)}
              >
                {showStull ? 'Hide Stull Chart' : 'Show Stull Chart'}
              </button>

              {showStull && (
                <StullChart
                  al2o3={chemistry.stull.x}
                  sio2={chemistry.stull.y}
                  zone={chemistry.stull.zone}
                />
              )}
            </div>
          )}

          {/* Notes */}
          <div className="form-section">
            <label className="form-label">Notes</label>
            <textarea
              className="form-textarea"
              placeholder="Any notes about this glaze..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </>
      )}

      {activeTab === 'layering' && (
        <div className="layering-panel">
          <div className="layering-intro">
            <p>Save this recipe first, then use the Layering tool to find compatible companion glazes from your library.</p>
            <p>The AI will suggest:</p>
            <ul>
              <li>Which of your saved glazes layer well with this one</li>
              <li>The recommended order of application</li>
              <li>The anticipated fired result</li>
            </ul>
            <p className="layering-note">Available once you have 2 or more recipes saved.</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="form-actions">
        <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
        <button type="button" className="save-btn" onClick={handleSave}>
          {isEdit ? 'Save Changes' : 'Save Recipe'}
        </button>
      </div>

      {/* Add to library modal */}
      <Modal
        open={addMaterialModal}
        onClose={() => setAddMaterialModal(false)}
        title={`Add "${pendingMaterialName}" to Materials`}
        primaryAction={{
          content: 'Add to Library',
          onAction: handleAddMaterialConfirm
        }}
        secondaryActions={[{
          content: 'Skip',
          onAction: () => setAddMaterialModal(false)
        }]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text tone="subdued">
              This material isn't in your library yet. Add it now so inventory can be tracked.
            </Text>
            <InlineStack gap="300" blockAlign="end">
              <div style={{flex: 1}}>
                <TextField
                  label="Amount on hand"
                  type="number"
                  value={newMatAmount}
                  onChange={setNewMatAmount}
                  autoComplete="off"
                  helpText="Set to 0 if you haven't measured it yet"
                />
              </div>
              <div style={{flex: 1}}>
                <Select
                  label="Unit"
                  options={UNITS}
                  value={newMatUnit}
                  onChange={setNewMatUnit}
                />
              </div>
            </InlineStack>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <input
                type="checkbox"
                id="new-mat-approx"
                checked={newMatApprox}
                onChange={e => setNewMatApprox(e.target.checked)}
                style={{width: '16px', height: '16px', cursor: 'pointer'}}
              />
              <label htmlFor="new-mat-approx" style={{fontSize: '14px', cursor: 'pointer'}}>
                This is an estimate
              </label>
            </div>
          </BlockStack>
        </Modal.Section>
      </Modal>

    </div>
  )
}

export default RecipeForm