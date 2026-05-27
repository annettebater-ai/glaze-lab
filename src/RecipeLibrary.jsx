import { useState } from 'react'
import './RecipeLibrary.css'

const RECIPE_TYPES = ['All', 'Glaze', 'Underglaze', 'Engobe', 'Flashing Slip', 'Wash', 'Overglaze', 'Other']
const SORT_OPTIONS = [
  { id: 'recent', label: 'Most Recent' },
  { id: 'name', label: 'Name A–Z' },
  { id: 'favourites', label: 'Favourites First' },
  { id: 'tested', label: 'Most Tested' },
]
const STATUS_OPTIONS = ['All', 'testing', 'stable', 'retired']

export default function RecipeLibrary({ recipes, onNewRecipe, onSelectRecipe, onToggleFavourite }) {
  const [filterType, setFilterType] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterCone, setFilterCone] = useState('All')
  const [sortBy, setSortBy] = useState('recent')
  const [showFilters, setShowFilters] = useState(false)

  const cones = ['All', ...new Set(recipes.map(r => r.cone).filter(Boolean))]

  const filtered = recipes
    .filter(r => filterType === 'All' || r.recipeType === filterType)
    .filter(r => filterStatus === 'All' || r.status === filterStatus)
    .filter(r => filterCone === 'All' || r.cone === filterCone)
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'favourites') return (b.favourite ? 1 : 0) - (a.favourite ? 1 : 0)
      if (sortBy === 'tested') return (b.testCount || 0) - (a.testCount || 0)
      return new Date(b.created || 0) - new Date(a.created || 0)
    })

  const activeFilterCount = [
    filterType !== 'All',
    filterStatus !== 'All',
    filterCone !== 'All'
  ].filter(Boolean).length

  const stullZoneColor = (zone) => {
    if (zone === 'microcrystalline') return '#2d6a9f'
    if (zone === 'glossy') return '#1a7a1a'
    if (zone === 'matte') return '#aa7700'
    return '#888'
  }

  const foodSafetyColor = (rating) => {
    if (rating === 'excellent') return '#1a7a1a'
    if (rating === 'good') return '#2d7a2d'
    if (rating === 'acceptable') return '#aa7700'
    return '#aa2200'
  }

  return (
    <div className="recipe-library">

      {/* Header */}
      <div className="library-header">
        <div className="library-title-row">
          <h2 className="library-title">My Recipes</h2>
          <button className="new-recipe-btn" onClick={onNewRecipe}>+ New</button>
        </div>

        {/* Sort + Filter bar */}
        <div className="library-controls">
          <select
            className="sort-select"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            {SORT_OPTIONS.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          <button
            className={`filter-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="filter-panel">
            <div className="filter-group">
              <div className="filter-label">Type</div>
              <div className="filter-pills">
                {RECIPE_TYPES.map(t => (
                  <button
                    key={t}
                    className={`filter-pill ${filterType === t ? 'active' : ''}`}
                    onClick={() => setFilterType(t)}
                  >{t}</button>
                ))}
              </div>
            </div>
            <div className="filter-group">
              <div className="filter-label">Status</div>
              <div className="filter-pills">
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s}
                    className={`filter-pill ${filterStatus === s ? 'active' : ''}`}
                    onClick={() => setFilterStatus(s)}
                  >{s.charAt(0).toUpperCase() + s.slice(1)}</button>
                ))}
              </div>
            </div>
            <div className="filter-group">
              <div className="filter-label">Cone</div>
              <div className="filter-pills">
                {cones.map(c => (
                  <button
                    key={c}
                    className={`filter-pill ${filterCone === c ? 'active' : ''}`}
                    onClick={() => setFilterCone(c)}
                  >{c === 'All' ? 'All' : `Cone ${c}`}</button>
                ))}
              </div>
            </div>
            <button
              className="clear-filters-btn"
              onClick={() => { setFilterType('All'); setFilterStatus('All'); setFilterCone('All') }}
            >Clear Filters</button>
          </div>
        )}
      </div>

      {/* Recipe count */}
      <div className="recipe-count">
        {filtered.length} {filtered.length === 1 ? 'recipe' : 'recipes'}
        {activeFilterCount > 0 ? ' (filtered)' : ''}
      </div>

      {/* Recipe list */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>No recipes match your filters.</p>
        </div>
      ) : (
        <div className="recipe-list">
          {filtered.map(recipe => (
            <div
              key={recipe.id}
              className="recipe-card"
              onClick={() => onSelectRecipe(recipe)}
            >
              <div className="recipe-card-top">
                <div className="recipe-card-left">
                  <div className="recipe-card-type">{recipe.recipeType}</div>
                  <div className="recipe-card-name">{recipe.name}</div>
                  <div className="recipe-card-meta">
                    Cone {recipe.cone} · {recipe.atmosphere}
                  </div>
                </div>
                <div className="recipe-card-right">
                  <button
                    className={`favourite-btn ${recipe.favourite ? 'active' : ''}`}
                    onClick={e => { e.stopPropagation(); onToggleFavourite(recipe.id) }}
                  >★</button>
                  <div className={`status-badge ${recipe.status}`}>{recipe.status}</div>
                </div>
              </div>
              {recipe.chemistry && (
                <div className="recipe-card-chem">
                  <span style={{color: stullZoneColor(recipe.chemistry.stull.zone)}}>
                    {recipe.chemistry.stull.zone}
                  </span>
                  <span className="chem-dot">·</span>
                  <span style={{color: foodSafetyColor(recipe.chemistry.ratios.foodSafety)}}>
                    {recipe.chemistry.ratios.foodSafety}
                  </span>
                  <span className="chem-dot">·</span>
                  <span>Si/Al {recipe.chemistry.ratios.silicaAlumina}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}