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

const FIRING_TYPE_LABELS = {
  'cone-6-ox': 'Cone 6 Ox',
  'cone-10-red': 'Cone 10 Red',
  'cone-04-ox': 'Cone 04 Ox',
  'wood': 'Wood Fire',
  'soda': 'Soda Fire',
  'salt': 'Salt Fire',
  'raku': 'Raku',
  'other': 'Other',
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
  if (!mat) return <span className="ing-stock-badge unknown">Not in library</span>
  const status = getStockStatus(mat)
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
    const relevantResults = (testResults || []).filter(r => {
      const tiles = r.tiles || []
      const hasLowRating = tiles.some(t =>
        t.clayBody?.toLowerCase() === cb.name.toLowerCase() &&
        t.status === 'completed' &&
        t.rating > 0 &&
        t.rating <= 2
      )
      return r.recipeSlug === recipeSlug && hasLowRating
    })
    relevantResults.forEach(result => {
      const badTile = result.tiles?.find(t =>
        t.clayBody?.toLowerCase() === cb.name.toLowerCase() && t.rating <= 2
      )
      if (badTile) {
        allWarnings.push({
          type: 'experience',
          severity: badTile.rating === 1 ? 'high' : 'medium',
          clayBody: cb.name,
          source: 'rating',
          message: `Rated ${badTile.rating}★ on ${cb.name} (${result.date}).${badTile.notesAfter ? ` Note: ${badTile.notesAfter}` : ''}`
        })
      }
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
        <input ref={inputRef} className="inline-name-input" value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={handleSave} onKeyDown={handleKeyDown} />
        <button type="button" className="inline-name-save"
          onMouseDown={e => e.preventDefault()} onClick={handleSave}>✓</button>
      </div>
    )
  }

  return (
    <h1 className="detail-name editable" onClick={() => setEditing(true)} title="Click to edit name">
      {name}
      <span className="edit-pencil">✎</span>
    </h1>
  )
}

function TileDetail({ tile, index, accessToken }) {
  const firingLabel = FIRING_TYPE_LABELS[tile.firingType] || tile.firingType
  return (
    <div style={{border: '1px solid #e8e8e8', borderRadius: '8px', overflow: 'hidden', marginBottom: '10px'}}>
      <div style={{background: '#1a1a1a', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px'}}>
        <div style={{width: '20px', height: '20px', borderRadius: '50%', background: '#c8a96e', color: '#1a1a1a', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          {index + 1}
        </div>
        <span style={{fontSize: '12px', fontWeight: 600, color: 'white'}}>Tile {index + 1}</span>
        <span style={{marginLeft: 'auto', fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '8px',
          background: tile.status === 'completed' ? '#d4edda' : '#fff3cd',
          color: tile.status === 'completed' ? '#155724' : '#856404'}}>
          {tile.status === 'completed' ? 'Complete' : 'Pending'}
        </span>
      </div>
      <div style={{padding: '12px', background: 'white'}}>
        {[tile.clayBody, tile.applicationMethod, tile.thickness].filter(Boolean).length > 0 && (
          <div style={{fontSize: '12px', color: '#888', marginBottom: '8px'}}>
            {[tile.clayBody, tile.applicationMethod, tile.thickness].filter(Boolean).join(' · ')}
          </div>
        )}

        {tile.layers?.length > 0 && (
          <div style={{marginBottom: '8px'}}>
            <div style={{fontSize: '10px', fontWeight: 700, color: '#1a3a5c', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px'}}>Layering</div>
            {tile.layers.map((l, i) => (
              <div key={i} style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#555', padding: '1px 0'}}>
                <span style={{width: '14px', height: '14px', borderRadius: '50%', background: '#1a3a5c', color: 'white', fontSize: '9px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>{i + 1}</span>
                <span style={{fontWeight: 500}}>{l.type}</span>
                <span style={{color: '#aaa'}}>—</span>
                <span>{l.recipe}</span>
              </div>
            ))}
          </div>
        )}

        {tile.notesBefore && (
          <div style={{marginBottom: '8px'}}>
            <div style={{fontSize: '10px', fontWeight: 700, color: '#1a3a5c', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px'}}>Before</div>
            <p style={{margin: 0, fontSize: '12px', color: '#555'}}>{tile.notesBefore}</p>
          </div>
        )}

        {tile.preFirePhotos?.length > 0 && (
          <div style={{marginBottom: '8px'}}>
            <div style={{fontSize: '10px', fontWeight: 700, color: '#1a3a5c', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px'}}>Pre-fire</div>
            <div className="result-photos-grid">
              {tile.preFirePhotos.map((p, i) => (
                accessToken && p.fileId ? (
                  <img key={i} src={`https://www.googleapis.com/drive/v3/files/${p.fileId}?alt=media&access_token=${accessToken}`}
                    alt={p.name} className="result-photo-img" />
                ) : null
              ))}
            </div>
          </div>
        )}

        {tile.status === 'pending' && (
          <div style={{color: '#888', fontStyle: 'italic', fontSize: '12px'}}>⏳ Awaiting firing</div>
        )}

        {tile.status === 'completed' && (
          <>
            {tile.rating > 0 && <StarDisplay value={tile.rating} />}
            {firingLabel && (
              <div style={{marginTop: '6px', marginBottom: '6px'}}>
                <div style={{fontSize: '10px', fontWeight: 700, color: '#1a3a5c', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px'}}>Firing</div>
                <p style={{margin: 0, fontSize: '12px', color: '#555'}}>{firingLabel}{tile.coneReached ? ` · Cone ${tile.coneReached}` : ''}</p>
              </div>
            )}
            {tile.notesAfter && (
              <div style={{marginBottom: '6px'}}>
                <div style={{fontSize: '10px', fontWeight: 700, color: '#1a3a5c', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px'}}>Outcome</div>
                <p style={{margin: 0, fontSize: '12px', color: '#555'}}>{tile.notesAfter}</p>
              </div>
            )}
            {tile.nextSteps && (
              <div style={{marginBottom: '6px'}}>
                <div style={{fontSize: '10px', fontWeight: 700, color: '#1a3a5c', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px'}}>Next Steps</div>
                <p style={{margin: 0, fontSize: '12px', color: '#555'}}>{tile.nextSteps}</p>
              </div>
            )}
            {tile.photos?.length > 0 && (
              <div>
                <div style={{fontSize: '10px', fontWeight: 700, color: '#1a3a5c', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px'}}>Post-fire</div>
                <div className="result-photos-grid">
                  {tile.photos.map((p, i) => (
                    accessToken && p.fileId ? (
                      <img key={i} src={`https://www.googleapis.com/drive/v3/files/${p.fileId}?alt=media&access_token=${accessToken}`}
                        alt={p.name} className="result-photo-img" />
                    ) : null
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function RecipeDetail({ recipe, onBack, onStartMix, onDelete, onSaveRecipe, onEditRecipe, testResults, mixingSessions, onSaveTestResult, onDeleteTestResult, accessToken, photosFolderId, materials, clayBodies }) {
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

  // ── New/Edit test session form ──
  if (showTestForm || editingResult) {
    return (
      <div className="recipe-detail">
        <div className="detail-title-block">
          <div className="detail-type-row">
            <div className="detail-type">
              {editingResult ? 'Edit Test Session' : 'New Test Session'}
            </div>
            <button className="detail-mix-btn" style={{background: '#888'}}
              onClick={() => { setShowTestForm(false); setEditingResult(null) }}>
              Cancel
            </button>
          </div>
          <h1 className="detail-name">{recipe.name}</h1>
        </div>
        <TestResultForm
          recipe={recipe}
          existingSession={editingResult || null}
          accessToken={accessToken}
          photosFolderId={photosFolderId}
          clayBodies={clayBodies}
          onSave={(result) => {
            onSaveTestResult(result)
            setShowTestForm(false)
            setEditingResult(null)
          }}
          onCancel={() => { setShowTestForm(false); setEditingResult(null) }}
          onDelete={editingResult ? (result) => {
            onDeleteTestResult(result)
            setEditingResult(null)
          } : null}
        />
      </div>
    )
  }

  // ── Session detail view ──
  if (selectedResult) {
    const totalTiles = selectedResult.tiles?.length || 0
    const completedTiles = selectedResult.tiles?.filter(t => t.status === 'completed').length || 0
    const bestRating = selectedResult.tiles?.reduce((max, t) => Math.max(max, t.rating || 0), 0) || 0

    return (
      <div className="recipe-detail">
        <div className="detail-title-block">
          <div className="detail-type-row">
            <div className="detail-type">Test Session · {selectedResult.date}</div>
            <div style={{display: 'flex', gap: '8px'}}>
              <button className="detail-mix-btn" style={{background: '#1a3a5c'}}
                onClick={() => { setEditingResult(selectedResult); setSelectedResult(null) }}>
                Edit
              </button>
              <button className="detail-mix-btn" style={{background: '#888'}}
                onClick={() => setSelectedResult(null)}>
                ← Back
              </button>
            </div>
          </div>
          <h1 className="detail-name">{recipe.name}</h1>
          <div className="detail-meta">
            {totalTiles} tile{totalTiles !== 1 ? 's' : ''} · {completedTiles}/{totalTiles} complete
          </div>
        </div>

        {bestRating > 0 && (
          <div className="detail-section">
            <StarDisplay value={bestRating} />
          </div>
        )}

        <div style={{padding: '0 16px'}}>
          {selectedResult.tiles?.map((tile, i) => (
            <TileDetail key={tile.id || i} tile={tile} index={i} accessToken={accessToken} />
          ))}
          {selectedResult.notes && (
            <div style={{padding: '12px', background: '#f9f7f4', borderRadius: '8px', marginTop: '4px'}}>
              <div style={{fontSize: '10px', fontWeight: 700, color: '#1a3a5c', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px'}}>Session Notes</div>
              <p style={{margin: 0, fontSize: '13px', color: '#555'}}>{selectedResult.notes}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Main recipe detail view ──
  return (
    <div className="recipe-detail">

      <div className="detail-title-block">
        <div className="detail-type-row">
          <div className="detail-type">{recipe.recipeType}</div>
          <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
            {onEditRecipe && (
              <button className="detail-mix-btn" style={{background: '#555'}}
                onClick={() => onEditRecipe(recipe)}>
                Edit
              </button>
            )}
            <button className="detail-mix-btn" onClick={() => onStartMix(recipe)}>
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

      <CompatibilityWarnings recipe={recipe} clayBodies={clayBodies} testResults={testResults} />

      <div className="detail-section">
        <div className="section-header-row">
          <h2 className="section-title" style={{marginBottom: 0}}>Test Sessions</h2>
          <button className="add-result-btn" onClick={() => setShowTestForm(true)}>
            + Add Test
          </button>
        </div>
        {recipeResults.length === 0 ? (
          <div className="no-results-hint">
            No test sessions yet. Add a test to record your tile results.
          </div>
        ) : (
          <div className="results-carousel">
            {recipeResults.map((session, i) => {
              const bestRating = session.tiles?.reduce((max, t) => Math.max(max, t.rating || 0), 0) || 0
              const allComplete = session.tiles?.every(t => t.status === 'completed')
              const firstCompletedTile = session.tiles?.find(t => t.status === 'completed' && t.photos?.length > 0)
              const firstPhoto = firstCompletedTile?.photos?.[0]

              return (
                <button key={i} className={`result-tile ${allComplete ? 'completed' : 'pending'}`}
                  onClick={() => setSelectedResult(session)}>
                  {!allComplete ? (
                    <div className="result-tile-pending">
                      <div className="result-tile-icon">⏳</div>
                      <div className="result-tile-date">{session.date}</div>
                      <div className="result-tile-label">
                        {session.tiles?.length || 0} tile{session.tiles?.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  ) : (
                    <div className="result-tile-completed">
                      {firstPhoto ? (
                        <DriveImage fileId={firstPhoto.fileId}
                          accessToken={accessToken} alt="Test result" className="result-tile-photo" />
                      ) : (
                        <div className="result-tile-photo-placeholder">🏺</div>
                      )}
                      <div className="result-tile-date">{session.date}</div>
                      <StarDisplay value={bestRating} />
                    </div>
                  )}
                </button>
              )
            })}
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
          <StullChart al2o3={stull.x} sio2={stull.y} zone={stull.zone} />
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