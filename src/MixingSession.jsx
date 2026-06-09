import { useState } from 'react'
import SubstitutionAssistant from './SubstitutionAssistant'
import { getStockStatus, toGrams, calcIngredientCost } from './materials'
import './MixingSession.css'

const UNITS = ['g', 'kg', 'lb', 'oz']

const TO_GRAMS = {
  g: 1,
  kg: 1000,
  lb: 453.592,
  oz: 28.3495
}

export default function MixingSession({ recipe, materials, onComplete, onCancel }) {
  const [batchSize, setBatchSize] = useState('')
  const [unit, setUnit] = useState('g')
  const [checked, setChecked] = useState({})
  const [sgMeasured, setSgMeasured] = useState('')
  const [sessionNotes, setSessionNotes] = useState('')
  const [showSG, setShowSG] = useState(false)
  const [showCost, setShowCost] = useState(false)

  if (!recipe) return null

  const batchGrams = parseFloat(batchSize) * TO_GRAMS[unit] || 0

  const calcGrams = (percent) => {
    if (!batchGrams) return '—'
    return (batchGrams * percent / 100).toFixed(1) + 'g'
  }

  const getMaterial = (name) => {
    return (materials || []).find(m => m.name.toLowerCase() === name?.toLowerCase())
  }

  const getIngredientStatus = (name, percent) => {
    const mat = getMaterial(name)
    if (!mat) return null
    if (!batchGrams) return getStockStatus(mat)
    const neededGrams = batchGrams * percent / 100
    const availableGrams = toGrams(mat.amount, mat.unit)
    if (availableGrams <= 0) return 'out'
    if (availableGrams < neededGrams) return 'out'
    if (mat.startingAmount > 0 && mat.amount / mat.startingAmount <= 0.25) return 'low'
    return 'ok'
  }

  const allIngredients = [
    ...(recipe.baseIngredients || []).map(i => ({ ...i, section: 'base' })),
    ...(recipe.additives || []).map(i => ({ ...i, section: 'additive' }))
  ].filter(i => i.material)

  const checkedCount = Object.values(checked).filter(Boolean).length
  const totalCount = allIngredients.length
  const allDone = checkedCount === totalCount && totalCount > 0

  const toggleChecked = (key) => {
    setChecked(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const sgTarget = { min: 1.40, max: 1.50 }
  const sgValue = parseFloat(sgMeasured)
  const sgStatus = () => {
    if (!sgMeasured || isNaN(sgValue)) return null
    if (sgValue < sgTarget.min) return { msg: 'Too thin — add dry material', color: '#aa7700' }
    if (sgValue > sgTarget.max) return { msg: 'Too thick — add water', color: '#cc2200' }
    return { msg: 'Within target range ✓', color: '#1a7a1a' }
  }

  const costBreakdown = allIngredients.map(ing => {
    const mat = getMaterial(ing.material)
    if (!mat || !batchGrams) return { name: ing.material, cost: null, estimated: false }
    const usedGrams = batchGrams * ing.percent / 100
    const cost = calcIngredientCost(mat, usedGrams)
    return {
      name: ing.material,
      usedGrams,
      cost,
      estimated: mat.priceApproximate,
      hasPrice: mat.price !== null && mat.price !== undefined
    }
  })

  const totalCost = costBreakdown.reduce((sum, item) => sum + (item.cost || 0), 0)
  const hasAnyCost = costBreakdown.some(item => item.cost !== null)
  const hasEstimated = costBreakdown.some(item => item.estimated && item.cost !== null)

  const handleComplete = () => {
    onComplete({
      recipe,
      recipeId: recipe.id,
      batchSize: parseFloat(batchSize),
      unit,
      batchGrams,
      sgMeasured: sgValue || null,
      notes: sessionNotes,
      date: new Date().toISOString().split('T')[0],
      completed: true
    })
  }

  const renderIngredient = (ing, key) => {
    const done = checked[key]
    const status = getIngredientStatus(ing.material, ing.percent)
    const isOut = status === 'out'
    const isLow = status === 'low'

    return (
      <button
        key={key}
        className={`mix-ingredient ${done ? 'checked' : ''} ${isOut ? 'stock-out' : ''}`}
        onClick={() => toggleChecked(key)}
      >
        <div className="mix-ing-left">
          <div className={`mix-check ${done ? 'done' : ''}`}>
            {done ? '✓' : ''}
          </div>
          <div className="mix-ing-info">
            <div className={`mix-ing-name ${done ? 'struck' : ''}`}>
              {ing.material}
              {isOut && !done && <span className="stock-badge out">Out</span>}
              {isLow && !isOut && !done && <span className="stock-badge low">Low</span>}
            </div>
            <div className="mix-ing-pct">{ing.percent}% of base</div>
          </div>
        </div>
        <div className={`mix-ing-weight ${done ? 'struck' : ''} ${isOut ? 'text-danger' : ''}`}>
          {calcGrams(ing.percent)}
        </div>
      </button>
    )
  }

  return (
    <div className="mixing-session">

      <div className="mix-header">
        <button className="mix-back-btn" onClick={onCancel}>← Cancel</button>
        <h2 className="mix-title">{recipe.name}</h2>
        <div className="mix-progress-text">{checkedCount}/{totalCount}</div>
      </div>

      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{ width: totalCount > 0 ? (checkedCount / totalCount * 100) + '%' : '0%' }}
        />
      </div>

      <div className="mix-batch-bar">
        <div className="mix-batch-label">Batch size</div>
        <div className="mix-batch-controls">
          <input
            className="mix-batch-input"
            type="number"
            placeholder="0"
            value={batchSize}
            onChange={e => setBatchSize(e.target.value)}
          />
          <div className="mix-unit-pills">
            {UNITS.map(u => (
              <button
                key={u}
                className={`mix-unit-pill ${unit === u ? 'active' : ''}`}
                onClick={() => setUnit(u)}
              >{u}</button>
            ))}
          </div>
          {batchGrams > 0 && unit !== 'g' && (
            <div className="mix-batch-converted">{batchGrams.toFixed(0)}g total</div>
          )}
        </div>
      </div>

      <div className="mix-section-label">Base Glaze</div>
      {(recipe.baseIngredients || []).map((ing, i) => {
        if (!ing.material) return null
        return renderIngredient(ing, 'base-' + i)
      })}

      {recipe.additives && recipe.additives.filter(a => a.material).length > 0 && (
        <>
          <div className="mix-section-label">Additives</div>
          {recipe.additives.map((add, i) => {
            if (!add.material) return null
            return renderIngredient(add, 'add-' + i)
          })}
        </>
      )}

      {hasAnyCost && batchGrams > 0 && (
        <div className="mix-sg-section">
          <div className="mix-sg-header">
            <button
              className="sg-toggle-inline"
              onClick={() => setShowCost(!showCost)}
            >
              {showCost ? 'Hide Cost Estimate' : `Cost Estimate — $${totalCost.toFixed(2)}${hasEstimated ? ' (est.)' : ''}`}
            </button>
          </div>
          {showCost && (
            <div className="cost-panel">
              {costBreakdown.map((item, i) => (
                item.cost !== null ? (
                  <div key={i} className="cost-row">
                    <span className="cost-name">
                      {item.name}
                      {item.estimated && <span className="cost-est-badge">estimated</span>}
                    </span>
                    <span className="cost-amount">${item.cost.toFixed(3)}</span>
                  </div>
                ) : (
                  <div key={i} className="cost-row cost-row-unknown">
                    <span className="cost-name">{item.name}</span>
                    <span className="cost-unknown">no price set</span>
                  </div>
                )
              ))}
              <div className="cost-total-row">
                <span>Total batch cost</span>
                <span>${totalCost.toFixed(2)}{hasEstimated ? ' (est.)' : ''}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mix-sg-section">
        <div className="mix-sg-header">
          <button
            className="sg-toggle-inline"
            onClick={() => setShowSG(!showSG)}
          >
            {showSG ? 'Hide SG Calculator' : 'SG Calculator'}
          </button>
        </div>
        {showSG && (
          <div className="sg-panel">
            <div className="sg-row">
              <input
                className="sg-input"
                type="number"
                step="0.01"
                placeholder="e.g. 1.45"
                value={sgMeasured}
                onChange={e => setSgMeasured(e.target.value)}
              />
              <div className="sg-info">
                <div className="sg-target">Target: {sgTarget.min}–{sgTarget.max}</div>
                {sgStatus() && (
                  <div className="sg-status" style={{color: sgStatus().color}}>
                    {sgStatus().msg}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mix-notes-section">
        <textarea
          className="mix-notes-input"
          placeholder="Session notes..."
          value={sessionNotes}
          onChange={e => setSessionNotes(e.target.value)}
          rows={2}
        />
      </div>

      <div className="mix-footer">
        <button
          className={`complete-btn ${allDone ? 'ready' : ''}`}
          onClick={handleComplete}
          disabled={!allDone}
        >
          {allDone ? 'Complete Session' : `${totalCount - checkedCount} remaining`}
        </button>
      </div>

      <SubstitutionAssistant
        recipe={recipe}
        checkedIngredients={checked}
      />

    </div>
  )
}