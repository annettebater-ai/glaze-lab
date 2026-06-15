import { useState } from 'react'
import {
  Page,
  Card,
  Text,
  Button,
  ButtonGroup,
  Modal,
  TextField,
  Spinner,
} from '@shopify/polaris'
import { EditIcon, DeleteIcon } from '@shopify/polaris-icons'
import TestResultForm from './TestResultForm'

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

const STATUS_LABELS = { 'in-stock': 'In Stock', 'low': 'Low', 'used-up': 'Used Up' }

function getInventoryStatus(entry) {
  if (entry.isUsedUp) return 'used-up'
  if (entry.isLow) return 'low'
  return 'in-stock'
}

export default function TestsScreen({
  testResults,
  recipes,
  clayBodies,
  glazeInventory,
  onSaveTestResult,
  onDeleteTestResult,
  accessToken,
  photosFolderId,
}) {
  const [tab, setTab] = useState('start')
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editingResult, setEditingResult] = useState(null)
  const [selectedResult, setSelectedResult] = useState(null)
  const [startingTest, setStartingTest] = useState(null) // glaze inventory entry
  const [loadingLayering, setLoadingLayering] = useState(false)
  const [layeringSuggestion, setLayeringSuggestion] = useState('')

  const pendingCount = testResults.filter(r => r.status === 'pending').length
  const completedCount = testResults.filter(r => r.status === 'completed').length

  // Sort inventory most recent first, exclude used-up
  const availableGlazes = [...(glazeInventory || [])]
    .filter(e => !e.isUsedUp)
    .sort((a, b) => new Date(b.dateMixed) - new Date(a.dateMixed))

  const filteredTests = [...testResults]
    .filter(r => {
      if (tab === 'pending') return r.status === 'pending'
      if (tab === 'completed') return r.status === 'completed'
      return false
    })
    .filter(r => {
      if (!search) return true
      const s = search.toLowerCase()
      return (
        r.recipeName?.toLowerCase().includes(s) ||
        r.clayBody?.toLowerCase().includes(s) ||
        r.notesAfter?.toLowerCase().includes(s) ||
        r.notesBefore?.toLowerCase().includes(s)
      )
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  const getRecipe = (result) =>
    recipes?.find(r => r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === result.recipeSlug)

  const truncate = (str, len = 80) => {
    if (!str) return '—'
    return str.length > len ? str.slice(0, len) + '…' : str
  }

  const handleAskLayering = async (entry) => {
    setLoadingLayering(true)
    setLayeringSuggestion('')
    try {
      const recipe = recipes?.find(r => r.id === entry.recipeId)
      const isCommercial = entry.entryType === 'commercial'
      const otherGlazes = (glazeInventory || [])
        .filter(e => e.id !== entry.id && !e.isUsedUp)
        .slice(0, 8)
        .map(e => e.recipeName)

      const prompt = isCommercial
        ? `I'm about to fire test tiles with a commercial glaze: "${entry.recipeName}" by ${entry.brand || 'unknown brand'}, cone range ${entry.coneRange || 'unknown'}, colour: ${entry.colour || 'unknown'}.

Other glazes I have available: ${otherGlazes.join(', ')}

Suggest the best layering combinations and application order for test tiles. Which glazes to pair it with and how to apply them (which goes first, thickness, method). Be concise and practical — I'm about to load the kiln.`
        : `I'm about to fire test tiles with a glaze called "${entry.recipeName}"${recipe?.chemistry?.stull?.zone ? ` (${recipe.chemistry.stull.zone})` : ''}.

Other glazes I have available: ${otherGlazes.join(', ')}

Suggest the best layering combinations and application order for test tiles. Which glazes to pair it with, what order to apply them, and how thick. Be concise and practical — I'm about to load the kiln.`

      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const data = await response.json()
      setLayeringSuggestion(data.content?.[0]?.text || 'No suggestion returned.')
    } catch (err) {
      setLayeringSuggestion('Failed to get suggestion. Check your connection.')
    } finally {
      setLoadingLayering(false)
    }
  }

  // ── Edit view ──
  if (editingResult) {
    const recipe = getRecipe(editingResult) || { name: editingResult.recipeName }
    return (
      <Page title="Edit Test" backAction={{ content: 'Tests', onAction: () => setEditingResult(null) }}>
        <TestResultForm
          recipe={recipe}
          existingResult={editingResult}
          accessToken={accessToken}
          photosFolderId={photosFolderId}
          clayBodies={clayBodies}
          onSave={(result) => { onSaveTestResult(result); setEditingResult(null) }}
          onCancel={() => setEditingResult(null)}
          onDelete={(result) => { onDeleteTestResult(result); setEditingResult(null) }}
        />
      </Page>
    )
  }

  // ── Start test view ──
  if (startingTest) {
    const recipe = recipes?.find(r => r.id === startingTest.recipeId) || { name: startingTest.recipeName }
    return (
      <Page
        title={`New Test — ${startingTest.recipeName}`}
        backAction={{ content: 'Tests', onAction: () => { setStartingTest(null); setLayeringSuggestion('') } }}
      >
        <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>

          {/* Layering suggestion */}
          <Card>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: layeringSuggestion ? '12px' : '0'}}>
              <div>
                <Text variant="headingSm">Layering Suggestions</Text>
                <Text variant="bodySm" tone="subdued">Ask Sidekick for pairing and application order ideas</Text>
              </div>
              <button
                type="button"
                onClick={() => handleAskLayering(startingTest)}
                disabled={loadingLayering}
                style={{
                  padding: '8px 14px', background: '#1a1a1a', color: 'white', border: 'none',
                  borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                  cursor: loadingLayering ? 'not-allowed' : 'pointer',
                  opacity: loadingLayering ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                {loadingLayering ? <Spinner size="small" /> : '✦'}
                {loadingLayering ? 'Thinking...' : 'Ask Sidekick'}
              </button>
            </div>
            {layeringSuggestion && (
              <div style={{padding: '12px', background: '#f9f7f4', borderRadius: '8px', fontSize: '14px', color: '#333', lineHeight: 1.6, whiteSpace: 'pre-wrap'}}>
                {layeringSuggestion}
              </div>
            )}
          </Card>

          {/* Test form */}
          <TestResultForm
            recipe={recipe}
            accessToken={accessToken}
            photosFolderId={photosFolderId}
            clayBodies={clayBodies}
            onSave={(result) => {
              onSaveTestResult(result)
              setStartingTest(null)
              setLayeringSuggestion('')
              setTab('pending')
            }}
            onCancel={() => { setStartingTest(null); setLayeringSuggestion('') }}
          />
        </div>
      </Page>
    )
  }

  // ── Detail view ──
  if (selectedResult) {
    const firingLabel = FIRING_TYPE_LABELS[selectedResult.firingType] || selectedResult.firingType
    return (
      <Page title={selectedResult.recipeName} backAction={{ content: 'Tests', onAction: () => setSelectedResult(null) }}>
        <div className="recipe-detail">
          <div className="detail-title-block">
            <div className="detail-type-row">
              <div className="detail-type">Test · {selectedResult.date}</div>
              <div style={{display: 'flex', gap: '8px'}}>
                <button className="detail-mix-btn" style={{background: '#1a3a5c'}}
                  onClick={() => { setEditingResult(selectedResult); setSelectedResult(null) }}>
                  Edit
                </button>
                <button className="detail-mix-btn" style={{background: '#cc2200'}}
                  onClick={() => setDeleteTarget(selectedResult)}>
                  Delete
                </button>
              </div>
            </div>
            <h1 className="detail-name">{selectedResult.recipeName}</h1>
            <div className="detail-meta">
              {[selectedResult.clayBody, selectedResult.applicationMethod, selectedResult.thickness].filter(Boolean).join(' · ')}
            </div>
          </div>

          {selectedResult.status === 'completed' && selectedResult.rating > 0 && (
            <div className="detail-section">
              <div className="star-display">
                {[1,2,3,4,5].map(n => (
                  <span key={n} className={`star-icon ${n <= selectedResult.rating ? 'active' : ''}`}>★</span>
                ))}
              </div>
            </div>
          )}

          {selectedResult.layers?.length > 0 && (
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

          {selectedResult.preFirePhotos?.length > 0 && (
            <div className="detail-section">
              <h2 className="section-title">Pre-fire Photos</h2>
              <div className="result-photos-grid">
                {selectedResult.preFirePhotos.map((p, i) => (
                  accessToken && p.fileId ? (
                    <img key={i}
                      src={`https://www.googleapis.com/drive/v3/files/${p.fileId}?alt=media&access_token=${accessToken}`}
                      alt={p.name} className="result-photo-img" />
                  ) : null
                ))}
              </div>
            </div>
          )}

          {selectedResult.status === 'pending' && (
            <div className="detail-section">
              <div className="pending-badge">⏳ Awaiting firing</div>
              <div style={{marginTop: '12px'}}>
                <button onClick={() => { setEditingResult(selectedResult); setSelectedResult(null) }}
                  style={{padding: '9px 18px', background: '#1a7a1a', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'}}>
                  Add Post-fire Results
                </button>
              </div>
            </div>
          )}

          {selectedResult.status === 'completed' && (
            <>
              {selectedResult.firingType && (
                <div className="detail-section">
                  <h2 className="section-title">Firing</h2>
                  <p className="detail-notes">
                    {firingLabel}{selectedResult.coneReached ? ` · Cone ${selectedResult.coneReached}` : ''}
                  </p>
                </div>
              )}
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
              {selectedResult.photos?.length > 0 && (
                <div className="detail-section">
                  <h2 className="section-title">Post-fire Photos</h2>
                  <div className="result-photos-grid">
                    {selectedResult.photos.map((p, i) => (
                      accessToken && p.fileId ? (
                        <img key={i}
                          src={`https://www.googleapis.com/drive/v3/files/${p.fileId}?alt=media&access_token=${accessToken}`}
                          alt={p.name} className="result-photo-img" />
                      ) : null
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete test?"
          primaryAction={{ content: 'Delete', destructive: true, onAction: () => {
            onDeleteTestResult(deleteTarget); setDeleteTarget(null); setSelectedResult(null)
          }}}
          secondaryActions={[{ content: 'Cancel', onAction: () => setDeleteTarget(null) }]}>
          <Modal.Section><Text>This test result will be permanently deleted.</Text></Modal.Section>
        </Modal>
      </Page>
    )
  }

  // ── Main list view ──
  return (
    <Page title="Tests">
      <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>

        <div className="library-tabs">
          <button className={`library-tab ${tab === 'start' ? 'active' : ''}`} onClick={() => setTab('start')}>
            Start a Test
          </button>
          <button className={`library-tab ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
            Pending <span className="library-tab-count">{pendingCount}</span>
          </button>
          <button className={`library-tab ${tab === 'completed' ? 'active' : ''}`} onClick={() => setTab('completed')}>
            Completed <span className="library-tab-count">{completedCount}</span>
          </button>
        </div>

        {/* ── Start a Test tab ── */}
        {tab === 'start' && (
          <>
            {availableGlazes.length === 0 ? (
              <Card>
                <div style={{padding: '32px', textAlign: 'center'}}>
                  <Text tone="subdued">No glazes in inventory yet. Mix a batch or add a commercial glaze first.</Text>
                </div>
              </Card>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                {availableGlazes.map(entry => {
                  const isCommercial = entry.entryType === 'commercial'
                  const status = getInventoryStatus(entry)
                  return (
                    <div
                      key={entry.id}
                      onClick={() => { setStartingTest(entry); setLayeringSuggestion('') }}
                      style={{
                        background: 'white', borderRadius: '12px', padding: '16px',
                        border: '1px solid #e8e8e8', cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        transition: 'box-shadow 0.15s',
                      }}
                    >
                      <div style={{fontSize: '11px', color: '#2d6a9f', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: '4px'}}>
                        {isCommercial ? `Commercial${entry.brand ? ` · ${entry.brand}` : ''}` : `Mixed · ${entry.dateMixed}`}
                      </div>
                      <div style={{fontSize: '16px', fontWeight: 700, color: '#1a1a1a', marginBottom: '4px'}}>
                        {entry.recipeName}
                      </div>
                      <div style={{fontSize: '13px', color: '#888', marginBottom: '12px'}}>
                        {isCommercial
                          ? [entry.colour, entry.coneRange ? `Cone ${entry.coneRange}` : ''].filter(Boolean).join(' · ')
                          : [entry.batchSize ? `${entry.batchSize}${entry.batchUnit}` : ''].filter(Boolean).join(' · ')
                        }
                      </div>
                      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid #f0f0f0'}}>
                        <span style={{
                          fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.3px',
                          background: status === 'low' ? '#fff8e1' : '#d4edda',
                          color: status === 'low' ? '#aa7700' : '#155724',
                        }}>
                          {STATUS_LABELS[status]}
                        </span>
                        <span style={{fontSize: '13px', color: '#1a3a5c', fontWeight: 600}}>
                          Test this glaze →
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── Pending / Completed tabs ── */}
        {(tab === 'pending' || tab === 'completed') && (
          <>
            <Card>
              <TextField label="Search" labelHidden placeholder="Search by recipe, clay body, or notes..."
                value={search} onChange={setSearch} autoComplete="off"
                clearButton onClearButtonClick={() => setSearch('')} />
            </Card>

            {filteredTests.length === 0 ? (
              <Card>
                <div style={{padding: '32px', textAlign: 'center'}}>
                  <Text tone="subdued">
                    {search ? 'No tests match your search.'
                      : tab === 'pending' ? 'No tests awaiting firing. Start a test from the first tab.'
                      : 'No completed tests yet.'}
                  </Text>
                </div>
              </Card>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                {filteredTests.map(result => {
                  const firingLabel = FIRING_TYPE_LABELS[result.firingType] || result.firingType
                  return (
                    <div key={result.id} className="recipe-card" onClick={() => setSelectedResult(result)} style={{cursor: 'pointer'}}>
                      <div className="recipe-card-top">
                        <div className="recipe-card-left">
                          <div className="recipe-card-type">{result.date}</div>
                          <div className="recipe-card-name">{result.recipeName}</div>
                          <div className="recipe-card-meta">
                            {[result.clayBody, result.applicationMethod].filter(Boolean).join(' · ')}
                          </div>
                          {result.status === 'completed' && firingLabel && (
                            <div className="recipe-card-meta" style={{marginTop: '2px', color: '#1a3a5c'}}>
                              {firingLabel}{result.coneReached ? ` · Cone ${result.coneReached}` : ''}
                            </div>
                          )}
                        </div>
                        <div className="recipe-card-right">
                          {result.status === 'completed' && result.rating > 0 && (
                            <div style={{fontSize: '13px', color: '#f0a500'}}>
                              {'★'.repeat(result.rating)}{'☆'.repeat(5 - result.rating)}
                            </div>
                          )}
                          <div onClick={e => e.stopPropagation()}>
                            <ButtonGroup gap="tight">
                              <Button icon={EditIcon} variant="plain" tone="base"
                                accessibilityLabel="Edit" onClick={() => setEditingResult(result)} />
                              <Button icon={DeleteIcon} variant="plain" tone="critical"
                                accessibilityLabel="Delete" onClick={() => setDeleteTarget(result)} />
                            </ButtonGroup>
                          </div>
                        </div>
                      </div>
                      {(result.notesAfter || result.notesBefore) && (
                        <div className="recipe-card-chem">
                          {truncate(result.notesAfter || result.notesBefore)}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

      </div>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete test?"
        primaryAction={{ content: 'Delete', destructive: true, onAction: () => {
          onDeleteTestResult(deleteTarget); setDeleteTarget(null)
        }}}
        secondaryActions={[{ content: 'Cancel', onAction: () => setDeleteTarget(null) }]}>
        <Modal.Section><Text>This test result will be permanently deleted.</Text></Modal.Section>
      </Modal>
    </Page>
  )
}