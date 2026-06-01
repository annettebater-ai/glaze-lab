import { useState, useEffect, useRef } from 'react'
import { analyseRecipe, MATERIALS } from './chemistry'
import './RecipeForm.css'

const MATERIAL_NAMES = Object.keys(MATERIALS).sort()

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

function StullChart({ x, y, zone }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height
    const pad = { top: 30, right: 20, bottom: 40, left: 40 }
    const chartW = w - pad.left - pad.right
    const chartH = h - pad.top - pad.bottom

    // Scale: x = Al2O3 0–0.75, y = SiO2 0–5.5
    const toCanvasX = (al) => pad.left + (al / 0.75) * chartW
    const toCanvasY = (si) => pad.top + chartH - (si / 5.5) * chartH

    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#fafaf8'
    ctx.fillRect(0, 0, w, h)

    // Draw zones
    const zones = [
      { pts: [[0,0],[0.2,0],[0.2,1.5],[0.1,1.0],[0,0.8]], color: '#e8d5c0', label: 'Underfired' },
      { pts: [[0.2,0],[0.5,0],[0.5,2.5],[0.35,2.5],[0.2,1.5]], color: '#d4e8d0', label: 'Matte' },
      { pts: [[0.15,1.5],[0.35,1.5],[0.35,3.5],[0.15,3.5]], color: '#c8d8f0', label: 'Microcrystalline' },
      { pts: [[0.3,2.5],[0.7,2.5],[0.7,5.5],[0.3,5.5]], color: '#f0e8c8', label: 'Glossy' },
    ]

    zones.forEach(({ pts, color, label }) => {
      ctx.beginPath()
      pts.forEach(([ax, sy], i) => {
        const cx = toCanvasX(ax)
        const cy = toCanvasY(sy)
        i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy)
      })
      ctx.closePath()
      ctx.fillStyle = color
      ctx.globalAlpha = 0.6
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.strokeStyle = '#aaa'
      ctx.lineWidth = 0.5
      ctx.stroke()
    })

    // Zone labels
    const zoneLabels = [
      { text: 'Underfired', ax: 0.08, sy: 0.35 },
      { text: 'Matte', ax: 0.32, sy: 0.7 },
      { text: 'Microcrystalline', ax: 0.22, sy: 2.6 },
      { text: 'Glossy', ax: 0.48, sy: 3.8 },
    ]
    ctx.font = '9px -apple-system, sans-serif'
    ctx.fillStyle = '#666'
    ctx.textAlign = 'center'
    zoneLabels.forEach(({ text, ax, sy }) => {
      ctx.fillText(text, toCanvasX(ax), toCanvasY(sy))
    })

    // Grid lines
    ctx.strokeStyle = '#ddd'
    ctx.lineWidth = 0.5
    ctx.setLineDash([2, 3])
    for (let ax = 0; ax <= 0.75; ax += 0.1) {
      ctx.beginPath()
      ctx.moveTo(toCanvasX(ax), pad.top)
      ctx.lineTo(toCanvasX(ax), pad.top + chartH)
      ctx.stroke()
    }
    for (let sy = 0; sy <= 5.5; sy += 0.5) {
      ctx.beginPath()
      ctx.moveTo(pad.left, toCanvasY(sy))
      ctx.lineTo(pad.left + chartW, toCanvasY(sy))
      ctx.stroke()
    }
    ctx.setLineDash([])

    // Axes
    ctx.strokeStyle = '#888'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(pad.left, pad.top)
    ctx.lineTo(pad.left, pad.top + chartH)
    ctx.lineTo(pad.left + chartW, pad.top + chartH)
    ctx.stroke()

    // Axis labels
    ctx.font = '10px -apple-system, sans-serif'
    ctx.fillStyle = '#555'
    ctx.textAlign = 'center'
    ctx.fillText('Al₂O₃', pad.left + chartW / 2, h - 4)
    ctx.save()
    ctx.translate(12, pad.top + chartH / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('SiO₂', 0, 0)
    ctx.restore()

    // Axis tick values
    ctx.font = '8px -apple-system, sans-serif'
    ctx.fillStyle = '#888'
    ctx.textAlign = 'center'
    for (let ax = 0; ax <= 0.7; ax += 0.2) {
      ctx.fillText(ax.toFixed(1), toCanvasX(ax), pad.top + chartH + 12)
    }
    ctx.textAlign = 'right'
    for (let sy = 0; sy <= 5; sy += 1) {
      ctx.fillText(sy, pad.left - 4, toCanvasY(sy) + 3)
    }

    // Plot the glaze point
    const px = toCanvasX(x)
    const py = toCanvasY(y)
    ctx.beginPath()
    ctx.arc(px, py, 6, 0, Math.PI * 2)
    ctx.fillStyle = '#1a3a5c'
    ctx.fill()
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 2
    ctx.stroke()

    // Label the point
    ctx.font = 'bold 10px -apple-system, sans-serif'
    ctx.fillStyle = '#1a3a5c'
    ctx.textAlign = 'left'
    ctx.fillText(`Al₂O₃ ${x} / SiO₂ ${y}`, px + 10, py + 4)

  }, [x, y])

  return (
    <div className="stull-chart-container">
      <canvas ref={canvasRef} width={320} height={260} className="stull-canvas" />
      <div className="stull-zone-badge" style={{ color: GLAZE_TYPE_COLORS[zone] }}>
        Zone: {GLAZE_TYPE_LABELS[zone]}
      </div>
    </div>
  )
}

function RecipeForm({ onSave, onCancel }) {
  const [activeTab, setActiveTab] = useState('details')
  const [recipeType, setRecipeType] = useState('Glaze')
  const [name, setName] = useState('')
  const [cone, setCone] = useState('6')
  const [atmosphere, setAtmosphere] = useState('oxidation')
  const [status, setStatus] = useState('testing')
  const [baseIngredients, setBaseIngredients] = useState([
    { material: '', percent: '' },
    { material: '', percent: '' },
    { material: '', percent: '' },
  ])
  const [additives, setAdditives] = useState([
    { material: '', percent: '' }
  ])
  const [chemistry, setChemistry] = useState(null)
  const [showStull, setShowStull] = useState(false)
  const [notes, setNotes] = useState('')

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

  const updateBaseIngredient = (index, field, value) => {
    const updated = [...baseIngredients]
    updated[index] = { ...updated[index], [field]: value }
    setBaseIngredients(updated)
  }

  const addAdditive = () => {
    setAdditives([...additives, { material: '', percent: '' }])
  }

  const removeAdditive = (index) => {
    setAdditives(additives.filter((_, i) => i !== index))
  }

  const updateAdditive = (index, field, value) => {
    const updated = [...additives]
    updated[index] = { ...updated[index], [field]: value }
    setAdditives(updated)
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
      name: name.trim(), recipeType, cone, atmosphere, status,
      baseIngredients: normalisedBase,
      additives: additives.filter(i => i.material && parseFloat(i.percent) > 0),
      chemistry, notes
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
          className={`form-tab ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >Recipe</button>
        <button
          className={`form-tab ${activeTab === 'layering' ? 'active' : ''}`}
          onClick={() => setActiveTab('layering')}
        >Layering</button>
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <>
          {/* Base Glaze */}
          <div className="form-section">
            <div className="section-header">
              <label className="form-label">Base</label>
              <span className="section-hint">Totals 100%</span>
            </div>
            {baseIngredients.map((ing, index) => (
              <div key={index} className="ingredient-row">
                <select
                  className="form-select material-select"
                  value={ing.material}
                  onChange={e => updateBaseIngredient(index, 'material', e.target.value)}
                >
                  <option value="">Select material...</option>
                  {MATERIAL_NAMES.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <input
                  className="form-input parts-input"
                  type="number"
                  placeholder="0"
                  value={ing.percent}
                  onChange={e => updateBaseIngredient(index, 'percent', e.target.value)}
                />
                <span className="normalised-pct">
                  {getNormalisedPercent(ing.percent) ? `${getNormalisedPercent(ing.percent)}%` : '—'}
                </span>
                <button className="remove-btn" onClick={() => removeBaseIngredient(index)}>✕</button>
              </div>
            ))}
            <button className="add-ingredient-btn" onClick={addBaseIngredient}>
              + Add Ingredient
            </button>
          </div>

          {/* Additives */}
          <div className="form-section">
            <div className="section-header">
              <label className="form-label">Additives</label>
              <span className="section-hint">% on top of base</span>
            </div>
            {additives.map((add, index) => (
              <div key={index} className="ingredient-row">
                <select
                  className="form-select material-select"
                  value={add.material}
                  onChange={e => updateAdditive(index, 'material', e.target.value)}
                >
                  <option value="">Select material...</option>
                  {MATERIAL_NAMES.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <input
                  className="form-input parts-input"
                  type="number"
                  placeholder="0"
                  value={add.percent}
                  onChange={e => updateAdditive(index, 'percent', e.target.value)}
                />
                <span className="normalised-pct"></span>
                <button className="remove-btn" onClick={() => removeAdditive(index)}>✕</button>
              </div>
            ))}
            <button className="add-ingredient-btn" onClick={addAdditive}>
              + Add Additive
            </button>
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

              {/* Stull Chart Toggle */}
              <button
                className="stull-btn"
                onClick={() => setShowStull(!showStull)}
              >
                {showStull ? 'Hide Stull Chart' : 'Show Stull Chart'}
              </button>

              {showStull && (
                <StullChart
                  x={chemistry.stull.x}
                  y={chemistry.stull.y}
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

      {/* Layering Tab */}
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
        <button className="cancel-btn" onClick={onCancel}>Cancel</button>
        <button className="save-btn" onClick={handleSave}>Save Recipe</button>
      </div>

    </div>
  )
}

export default RecipeForm