import { useState } from 'react'
import {
  Page,
  Card,
  Text,
  Button,
  ButtonGroup,
  Modal,
  TextField,
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

export default function TestsScreen({
  testResults,
  recipes,
  clayBodies,
  onSaveTestResult,
  onDeleteTestResult,
  accessToken,
  photosFolderId,
}) {
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('pending')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editingResult, setEditingResult] = useState(null)
  const [selectedResult, setSelectedResult] = useState(null)

  const filtered = [...testResults]
    .filter(r => r.status === tab)
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

  const pendingCount = testResults.filter(r => r.status === 'pending').length
  const completedCount = testResults.filter(r => r.status === 'completed').length

  const getRecipe = (result) =>
    recipes?.find(r => r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === result.recipeSlug)

  const truncate = (str, len = 80) => {
    if (!str) return '—'
    return str.length > len ? str.slice(0, len) + '…' : str
  }

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

  return (
    <Page title="Tests">
      <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>

        <div className="library-tabs">
          <button className={`library-tab ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
            Pending <span className="library-tab-count">{pendingCount}</span>
          </button>
          <button className={`library-tab ${tab === 'completed' ? 'active' : ''}`} onClick={() => setTab('completed')}>
            Completed <span className="library-tab-count">{completedCount}</span>
          </button>
        </div>

        <Card>
          <TextField label="Search" labelHidden placeholder="Search by recipe, clay body, or notes..."
            value={search} onChange={setSearch} autoComplete="off"
            clearButton onClearButtonClick={() => setSearch('')} />
        </Card>

        {filtered.length === 0 ? (
          <Card>
            <div style={{padding: '32px', textAlign: 'center'}}>
              <Text tone="subdued">
                {search ? 'No tests match your search.'
                  : tab === 'pending' ? 'No tests awaiting firing. Open a recipe to add a test.'
                  : 'No completed tests yet.'}
              </Text>
            </div>
          </Card>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
            {filtered.map(result => {
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