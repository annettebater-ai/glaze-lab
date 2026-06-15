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
} from '@shopify/polaris'
import { materialToMarkdown, getStockStatus, toGrams } from './materials'
import './MaterialsScreen.css'

const UNITS = [
  { label: 'grams (g)', value: 'g' },
  { label: 'kilograms (kg)', value: 'kg' },
  { label: 'pounds (lb)', value: 'lb' },
  { label: 'ounces (oz)', value: 'oz' },
]

const PRICE_UNITS = [
  { label: 'per kg', value: 'kg' },
  { label: 'per lb', value: 'lb' },
  { label: 'per oz', value: 'oz' },
  { label: 'per g', value: 'g' },
]

const STATUS_BADGE = {
  ok: null,
  low: <Badge tone="warning">Low</Badge>,
  out: <Badge tone="critical">Out</Badge>,
}

// Primary oxide contributions for common glaze materials
const MATERIAL_OXIDES = {
  // Feldspars
  'custer feldspar': 'K₂O·Al₂O₃·SiO₂',
  'custer': 'K₂O·Al₂O₃·SiO₂',
  'potash feldspar': 'K₂O·Al₂O₃·SiO₂',
  'g-200 feldspar': 'K₂O·Al₂O₃·SiO₂',
  'g200 feldspar': 'K₂O·Al₂O₃·SiO₂',
  'minspar': 'Na₂O·Al₂O₃·SiO₂',
  'minspar 200': 'Na₂O·Al₂O₃·SiO₂',
  'soda feldspar': 'Na₂O·Al₂O₃·SiO₂',
  'nepheline syenite': 'Na₂O·K₂O·Al₂O₃·SiO₂',
  'nepheline': 'Na₂O·K₂O·Al₂O₃·SiO₂',
  'cornwall stone': 'K₂O·Na₂O·Al₂O₃·SiO₂',
  // Silica sources
  'silica': 'SiO₂',
  'flint': 'SiO₂',
  'quartz': 'SiO₂',
  'silica 325': 'SiO₂',
  // Alumina sources
  'epk kaolin': 'Al₂O₃·SiO₂',
  'epk': 'Al₂O₃·SiO₂',
  'kaolin': 'Al₂O₃·SiO₂',
  'calcined kaolin': 'Al₂O₃·SiO₂',
  'om4 ball clay': 'Al₂O₃·SiO₂',
  'om4': 'Al₂O₃·SiO₂',
  'ball clay': 'Al₂O₃·SiO₂',
  'alumina hydrate': 'Al₂O₃',
  'calcined alumina': 'Al₂O₃',
  // Calcium sources
  'whiting': 'CaO',
  'calcium carbonate': 'CaO',
  'wollastonite': 'CaO·SiO₂',
  'dolomite': 'CaO·MgO',
  'talc': 'MgO·SiO₂',
  'limestone': 'CaO',
  // Magnesium
  'magnesium carbonate': 'MgO',
  'magnesite': 'MgO',
  // Zinc
  'zinc oxide': 'ZnO',
  'zinc': 'ZnO',
  // Barium
  'barium carbonate': 'BaO',
  'barium': 'BaO',
  // Strontium
  'strontium carbonate': 'SrO',
  // Boron sources
  'gerstley borate': 'B₂O₃·CaO',
  'gerstley': 'B₂O₃·CaO',
  'colemanite': 'B₂O₃·CaO',
  'ferro frit 3134': 'B₂O₃·CaO·Na₂O',
  'frit 3134': 'B₂O₃·CaO·Na₂O',
  'ferro frit 3124': 'B₂O₃·CaO·Al₂O₃',
  'frit 3124': 'B₂O₃·CaO·Al₂O₃',
  'ferro frit 3195': 'B₂O₃·CaO·MgO',
  'frit 3195': 'B₂O₃·CaO·MgO',
  'ulexite': 'B₂O₃·Na₂O·CaO',
  // Lithium
  'lithium carbonate': 'Li₂O',
  'lepidolite': 'Li₂O·Al₂O₃·SiO₂',
  'spodumene': 'Li₂O·Al₂O₃·SiO₂',
  // Colorants
  'cobalt carbonate': 'CoO',
  'cobalt oxide': 'CoO',
  'copper carbonate': 'CuO',
  'copper oxide': 'CuO',
  'red iron oxide': 'Fe₂O₃',
  'iron oxide': 'Fe₂O₃',
  'yellow iron oxide': 'Fe₂O₃',
  'black iron oxide': 'FeO',
  'manganese dioxide': 'MnO₂',
  'manganese carbonate': 'MnO',
  'rutile': 'TiO₂',
  'titanium dioxide': 'TiO₂',
  'tin oxide': 'SnO₂',
  'chrome oxide': 'Cr₂O₃',
  'nickel oxide': 'NiO',
  'nickel carbonate': 'NiO',
  'vanadium pentoxide': 'V₂O₅',
  'zircopax': 'ZrO₂·SiO₂',
  'zirconium silicate': 'ZrO₂·SiO₂',
  'superpax': 'ZrO₂·SiO₂',
  // Opacifiers / misc
  'bone ash': 'P₂O₅·CaO',
  'bentonite': 'Al₂O₃·SiO₂',
  'veegum': 'MgO·Al₂O₃·SiO₂',
  'cmc': 'binder',
  'red art clay': 'Fe₂O₃·Al₂O₃·SiO₂',
}

function getOxideSymbol(name) {
  if (!name) return null
  return MATERIAL_OXIDES[name.toLowerCase().trim()] || null
}

function MaterialForm({ existing, onSave, onCancel }) {
  const [name, setName] = useState(existing?.name || '')
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '')
  const [unit, setUnit] = useState(existing?.unit || 'g')
  const [isApproximate, setIsApproximate] = useState(existing?.isApproximate || false)
  const [price, setPrice] = useState(existing?.price ? String(existing.price) : '')
  const [priceUnit, setPriceUnit] = useState(existing?.priceUnit || 'kg')
  const [priceApproximate, setPriceApproximate] = useState(existing?.priceApproximate || false)
  const [notes, setNotes] = useState(existing?.notes || '')

  const oxideSymbol = getOxideSymbol(name)

  const handleSave = () => {
    if (!name.trim()) { alert('Please enter a material name'); return }
    if (!amount || isNaN(parseFloat(amount))) { alert('Please enter an amount'); return }
    const amt = parseFloat(amount)
    onSave({
      ...(existing || {}),
      name: name.trim(),
      amount: amt,
      startingAmount: existing ? existing.startingAmount : amt,
      unit,
      isApproximate,
      price: price ? parseFloat(price) : null,
      priceUnit,
      priceApproximate,
      notes: notes.trim(),
      id: existing?.id || Date.now().toString(),
      created: existing?.created || new Date().toISOString().split('T')[0],
    })
  }

  return (
    <div className="material-form">
      <BlockStack gap="400">

        <Card>
          <BlockStack gap="300">
            <Text variant="headingSm">Material</Text>
            <BlockStack gap="100">
              <TextField
                label="Material name"
                placeholder="e.g. Custer Feldspar"
                value={name}
                onChange={setName}
                autoComplete="off"
              />
              {oxideSymbol && (
                <div style={{fontSize: '12px', color: '#2d6a9f', fontWeight: 500}}>
                  Primary oxides: <span style={{fontFamily: 'monospace'}}>{oxideSymbol}</span>
                </div>
              )}
            </BlockStack>
            <InlineStack gap="300" blockAlign="end">
              <div style={{flex: 1}}>
                <TextField
                  label="Amount on hand"
                  type="number"
                  value={amount}
                  onChange={setAmount}
                  autoComplete="off"
                />
              </div>
              <div style={{flex: 1}}>
                <Select
                  label="Unit"
                  options={UNITS}
                  value={unit}
                  onChange={setUnit}
                />
              </div>
            </InlineStack>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <input type="checkbox" id="approx" checked={isApproximate}
                onChange={e => setIsApproximate(e.target.checked)}
                style={{width: '16px', height: '16px', cursor: 'pointer'}} />
              <label htmlFor="approx" style={{fontSize: '14px', color: '#1a1a1a', cursor: 'pointer'}}>
                This is an estimate (~approx)
              </label>
            </div>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300">
            <Text variant="headingSm">Price (CAD)</Text>
            <InlineStack gap="300" blockAlign="end">
              <div style={{flex: 1}}>
                <TextField label="Price" type="number" placeholder="e.g. 24.99"
                  value={price} onChange={setPrice} autoComplete="off" prefix="$" />
              </div>
              <div style={{flex: 1}}>
                <Select label="Per unit" options={PRICE_UNITS}
                  value={priceUnit} onChange={setPriceUnit} />
              </div>
            </InlineStack>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <input type="checkbox" id="price-approx" checked={priceApproximate}
                onChange={e => setPriceApproximate(e.target.checked)}
                style={{width: '16px', height: '16px', cursor: 'pointer'}} />
              <label htmlFor="price-approx" style={{fontSize: '14px', color: '#1a1a1a', cursor: 'pointer'}}>
                Price is estimated
              </label>
            </div>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300">
            <Text variant="headingSm">Notes (optional)</Text>
            <TextField label="Notes" labelHidden value={notes} onChange={setNotes}
              multiline={2} autoComplete="off" />
          </BlockStack>
        </Card>

        <div style={{display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '8px 0 24px'}}>
          <button type="button" onClick={onCancel}
            style={{padding: '9px 18px', background: 'white', color: '#1a1a1a', border: '1px solid #c9cccf', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'}}>
            Cancel
          </button>
          <button type="button" onClick={handleSave}
            style={{padding: '9px 18px', background: '#1a3a5c', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'}}>
            {existing ? 'Save Changes' : 'Add Material'}
          </button>
        </div>

      </BlockStack>
    </div>
  )
}

export default function MaterialsScreen({ materials, onSaveMaterial, onDeleteMaterial }) {
  const [showForm, setShowForm] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [search, setSearch] = useState('')

  const filtered = materials
    .filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))

  const handleSave = (material) => {
    onSaveMaterial(material)
    setShowForm(false)
    setEditingMaterial(null)
  }

  if (showForm || editingMaterial) {
    return (
      <Page
        title={editingMaterial ? 'Edit Material' : 'Add Material'}
        backAction={{
          content: 'Materials',
          onAction: () => { setShowForm(false); setEditingMaterial(null) }
        }}
      >
        <MaterialForm
          existing={editingMaterial || null}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingMaterial(null) }}
        />
      </Page>
    )
  }

  return (
    <Page
      title="Materials"
      primaryAction={{
        content: 'Add Material',
        onAction: () => { setEditingMaterial(null); setShowForm(true) }
      }}
    >
      <BlockStack gap="400">
        <Card>
          <TextField label="Search" labelHidden placeholder="Search materials..."
            value={search} onChange={setSearch} autoComplete="off"
            clearButton onClearButtonClick={() => setSearch('')} />
        </Card>

        {filtered.length === 0 ? (
          <Card>
            <Text tone="subdued">
              {search ? 'No materials match your search.' : 'No materials yet. Add your first material to start tracking inventory.'}
            </Text>
          </Card>
        ) : (
          <Card padding="0">
            {filtered.map((material, i) => {
              const status = getStockStatus(material)
              const amountDisplay = `${material.amount} ${material.unit}`
              const priceDisplay = material.price
                ? `$${material.price.toFixed(2)}/${material.priceUnit}${material.priceApproximate ? ' (est.)' : ''}`
                : null
              const oxideSymbol = getOxideSymbol(material.name)
              return (
                <div key={material.id}
                  className={`material-row ${i < filtered.length - 1 ? 'with-border' : ''}`}>
                  <div className="material-row-left">
                    <div className="material-row-name">
                      {material.name}
                      {material.isApproximate && (
                        <span className="approx-badge">~approx</span>
                      )}
                    </div>
                    {oxideSymbol && (
                      <div style={{fontSize: '11px', color: '#2d6a9f', fontFamily: 'monospace', marginTop: '2px'}}>
                        {oxideSymbol}
                      </div>
                    )}
                    {priceDisplay && (
                      <div className="material-row-price">{priceDisplay}</div>
                    )}
                  </div>
                  <div className="material-row-right">
                    <div className="material-row-amount">
                      {amountDisplay}
                      {status && status !== 'ok' && (
                        <span style={{marginLeft: '8px'}}>{STATUS_BADGE[status]}</span>
                      )}
                    </div>
                    <div className="material-row-actions">
                      <button type="button" className="material-action-btn"
                        onClick={() => setEditingMaterial(material)}>
                        Edit
                      </button>
                      <button type="button" className="material-action-btn danger"
                        onClick={() => setDeleteTarget(material)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </Card>
        )}
      </BlockStack>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete material?"
        primaryAction={{
          content: 'Delete', destructive: true,
          onAction: () => { onDeleteMaterial(deleteTarget); setDeleteTarget(null) }
        }}
        secondaryActions={[{ content: 'Cancel', onAction: () => setDeleteTarget(null) }]}>
        <Modal.Section>
          <Text>Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.</Text>
        </Modal.Section>
      </Modal>
    </Page>
  )
}