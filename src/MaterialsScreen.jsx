import { useState } from 'react'
import { Modal, Text, BlockStack } from '@shopify/polaris'
import SubstitutionAssistant from './SubstitutionAssistant'
import { getStockStatus, toGrams, calcIngredientCost } from './materials'
import { calcSurfaceArea, calcGlazeVolume, groupByCategory, DEFAULT_OBJECT_TYPES } from './objectTypes'
import './MixingSession.css'

const UNITS = ['g', 'kg', 'lb', 'oz']

const TO_GRAMS = {
  g: 1,
  kg: 1000,
  lb: 453.592,
  oz: 28.3495
}

export default function MixingSession({ recipe, materials, objectTypes, onComplete, onCancel }) {
  const [batchSize, setBatchSize] = useState('')
  const [unit, setUnit] = useState('g')
  const [checked, setChecked] = useState({})
  const [sgMeasured, setSgMeasured] = useState('')
  const [sessionNotes, setSessionNotes] = useState('')
  const [showSG, setShowSG] = useState(false)
  const [showDipModal, setShowDipModal] = useState(false)

  if (!recipe) return null

  const allTypes = objectTypes || DEFAULT_OBJECT_TYPES
  const batchGrams = parseFloat(batchSize) * TO_GRAMS[unit] || 0
  const batchReady = batchGrams > 0

  const calcGrams = (percent) => {
    if (!batchGrams) return '—'
    return (batchGrams * percent / 100).toFixed(1) + 'g'
  }

  const getMaterial = (name) => {
    return (materials || []).find(m => m.name.toLowerCase() === name?.toLowerCase())
  }

  const getIngredientStatus = (name, percent) => {
    const mat = getMaterial(name)
    if (!mat) return 'unknown'
    if (mat.amount <= 0) return 'out'
    if (!batchGrams) {
      if (mat.startingAmount > 0 && mat.amount / mat.startingAmount <= 0.25) return 'low'
      return 'ok'
    }
    const neededGrams = batchGrams * percent / 100
    const availableGrams = toGrams(mat.amount, mat.unit)
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
    if (!batchReady) return
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
    return { name: ing.material, usedGrams, cost, estimated: mat.priceApproximate }
  })

  const totalCost = costBreakdown.reduce((sum, item) => sum + (item.cost || 0), 0)
  const hasAnyCost = costBreakdown.some(item => item.cost !== null)
  const hasEstimated = costBreakdown.some(item => item.estimated && item.cost !== null)

  const glazeDensity = sgValue && !isNaN(sgValue) ? sgValue : 1.45
  const costPerGram = batchGrams > 0 && totalCost > 0 ? totalCost / batchGrams : null
  const costPerMl = costPerGram ? costPerGram * glazeDensity : null

  const getDipCost = (obj) => {
    if (!costPerMl) return null
    const area = calcSurfaceArea(obj)
    const volume = calcGlazeVolume(area)
    return volume * costPerMl
  }

  const defaultObj = allTypes.find(o => o.category === 'Mug' && o.variant === 'MD') || allTypes[0]
  const defaultDipCost = defaultObj ? getDipCost(defaultObj) : null
  const groupedObjectTypes = groupByCategory(allTypes)

  const handleComplete = () => {
    onComplete({
      recipe,
      recipeId: recipe.id,
      recipeSlug: recipe.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      recipeName: recipe.name,
      batchSize: parseFloat(batchSize),
      unit,
      batchGrams,
      batchCost: hasAnyCost ? totalCost : null,
      batchCostEstimated: hasEstimated,
      sgMeasured: sgValue || null,
      notes: sessionNotes,
      date: new Date().toISOString().split('T')[0],
      id: Date.now().toString(),
      completed: true
    })
  }

  const renderIngredient = (ing, key) => {
    const done = checked[key]
    const status = getIngredientStatus(ing.material, ing.percent)
    const isOut = status === 'out'
    const isLow = status === 'low'
    const isUnknown = status === 'unknown'
    const locked = !batchReady

    return (
      <button
        key={key}
        className={`mix-ingredient ${done ? 'checked' : ''} ${isOut ? 'stock-out' : ''} ${locked ? 'locked' : ''}`}
        onClick={() => toggleChecked(key)}
        disabled={locked}
        title={locked ? 'Enter a batch size first' : ''}
      >
        <div className="mix-ing-left">
          <div className={`mix-check ${done ? 'done' : ''} ${locked ? 'locked' : ''}`}>
            {locked ? '🔒' : done ? '✓' : ''}
          </div>
          <div className="mix-ing-info">
            <div className={`mix-ing-name ${done ? 'struck' : ''} ${locked ? 'muted' : ''}`}>
              <span>{ing.material}</span>
              {isOut && !done && <span className="stock-badge out">Out</span>}
              {isLow && !isOut && !done && <span className="stock-badge low">Low</span>}
              {isUnknown && !done && <span className="stock-badge unknown">?</span>}
            </div>
            <div className="mix-ing-pct">{ing.percent}% of base</div>
          </div>
        </div>
        <div className={`mix-ing-weight ${done ? 'struck' : ''} ${isOut ? 'text-danger' : ''} ${locked ? 'muted' : ''}`}>
          {locked ? '—' : calcGrams(ing.percent)}
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

      <div className={`mix-batch-bar ${!batchReady ? 'batch-required' : ''}`}>
        <div className="mix-batch-label">
          Batch size
          {!batchReady && <span className="batch-required-hint"> — enter to unlock ingredients</span>}
        </div>
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

      {/* Batch cost summary */}
      {batchReady && (
        <div className="batch-cost-summary">
          <div className="batch-cost-row">
            <span className="batch-cost-label">Batch cost</span>
            <span className="batch-cost-value">
              {hasAnyCost
                ? `$${totalCost.toFixed(2)}${hasEstimated ? ' (est.)' : ''}`
                : '—'}
            </span>
          </div>
          {defaultObj && (
            <div className="batch-cost-row">
              <span className="batch-cost-label">
                {defaultObj.category} {defaultObj.variant} per dip
              </span>
              <span className="batch-cost-value">
                {defaultDipCost !== null
                  ? `$${defaultDipCost.toFixed(3)}${hasEstimated ? ' (est.)' : ''}`
                  : '—'}
                {' '}
                <button
                  type="button"
                  className="see-more-link"
                  onClick={() => setShowDipModal(true)}
                >
                  See more...
                </button>
              </span>
            </div>
          )}
          {!hasAnyCost && (
            <div className="batch-cost-hint">Add prices to materials to see cost estimates.</div>
          )}
        </div>
      )}

      {/* SG Calculator */}
      <div className="mix-sg-section">
        <div className="mix-sg-header">
          <button className="sg-toggle-inline" onClick={() => setShowSG(!showSG)}>
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
          {!batchReady ? 'Enter batch size first' : allDone ? 'Complete Session' : `${totalCount - checkedCount} remaining`}
        </button>
      </div>

      <SubstitutionAssistant
        recipe={recipe}
        checkedIngredients={checked}
      />

      <Modal
        open={showDipModal}
        onClose={() => setShowDipModal(false)}
        title="Per-Dip Cost by Object Type"
      >
        <Modal.Section>
          <BlockStack gap="200">
            <Text tone="subdued" variant="bodySm">
              Based on SG {glazeDensity.toFixed(2)} · 0.5mm glaze layer
              {hasEstimated ? ' · some prices estimated' : ''}
            </Text>
            {Object.entries(groupedObjectTypes).map(([category, items]) => (
              <div key={category}>
                <div style={{padding: '8px 0 4px', fontSize: '11px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #f0f0f0', marginBottom: '4px'}}>
                  {category}
                </div>
                {items.map(obj => {
                  const dipCost = getDipCost(obj)
                  const area = calcSurfaceArea(obj)
                  const volume = calcGlazeVolume(area)
                  const isDefault = obj.id === defaultObj?.id
                  return (
                    <div
                      key={obj.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: isDefault ? '7px 8px' : '7px 0',
                        borderBottom: '1px solid #f9f9f9',
                        background: isDefault ? '#f5f0e8' : 'transparent',
                        borderRadius: isDefault ? '4px' : '0',
                      }}
                    >
                      <div>
                        <span style={{fontSize: '14px', fontWeight: isDefault ? 700 : 400}}>
                          {obj.variant}
                          {isDefault && <span style={{fontSize: '11px', color: '#888', marginLeft: '6px'}}>default</span>}
                        </span>
                        <div style={{fontSize: '11px', color: '#aaa'}}>
                          {obj.height}" H · {obj.maxDiameter}" ⌀ · {volume.toFixed(1)} mL/dip
                        </div>
                      </div>
                      <span style={{fontSize: '14px', fontWeight: 600, color: dipCost ? '#1a3a5c' : '#aaa'}}>
                        {dipCost ? `$${dipCost.toFixed(3)}` : 'no price'}
                      </span>
                    </div>
                  )
                })}
              </div>
            ))}
          </BlockStack>
        </Modal.Section>
      </Modal>

    </div>
  )
}