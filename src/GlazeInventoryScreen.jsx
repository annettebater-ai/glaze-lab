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
  Spinner,
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
  return { isLow: status === 'low', isUsedUp: status === 'used-up' }
}

function CommercialGlazeForm({ existing, onSave, onCancel }) {
  const [name, setName] = useState(existing?.recipeName || '')
  const [brand, setBrand] = useState(existing?.brand || '')
  const [colour, setColour] = useState(existing?.colour || '')
  const [coneRange, setConeRange] = useState(existing?.coneRange || '')
  const [notes, setNotes] = useState(existing?.notes || '')
  const [errors, setErrors] = useState({})

  const handleSave = () => {
    const newErrors = {}
    if (!name.trim()) newErrors.name = 'Name is required'
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }
    onSave({
      ...(existing || {}),
      id: existing?.id || Date.now().toString(),
      entryType: 'commercial',
      recipeName: name,
      brand,
      colour,
      coneRange,
      notes,
      dateMixed: existing?.dateMixed || new Date().toISOString().split('T')[0],
      isLow: existing?.isLow || false,
      isUsedUp: existing?.isUsedUp || false,
      batchSize: 0,
      batchUnit: '',
      batchGrams: 0,
    })
  }

  return (
    <BlockStack gap="300">
      <TextField
        label="Product name"
        placeholder="e.g. Cobalt Blue Satin"
        value={name}
        onChange={val => { setName(val); if (errors.name) setErrors({}) }}
        error={errors.name}
        autoComplete="off"
      />
      <InlineStack gap="300">
        <div style={{flex: 1}}>
          <TextField
            label="Brand"
            placeholder="e.g. Amaco, Duncan"
            value={brand}
            onChange={setBrand}
            autoComplete="off"
          />
        </div>
        <div style={{flex: 1}}>
          <TextField
            label="Cone range"
            placeholder="e.g. 06-6"
            value={coneRange}
            onChange={setConeRange}
            autoComplete="off"
          />
        </div>
      </InlineStack>
      <TextField
        label="Colour description"
        placeholder="e.g. Deep cobalt, semi-matte"
        value={colour}
        onChange={setColour}
        autoComplete="off"
      />
      <TextField
        label="Notes"
        placeholder="Any notes about this glaze..."
        value={notes}
        onChange={setNotes}
        multiline={2}
        autoComplete="off"
      />
      <InlineStack gap="300" align="end">
        <button type="button" onClick={onCancel}
          style={{padding: '9px 18px', background: 'white', color: '#1a1a1a', border: '1px solid #c9cccf', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'}}>
          Cancel
        </button>
        <button type="button" onClick={handleSave}
          style={{padding: '9px 18px', background: '#1a3a5c', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'}}>
          {existing ? 'Save Changes' : 'Add to Inventory'}
        </button>
      </InlineStack>
    </BlockStack>
  )
}

function GlazeInventoryDetail({
  entry, recipe, testResults, recipes, accessToken, objectTypes,
  onUpdate, onDelete, onMixNew, onBack,
}) {
  const [status, setStatus] = useState(getStatus(entry))
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDipModal, setShowDipModal] = useState(false)
  const [layeringAdvice, setLayeringAdvice] = useState('')
  const [loadingLayering, setLoadingLayering] = useState(false)
  const [editing, setEditing] = useState(false)

  const allTypes = objectTypes || DEFAULT_OBJECT_TYPES
  const isCommercial = entry.entryType === 'commercial'

  const relevantResults = (testResults || [])
    .filter(r => r.recipeSlug === entry.recipeSlug && r.status === 'completed')
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  const bestRating = relevantResults.reduce((max, r) => Math.max(max, r.rating || 0), 0)
  const allPhotos = relevantResults.flatMap(r => r.photos || []).filter(p => p.fileId)
  const layeringResults = relevantResults.filter(r => r.layers && r.layers.length > 1)

  const costPerGram = entry.batchCost && entry.batchGrams ? entry.batchCost / entry.batchGrams : null
  const glazeDensity = entry.sg || 1.45
  const costPerMl = costPerGram ? costPerGram * glazeDensity : null
  const getDipCost = (obj) => {
    if (!costPerMl) return null
    return calcGlazeVolume(calcSurfaceArea(obj)) * costPerMl
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
        .map(r => ({ name: r.name, zone: r.chemistry?.stull?.zone }))

      const prompt = isCommercial
        ? `I have a commercial glaze: "${entry.recipeName}" by ${entry.brand || 'unknown brand'}, cone range ${entry.coneRange || 'unknown'}, colour: ${entry.colour || 'unknown'}.

My other glazes include: ${otherGlazes.map(g => g.name).join(', ')}

Suggest layering combinations and application order. Be concise and practical.`
        : `I have a glaze called "${entry.recipeName}" with chemistry zone: ${thisRecipe?.chemistry?.stull?.zone || 'unknown'}.

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

  if (editing && isCommercial) {
    return (
      <Page title="Edit Commercial Glaze" backAction={{ content: 'Glaze Inventory', onAction: () => setEditing(false) }}>
        <Card>
          <CommercialGlazeForm
            existing={entry}
            onSave={(updated) => { onUpdate(updated); setEditing(false) }}
            onCancel={() => setEditing(false)}
          />
        </Card>
      </Page>
    )
  }

  return (
    <Page title={entry.recipeName} backAction={{ content: 'Glaze Inventory', onAction: onBack }}>
      <BlockStack gap="400">

        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="start">
              <BlockStack gap="100">
                {isCommercial ? (
                  <>
                    <Badge tone="info">Commercial</Badge>
                    {entry.brand && <Text tone="subdued" variant="bodySm">{entry.brand}{entry.coneRange ? ` · Cone ${entry.coneRange}` : ''}</Text>}
                    {entry.colour && <Text tone="subdued" variant="bodySm">{entry.colour}</Text>}
                  </>
                ) : (
                  <Text tone="subdued" variant="bodySm">
                    Mixed {entry.dateMixed} · {entry.batchSize}{entry.batchUnit}
                    {entry.batchCost ? ` · $${entry.batchCost.toFixed(2)}` : ''}
                  </Text>
                )}
                {bestRating > 0 && (
                  <div className="star-display">
                    {[1,2,3,4,5].map(n => (
                      <span key={n} className={`star-icon ${n <= bestRating ? 'active' : ''}`}>★</span>
                    ))}
                  </div>
                )}
              </BlockStack>
              <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>
            </InlineStack>

            <div>
              <div style={{display: 'flex', gap: '6px'}}>
                {STATUS_OPTIONS.map(s => (
                  <button key={s} type="button" onClick={() => handleStatusChange(s)}
                    style={{
                      padding: '6px 12px', borderRadius: '6px',
                      border: `1px solid ${status === s ? '#1a3a5c' : '#c9cccf'}`,
                      background: status === s ? '#1a3a5c' : 'white',
                      color: status === s ? 'white' : '#616161',
                      fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                    }}>
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '1px solid #f0f0f0'}}>
              <div style={{display: 'flex', gap: '8px'}}>
                {!isCommercial && (
                  <button type="button" onClick={onMixNew}
                    style={{padding: '8px 16px', background: '#1a3a5c', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'}}>
                    Mix New Batch
                  </button>
                )}
                {isCommercial && (
                  <button type="button" onClick={() => setEditing(true)}
                    style={{padding: '8px 16px', background: '#1a3a5c', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'}}>
                    Edit
                  </button>
                )}
              </div>
              <button type="button" onClick={() => setShowDeleteModal(true)}
                style={{background: 'none', border: 'none', color: '#cc2200', fontSize: '13px', fontWeight: 500, cursor: 'pointer', textDecoration: 'underline'}}>
                Delete
              </button>
            </div>
          </BlockStack>
        </Card>

        {!isCommercial && (entry.batchCost || defaultDipCost) && (
          <Card>
            <BlockStack gap="300">
              <Text variant="headingSm">Cost</Text>
              {entry.batchCost && (
                <div style={{display: 'flex', justifyContent: 'space-between', padding: '4px 0'}}>
                  <Text tone="subdued">Batch cost</Text>
                  <Text fontWeight="semibold">${entry.batchCost.toFixed(2)}{entry.batchCostEstimated ? ' (est.)' : ''}</Text>
                </div>
              )}
              {defaultObj && defaultDipCost && (
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0'}}>
                  <Text tone="subdued">{defaultObj.category} {defaultObj.variant} per dip</Text>
                  <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <Text fontWeight="semibold">${defaultDipCost.toFixed(3)}</Text>
                    <button type="button" onClick={() => setShowDipModal(true)}
                      style={{background: 'none', border: 'none', color: '#1a3a5c', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline', padding: 0}}>
                      See more...
                    </button>
                  </div>
                </div>
              )}
            </BlockStack>
          </Card>
        )}

        {allPhotos.length > 0 && (
          <Card>
            <BlockStack gap="300">
              <Text variant="headingSm">Photos</Text>
              <div className="result-photos-grid">
                {allPhotos.slice(0, 6).map((p, i) => (
                  <DriveImage key={i} fileId={p.fileId} accessToken={accessToken} alt="Glaze result" className="result-photo-img" />
                ))}
              </div>
            </BlockStack>
          </Card>
        )}

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
                  {r.notesAfter && <p style={{margin: '6px 0 0', fontSize: '13px', color: '#888'}}>{r.notesAfter}</p>}
                </div>
              ))}
            </BlockStack>
          </Card>
        )}

        <Card>
          <BlockStack gap="300">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div>
                <Text variant="headingSm">Layering Compatibility</Text>
                <Text variant="bodySm" tone="subdued">Chemistry-based suggestions from Sidekick</Text>
              </div>
              <button type="button" onClick={handleAskLayering} disabled={loadingLayering}
                style={{padding: '8px 14px', background: '#1a1a1a', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: loadingLayering ? 'not-allowed' : 'pointer', opacity: loadingLayering ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '6px'}}>
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
                  {r.notesAfter && <p style={{margin: '4px 0 0', fontSize: '13px', color: '#888'}}>{r.notesAfter}</p>}
                </div>
              ))}
            </BlockStack>
          </Card>
        )}

      </BlockStack>

      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete from inventory?"
        primaryAction={{ content: 'Delete', destructive: true, onAction: () => { onDelete(entry); setShowDeleteModal(false) } }}
        secondaryActions={[{ content: 'Cancel', onAction: () => setShowDeleteModal(false) }]}>
        <Modal.Section>
          <Text>This will delete this entry from your glaze inventory.</Text>
        </Modal.Section>
      </Modal>

      <Modal open={showDipModal} onClose={() => setShowDipModal(false)} title="Per-Dip Cost by Object Type">
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
                    <div key={obj.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: isDefault ? '7px 8px' : '7px 0', borderBottom: '1px solid #f9f9f9', background: isDefault ? '#f5f0e8' : 'transparent', borderRadius: isDefault ? '4px' : '0'}}>
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
  glazeInventory, recipes, testResults, accessToken, objectTypes,
  onUpdateEntry, onDeleteEntry, onMixNew,
}) {
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showAddCommercial, setShowAddCommercial] = useState(false)
  const [tab, setTab] = useState('all')

  const filtered = [...glazeInventory]
    .filter(e => !search || e.recipeName?.toLowerCase().includes(search.toLowerCase()))
    .filter(e => {
      if (tab === 'mixed') return e.entryType !== 'commercial'
      if (tab === 'commercial') return e.entryType === 'commercial'
      return true
    })
    .sort((a, b) => {
      if (a.isUsedUp && !b.isUsedUp) return 1
      if (!a.isUsedUp && b.isUsedUp) return -1
      return new Date(b.dateMixed) - new Date(a.dateMixed)
    })

  const handleSaveCommercial = (entry) => {
    onUpdateEntry(entry)
    setShowAddCommercial(false)
  }

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
        onUpdate={(updated) => { onUpdateEntry(updated); setSelectedEntry(updated) }}
        onDelete={(entry) => { onDeleteEntry(entry); setSelectedEntry(null) }}
        onMixNew={() => { const r = recipes?.find(r => r.id === selectedEntry.recipeId); if (r) onMixNew(r) }}
        onBack={() => setSelectedEntry(null)}
      />
    )
  }

  return (
    <Page
      title="Glaze Inventory"
      primaryAction={{ content: 'Add Commercial Glaze', onAction: () => setShowAddCommercial(true) }}
    >
      <BlockStack gap="400">

        {showAddCommercial && (
          <Card>
            <BlockStack gap="300">
              <Text variant="headingSm">Add Commercial Glaze</Text>
              <CommercialGlazeForm
                onSave={handleSaveCommercial}
                onCancel={() => setShowAddCommercial(false)}
              />
            </BlockStack>
          </Card>
        )}

        <div className="library-tabs">
          <button className={`library-tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>
            All <span className="library-tab-count">{glazeInventory.length}</span>
          </button>
          <button className={`library-tab ${tab === 'mixed' ? 'active' : ''}`} onClick={() => setTab('mixed')}>
            Mixed <span className="library-tab-count">{glazeInventory.filter(e => e.entryType !== 'commercial').length}</span>
          </button>
          <button className={`library-tab ${tab === 'commercial' ? 'active' : ''}`} onClick={() => setTab('commercial')}>
            Commercial <span className="library-tab-count">{glazeInventory.filter(e => e.entryType === 'commercial').length}</span>
          </button>
        </div>

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

        {filtered.length === 0 ? (
          <Card>
            <div style={{padding: '32px', textAlign: 'center'}}>
              <Text tone="subdued">
                {search ? 'No glazes match your search.' : 'No glazes in inventory yet. Complete a mixing session or add a commercial glaze.'}
              </Text>
            </div>
          </Card>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
            {filtered.map(entry => {
              const status = getStatus(entry)
              const isCommercial = entry.entryType === 'commercial'
              return (
                <div
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid #e8e8e8',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
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
                      : [entry.batchSize ? `${entry.batchSize}${entry.batchUnit}` : '', entry.batchCost ? `$${entry.batchCost.toFixed(2)}` : ''].filter(Boolean).join(' · ')
                    }
                  </div>
                  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid #f0f0f0'}}>
                    <span style={{
                      fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.3px',
                      background: status === 'used-up' ? '#fff0f0' : status === 'low' ? '#fff8e1' : '#d4edda',
                      color: status === 'used-up' ? '#cc2200' : status === 'low' ? '#aa7700' : '#155724',
                    }}>
                      {STATUS_LABELS[status]}
                    </span>
                    {!isCommercial && entry.sg && !isNaN(Number(entry.sg)) && (
                      <span style={{fontSize: '12px', color: '#888'}}>SG {entry.sg}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </BlockStack>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete from inventory?"
        primaryAction={{ content: 'Delete', destructive: true, onAction: () => { onDeleteEntry(deleteTarget); setDeleteTarget(null) } }}
        secondaryActions={[{ content: 'Cancel', onAction: () => setDeleteTarget(null) }]}>
        <Modal.Section>
          <Text>This will delete this entry from your glaze inventory.</Text>
        </Modal.Section>
      </Modal>
    </Page>
  )
}