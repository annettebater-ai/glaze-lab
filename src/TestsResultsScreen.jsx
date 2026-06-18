import { useState } from 'react'
import {
  Page,
  Card,
  Text,
  TextField,
  Modal,
} from '@shopify/polaris'
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
            {tile.rating > 0 && (
              <div className="star-display" style={{justifyContent: 'flex-start', marginBottom: '6px'}}>
                {[1,2,3,4,5].map(n => (
                  <span key={n} className={`star-icon ${n <= tile.rating ? 'active' : ''}`}>★</span>
                ))}
              </div>
            )}
            {firingLabel && (
              <div style={{marginBottom: '6px'}}>
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
  const [search, setSearch] = useState('')
  const [selectedSession, setSelectedSession] = useState(null)
  const [editingSession, setEditingSession] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [addingTest, setAddingTest] = useState(false)
  const [selectedGlaze, setSelectedGlaze] = useState(null)
  const [loadingLayering, setLoadingLayering] = useState(false)
  const [layeringSuggestion, setLayeringSuggestion] = useState('')

  const sorted = [...testResults]
    .filter(r => {
      if (!search) return true
      return r.recipeName?.toLowerCase().includes(search.toLowerCase())
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  const availableGlazes = [...(glazeInventory || [])]
    .filter(e => !e.isUsedUp)
    .sort((a, b) => new Date(b.dateMixed) - new Date(a.dateMixed))

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
        ? `I'm about to fire test tiles with a commercial glaze: "${entry.recipeName}" by ${entry.brand || 'unknown brand'}, cone range ${entry.coneRange || 'unknown'}.
Other glazes available: ${otherGlazes.join(', ')}
Suggest layering combinations and application order. Be concise and practical.`
        : `I'm about to fire test tiles with "${entry.recipeName}"${recipe?.chemistry?.stull?.zone ? ` (${recipe.chemistry.stull.zone})` : ''}.
Other glazes available: ${otherGlazes.join(', ')}
Suggest layering combinations and application order. Be concise and practical.`

      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const data = await response.json()
      setLayeringSuggestion(data.content?.[0]?.text || 'No suggestion returned.')
    } catch (err) {
      setLayeringSuggestion('Failed to get suggestion.')
    } finally {
      setLoadingLayering(false)
    }
  }

  // ── Edit session ──
  if (editingSession) {
    const recipe = recipes?.find(r =>
      r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === editingSession.recipeSlug
    ) || { name: editingSession.recipeName }
    return (
      <Page title="Edit Test Session" backAction={{ content: 'Test Results', onAction: () => setEditingSession(null) }}>
        <TestResultForm
          recipe={recipe}
          existingSession={editingSession}
          accessToken={accessToken}
          photosFolderId={photosFolderId}
          clayBodies={clayBodies}
          onSave={(result) => { onSaveTestResult(result); setEditingSession(null) }}
          onCancel={() => setEditingSession(null)}
          onDelete={(result) => { onDeleteTestResult(result); setEditingSession(null) }}
        />
      </Page>
    )
  }

  // ── New test: glaze picker ──
  if (addingTest && !selectedGlaze) {
    return (
      <Page title="Start a Test" backAction={{ content: 'Test Results', onAction: () => setAddingTest(false) }}>
        <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
          <Text tone="subdued">Select a glaze from your inventory:</Text>
          {availableGlazes.length === 0 ? (
            <Card>
              <div style={{padding: '32px', textAlign: 'center'}}>
                <Text tone="subdued">No glazes in inventory. Mix a batch or add a commercial glaze first.</Text>
              </div>
            </Card>
          ) : (
            <Card padding="0">
              <div>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 120px 100px', padding: '10px 16px', borderBottom: '1px solid #f0f0f0', background: '#fafafa'}}>
                  <Text variant="bodySm" fontWeight="semibold" tone="subdued">Name</Text>
                  <Text variant="bodySm" fontWeight="semibold" tone="subdued">Type</Text>
                  <Text variant="bodySm" fontWeight="semibold" tone="subdued">Date</Text>
                </div>
                {availableGlazes.map((entry, index) => {
                  const isCommercial = entry.entryType === 'commercial'
                  return (
                    <div key={entry.id}
                      onClick={() => { setSelectedGlaze(entry); setLayeringSuggestion('') }}
                      style={{
                        display: 'grid', gridTemplateColumns: '1fr 120px 100px',
                        padding: '12px 16px',
                        borderBottom: index < availableGlazes.length - 1 ? '1px solid #f5f5f5' : 'none',
                        cursor: 'pointer', background: 'white',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    >
                      <div>
                        <div style={{fontSize: '14px', fontWeight: 600, color: '#1a1a1a'}}>{entry.recipeName}</div>
                        {isCommercial && entry.brand && <div style={{fontSize: '12px', color: '#888'}}>{entry.brand}</div>}
                        {!isCommercial && entry.batchSize > 0 && <div style={{fontSize: '12px', color: '#888'}}>{entry.batchSize}{entry.batchUnit}</div>}
                      </div>
                      <div style={{display: 'flex', alignItems: 'center'}}>
                        <span style={{fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '8px',
                          background: isCommercial ? '#e8f0fe' : '#f0f0f0',
                          color: isCommercial ? '#1a3a5c' : '#555'}}>
                          {isCommercial ? 'Commercial' : 'Mixed'}
                        </span>
                      </div>
                      <div style={{display: 'flex', alignItems: 'center'}}>
                        <Text variant="bodySm" tone="subdued">
                          {isCommercial ? (entry.coneRange ? `Cone ${entry.coneRange}` : '—') : (entry.dateMixed || '—')}
                        </Text>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
        </div>
      </Page>
    )
  }

  // ── New test: form ──
  if (addingTest && selectedGlaze) {
    const recipe = recipes?.find(r => r.id === selectedGlaze.recipeId) || { name: selectedGlaze.recipeName }
    return (
      <Page
        title={`New Test — ${selectedGlaze.recipeName}`}
        backAction={{ content: 'Select Glaze', onAction: () => { setSelectedGlaze(null); setLayeringSuggestion('') } }}
      >
        <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
          <TestResultForm
            recipe={recipe}
            accessToken={accessToken}
            photosFolderId={photosFolderId}
            clayBodies={clayBodies}
            layeringSuggestion={layeringSuggestion}
            onAskLayering={() => handleAskLayering(selectedGlaze)}
            loadingLayering={loadingLayering}
            onSave={(result) => {
              result.inventoryId = selectedGlaze.id
              result.inventoryName = selectedGlaze.recipeName
              onSaveTestResult(result)
              setAddingTest(false)
              setSelectedGlaze(null)
              setLayeringSuggestion('')
            }}
            onCancel={() => { setAddingTest(false); setSelectedGlaze(null); setLayeringSuggestion('') }}
          />
        </div>
      </Page>
    )
  }

  // ── Session detail ──
  if (selectedSession) {
    const totalTiles = selectedSession.tiles?.length || 0
    const completedTiles = selectedSession.tiles?.filter(t => t.status === 'completed').length || 0
    const bestRating = selectedSession.tiles?.reduce((max, t) => Math.max(max, t.rating || 0), 0) || 0

    return (
      <Page title={selectedSession.recipeName} backAction={{ content: 'Test Results', onAction: () => setSelectedSession(null) }}>
        <div className="recipe-detail">
          <div className="detail-title-block">
            <div className="detail-type-row">
              <div className="detail-type">Test Session · {selectedSession.date}</div>
              <div style={{display: 'flex', gap: '8px'}}>
                <button className="detail-mix-btn" style={{background: '#1a3a5c'}}
                  onClick={() => { setEditingSession(selectedSession); setSelectedSession(null) }}>
                  Edit
                </button>
                <button className="detail-mix-btn" style={{background: '#cc2200'}}
                  onClick={() => setDeleteTarget(selectedSession)}>
                  Delete
                </button>
              </div>
            </div>
            <h1 className="detail-name">{selectedSession.recipeName}</h1>
            <div className="detail-meta">
              {totalTiles} tile{totalTiles !== 1 ? 's' : ''} · {completedTiles}/{totalTiles} complete
            </div>
          </div>

          {bestRating > 0 && (
            <div className="detail-section">
              <div className="star-display">
                {[1,2,3,4,5].map(n => (
                  <span key={n} className={`star-icon ${n <= bestRating ? 'active' : ''}`}>★</span>
                ))}
              </div>
            </div>
          )}

          <div style={{padding: '0 16px'}}>
            {selectedSession.tiles?.map((tile, i) => (
              <TileDetail key={tile.id || i} tile={tile} index={i} accessToken={accessToken} />
            ))}
            {selectedSession.notes && (
              <div style={{padding: '12px', background: '#f9f7f4', borderRadius: '8px', marginTop: '4px'}}>
                <div style={{fontSize: '10px', fontWeight: 700, color: '#1a3a5c', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px'}}>Session Notes</div>
                <p style={{margin: 0, fontSize: '13px', color: '#555'}}>{selectedSession.notes}</p>
              </div>
            )}
          </div>
        </div>

        <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete test session?"
          primaryAction={{ content: 'Delete', destructive: true, onAction: () => {
            onDeleteTestResult(deleteTarget); setDeleteTarget(null); setSelectedSession(null)
          }}}
          secondaryActions={[{ content: 'Cancel', onAction: () => setDeleteTarget(null) }]}>
          <Modal.Section><Text>This test session will be permanently deleted.</Text></Modal.Section>
        </Modal>
      </Page>
    )
  }

  // ── Main list ──
  return (
    <Page title="Test Results"
      primaryAction={{ content: 'Add New Test', onAction: () => setAddingTest(true) }}>
      <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>

        <Card>
          <TextField label="Search" labelHidden placeholder="Search by glaze name..."
            value={search} onChange={setSearch} autoComplete="off"
            clearButton onClearButtonClick={() => setSearch('')} />
        </Card>

        {sorted.length === 0 ? (
          <Card>
            <div style={{padding: '32px', textAlign: 'center'}}>
              <Text tone="subdued">
                {search ? 'No test results match your search.' : 'No test results yet. Add a test to get started.'}
              </Text>
            </div>
          </Card>
        ) : (
          <Card padding="0">
            <div>
              <div style={{display: 'grid', gridTemplateColumns: '56px 1fr 110px 80px 70px', padding: '10px 16px', borderBottom: '1px solid #f0f0f0', background: '#fafafa'}}>
                <div />
                <Text variant="bodySm" fontWeight="semibold" tone="subdued">Glaze</Text>
                <Text variant="bodySm" fontWeight="semibold" tone="subdued">Date</Text>
                <Text variant="bodySm" fontWeight="semibold" tone="subdued">Status</Text>
                <Text variant="bodySm" fontWeight="semibold" tone="subdued">Rating</Text>
              </div>
              {sorted.map((session, index) => {
                const allComplete = session.tiles?.every(t => t.status === 'completed')
                const anyComplete = session.tiles?.some(t => t.status === 'completed')
                const bestRating = session.tiles?.reduce((max, t) => Math.max(max, t.rating || 0), 0) || 0
                const firstPhoto = session.tiles?.find(t => t.photos?.length > 0)?.photos?.[0]
                const totalTiles = session.tiles?.length || 0

                return (
                  <div key={session.id}
                    onClick={() => setSelectedSession(session)}
                    style={{
                      display: 'grid', gridTemplateColumns: '56px 1fr 110px 80px 70px',
                      padding: '10px 16px', alignItems: 'center',
                      borderBottom: index < sorted.length - 1 ? '1px solid #f5f5f5' : 'none',
                      cursor: 'pointer', background: 'white',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  >
                    <div style={{width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', background: '#f0ede8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
                      {firstPhoto && accessToken ? (
                        <img src={`https://www.googleapis.com/drive/v3/files/${firstPhoto.fileId}?alt=media&access_token=${accessToken}`}
                          alt="tile" style={{width: '100%', height: '100%', objectFit: 'cover'}}
                          onError={e => { e.target.style.display = 'none' }} />
                      ) : (
                        <span style={{fontSize: '18px'}}>🏺</span>
                      )}
                    </div>
                    <div>
                      <div style={{fontSize: '14px', fontWeight: 600, color: '#1a1a1a'}}>{session.recipeName}</div>
                      <div style={{fontSize: '12px', color: '#888'}}>{totalTiles} tile{totalTiles !== 1 ? 's' : ''}</div>
                    </div>
                    <Text variant="bodySm" tone="subdued">{session.date}</Text>
                    <div>
                      <span style={{
                        fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '8px', textTransform: 'uppercase',
                        background: allComplete ? '#d4edda' : anyComplete ? '#e8f0fe' : '#fff3cd',
                        color: allComplete ? '#155724' : anyComplete ? '#1a3a5c' : '#856404',
                      }}>
                        {allComplete ? 'Complete' : anyComplete ? 'Partial' : 'Pending'}
                      </span>
                    </div>
                    <div style={{fontSize: '13px', color: '#f0a500'}}>
                      {bestRating > 0 ? '★'.repeat(bestRating) : '—'}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
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