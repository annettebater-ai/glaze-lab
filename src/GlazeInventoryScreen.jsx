import { useState } from 'react'
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Modal,
  TextField,
  IndexTable,
  Spinner,
  useIndexResourceState,
} from '@shopify/polaris'
import DriveImage from './DriveImage'
import { calcSurfaceArea, calcGlazeVolume, groupByCategory, DEFAULT_OBJECT_TYPES } from './objectTypes'

const STATUS_OPTIONS = ['in-stock', 'low', 'used-up']
const STATUS_LABELS = { 'in-stock': 'In Stock', 'low': 'Low', 'used-up': 'Used Up' }
const STATUS_TONES = { 'in-stock': 'success', 'low': 'warning', 'used-up': 'critical' }

function getStatus(entry) {
  if (entry.isUsedUp) return 'used-up'
  if (entry.isLow) return 'low'
  return 'in-stock'
}

function statusToFlags(status) {
  return {
    isLow: status === 'low',
    isUsedUp: status === 'used-up'
  }
}

function StatusBadge({ entry }) {
  const status = getStatus(entry)
  return <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>
}

function InlineStatusSelect({ entry, onUpdate }) {
  const status = getStatus(entry)
  return (
    <select
      value={status}
      onChange={e => {
        e.stopPropagation()
        onUpdate({ ...entry, ...statusToFlags(e.target.value) })
      }}
      onClick={e => e.stopPropagation()}
      style={{
        fontSize: '12px',
        fontWeight: 600,
        padding: '3px 8px',
        borderRadius: '6px',
        border: '1px solid #c9cccf',
        background: 'white',
        cursor: 'pointer',
        color: status === 'used-up' ? '#cc2200' : status === 'low' ? '#aa7700' : '#1a7a1a',
      }}
    >
      {STATUS_OPTIONS.map(s => (
        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
      ))}
    </select>
  )
}

function GlazeInventoryDetail({
  entry,
  recipe,
  testResults,
  recipes,
  accessToken,
  objectTypes,
  onUpdate,
  onDelete,
  onMixNew,
  onBack,
}) {
  const [status, setStatus] = useState(getStatus(entry))
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDipModal, setShowDipModal] = useState(false)
  const [layeringAdvice, setLayeringAdvice] = useState('')
  const [loadingLayering, setLoadingLayering] = useState(false)

  const allTypes = objectTypes || DEFAULT_OBJECT_TYPES
  const recipeSlug = entry.recipeSlug

  const relevantResults = (testResults || [])
    .filter(r => r.recipeSlug === recipeSlug && r.status === 'completed')
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  const bestRating = relevantResults.reduce((max, r) => Math.max(max, r.rating || 0), 0)
  const allPhotos = relevantResults.flatMap(r => r.photos || []).filter(p => p.fileId)
  const layeringResults = relevantResults.filter(r => r.layers && r.layers.length > 1)

  const costPerGram = entry.batchCost && entry.batchGrams
    ? entry.batchCost / entry.batchGrams : null
  const glazeDensity = entry.sg || 1.45
  const costPerMl = costPerGram ? costPerGram * glazeDensity : null

  const getDipCost = (obj) => {
    if (!costPerMl) return null
    const area = calcSurfaceArea(obj)
    const volume = calcGlazeVolume(area)
    return volume * costPerMl
  }

  const defaultObj = allTypes.find(o => o.category === 'Mug' && o.variant === 'MD') || allTypes[0]
  const defaultDipCost = defaultObj ? getDipCost(defaultObj) : null
  const groupedTypes = groupByCategory(allTypes)

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus)
    onUpdate({ ...entry, ...statusToFlags(newStatus) })
  }

  const handleAskLayering = async () => {
    setLoadingLayering(true)
    setLayeringAdvice('')
    try {
      const thisRecipe = recipe || recipes?.find(r => r.id === entry.recipeId)
      const otherGlazes = (recipes || [])
        .filter(r => r.id !== entry.recipeId && r.chemistry)
        .slice(0, 6)
        .map(r => ({
          name: r.name,
          zone: r.chemistry?.stull?.zone,
          foodSafety: r.chemistry?.ratios?.foodSafety
        }))

      const prompt = `I have a glaze called "${entry.recipeName}" with chemistry:
Glaze type: ${thisRecipe?.chemistry?.stull?.zone || 'unknown'}
Food safety: ${thisRecipe?.chemistry?.ratios?.foodSafety || 'unknown'}
UMF: ${JSON.stringify(thisRecipe?.chemistry?.unity || {})}

My other glazes: ${otherGlazes.map(g => `${g.name} (${g.zone})`).join(', ')}

Suggest layering combinations and application order. What works well together and what to avoid? Be concise and practical.`

      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 600,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const data = await response.json()
      setLayeringAdvice(data.content?.[0]?.text || 'No advice returned.')
    } catch (err) {
      setLayeringAdvice('Failed to get layering advice. Check your connection.')
    } finally {
      setLoadingLayering(false)
    }
  }

  return (
    <Page
      title={entry.recipeName}
      backAction={{ content: 'Glaze Inventory', onAction: onBack }}
    >
      <BlockStack gap="400">

        {/* Summary card */}
        <Card>
          <BlockStack gap="400">

            {/* Meta + rating */}
            <InlineStack align="space-between" blockAlign="start">
              <BlockStack gap="100">
                <Text tone="subdued" variant="bodySm">
                  Mixed {entry.dateMixed} · {entry.batchSize}{entry.batchUnit}
                  {entry.batchCost ? ` · $${entry.batchCost.toFixed(2)}` : ''}
                </Text>
                {bestRating > 0 && (
                  <div className="star-display">
                    {[1,2,3,4,5].map(n => (
                      <span key={n} className={`star-icon ${n <= bestRating ? 'active' : ''}`}>★</span>
                    ))}
                  </div>
                )}
              </BlockStack>
              <StatusBadge entry={{isLow: status === 'low', isUsedUp: status === 'used-up'}} />
            </InlineStack>

            {/* Status toggle */}
            <div>
              <Text variant="bodySm" tone="subdued" as="p" style={{marginBottom: '8px'}}>Update status</Text>
              <div style={{display: 'flex', gap: '6px'}}>
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleStatusChange(s)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${status === s ? '#1a3a5c' : '#c9cccf'}`,
                      background: status === s ? '#1a3a5c' : 'white',
                      color: status === s ? 'white' : '#616161',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '1px solid #f0f0f0'}}>
              <button
                type="button"
                onClick={onMixNew}
                style={{padding: '8px 16px', background: '#1a3a5c', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'}}
              >
                Mix New Batch
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                style={{background: 'none', border: 'none', color: '#cc2200', fontSize: '13px', fontWeight: 500, cursor: 'pointer', textDecoration: 'underline'}}
              >
                Delete
              </button>
            </div>

          </BlockStack>
        </Card>

        {/* Cost */}
        {(entry.batchCost || defaultDipCost) && (
          <Card>
            <BlockStack gap="300">
              <Text variant="headingSm">Cost</Text>
              {entry.batchCost && (
                <div style={{display: 'flex', justifyContent: 'space-between', padding: '4px 0'}}>
                  <Text tone="subdued">Batch cost</Text>
                  <Text fontWeight="semibold">${entry.batchCost.toFixed(2)}{entry.batchCostEstimated ? ' (est.)' : ''}</Text>
                </div>
              )}
              {defaultObj && (
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0'}}>
                  <Text tone="subdued">{defaultObj.category} {defaultObj.variant} per dip</Text>
                  <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <Text fontWeight="semibold">{defaultDipCost ? `$${defaultDipCost.toFixed(3)}` : '—'}</Text>
                    <button
                      type="button"
                      onClick={() => setShowDipModal(true)}
                      style={{background: 'none', border: 'none', color: '#1a3a5c', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline', padding: 0}}
                    >
                      See more...
                    </button>
                  </div>
                </div>
              )}
            </BlockStack>
          </Card>
        )}

        {/* Photos */}
        {allPhotos.length > 0 && (
          <Card>
            <BlockStack gap="300">
              <Text variant="headingSm">Photos</Text>
              <div className="result-photos-grid">
                {allPhotos.slice(0, 6).map((p, i) => (
                  <DriveImage
                    key={i}
                    fileId={p.fileId}
                    accessToken={accessToken}
                    alt="Glaze result"
                    className="result-photo-img"
                  />
                ))}
              </div>
            </BlockStack>
          </Card>
        )}

        {/* Tested layering */}
        {layeringResults.length > 0 && (
          <Card>
            <BlockStack gap="300">
              <Text variant="headingSm">Tested Layering Combinations</Text>
              {layeringResults.map((r, i) => (
                <div key={i} style={{paddingBottom: '12px', borderBottom: i < layeringResults.length - 1 ? '1px solid #f0f0f0' : 'none'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '6px'}}>
                    <Text variant="bodySm" tone="subdued">{r.date} · {r.clayBody}</Text>
                    <div className="star-display" style={{fontSize: '11px'}}>
                      {[1,2,3,4,5].map(n => (
                        <span key={n} className={`star-icon ${n <= (r.rating || 0) ? 'active' : ''}`}>★</span>
                      ))}
                    </div>
                  </div>
                  {r.layers.map((l, li) => (
                    <div key={li} style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#555', padding: '2px 0'}}>
                      <span style={{width: '18px', height: '18px', borderRadius: '50%', background: '#1a3a5c', color: 'white', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>{li + 1}</span>
                      <span style={{fontWeight: 500}}>{l.type}</span>
                      <span style={{color: '#888'}}>— {l.recipe}</span>
                    </div>
                  ))}
                  {r.notesAfter && (
                    <p style={{margin: '6px 0 0', fontSize: '13px', color: '#888'}}>{r.notesAfter}</p>
                  )}
                </div>
              ))}
            </BlockStack>
          </Card>
        )}

        {/* Sidekick layering */}
        <Card>
          <BlockStack gap="300">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div>
                <Text variant="headingSm">Layering Compatibility</Text>
                <Text variant="bodySm" tone="subdued">Chemistry-based suggestions from Sidekick</Text>
              </div>
              <button
                type="button"
                onClick={handleAskLayering}
                disabled={loadingLayering}
                style={{
                  padding: '8px 14px',
                  background: '#1a1a1a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: loadingLayering ? 'not-allowed' : 'pointer',
                  opacity: loadingLayering ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {loadingLayering ? <Spinner size="small" /> : '✦'}
                {loadingLayering ? 'Thinking...' : 'Ask Sidekick'}
              </button>
            </div>
            {layeringAdvice && (
              <div style={{padding: '12px', background: '#f9f7f4', borderRadius: '8px', fontSize: '14px', color: '#333', lineHeight: 1.6, whiteSpace: 'pre-wrap'}}>
                {layeringAdvice}
              </div>
            )}
          </BlockStack>
        </Card>

        {/* Test results */}
        {relevantResults.length > 0 && (
          <Card>
            <BlockStack gap="300">
              <Text variant="headingSm">Test Results</Text>
              {relevantResults.map((r, i) => (
                <div key={i} style={{paddingBottom: '10px', borderBottom: i < relevantResults.length - 1 ? '1px solid #f0f0f0' : 'none'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div>
                      <Text variant="bodySm" fontWeight="semibold">{r.clayBody}</Text>
                      <Text variant="bodySm" tone="subdued">{r.date}</Text>
                    </div>
                    <div className="star-display" style={{fontSize: '12px'}}>
                      {[1,2,3,4,5].map(n => (
                        <span key={n} className={`star-icon ${n <= (r.rating || 0) ? 'active' : ''}`}>★</span>
                      ))}
                    </div>
                  </div>
                  {r.notesAfter && (
                    <p style={{margin: '4px 0 0', fontSize: '13px', color: '#888'}}>{r.notesAfter}</p>
                  )}
                </div>
              ))}
            </BlockStack>
          </Card>
        )}

      </BlockStack>

      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete from inventory?"
        primaryAction={{
          content: 'Delete',
          destructive: true,
          onAction: () => { onDelete(entry); setShowDeleteModal(false) }
        }}
        secondaryActions={[{ content: 'Cancel', onAction: () => setShowDeleteModal(false) }]}
      >
        <Modal.Section>
          <Text>This will delete this batch from your glaze inventory. The recipe will not be affected.</Text>
        </Modal.Section>
      </Modal>

      <Modal
        open={showDipModal}
        onClose={() => setShowDipModal(false)}
        title="Per-Dip Cost by Object Type"
      >
        <Modal.Section>
          <BlockStack gap="200">
            <Text tone="subdued" variant="bodySm">Based on SG {glazeDensity.toFixed(2)} · 0.5mm glaze layer</Text>
            {Object.entries(groupedTypes).map(([category, items]) => (
              <div key={category}>
                <div style={{padding: '8px 0 4px', fontSize: '11px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #f0f0f0', marginBottom: '4px'}}>
                  {category}
                </div>
                {items.map(obj => {
                  const dipCost = getDipCost(obj)
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
                      <span style={{fontSize: '14px', fontWeight: isDefault ? 700 : 400}}>
                        {obj.variant}
                        {isDefault && <span style={{fontSize: '11px', color: '#888', marginLeft: '6px'}}>default</span>}
                      </span>
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
    </Page>
  )
}

export default function GlazeInventoryScreen({
  glazeInventory,
  recipes,
  testResults,
  accessToken,
  objectTypes,
  onUpdateEntry,
  onDeleteEntry,
  onMixNew,
}) {
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const sorted = [...glazeInventory]
    .filter(e => !search || e.recipeName?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (a.isUsedUp && !b.isUsedUp) return 1
      if (!a.isUsedUp && b.isUsedUp) return -1
      if (a.isLow && !b.isLow) return 1
      if (!a.isLow && b.isLow) return -1
      return new Date(b.dateMixed) - new Date(a.dateMixed)
    })

  const resourceName = { singular: 'glaze', plural: 'glazes' }
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(sorted)

  if (selectedEntry) {
    const recipe = recipes?.find(r => r.id === selectedEntry.recipeId)
    return (
      <GlazeInventoryDetail
        entry={selectedEntry}
        recipe={recipe}
        recipes={recipes}
        testResults={testResults}
        accessToken={accessToken}
        objectTypes={objectTypes}
        onUpdate={(updated) => {
          onUpdateEntry(updated)
          setSelectedEntry(updated)
        }}
        onDelete={(entry) => {
          onDeleteEntry(entry)
          setSelectedEntry(null)
        }}
        onMixNew={() => {
          const recipe = recipes?.find(r => r.id === selectedEntry.recipeId)
          if (recipe) onMixNew(recipe)
        }}
        onBack={() => setSelectedEntry(null)}
      />
    )
  }

  return (
    <Page title="Glaze Inventory">
      <BlockStack gap="400">
        <Card>
          <TextField
            label="Search"
            labelHidden
            placeholder="Search glazes..."
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
              { title: 'Glaze' },
              { title: 'Date Mixed' },
              { title: 'Batch Size' },
              { title: 'Batch Cost' },
              { title: 'Status' },
              { title: '' },
            ]}
            emptyState={
              <div style={{padding: '40px', textAlign: 'center'}}>
                <Text tone="subdued">No glazes in inventory yet. Complete a mixing session to add one automatically.</Text>
              </div>
            }
          >
            {sorted.map((entry, index) => (
              <IndexTable.Row
                id={entry.id}
                key={entry.id}
                selected={selectedResources.includes(entry.id)}
                position={index}
                onClick={() => setSelectedEntry(entry)}
              >
                <IndexTable.Cell>
                  <Text variant="bodyMd" fontWeight="semibold">{entry.recipeName}</Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Text variant="bodyMd" tone="subdued">{entry.dateMixed}</Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Text variant="bodyMd">{entry.batchSize}{entry.batchUnit}</Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Text variant="bodyMd">
                    {entry.batchCost ? `$${entry.batchCost.toFixed(2)}${entry.batchCostEstimated ? ' (est.)' : ''}` : '—'}
                  </Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <div onClick={e => e.stopPropagation()}>
                    <InlineStatusSelect
                      entry={entry}
                      onUpdate={onUpdateEntry}
                    />
                  </div>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <div onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(entry)}
                      style={{background: 'none', border: 'none', color: '#cc2200', fontSize: '13px', cursor: 'pointer', fontWeight: 500}}
                    >
                      Delete
                    </button>
                  </div>
                </IndexTable.Cell>
              </IndexTable.Row>
            ))}
          </IndexTable>
        </Card>
      </BlockStack>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete from inventory?"
        primaryAction={{
          content: 'Delete',
          destructive: true,
          onAction: () => { onDeleteEntry(deleteTarget); setDeleteTarget(null) }
        }}
        secondaryActions={[{ content: 'Cancel', onAction: () => setDeleteTarget(null) }]}
      >
        <Modal.Section>
          <Text>This will delete this batch from your glaze inventory. The recipe will not be affected.</Text>
        </Modal.Section>
      </Modal>
    </Page>
  )
}