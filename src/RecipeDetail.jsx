import { useState } from 'react'
import { analyseRecipe } from './chemistry'
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

export default function RecipeDetail({ recipe, onBack, onStartMix }) {
  const [showStull, setShowStull] = useState(false)

  if (!recipe) return null

  const unity = recipe.chemistry?.unity || {}
  const ratios = recipe.chemistry?.ratios || {}
  const stull = recipe.chemistry?.stull || {}

  const fluxes = ['K2O','Na2O','Li2O','CaO','MgO','ZnO','BaO','SrO','MnO']
    .filter(ox => unity[ox] > 0.001)
  const amphoteric = ['Al2O3','B2O3']
    .filter(ox => unity[ox] > 0.001)
  const glassFormers = ['SiO2','TiO2','P2O5']
    .filter(ox => unity[ox] > 0.001)

  return (
    <div className="recipe-detail">

      {/* Header */}
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="detail-header-actions">
          <button className="mix-btn" onClick={() => onStartMix(recipe)}>
            ⚖️ Start Mixing
          </button>
        </div>
      </div>

      {/* Title block */}
      <div className="detail-title-block">
        <div className="detail-type">{recipe.recipeType}</div>
        <h1 className="detail-name">{recipe.name}</h1>
        <div className="detail-meta">
          Cone {recipe.cone} · {recipe.atmosphere} · 
          <span className={`detail-status ${recipe.status}`}> {recipe.status}</span>
        </div>
      </div>

      {/* Chemistry summary cards */}
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

      {/* Base ingredients */}
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
                <td className="ing-td">{ing.material}</td>
                <td className="ing-td ing-td-right">{ing.percent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Additives */}
      {recipe.additives && recipe.additives.length > 0 && (
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
              {recipe.additives.map((add, i) => (
                <tr key={i} className="ing-row">
                  <td className="ing-td">{add.material}</td>
                  <td className="ing-td ing-td-right">{add.percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* UMF */}
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
            <div className="stull-placeholder">
              Stull: Al₂O₃ {stull.x} / SiO₂ {stull.y} / Zone: {stull.zone}
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {recipe.notes && (
        <div className="detail-section">
          <h2 className="section-title">Notes</h2>
          <p className="detail-notes">{recipe.notes}</p>
        </div>
      )}

      {/* Mix button at bottom */}
      <div className="detail-mix-footer">
        <button className="mix-btn-large" onClick={() => onStartMix(recipe)}>
          ⚖️ Start Mixing Session
        </button>
      </div>

    </div>
  )
}