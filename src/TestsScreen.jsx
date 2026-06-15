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

function TileDetail({ tile, index, accessToken }) {
  const firingLabel = FIRING_TYPE_LABELS[tile.firingType] || tile.firingType
  return (
    <div style={{border: '2px solid #e8e8e8', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px'}}>
      <div style={{background: '#1a1a1a', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px'}}>
        <div style={{width: '22px', height: '22px', borderRadius: '50%', background: '#c8a96e', color: '#1a1a1a', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          {index + 1}
        </div>
        <Text variant="bodySm" fontWeight="semibold" tone="textInverse">Tile {index + 1}</Text>
        <span style={{marginLeft: 'auto', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '8px',
          background: tile.status === 'completed' ? '#d4edda' : '#fff3cd',
          color: tile.status === 'completed' ? '#155724' : '#856404'}}>
          {tile.status === 'completed' ? 'Complete' : 'Pending'}
        </span>
      </div>
      <div style={{padding: '14px 16px', background: 'white'}}>
        <div style={{fontSize: '13px', color: '#888', marginBottom: '10px'}}>
          {[tile.clayBody, tile.applicationMethod, tile.thickness].filter(Boolean).join(' · ')}
        </div>

        {tile.layers?.length > 0 && (
          <div style={{marginBottom: '10px'}}>
            <div style={{fontSize: '11px', fontWeight: 700, color: '#1a3a5c', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px'}}>Layering</div>
            {tile.layers.map((l, i) => (
              <div key={i} style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#555', padding: '2px 0'}}>
                <span style={{width: '16px', height: '16px', borderRadius: '50%', background: '#1a3a5c', color: 'white', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>{i + 1}</span>
                <span style={{fontWeight: 500}}>{l.type}</span>
                <span style={{color: '#888'}}>— {l.recipe}</span>
              </div>
            ))}
          </div>
        )}

        {tile.notesBefore && (
          <div style={{marginBottom: '10px'}}>
            <div style={{fontSize: '11px', fontWeight: 700, color: '#1a3a5c', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px'}}>Notes Before</div>
            <p style={{margin: 0, fontSize: '13px', color: '#555'}}>{tile.notesBefore}</p>
          </div>
        )}

        {tile.preFirePhotos?.length > 0 && (
          <div style={{marginBottom: '10px'}}>
            <div style={{fontSize: '11px', fontWeight: 700, color: '#1a3a5c', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px'}}>Pre-fire Photos</div>
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
          <div style={{padding: '8px 0', color: '#888', fontStyle: 'italic', fontSize: '13px'}}>⏳ Awaiting firing</div>
        )}

        {tile.status === 'completed' && (
          <>
            {tile.rating > 0 && (
              <div className="star-display" style={{marginBottom: '8px'}}>
                {[1,2,3,4,5].map(n => (
                  <span key={n} className={`star-icon ${n <= tile.rating ? 'active' : ''}`}>★</span>
                ))}
              </div>
            )}
            {firingLabel && (
              <div style={{marginBottom: '8px'}}>
                <div style={{fontSize: '11px', fontWeight: 700, color: '#1a3a5c', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px'}}>Firing</div>
                <p style={{margin: 0, fontSize: '13px', color: '#555'}}>{firingLabel}{tile.coneReached ? ` · Cone ${tile.coneReached}` : ''}</p>
              </div>
            )}
            {tile.notesAfter && (
              <div style={{marginBottom: '8px'}}>
                <div style={{fontSize: '11px', fontWeight: 700, color: '#1a3a5c', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px'}}>Outcome</div>
                <p style={{margin: 0, fontSize: '13px', color: '#555'}}>{tile.notesAfter}</p>
              </div>
            )}
            {tile.nextSteps && (
              <div style={{marginBottom: '8px'}}>
                <div style={{fontSize: '11px', fontWeight: 700, color: '#1a3a5c', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px'}}>What To Try Next</div>
                <p style={{margin: 0, fontSize: '13px', color: '#555'}}>{tile.nextSteps}</p>
              </div>
            )}
            {tile.photos?.length > 0 && (
              <div>
                <div style={{fontSize: '11px', fontWeight: 700, color: '#1a3a5c', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px'}}>Post-fire Photos</div>
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
  const [startingTest, setStartingTest] = useState(null)
  const [loadingLayering, setLoadingLayering] = useState(false)
  const [layeringSuggestion, setLayeringSuggestion] = useState('')

  const pendingCount = testResults.filter(r => r.status === 'pending' || r.status === 'partial').length
  const completedCount = testResults.filter(r => r.status === 'completed').length

  const availableGlazes = [...(glazeInventory || [])]
    .filter(e => !e.isUsedUp)
    .sort((a, b) => new Date(b.dateMixed) - new Date(a.dateMixed))

  const filteredTests = [...testResults]
    .filter(r => {
      if (tab === 'pending') return r.status === 'pending' || r.status === 'partial'
      if (tab === 'completed') return r.status === 'completed'
      return false
    })
    .filter(r => {
      if (!search) return true
      const s = search.toLowerCase()
      return r.recipeName?.toLowerCase().includes(s)
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))

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

Suggest the best layering combinations and application order for test tiles. Which glazes to pair it with and how to apply them. Be concise and practical.`
        : `I'm about to fire test tiles with a glaze called "${entry.recipeName}"${recipe?.chemistry?.stull?.zone ? ` (${recipe.chemistry.stull.zone})` : ''}.

Other glazes I have available: ${otherGlazes.join(', ')}

Suggest the best layering combinations and application order for test tiles. Which glazes to pair, what order, and how thick. Be concise and practical.`

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
    const recipe = recipes?.find(r =>
      r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === editingResult.recipeSlug
    ) || { name: editingResult.recipeName }
    return (
      <Page title="Edit Test Session" backAction={{ content: 'Tests', onAction: () => setEditingResult(null) }}>
        <TestResultForm
          recipe={recipe}
          existingSession={editingResult}
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
          <TestResultForm
            recipe={recipe}
            accessToken={accessToken}
            photosFolderId={photosFolderId}
            clayBodies={clayBodies}
            layeringSuggestion={layeringSuggestion}
            onAskLayering={() => handleAskLayering(startingTest)}
            loadingLayering={loadingLayering}
            onSave={(result) => {
              result.inventoryId = startingTest.id
              result.inventoryName = startingTest.recipeName
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
    const allComplete = selectedResult.tiles?.every(t => t.status === 'completed')
    const pendingTiles = selectedResult.tiles?.filter(t => t.status === 'pending').length || 0
    return (
      <Page title={selectedResult.recipeName} backAction={{ content: 'Tests', onAction: () => setSelectedResult(null) }}>
        <div className="recipe-detail">
          <div className="detail-title-block">
            <div className="detail-type-row">
              <div className="detail-type">Test Session · {selectedResult.date}</div>
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
              {selectedResult.tiles?.length || 0} tile{selectedResult.tiles?.length !== 1 ? 's' : ''}
              {pendingTiles > 0 ? ` · ${pendingTiles} pending` : ' · all complete'}
            </div>
          </div>

          <div style={{padding: '12px 16px'}}>
            {selectedResult.tiles?.map((tile, i) => (
              <TileDetail key={tile.id} tile={tile} index={i} accessToken={accessToken} />
            ))}
            {selectedResult.notes && (
              <div style={{background: 'white', borderRadius: '8px', padding: '14px 16px', marginTop: '4px', border: '1px solid #e8e8e8'}}>
                <div style={{fontSize: '11px', fontWeight: 700, color: '#1a3a5c', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px'}}>Session Notes</div>
                <p style={{margin: 0, fontSize: '14px', color: '#555'}}>{selectedResult.notes}</p>
              </div>
            )}
          </div>
        </div>

        <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete test session?"
          primaryAction={{ content: 'Delete', destructive: true, onAction: () => {
            onDeleteTestResult(deleteTarget); setDeleteTarget(null); setSelectedResult(null)
          }}}
          secondaryActions={[{ content: 'Cancel', onAction: () => setDeleteTarget(null) }]}>
          <Modal.Section><Text>This test session will be permanently deleted.</Text></Modal.Section>
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

        {tab === 'start' && (
          <>
            {availableGlazes.length === 0 ? (
              <Card>
                <div style={{padding: '32px', textAlign: 'center'}}>
                  <Text tone="subdued">No glazes in inventory. Mix a batch or add a commercial glaze first.</Text>
                </div>
              </Card>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                {availableGlazes.map(entry => {
                  const isCommercial = entry.entryType === 'commercial'
                  const status = getInventoryStatus(entry)
                  return (
                    <div key={entry.id} onClick={() => { setStartingTest(entry); setLayeringSuggestion('') }}
                      style={{background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #e8e8e8', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)'}}>
                      <div style={{fontSize: '11px', color: '#2d6a9f', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: '4px'}}>
                        {isCommercial ? `Commercial${entry.brand ? ` · ${entry.brand}` : ''}` : `Mixed · ${entry.dateMixed}`}
                      </div>
                      <div style={{fontSize: '16px', fontWeight: 700, color: '#1a1a1a', marginBottom: '4px'}}>{entry.recipeName}</div>
                      <div style={{fontSize: '13px', color: '#888', marginBottom: '12px'}}>
                        {isCommercial
                          ? [entry.colour, entry.coneRange ? `Cone ${entry.coneRange}` : ''].filter(Boolean).join(' · ')
                          : [entry.batchSize ? `${entry.batchSize}${entry.batchUnit}` : ''].filter(Boolean).join(' · ')
                        }
                      </div>
                      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid #f0f0f0'}}>
                        <span style={{fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.3px',
                          background: status === 'low' ? '#fff8e1' : '#d4edda',
                          color: status === 'low' ? '#aa7700' : '#155724'}}>
                          {STATUS_LABELS[status]}
                        </span>
                        <span style={{fontSize: '13px', color: '#1a3a5c', fontWeight: 600}}>Test this glaze →</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {(tab === 'pending' || tab === 'completed') && (
          <>
            <Card>
              <TextField label="Search" labelHidden placeholder="Search by recipe name..."
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
                  const completedTiles = result.tiles?.filter(t => t.status === 'completed').length || 0
                  const totalTiles = result.tiles?.length || 0
                  const bestRating = result.tiles?.reduce((max, t) => Math.max(max, t.rating || 0), 0) || 0
                  return (
                    <div key={result.id} className="recipe-card" onClick={() => setSelectedResult(result)} style={{cursor: 'pointer'}}>
                      <div className="recipe-card-top">
                        <div className="recipe-card-left">
                          <div className="recipe-card-type">{result.date}</div>
                          <div className="recipe-card-name">{result.recipeName}</div>
                          <div className="recipe-card-meta">
                            {totalTiles} tile{totalTiles !== 1 ? 's' : ''}
                            {tab === 'pending' ? ` · ${completedTiles}/${totalTiles} complete` : ''}
                          </div>
                        </div>
                        <div className="recipe-card-right">
                          {bestRating > 0 && (
                            <div style={{fontSize: '13px', color: '#f0a500'}}>
                              {'★'.repeat(bestRating)}{'☆'.repeat(5 - bestRating)}
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
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

      </div>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete test session?"
        primaryAction={{ content: 'Delete', destructive: true, onAction: () => {
          onDeleteTestResult(deleteTarget); setDeleteTarget(null)
        }}}
        secondaryActions={[{ content: 'Cancel', onAction: () => setDeleteTarget(null) }]}>
        <Modal.Section><Text>This test session will be permanently deleted.</Text></Modal.Section>
      </Modal>
    </Page>
  )
}