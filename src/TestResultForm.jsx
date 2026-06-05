import { useState } from 'react'
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Select,
  TextField,
  RadioButton,
} from '@shopify/polaris'
import './TestResultForm.css'

const APPLICATION_METHODS = [
  { label: 'Dipping', value: 'dipping' },
  { label: 'Brushing', value: 'brushing' },
  { label: 'Spraying', value: 'spraying' },
  { label: 'Pouring', value: 'pouring' },
]

const THICKNESS_OPTIONS = [
  { label: 'Thin', value: 'thin' },
  { label: 'Medium', value: 'medium' },
  { label: 'Thick', value: 'thick' },
]

const LAYER_TYPES = [
  'Underglaze',
  'Base Glaze',
  'Overglaze',
  'Wash',
  'Slip',
  'Engobe',
]

const StarRating = ({ value, onChange }) => (
  <div className="star-rating">
    {[1, 2, 3, 4, 5].map(n => (
      <button
        key={n}
        className={`star ${n <= value ? 'active' : ''}`}
        onClick={() => onChange(n)}
        type="button"
      >★</button>
    ))}
  </div>
)

export default function TestResultForm({ recipe, mixingSessions, onSave, onCancel }) {
  const [status, setStatus] = useState('pending')
  const [clayBody, setClayBody] = useState('')
  const [applicationMethod, setApplicationMethod] = useState('dipping')
  const [thickness, setThickness] = useState('medium')
  const [mixingSessionId, setMixingSessionId] = useState(
    mixingSessions?.[0]?.id || 'none'
  )
  const [layers, setLayers] = useState([
    { type: 'Base Glaze', recipe: recipe?.name || '' }
  ])
  const [notesBefore, setNotesBefore] = useState('')
  const [notesAfter, setNotesAfter] = useState('')
  const [nextSteps, setNextSteps] = useState('')
  const [rating, setRating] = useState(0)
  const [photos, setPhotos] = useState([])

  const addLayer = () => {
    setLayers([...layers, { type: 'Underglaze', recipe: '' }])
  }

  const removeLayer = (i) => {
    setLayers(layers.filter((_, idx) => idx !== i))
  }

  const updateLayer = (i, field, value) => {
    const updated = [...layers]
    updated[i] = { ...updated[i], [field]: value }
    setLayers(updated)
  }

  const moveLayer = (i, dir) => {
    const updated = [...layers]
    const swap = i + dir
    if (swap < 0 || swap >= updated.length) return
    ;[updated[i], updated[swap]] = [updated[swap], updated[i]]
    setLayers(updated)
  }

  const handlePhotoCapture = async (e) => {
    const files = Array.from(e.target.files)
    const names = files.map(f => f.name)
    setPhotos(prev => [...prev, ...names])
    // TODO: upload to Drive in next step
  }

  const handleSave = () => {
    if (!clayBody.trim()) {
      alert('Please enter a clay body')
      return
    }
    onSave({
      recipeSlug: recipe.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      recipeName: recipe.name,
      mixingSessionId: mixingSessionId === 'none' ? null : mixingSessionId,
      clayBody,
      applicationMethod,
      thickness,
      layers,
      status,
      notesBefore,
      notesAfter: status === 'completed' ? notesAfter : '',
      nextSteps: status === 'completed' ? nextSteps : '',
      rating: status === 'completed' ? rating : 0,
      photos,
      date: new Date().toISOString().split('T')[0],
      id: Date.now().toString(),
    })
  }

  const sessionOptions = [
    { label: 'No session / added manually', value: 'none' },
    ...(mixingSessions || []).map(s => ({
      label: `${s.date} — ${s.batchSize}${s.unit} batch`,
      value: s.id
    }))
  ]

  return (
    <div className="test-result-form">
      <BlockStack gap="400">

        {/* Status toggle */}
        <Card>
          <BlockStack gap="300">
            <Text variant="headingSm">Result Status</Text>
            <InlineStack gap="400">
              <RadioButton
                label="Pending — not yet fired"
                checked={status === 'pending'}
                onChange={() => setStatus('pending')}
                id="pending"
              />
              <RadioButton
                label="Completed — fired and assessed"
                checked={status === 'completed'}
                onChange={() => setStatus('completed')}
                id="completed"
              />
            </InlineStack>
          </BlockStack>
        </Card>

        {/* Mixing session */}
        <Card>
          <BlockStack gap="300">
            <Text variant="headingSm">Mixing Session</Text>
            <Select
              label="Which mixing session produced this test?"
              labelHidden
              options={sessionOptions}
              value={mixingSessionId}
              onChange={setMixingSessionId}
            />
          </BlockStack>
        </Card>

        {/* Clay body */}
        <Card>
          <BlockStack gap="300">
            <Text variant="headingSm">Clay Body</Text>
            <TextField
              label="Clay body used"
              labelHidden
              placeholder="e.g. Scarva ES50, Plainsman M340"
              value={clayBody}
              onChange={setClayBody}
              autoComplete="off"
            />
            <InlineStack gap="300">
              <div style={{flex: 1}}>
                <Select
                  label="Application method"
                  options={APPLICATION_METHODS}
                  value={applicationMethod}
                  onChange={setApplicationMethod}
                />
              </div>
              <div style={{flex: 1}}>
                <Select
                  label="Thickness"
                  options={THICKNESS_OPTIONS}
                  value={thickness}
                  onChange={setThickness}
                />
              </div>
            </InlineStack>
          </BlockStack>
        </Card>

        {/* Layering */}
        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between">
              <Text variant="headingSm">Layering Order</Text>
              <Button size="slim" onClick={addLayer}>+ Add Layer</Button>
            </InlineStack>
            <Text variant="bodySm" tone="subdued">
              Drag to reorder. List from first applied to last.
            </Text>
            {layers.map((layer, i) => (
              <div key={i} className="layer-row">
                <div className="layer-order-btns">
                  <button className="layer-order-btn" onClick={() => moveLayer(i, -1)}>↑</button>
                  <button className="layer-order-btn" onClick={() => moveLayer(i, 1)}>↓</button>
                </div>
                <div className="layer-num">{i + 1}</div>
                <select
                  className="layer-type-select"
                  value={layer.type}
                  onChange={e => updateLayer(i, 'type', e.target.value)}
                >
                  {LAYER_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input
                  className="layer-recipe-input"
                  type="text"
                  placeholder="Recipe or product name"
                  value={layer.recipe}
                  onChange={e => updateLayer(i, 'recipe', e.target.value)}
                />
                <button className="layer-remove" onClick={() => removeLayer(i)}>✕</button>
              </div>
            ))}
          </BlockStack>
        </Card>

        {/* Pre-firing notes */}
        <Card>
          <BlockStack gap="300">
            <Text variant="headingSm">Notes Before Firing</Text>
            <TextField
              label="Pre-firing notes"
              labelHidden
              placeholder="Application notes, observations before the kiln..."
              value={notesBefore}
              onChange={setNotesBefore}
              multiline={3}
              autoComplete="off"
            />
          </BlockStack>
        </Card>

        {/* Post-firing — only if completed */}
        {status === 'completed' && (
          <>
            <Card>
              <BlockStack gap="300">
                <Text variant="headingSm">Outcome</Text>
                <StarRating value={rating} onChange={setRating} />
                <TextField
                  label="Outcome description"
                  labelHidden
                  placeholder="Describe the fired result..."
                  value={notesAfter}
                  onChange={setNotesAfter}
                  multiline={3}
                  autoComplete="off"
                />
                <TextField
                  label="What to try next"
                  labelHidden
                  placeholder="Adjustments to try in the next test..."
                  value={nextSteps}
                  onChange={setNextSteps}
                  multiline={2}
                  autoComplete="off"
                />
              </BlockStack>
            </Card>

            {/* Photos */}
            <Card>
              <BlockStack gap="300">
                <Text variant="headingSm">Photos</Text>
                {photos.length > 0 && (
                  <div className="photo-preview-row">
                    {photos.map((p, i) => (
                      <div key={i} className="photo-preview-thumb">
                        <span>{p}</span>
                        <button onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="photo-upload-btn">
                  📷 Add Photos
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    onChange={handlePhotoCapture}
                    style={{display: 'none'}}
                  />
                </label>
              </BlockStack>
            </Card>
          </>
        )}

        {/* Actions */}
        <InlineStack gap="300" align="end">
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>
            {status === 'pending' ? 'Save Pending Result' : 'Save Result'}
          </Button>
        </InlineStack>

      </BlockStack>
    </div>
  )
}