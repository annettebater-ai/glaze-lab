import { useState, useRef, useEffect } from 'react'
import TestResultForm from './TestResultForm'
import DriveImage from './DriveImage'
import StullChart from './StullChart'
import { getStockStatus } from './materials'
import { getCompatibilityWarnings } from './clayBodies'
import './RecipeDetail.css'

const GLAZE_TYPE_COLORS = {
  microcrystalline: '#2d6a9f',
  glossy: '#1a7a1a',
  matte: '#aa7700',
  underfired: '#aa2200',
  unknown: '#888'
}

const FOOD_SAFETY_COLORS = {
  excellent: '#1a7a1a',
  good: '#2d7a2d',
  acceptable: '#aa7700',
  caution: '#aa2200',
  unknown: '#888'
}

const StarDisplay = ({ value }) => (
  <div className="star-display">
    {[1,2,3,4,5].map(n => (
      <span key={n} className={`star-icon ${n <= value ? 'active' : ''}`}>★</span>
    ))}
  </div>
)

function IngredientStockBadge({ name, materials }) {
  const mat = (materials || []).find(m => m.name.toLowerCase() === name?.toLowerCase())
  if (!mat) return null
  const status = getStockStatus(mat)
  if (!status || status === 'ok') return null
  if (status === 'out') return <span className="ing-stock-badge out">Out</span>
  if (status === 'low') return <span className="ing-stock-badge low">Low</span>
  return null
}

function CompatibilityWarnings({ recipe, clayBodies, testResults }) {
  if (!clayBodies?.length) return null
  const allWarnings = []

  clayBodies.forEach(cb => {
    const chemWarnings = getCompatibilityWarnings(recipe, cb)
    chemWarnings.forEach(w => {
      allWarnings.push({ ...w, clayBody: cb.name, source: 'chemistry' })
    })
    const recipeSlug = recipe.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const relevantResults = (testResults || []).filter(r =>
      r.recipeSlug === recipeSlug &&
      r.clayBody?.toLowerCase() === cb.name.toLowerCase() &&
      r.status === 'completed' &&
      r.rating > 0 &&
      r.rating <= 2
    )
    relevantResults.forEach(result => {
      allWarnings.push({
        type: 'experience',
        severity: result.rating === 1 ? 'high' : 'medium',
        clayBody: cb.name,
        source: 'rating',
        message: `Rated ${result.rating}★ on ${cb.name} (${result.date}).${result.notesAfter ? ` Note: ${result.notesAfter}` : ''}`
      })
    })
  })

  if (!allWarnings.length) return null

  return (
    <div className="detail-section">
      <h2 className="section-title">Compatibility Warnings</h2>
      {allWarnings.map((w, i) => (
        <div key={i} className={`compat-warning ${w.severity}`}>
          <div className="compat-warning-header">
            <span className="compat-clay-body">{w.clayBody}</span>
            <span className={`compat-badge ${w.severity}`}>
              {w.severity === 'high' ? '⚠ High' : '! Medium'}
            </span>
            <span className="compat-source">
              {w.source === 'chemistry' ? 'Chemistry' : 'Experience'}
            </span>
          </div>
          <div className="compat-warning-msg">{w.message}</div>
        </div>
      ))}
    </div>
  )
}

function InlineNameEditor({ name, onSave }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)
  const inputRef = useRef(null)

  useEffect(() => { setValue(name) }, [name])
  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus()
  }, [editing])

  const handleSave = () => {
    const trimmed = value.trim()
    if (trimmed && trimmed !== name) onSave(trimmed)
    setEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') { setValue(name); setEditing(false) }
  }

  if (editing) {
    return (
      <div className="inline-name-editor">
        <input
          ref={inputRef}
          className="inline-name-input"
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className="inline-name-save"
          onMouseDown={e => e.preventDefault()}
          onClick={handleSave}
        >✓</button>
      </div>
    )
  }

  return (
    <h1
      className="detail-name editable"
      onClick={() => setEditing(true)}
      title="Click to edit name"
    >
      {name}
      <span className="edit-pencil">✎</span>
    </h1>
  )
}

export default function RecipeDetail({ recipe, onBack, onStartMix, onDelete, onSaveRecipe, onEditRecipe, testResults, mixingSessions, onSaveTestResult, onDeleteTestResult, accessToken, photosFolderId, materials, clayBodies }) {
  const [showStull, setShowStull] = useState(false)
  const [showTestForm, setShowTestForm] = useState(false)
  const [editingResult, setEditingResult] = useState(null)
  const [selectedResult, setSelectedResult] = useState(null)

  if (!recipe) return null

  const unity = recipe.chemistry?.unity || {}
  const ratios = recipe.chemistry?.ratios || {}
  const stull = recipe.chemistry?.stull || {}

  const recipeSlug = recipe.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const recipeResults = (testResults || [])
    .filter(r => r.recipeSlug === recipeSlug)
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  const fluxes = ['K2O','Na2O','Li2O','CaO','MgO','ZnO','BaO','SrO','MnO']
    .filter(ox => unity[ox] > 0.001)
  const amphoteric = ['Al2O3','B2O3']
    .filter(ox => unity[ox] > 0.001)
  const glassFormers = ['SiO2','TiO2','P2O5']
    .filter(ox => unity[ox] > 0.001)

  const handleNameSave = (newName) => {
    if (onSaveRecipe) onSaveRecipe({ ...recipe, name: newName })
  }

  if (showTestForm || editingResult) {
    return (
      <div className="recipe-detail">
        <div className="detail-title-block">
          <div className="detail-type-row">
            <div className="detail-type">
              {editingResult ? 'Edit Test Result' : 'New Test Result'}
            </div>
            <button
              className="detail-mix-btn"
              style={{background: '#888'}}
              onClick={() => {
                setShowTestForm(false)
                setEditingResult(null)
              }}
            >
              Cancel
            </button>
          </div>
          <h1 className="detail-name">{recipe.name}</h1>
        </div>
        <TestResultForm
          recipe={recipe}
          mixingSessions={mixingSessions}
          existingResult={editingResult || null}
          accessToken={accessToken}
          photosFolderId={photosFolderId}
          onSave={(result) => {
            onSaveTestResult(result)
            setShowTestForm(false)
            setEditingResult(null)
          }}
          onCancel={() => {
            setShowTestForm(false)
            setEditingResult(null)
          }}
          onDelete={editingResult ? (result) => {
            onDeleteTestResult(result)
            setEditingResult(null)
          } : null}
        />
      </div>
    )
  }

  if (selectedResult) {
    return (
      <div className="recipe-detail">
        <div className="detail-title-block">
          <div className="detail-type-row">
            <div className="detail-type">Test Result · {selectedResult.date}</div>
            <div style={{display: 'flex', gap: '8px'}}>
              <button
                className="detail-mix-btn"
                style={{background: '#1a3a5c'}}
                onClick={() => {
                  setEditingResult(selectedResult)
                  setSelectedResult(null)
                }}
              >
                Edit
              </button>
              <button
                className="detail-mix-btn"
                style={{background: '#888'}}
                onClick={() => setSelectedResult(null)}
              >
                ← Back
              </button>
            </div>
          </div>
          <h1 className="detail-name">{recipe.name}</h1>
          <div className="detail-meta">
            {selectedResult.clayBody} · {selectedResult.applicationMethod} · {selectedResult.thickness}
          </div>
        </div>

        {selectedResult.status === 'completed' && selectedResult.rating > 0 && (
          <div className="detail-section">
            <StarDisplay value={selectedResult.rating} />
          </div>
        )}

        {selectedResult.photos && selectedResult.photos.length > 0 && (
          <div className="detail-section">
            <h2 className="section-title">Photos</h2>
            <div className="result-photos-grid">
              {selectedResult.photos.map((p, i) => (
                <DriveImage
                  key={i}
                  fileId={p.fileId || p}
                  accessToken={accessToken}
                  alt="Test result"
                  className="result-photo-img"
                />
              ))}
            </div>
          </div>
        )}

        {selectedResult.layers && selectedResult.layers.length > 0 && (
          <div className="detail-section">
            <h2 className="section-title">Layering</h2>
            {selectedResult.layers.map((l, i) => (
              <div key={i} className="result-layer-row">
                <div className="result-layer-num">{i + 1}</div>
                <div>
                  <div className="result-layer-type">{l.type}</div>
                  <div className="result-layer-recipe">{l.recipe || '—'}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedResult.notesBefore && (
          <div className="detail-section">
            <h2 className="section-title">Notes Before Firing</h2>
            <p className="detail-notes">{selectedResult.notesBefore}</p>
          </div>
        )}

        {selectedResult.status === 'pending' && (
          <div className="detail-section">
            <div className="pending-badge">⏳ Awaiting firing</div>
          </div>
        )}

        {selectedResult.status === 'completed' && (
          <>
            {selectedResult.notesAfter && (
              <div className="detail-section">
                <h2 className="section-title">Outcome</h2>
                <p className="detail-notes">{selectedResult.notesAfter}</p>
              </div>
            )}
            {selectedResult.nextSteps && (
              <div className="detail-section">
                <h2 className="section-title">What To Try Next</h2>
                <p className="detail-notes">{selectedResult.nextSteps}</p>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="recipe-detail">

      <div className="detail-title-block">
        <div className="detail-type-row">
          <div className="detail-type">{recipe.recipeType}</div>
          <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
            {onEditRecipe && (
              <button
                className="detail-mix-btn"
                style={{background: '#555'}}
                onClick={() => onEditRecipe(recipe)}
              >
                Edit
              </button>
            )}
            <button
              className="detail-mix-btn"
              onClick={() => onStartMix(recipe)}
            >
              Start Mixing
            </button>
          </div>
        </div>
        <InlineNameEditor name={recipe.name} onSave={handleNameSave} />
        <div className="detail-meta">
          Cone {recipe.cone} · {recipe.atmosphere} ·
          <span className={`detail-status ${recipe.status}`}> {recipe.status}</span>
        </div>
      </div>

      <CompatibilityWarnings
        recipe={recipe}
        clayBodies={clayBodies}
        testResults={testResults}
      />

      <div className="detail-section">
        <div className="section-header-row">
          <h2 className="section-title" style={{marginBottom: 0}}>Test Results</h2>
          <button className="add-result-btn" onClick={() => setShowTestForm(true)}>
            + Add Result
          </button>
        </div>
        {recipeResults.length === 0 ? (
          <div className="no-results-hint">
            No test results yet. Fire a test tile and record the outcome.
          </div>
        ) : (
          <div className="results-carousel">
            {recipeResults.map((result, i) => (
              <button
                key={i}
                className={`result-tile ${result.status}`}
                onClick={() => setSelectedResult(result)}
              >
                {result.status === 'pending' ? (
                  <div className="result-tile-pending">
                    <div className="result-tile-icon">⏳</div>
                    <div className="result-tile-date">{result.date}</div>
                    <div className="result-tile-label">Pending</div>
                  </div>
                ) : (
                  <div className="result-tile-completed">
                    {result.photos && result.photos.length > 0 ? (
                      <DriveImage
                        fileId={result.photos[0].fileId || result.photos[0]}
                        accessToken={accessToken}
                        alt="Test result"
                        className="result-tile-photo"
                      />
                    ) : (
                      <div className="result-tile-photo-placeholder">🏺</div>
                    )}
                    <div className="result-tile-date">{result.date}</div>
                    <StarDisplay value={result.rating} />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {recipe.chemistry && (
        <div className="detail-section">
          <div className="chemistry-cards">
            <div className="chem-card">
              <div className="chem-label">Glaze Type</div>
              <div className="chem-value" style={{color: GLAZE_TYPE_COLORS[stull.zone]}}>
                {stull.zone || 'unknown'}
              </div>
            </div>
            <div className="chem-card">
              <div className="chem-label">Food Safety</div>
              <div className="chem-value" style={{color: FOOD_SAFETY_COLORS[ratios.foodSafety]}}>
                {ratios.foodSafety || 'unknown'}
              </div>
            </div>
            <div className="chem-card">
              <div className="chem-label">SiO₂ : Al₂O₃</div>
              <div className="chem-value">{ratios.silicaAlumina} : 1</div>
            </div>
            <div className="chem-card">
              <div className="chem-label">KNa : CaMg</div>
              <div className="chem-value">{ratios.knaCamg}</div>
            </div>
          </div>
        </div>
      )}

      <div className="detail-section">
        <h2 className="section-title">Base Glaze</h2>
        <table className="ingredient-table">
          <thead>
            <tr>
              <th className="ing-th">Material</th>
              <th className="ing-th ing-th-right">%</th>
            </tr>
          </thead>
          <tbody>
            {(recipe.baseIngredients || []).map((ing, i) => (
              <tr key={i} className="ing-row">
                <td className="ing-td">
                  <span>{ing.material}</span>
                  <IngredientStockBadge name={ing.material} materials={materials} />
                </td>
                <td className="ing-td ing-td-right">{ing.percent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {recipe.additives && recipe.additives.filter(a => a.material).length > 0 && (
        <div className="detail-section">
          <h2 className="section-title">Additives</h2>
          <table className="ingredient-table">
            <thead>
              <tr>
                <th className="ing-th">Material</th>
                <th className="ing-th ing-th-right">% of base</th>
              </tr>
            </thead>
            <tbody>
              {recipe.additives.filter(a => a.material).map((add, i) => (
                <tr key={i} className="ing-row">
                  <td className="ing-td">
                    <span>{add.material}</span>
                    <IngredientStockBadge name={add.material} materials={materials} />
                  </td>
                  <td className="ing-td ing-td-right">{add.percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {recipe.chemistry && (
        <div className="detail-section">
          <h2 className="section-title">Unity Molecular Formula</h2>
          <div className="umf-grid">
            <div className="umf-col">
              <div className="umf-group-label">Fluxes</div>
              {fluxes.map(ox => (
                <div key={ox} className="umf-row">
                  <span className="umf-oxide">{ox}</span>
                  <span className="umf-val">{unity[ox].toFixed(3)}</span>
                </div>
              ))}
            </div>
            <div className="umf-col">
              <div className="umf-group-label">Amphoteric</div>
              {amphoteric.map(ox => (
                <div key={ox} className="umf-row">
                  <span className="umf-oxide">{ox}</span>
                  <span className="umf-val">{unity[ox].toFixed(3)}</span>
                </div>
              ))}
              <div className="umf-group-label" style={{marginTop: '12px'}}>Glass Formers</div>
              {glassFormers.map(ox => (
                <div key={ox} className="umf-row">
                  <span className="umf-oxide">{ox}</span>
                  <span className="umf-val">{unity[ox].toFixed(3)}</span>
                </div>
              ))}
            </div>
          </div>
          <button
            className="stull-toggle-btn"
            onClick={() => setShowStull(!showStull)}
          >
            {showStull ? 'Hide Stull Chart' : 'Show Stull Chart'}
          </button>
          {showStull && (
            <StullChart
              al2o3={stull.x}
              sio2={stull.y}
              zone={stull.zone}
            />
          )}
        </div>
      )}

      {recipe.notes && (
        <div className="detail-section">
          <h2 className="section-title">Notes</h2>
          <p className="detail-notes">{recipe.notes}</p>
        </div>
      )}

    </div>
  )
}