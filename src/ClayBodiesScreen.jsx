import { useState } from 'react'
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Select,
  Modal,
  Badge,
  Spinner,
  Tabs,
} from '@shopify/polaris'
import { clayBodyToMarkdown } from './clayBodies'
import {
  DEFAULT_OBJECT_TYPES,
  calcSurfaceArea,
  sqInToCm2,
  inToCm,
  groupByCategory,
} from './objectTypes'
import './ClayBodiesScreen.css'

const ATMOSPHERES = [
  { label: 'Oxidation', value: 'oxidation' },
  { label: 'Reduction', value: 'reduction' },
  { label: 'Neutral', value: 'neutral' },
  { label: 'Soda', value: 'soda' },
  { label: 'Wood', value: 'wood' },
]

const CATEGORIES = ['Mug', 'Cup', 'Bowl', 'Plate', 'Vase', 'Other']

// ── Clay Body Form ────────────────────────────────────────────

function ClayBodyForm({ existing, onSave, onCancel }) {
  const [manufacturer, setManufacturer] = useState(existing?.manufacturer || '')
  const [name, setName] = useState(existing?.name || '')
  const [cone, setCone] = useState(existing?.cone || '')
  const [atmosphere, setAtmosphere] = useState(existing?.atmosphere || 'oxidation')
  const [thermalExpansion, setThermalExpansion] = useState(
    existing?.thermalExpansion ? String(existing.thermalExpansion) : ''
  )
  const [silica, setSilica] = useState(existing?.silica ? String(existing.silica) : '')
  const [alumina, setAlumina] = useState(existing?.alumina ? String(existing.alumina) : '')
  const [flux, setFlux] = useState(existing?.flux ? String(existing.flux) : '')
  const [notes, setNotes] = useState(existing?.notes || '')
  const [chemistryNotes, setChemistryNotes] = useState(existing?.chemistryNotes || '')
  const [chemistrySource, setChemistrySource] = useState(existing?.chemistrySource || 'manual')
  const [chemistryVerified, setChemistryVerified] = useState(existing?.chemistryVerified || false)
  const [lookingUp, setLookingUp] = useState(false)
  const [lookupError, setLookupError] = useState('')

  const handleLookup = async () => {
    const lookupName = [manufacturer, name].filter(Boolean).join(' ')
    if (!lookupName.trim()) { alert('Enter a manufacturer and/or clay body name first'); return }
    setLookingUp(true)
    setLookupError('')
    try {
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You are a ceramic materials expert. When given a clay body name, look up its known chemistry and physical properties. Respond ONLY with this JSON format, no markdown, no preamble:
{
  "found": true,
  "thermalExpansion": 5.5,
  "silica": 65.2,
  "alumina": 18.4,
  "flux": 16.4,
  "cone": "6-10",
  "atmosphere": "oxidation",
  "chemistryNotes": "Brief note about the source and any caveats",
  "confidence": "high|medium|low"
}
If not found or uncertain, respond with: {"found": false, "message": "reason"}
Thermal expansion should be the COE x 10^-6. Silica, alumina, flux are weight percentages.`,
          messages: [{ role: 'user', content: `Look up the chemistry for: ${lookupName}` }]
        })
      })
      const data = await response.json()
      const raw = data.content?.[0]?.text || ''
      let parsed
      try { parsed = JSON.parse(raw) } catch { parsed = { found: false, message: 'Could not parse response' } }

      if (parsed.found) {
        if (parsed.thermalExpansion) setThermalExpansion(String(parsed.thermalExpansion))
        if (parsed.silica) setSilica(String(parsed.silica))
        if (parsed.alumina) setAlumina(String(parsed.alumina))
        if (parsed.flux) setFlux(String(parsed.flux))
        if (parsed.cone && !cone) setCone(parsed.cone)
        if (parsed.atmosphere) setAtmosphere(parsed.atmosphere)
        if (parsed.chemistryNotes) setChemistryNotes(parsed.chemistryNotes)
        setChemistrySource('sidekick')
        setChemistryVerified(parsed.confidence === 'high')
      } else {
        setLookupError(parsed.message || 'Could not find chemistry data for this clay body.')
      }
    } catch (err) {
      setLookupError('Lookup failed. Check your connection.')
    } finally {
      setLookingUp(false)
    }
  }

  const handleSave = () => {
    if (!name.trim()) { alert('Please enter a clay body name'); return }
    onSave({
      ...(existing || {}),
      name: name.trim(),
      manufacturer: manufacturer.trim(),
      cone,
      atmosphere,
      thermalExpansion: thermalExpansion ? parseFloat(thermalExpansion) : null,
      silica: silica ? parseFloat(silica) : null,
      alumina: alumina ? parseFloat(alumina) : null,
      flux: flux ? parseFloat(flux) : null,
      notes: notes.trim(),
      chemistryNotes: chemistryNotes.trim(),
      chemistrySource,
      chemistryVerified,
      id: existing?.id || Date.now().toString(),
      created: existing?.created || new Date().toISOString().split('T')[0],
    })
  }

  return (
    <div className="clay-body-form">
      <BlockStack gap="400">
        <Card>
          <BlockStack gap="300">
            <Text variant="headingSm">Clay Body</Text>
            <TextField
              label="Manufacturer"
              placeholder="e.g. Plainsman, Scarva, PSH"
              value={manufacturer}
              onChange={setManufacturer}
              autoComplete="off"
            />
            <TextField
              label="Clay Body Name"
              placeholder="e.g. Dark Granite, M340, ES50"
              value={name}
              onChange={setName}
              autoComplete="off"
            />
            <InlineStack gap="300">
              <div style={{flex: 1}}>
                <TextField
                  label="Cone range"
                  placeholder="e.g. 6, 6-10"
                  value={cone}
                  onChange={setCone}
                  autoComplete="off"
                />
              </div>
              <div style={{flex: 1}}>
                <Select
                  label="Atmosphere"
                  options={ATMOSPHERES}
                  value={atmosphere}
                  onChange={setAtmosphere}
                />
              </div>
            </InlineStack>
            <TextField
              label="Notes (optional)"
              value={notes}
              onChange={setNotes}
              multiline={2}
              autoComplete="off"
            />
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              <div>
                <Text variant="headingSm">Chemistry</Text>
                <Text variant="bodySm" tone="subdued">Used for glaze compatibility warnings</Text>
              </div>
              <button
                type="button"
                onClick={handleLookup}
                disabled={lookingUp}
                style={{
                  padding: '8px 14px',
                  background: '#1a1a1a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: lookingUp ? 'not-allowed' : 'pointer',
                  opacity: lookingUp ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {lookingUp ? <Spinner size="small" /> : '✦'}
                {lookingUp ? 'Looking up...' : 'Look up with Sidekick'}
              </button>
            </InlineStack>

            {lookupError && (
              <div style={{padding: '10px 12px', background: '#fff0f0', borderRadius: '6px', fontSize: '13px', color: '#cc2200'}}>
                {lookupError}
              </div>
            )}

            {chemistrySource === 'sidekick' && (
              <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                <Badge tone={chemistryVerified ? 'success' : 'warning'}>
                  {chemistryVerified ? '✓ Sidekick — high confidence' : '~ Sidekick — estimated'}
                </Badge>
                <button
                  type="button"
                  onClick={() => setChemistrySource('manual')}
                  style={{background: 'none', border: 'none', fontSize: '12px', color: '#888', cursor: 'pointer', textDecoration: 'underline'}}
                >
                  Edit manually
                </button>
              </div>
            )}

            <InlineStack gap="300">
              <div style={{flex: 1}}>
                <TextField
                  label="Thermal expansion (COE)"
                  placeholder="e.g. 5.5"
                  value={thermalExpansion}
                  onChange={setThermalExpansion}
                  autoComplete="off"
                  helpText="×10⁻⁶/°C"
                />
              </div>
              <div style={{flex: 1}}>
                <TextField
                  label="Silica %"
                  placeholder="e.g. 65.2"
                  value={silica}
                  onChange={setSilica}
                  autoComplete="off"
                />
              </div>
            </InlineStack>
            <InlineStack gap="300">
              <div style={{flex: 1}}>
                <TextField
                  label="Alumina %"
                  placeholder="e.g. 18.4"
                  value={alumina}
                  onChange={setAlumina}
                  autoComplete="off"
                />
              </div>
              <div style={{flex: 1}}>
                <TextField
                  label="Flux %"
                  placeholder="e.g. 16.4"
                  value={flux}
                  onChange={setFlux}
                  autoComplete="off"
                />
              </div>
            </InlineStack>
            {chemistryNotes && (
              <div style={{padding: '10px 12px', background: '#f5f5f5', borderRadius: '6px', fontSize: '13px', color: '#555'}}>
                {chemistryNotes}
              </div>
            )}
          </BlockStack>
        </Card>

        <div style={{display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '8px 0 24px'}}>
          <button
            type="button"
            onClick={onCancel}
            style={{padding: '9px 18px', background: 'white', color: '#1a1a1a', border: '1px solid #c9cccf', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'}}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{padding: '9px 18px', background: '#1a3a5c', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'}}
          >
            {existing ? 'Save Changes' : 'Add Clay Body'}
          </button>
        </div>
      </BlockStack>
    </div>
  )
}

// ── Object Type Form ──────────────────────────────────────────

function ObjectTypeForm({ existing, onSave, onCancel }) {
  const [category, setCategory] = useState(existing?.category || 'Mug')
  const [variant, setVariant] = useState(existing?.variant || '')
  const [height, setHeight] = useState(existing ? String(existing.height) : '')
  const [maxDiameter, setMaxDiameter] = useState(existing ? String(existing.maxDiameter) : '')
  const [openingDiameter, setOpeningDiameter] = useState(existing ? String(existing.openingDiameter) : '')

  const handleSave = () => {
    if (!variant.trim()) { alert('Please enter a variant name'); return }
    if (!height || !maxDiameter || !openingDiameter) { alert('Please enter all dimensions'); return }
    onSave({
      ...(existing || {}),
      id: existing?.id || `${category.toLowerCase()}-${variant.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      category,
      variant: variant.trim(),
      height: parseFloat(height),
      maxDiameter: parseFloat(maxDiameter),
      openingDiameter: parseFloat(openingDiameter),
    })
  }

  const preview = height && maxDiameter && openingDiameter ? (() => {
    const obj = { height: parseFloat(height), maxDiameter: parseFloat(maxDiameter), openingDiameter: parseFloat(openingDiameter) }
    const area = calcSurfaceArea(obj)
    return { areaSqIn: area.toFixed(1), areaCm2: sqInToCm2(area).toFixed(0) }
  })() : null

  return (
    <div className="clay-body-form">
      <BlockStack gap="400">
        <Card>
          <BlockStack gap="300">
            <Text variant="headingSm">Object Type</Text>
            <Select
              label="Category"
              options={CATEGORIES.map(c => ({ label: c, value: c }))}
              value={category}
              onChange={setCategory}
            />
            <TextField
              label="Variant name"
              placeholder="e.g. SM, MD, LG, Espresso, Travel"
              value={variant}
              onChange={setVariant}
              autoComplete="off"
            />
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300">
            <Text variant="headingSm">Dimensions (inches)</Text>
            <InlineStack gap="300">
              <div style={{flex: 1}}>
                <TextField
                  label="Height"
                  type="number"
                  placeholder="e.g. 4"
                  value={height}
                  onChange={setHeight}
                  autoComplete="off"
                  helpText="inches"
                />
              </div>
              <div style={{flex: 1}}>
                <TextField
                  label="Max diameter"
                  type="number"
                  placeholder="e.g. 3.5"
                  value={maxDiameter}
                  onChange={setMaxDiameter}
                  autoComplete="off"
                  helpText="inches"
                />
              </div>
              <div style={{flex: 1}}>
                <TextField
                  label="Opening diameter"
                  type="number"
                  placeholder="e.g. 3"
                  value={openingDiameter}
                  onChange={setOpeningDiameter}
                  autoComplete="off"
                  helpText="inches"
                />
              </div>
            </InlineStack>
            {preview && (
              <div style={{padding: '10px 12px', background: '#f5f0e8', borderRadius: '6px', fontSize: '13px', color: '#555'}}>
                Estimated surface area: <strong>{preview.areaSqIn} in²</strong> ({preview.areaCm2} cm²)
              </div>
            )}
          </BlockStack>
        </Card>

        <div style={{display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '8px 0 24px'}}>
          <button
            type="button"
            onClick={onCancel}
            style={{padding: '9px 18px', background: 'white', color: '#1a1a1a', border: '1px solid #c9cccf', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'}}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{padding: '9px 18px', background: '#1a3a5c', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'}}
          >
            {existing ? 'Save Changes' : 'Add Object Type'}
          </button>
        </div>
      </BlockStack>
    </div>
  )
}

// ── Object Types Tab ──────────────────────────────────────────

function ObjectTypesTab({ objectTypes, onSave, onDelete }) {
  const [showForm, setShowForm] = useState(false)
  const [editingType, setEditingType] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const grouped = groupByCategory(objectTypes)

  if (showForm || editingType) {
    return (
      <div>
        <div style={{marginBottom: '16px'}}>
          <button
            type="button"
            onClick={() => { setShowForm(false); setEditingType(null) }}
            style={{background: 'none', border: 'none', fontSize: '14px', fontWeight: 500, color: '#1a3a5c', cursor: 'pointer'}}
          >
            ← Object Types
          </button>
        </div>
        <ObjectTypeForm
          existing={editingType || null}
          onSave={(obj) => {
            onSave(obj)
            setShowForm(false)
            setEditingType(null)
          }}
          onCancel={() => { setShowForm(false); setEditingType(null) }}
        />
      </div>
    )
  }

  return (
    <div>
      <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: '16px'}}>
        <button
          type="button"
          onClick={() => { setEditingType(null); setShowForm(true) }}
          style={{padding: '9px 18px', background: '#1a3a5c', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'}}
        >
          Add Object Type
        </button>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <Card>
          <Text tone="subdued">No object types yet.</Text>
        </Card>
      ) : (
        <BlockStack gap="300">
          {Object.entries(grouped).map(([category, items]) => (
            <Card key={category} padding="0">
              <div style={{padding: '12px 16px', borderBottom: '1px solid #f0f0f0', background: '#f9f7f4'}}>
                <Text variant="headingSm">{category}</Text>
              </div>
              {items.map((obj, i) => {
                const area = calcSurfaceArea(obj)
                const isExpanded = expandedId === obj.id
                return (
                  <div
                    key={obj.id}
                    style={{borderBottom: i < items.length - 1 ? '1px solid #f0f0f0' : 'none'}}
                  >
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px'}}>
                      <div style={{flex: 1}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                          <span style={{fontSize: '14px', fontWeight: 600}}>{obj.variant}</span>
                          <span style={{fontSize: '12px', color: '#888'}}>
                            {obj.height}" H × {obj.maxDiameter}" ⌀
                          </span>
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : obj.id)}
                            style={{background: 'none', border: 'none', fontSize: '11px', color: '#1a3a5c', cursor: 'pointer', textDecoration: 'underline'}}
                          >
                            {isExpanded ? 'less' : 'details'}
                          </button>
                        </div>
                        {isExpanded && (
                          <div style={{marginTop: '8px', fontSize: '12px', color: '#555', background: '#f9f7f4', padding: '8px 12px', borderRadius: '6px'}}>
                            <div>Height: {obj.height}" ({inToCm(obj.height).toFixed(1)} cm)</div>
                            <div>Max diameter: {obj.maxDiameter}" ({inToCm(obj.maxDiameter).toFixed(1)} cm)</div>
                            <div>Opening: {obj.openingDiameter}" ({inToCm(obj.openingDiameter).toFixed(1)} cm)</div>
                            <div style={{marginTop: '4px', fontWeight: 600}}>
                              Surface area: {area.toFixed(1)} in² ({sqInToCm2(area).toFixed(0)} cm²)
                            </div>
                          </div>
                        )}
                      </div>
                      <div style={{display: 'flex', gap: '8px', flexShrink: 0}}>
                        <button
                          type="button"
                          className="clay-body-action-btn"
                          onClick={() => setEditingType(obj)}
                        >Edit</button>
                        <button
                          type="button"
                          className="clay-body-action-btn danger"
                          onClick={() => setDeleteTarget(obj)}
                        >Delete</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </Card>
          ))}
        </BlockStack>
      )}

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete object type?"
        primaryAction={{
          content: 'Delete',
          destructive: true,
          onAction: () => {
            onDelete(deleteTarget)
            setDeleteTarget(null)
          }
        }}
        secondaryActions={[{ content: 'Cancel', onAction: () => setDeleteTarget(null) }]}
      >
        <Modal.Section>
          <Text>Delete {deleteTarget?.category} {deleteTarget?.variant}? This cannot be undone.</Text>
        </Modal.Section>
      </Modal>
    </div>
  )
}

// ── Main Screen ───────────────────────────────────────────────

export default function ClayBodiesScreen({ clayBodies, onSaveClayBody, onDeleteClayBody, objectTypes, onSaveObjectType, onDeleteObjectType }) {
  const [selectedTab, setSelectedTab] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editingClayBody, setEditingClayBody] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [search, setSearch] = useState('')

  const tabs = [
    { id: 'clay-bodies', content: 'Clay Bodies' },
    { id: 'object-types', content: 'Object Types' },
  ]

  const filtered = clayBodies
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.manufacturer?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))

  const handleSave = (clayBody) => {
    onSaveClayBody(clayBody)
    setShowForm(false)
    setEditingClayBody(null)
  }

  if (showForm || editingClayBody) {
    return (
      <Page
        title={editingClayBody ? 'Edit Clay Body' : 'Add Clay Body'}
        backAction={{
          content: 'Clay Bodies',
          onAction: () => { setShowForm(false); setEditingClayBody(null) }
        }}
      >
        <ClayBodyForm
          existing={editingClayBody || null}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingClayBody(null) }}
        />
      </Page>
    )
  }

  return (
    <Page
      title="Clay Bodies"
      primaryAction={selectedTab === 0 ? {
        content: 'Add Clay Body',
        onAction: () => { setEditingClayBody(null); setShowForm(true) }
      } : undefined}
    >
      <BlockStack gap="400">
        <Card padding="0">
          <Tabs
            tabs={tabs}
            selected={selectedTab}
            onSelect={setSelectedTab}
          />
        </Card>

        {selectedTab === 0 && (
          <BlockStack gap="400">
            <Card>
              <TextField
                label="Search"
                labelHidden
                placeholder="Search clay bodies..."
                value={search}
                onChange={setSearch}
                autoComplete="off"
                clearButton
                onClearButtonClick={() => setSearch('')}
              />
            </Card>

            {filtered.length === 0 ? (
              <Card>
                <Text tone="subdued">
                  {search ? 'No clay bodies match your search.' : 'No clay bodies yet. Add your first clay body to enable compatibility warnings.'}
                </Text>
              </Card>
            ) : (
              <Card padding="0">
                {filtered.map((cb, i) => (
                  <div
                    key={cb.id}
                    className={`clay-body-row ${i < filtered.length - 1 ? 'with-border' : ''}`}
                  >
                    <div className="clay-body-row-left">
                      <div className="clay-body-row-name">
                        {cb.manufacturer && <span className="clay-body-manufacturer">{cb.manufacturer}</span>}
                        {cb.manufacturer && cb.name && <span style={{color: '#ccc', margin: '0 4px'}}>·</span>}
                        {cb.name}
                        {cb.chemistrySource === 'sidekick' && (
                          <span style={{marginLeft: '8px'}}>
                            <Badge tone={cb.chemistryVerified ? 'success' : 'warning'}>
                              {cb.chemistryVerified ? 'Chemistry verified' : 'Chemistry estimated'}
                            </Badge>
                          </span>
                        )}
                      </div>
                      <div className="clay-body-row-meta">
                        {[cb.cone ? `Cone ${cb.cone}` : null, cb.atmosphere].filter(Boolean).join(' · ')}
                      </div>
                      {cb.thermalExpansion && (
                        <div className="clay-body-row-coe">COE: {cb.thermalExpansion} ×10⁻⁶</div>
                      )}
                    </div>
                    <div className="clay-body-row-actions">
                      <button type="button" className="clay-body-action-btn" onClick={() => setEditingClayBody(cb)}>Edit</button>
                      <button type="button" className="clay-body-action-btn danger" onClick={() => setDeleteTarget(cb)}>Delete</button>
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </BlockStack>
        )}

        {selectedTab === 1 && (
          <ObjectTypesTab
            objectTypes={objectTypes || DEFAULT_OBJECT_TYPES}
            onSave={onSaveObjectType}
            onDelete={onDeleteObjectType}
          />
        )}
      </BlockStack>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete clay body?"
        primaryAction={{
          content: 'Delete',
          destructive: true,
          onAction: () => { onDeleteClayBody(deleteTarget); setDeleteTarget(null) }
        }}
        secondaryActions={[{ content: 'Cancel', onAction: () => setDeleteTarget(null) }]}
      >
        <Modal.Section>
          <Text>Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.</Text>
        </Modal.Section>
      </Modal>
    </Page>
  )
}