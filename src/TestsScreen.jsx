import { useState } from 'react'
import {
  Page,
  Card,
  IndexTable,
  Text,
  Badge,
  Button,
  ButtonGroup,
  Modal,
  TextField,
  useIndexResourceState,
} from '@shopify/polaris'
import { EditIcon, DeleteIcon } from '@shopify/polaris-icons'
import TestResultForm from './TestResultForm'

export default function TestsScreen({
  testResults,
  recipes,
  onSaveTestResult,
  onDeleteTestResult,
  accessToken,
  photosFolderId,
}) {
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editingResult, setEditingResult] = useState(null)
  const [selectedResult, setSelectedResult] = useState(null)

  const sorted = [...testResults]
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

  const resourceName = { singular: 'test', plural: 'tests' }
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(sorted)

  const getRecipe = (result) =>
    recipes?.find(r =>
      r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === result.recipeSlug
    )

  const truncate = (str, len = 60) => {
    if (!str) return '—'
    return str.length > len ? str.slice(0, len) + '…' : str
  }

  if (editingResult) {
    const recipe = getRecipe(editingResult) || { name: editingResult.recipeName }
    return (
      <Page
        title="Edit Test"
        backAction={{
          content: 'Tests',
          onAction: () => setEditingResult(null)
        }}
      >
        <TestResultForm
          recipe={recipe}
          existingResult={editingResult}
          accessToken={accessToken}
          photosFolderId={photosFolderId}
          onSave={(result) => {
            onSaveTestResult(result)
            setEditingResult(null)
          }}
          onCancel={() => setEditingResult(null)}
          onDelete={(result) => {
            onDeleteTestResult(result)
            setEditingResult(null)
          }}
        />
      </Page>
    )
  }

  if (selectedResult) {
    return (
      <Page
        title={selectedResult.recipeName}
        backAction={{
          content: 'Tests',
          onAction: () => setSelectedResult(null)
        }}
      >
        <div className="recipe-detail">
          <div className="detail-title-block">
            <div className="detail-type-row">
              <div className="detail-type">Test · {selectedResult.date}</div>
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
                  style={{background: '#cc2200'}}
                  onClick={() => setDeleteTarget(selectedResult)}
                >
                  Delete
                </button>
              </div>
            </div>
            <h1 className="detail-name">{selectedResult.recipeName}</h1>
            <div className="detail-meta">
              {[selectedResult.clayBody, selectedResult.applicationMethod, selectedResult.thickness]
                .filter(Boolean).join(' · ')}
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

        <Modal
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title="Delete test?"
          primaryAction={{
            content: 'Delete',
            destructive: true,
            onAction: () => {
              onDeleteTestResult(deleteTarget)
              setDeleteTarget(null)
              setSelectedResult(null)
            }
          }}
          secondaryActions={[{
            content: 'Cancel',
            onAction: () => setDeleteTarget(null)
          }]}
        >
          <Modal.Section>
            <Text>This test result will be permanently deleted and cannot be recovered.</Text>
          </Modal.Section>
        </Modal>
      </Page>
    )
  }

  return (
    <Page title="Tests">
      <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
        <Card>
          <TextField
            label="Search"
            labelHidden
            placeholder="Search by recipe, clay body, or notes..."
            value={search}
            onChange={setSearch}
            autoComplete="off"
            clearButton
            onClearButtonClick={() => setSearch('')}
          />
        </Card>

        <Card padding="0">
          <IndexTable
            resourceName={resourceName}
            itemCount={sorted.length}
            selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
            onSelectionChange={handleSelectionChange}
            headings={[
              { title: 'Recipe' },
              { title: 'Clay Body' },
              { title: 'Date' },
              { title: 'Status' },
              { title: 'Notes' },
              { title: 'Actions' },
            ]}
            emptyState={
              <div style={{padding: '40px', textAlign: 'center'}}>
                <Text tone="subdued">
                  {search ? 'No tests match your search.' : 'No tests yet. Open a recipe and add a result after firing.'}
                </Text>
              </div>
            }
          >
            {sorted.map((result, index) => (
              <IndexTable.Row
                id={result.id}
                key={result.id}
                selected={selectedResources.includes(result.id)}
                position={index}
                onClick={() => setSelectedResult(result)}
              >
                <IndexTable.Cell>
                  <Text variant="bodyMd" fontWeight="semibold">{result.recipeName}</Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Text variant="bodyMd" tone="subdued">{result.clayBody || '—'}</Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Text variant="bodyMd">{result.date}</Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  {result.status === 'pending' ? (
                    <Badge tone="warning">Pending</Badge>
                  ) : (
                    <Badge tone="success">Completed</Badge>
                  )}
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Text variant="bodyMd" tone="subdued">
                    {truncate(result.notesAfter || result.notesBefore)}
                  </Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <div onClick={e => e.stopPropagation()}>
                    <ButtonGroup gap="tight">
                      <Button
                        icon={EditIcon}
                        variant="plain"
                        tone="base"
                        accessibilityLabel="Edit test"
                        onClick={() => setEditingResult(result)}
                      />
                      <Button
                        icon={DeleteIcon}
                        variant="plain"
                        tone="critical"
                        accessibilityLabel="Delete test"
                        onClick={() => setDeleteTarget(result)}
                      />
                    </ButtonGroup>
                  </div>
                </IndexTable.Cell>
              </IndexTable.Row>
            ))}
          </IndexTable>
        </Card>
      </div>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete test?"
        primaryAction={{
          content: 'Delete',
          destructive: true,
          onAction: () => {
            onDeleteTestResult(deleteTarget)
            setDeleteTarget(null)
          }
        }}
        secondaryActions={[{
          content: 'Cancel',
          onAction: () => setDeleteTarget(null)
        }]}
      >
        <Modal.Section>
          <Text>This test result will be permanently deleted and cannot be recovered.</Text>
        </Modal.Section>
      </Modal>
    </Page>
  )
}