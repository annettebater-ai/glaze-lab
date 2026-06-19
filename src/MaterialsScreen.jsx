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
} from '@shopify/polaris'
import './MaterialsScreen.css'

const UNITS = [
  { label: 'g', value: 'g' },
  { label: 'kg', value: 'kg' },
  { label: 'lb', value: 'lb' },
  { label: 'oz', value: 'oz' },
]

const PRICE_UNITS = [
  { label: 'per kg', value: 'kg' },
  { label: 'per g', value: 'g' },
  { label: 'per lb', value: 'lb' },
  { label: 'per oz', value: 'oz' },
]

function MaterialForm({ existing, onSave, onCancel }) {
  const [name, setName] = useState(existing?.name || '')
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '')
  const [unit, setUnit] = useState(existing?.unit || 'g')
  const [isApproximate, setIsApproximate] = useState(existing?.isApproximate || false)
  const [price, setPrice] = useState(existing?.price ? String(existing.price) : '')
  const [priceUnit, setPriceUnit] = useState(existing?.priceUnit || 'kg')
  const [priceApproximate, setPriceApproximate] = useState(existing?.priceApproximate || false)
  const [notes, setNotes] = useState(existing?.notes || '')
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [priceError, setPriceError] = useState('')

  const handleGetMarketPrice = async () => {
    if (!name.trim()) return
    setLoadingPrice(true)
    setPriceError('')
    try {
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 300,
          messages: [{
            role: 'user',
            content: `You are a Canadian pottery supply pricing assistant. Estimate the current retail price in CAD for "${name.trim()}" as a ceramic glaze material from Canadian suppliers like PSH (The Pottery Supply House), Tuckers Pottery, Great White North Pottery, and Sounding Stone.

Respond with ONLY a JSON object in this exact format, no other text:
{"price": 24.99, "unit": "kg", "note": "brief explanation"}

The unit should be "kg" or "g" depending on how this material is typically sold. Base the price on a typical purchase quantity.`
          }]
        })
      })
      const data = await response.json()
      const text = data.content?.[0]?.text || ''
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      if (parsed.price && parsed.unit) {
        setPrice(String(parsed.price))
        setPriceUnit(parsed.unit)
        setPriceApproximate(true)
        setPriceError('')
      } else {
        setPriceError('Could not get a price estimate. Try entering manually.')
      }
    } catch (err) {
      setPriceError('Failed to get market price. Check your connection.')
    } finally {
      setLoadingPrice(false)
    }
  }

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
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <Text variant="headingSm">Price (CAD)</Text>
              <button type="button" onClick={handleGetMarketPrice} disabled={loadingPrice || !name.trim()}
                style={{
                  padding: '6px 12px',
                  background: loadingPrice ? '#f0f0f0' : '#1a1a1a',
                  color: loadingPrice ? '#888' : 'white',
                  border: 'none', borderRadius: '6px',
                  fontSize: '12px', fontWeight: 600,
                  cursor: loadingPrice || !name.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}>
                <span style={{color: '#c8a96e'}}>✦</span>
                {loadingPrice ? 'Looking up...' : 'Get Market Price'}
              </button>
            </div>
            {priceError && (
              <div style={{fontSize: '12px', color: '#cc2200', padding: '4px 0'}}>{priceError}</div>
            )}
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
                {priceApproximate ? 'Market estimate (set by Sidekick)' : 'Price is estimated'}
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

  const handleSave = (material) => {
    onSaveMaterial(material)
    setShowForm(false)
    setEditingMaterial(null)
  }

  const sorted = [...materials].sort((a, b) => a.name.localeCompare(b.name))

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
          existing={editingMaterial}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingMaterial(null) }}
        />
      </Page>
    )
  }

  return (
    <Page
      title="Materials"
      primaryAction={{ content: 'Add Material', onAction: () => { setEditingMaterial(null); setShowForm(true) } }}
    >
      <BlockStack gap="400">
        {sorted.length === 0 ? (
          <Card>
            <div style={{padding: '32px', textAlign: 'center'}}>
              <Text tone="subdued">No materials yet. Add materials to track your inventory and enable cost calculations.</Text>
            </div>
          </Card>
        ) : (
          <Card padding="0">
            <div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 100px 120px 80px', padding: '10px 16px', borderBottom: '1px solid #f0f0f0', background: '#fafafa'}}>
                <Text variant="bodySm" fontWeight="semibold" tone="subdued">Name</Text>
                <Text variant="bodySm" fontWeight="semibold" tone="subdued">Stock</Text>
                <Text variant="bodySm" fontWeight="semibold" tone="subdued">Price</Text>
                <Text variant="bodySm" fontWeight="semibold" tone="subdued">Actions</Text>
              </div>
              {sorted.map((material, index) => {
                const priceDisplay = material.price
                  ? `$${material.price.toFixed(2)}/${material.priceUnit}${material.priceApproximate ? ' est.' : ''}`
                  : '—'
                const stockStatus = material.amount <= 0 ? 'out' :
                  (material.startingAmount > 0 && material.amount / material.startingAmount <= 0.25) ? 'low' : 'ok'

                return (
                  <div key={material.id} style={{
                    display: 'grid', gridTemplateColumns: '1fr 100px 120px 80px',
                    padding: '12px 16px', alignItems: 'center',
                    borderBottom: index < sorted.length - 1 ? '1px solid #f5f5f5' : 'none',
                    background: 'white',
                  }}>
                    <div>
                      <div style={{fontSize: '14px', fontWeight: 600, color: '#1a1a1a'}}>{material.name}</div>
                      {material.notes && <div style={{fontSize: '12px', color: '#888'}}>{material.notes}</div>}
                    </div>
                    <div>
                      <span style={{fontSize: '13px', fontWeight: 600, color: stockStatus === 'out' ? '#cc2200' : stockStatus === 'low' ? '#aa7700' : '#1a3a5c'}}>
                        {material.amount}{material.unit}
                      </span>
                      {material.isApproximate && <span style={{fontSize: '11px', color: '#888'}}> ~</span>}
                      {stockStatus !== 'ok' && (
                        <div>
                          <span style={{
                            fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '8px', textTransform: 'uppercase',
                            background: stockStatus === 'out' ? '#fff0f0' : '#fff8e1',
                            color: stockStatus === 'out' ? '#cc2200' : '#aa7700',
                          }}>
                            {stockStatus === 'out' ? 'Out' : 'Low'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <span style={{
                        fontSize: '13px', color: material.price ? '#1a1a1a' : '#aaa',
                        fontStyle: material.price ? 'normal' : 'italic'
                      }}>
                        {priceDisplay}
                      </span>
                    </div>
                    <div style={{display: 'flex', gap: '4px', justifyContent: 'flex-end'}}>
                      <button type="button" onClick={() => setEditingMaterial(material)}
                        title="Edit"
                        style={{width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid #e3e3e3', borderRadius: '6px', cursor: 'pointer', padding: 0}}>
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                          <path d="M14.5 2.5l3 3L7 16l-4 1 1-4L14.5 2.5z" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <button type="button" onClick={() => setDeleteTarget(material)}
                        title="Delete"
                        style={{width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid #cc2200', borderRadius: '6px', cursor: 'pointer', padding: 0}}>
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                          <path d="M4 6h12M8 6V4h4v2M6 6l1 11h6l1-11" stroke="#cc2200" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </BlockStack>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete material?"
        primaryAction={{
          content: 'Delete', destructive: true,
          onAction: () => { onDeleteMaterial(deleteTarget); setDeleteTarget(null) }
        }}
        secondaryActions={[{ content: 'Cancel', onAction: () => setDeleteTarget(null) }]}
      >
        <Modal.Section>
          <Text>This will permanently delete {deleteTarget?.name} from your materials library.</Text>
        </Modal.Section>
      </Modal>
    </Page>
  )
}