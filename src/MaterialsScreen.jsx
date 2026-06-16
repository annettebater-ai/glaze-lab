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
import { getStockStatus } from './materials'
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

function MaterialForm({ existing, onSave, onCancel }) {
  const [name, setName] = useState(existing?.name || '')
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '')
  const [unit, setUnit] = useState(existing?.unit || 'g')
  const [isApproximate, setIsApproximate] = useState(existing?.isApproximate || false)
  const [price, setPrice] = useState(existing?.price ? String(existing.price) : '')
  const [priceUnit, setPriceUnit] = useState(existing?.priceUnit || 'kg')
  const [priceApproximate, setPriceApproximate] = useState(existing?.priceApproximate || false)
  const [notes, setNotes] = useState(existing?.notes || '')

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
            <TextField
              label="Material name"
              placeholder="e.g. Custer Feldspar"
              value={name}
              onChange={setName}
              autoComplete="off"
            />
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
                <Select label="Unit" options={UNITS} value={unit} onChange={setUnit} />
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
                <Select label="Per unit" options={PRICE_UNITS} value={priceUnit} onChange={setPriceUnit} />
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