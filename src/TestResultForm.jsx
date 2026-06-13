import { useState } from 'react'
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Select,
  TextField,
  RadioButton,
  Modal,
  Spinner,
} from '@shopify/polaris'
import { uploadImage } from './drive'
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

export default function TestResultForm({ recipe, mixingSessions, existingResult, onSave, onCancel, onDelete, accessToken, photosFolderId }) {
  const existing = existingResult || {}

  const [status, setStatus] = useState(existing.status || 'pending')
  const [clayBody, setClayBody] = useState(existing.clayBody || '')
  const [applicationMethod, setApplicationMethod] = useState(existing.applicationMethod || 'dipping')
  const [thickness, setThickness] = useState(existing.thickness || 'medium')
  const [numDips, setNumDips] = useState(existing.numDips ? String(existing.numDips) : '')
  const [dipDuration, setDipDuration] = useState(existing.dipDuration ? String(existing.dipDuration) : '')
  const [layers, setLayers] = useState(
    existing.layers?.length > 0
      ? existing.layers
      : [{ type: 'Base Glaze', recipe: recipe?.name || '' }]
  )
  const [notesBefore, setNotesBefore] = useState(existing.notesBefore || '')
  const [notesAfter, setNotesAfter] = useState(existing.notesAfter || '')
  const [nextSteps, setNextSteps] = useState(existing.nextSteps || '')
  const [rating, setRating] = useState(existing.rating || 0)
  const [photos, setPhotos] = useState(existing.photos || [])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const isEditing = !!existingResult

  const addLayer = () => setLayers([...layers, { type: 'Underglaze', recipe: '' }])
  const removeLayer = (i) => setLayers(layers.filter((_, idx) => idx !== i))
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
    if (!files.length) return
    if (!accessToken || !photosFolderId) {
      alert('Not connected to Drive — cannot upload photos')
      return
    }
    setUploadingPhoto(true)
    try {
      const uploaded = await Promise.all(
        files.map(file => uploadImage(accessToken, photosFolderId, file))
      )
      const newPhotos = uploaded.map(f => ({ fileId: f.id, name: f.name }))
      setPhotos(prev => [...prev, ...newPhotos])
    } catch (err) {
      console.error('Photo upload failed:', err)
      alert('Photo upload failed. Please try again.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const removePhoto = (i) => setPhotos(photos.filter((_, idx) => idx !== i))

  const handleSave = () => {
    if (!clayBody.trim()) {
      alert('Please enter a clay body')
      return
    }
    onSave({
      ...(isEditing ? existing : {}),
      recipeSlug: recipe.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      recipeName: recipe.name,
      clayBody,
      applicationMethod,
      thickness,
      numDips: numDips ? parseInt(numDips) : null,
      dipDuration: dipDuration ? parseInt(dipDuration) : null,
      layers,
      status,
      notesBefore,
      notesAfter: status === 'completed' ? notesAfter : '',
      nextSteps: status === 'completed' ? nextSteps : '',
      rating: status === 'completed' ? rating : 0,
      photos,
      date: existing.date || new Date().toISOString().split('T')[0],
      id: existing.id || Date.now().toString(),
    })
  }

  return (
    <div className="test-result-form">
      <BlockStack gap="400">

        <Card>
          <BlockStack gap="300">
            <Text variant="headingSm">Result Status</Text>
            <InlineStack gap="400">
              <RadioButton
                label="Pending — not yet fired"
                checked={status === 'pending'}
                onChange={() => setStatus('pending')}
                id="status-pending"
              />
              <RadioButton
                label="Completed — fired and assessed"
                checked={status === 'completed'}
                onChange={() => setStatus('completed')}
                id="status-completed"
              />
            </InlineStack>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300">
            <Text variant="headingSm">Clay Body & Application</Text>
            <TextField
              label="Clay body"
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
            {applicationMethod === 'dipping' && (
              <InlineStack gap="300">
                <div style={{flex: 1}}>
                  <TextField
                    label="Number of dips"
                    type="number"
                    placeholder="e.g. 2"
                    value={numDips}
                    onChange={setNumDips}
                    autoComplete="off"
                  />
                </div>
                <div style={{flex: 1}}>
                  <TextField
                    label="Dip duration (seconds)"
                    type="number"
                    placeholder="e.g. 3"
                    value={dipDuration}
                    onChange={setDipDuration}
                    autoComplete="off"
                    helpText="seconds per dip"
                  />
                </div>
              </InlineStack>
            )}
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <Text variant="headingSm">Layering Order</Text>
              <button
                type="button"
                onClick={addLayer}
                style={{padding: '5px 12px', background: 'white', border: '1px solid #c9cccf', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'}}
              >
                + Add Layer
              </button>
            </div>
            <Text variant="bodySm" tone="subdued">List from first applied to last.</Text>
            {layers.map((layer, i) => (
              <div key={i} className="layer-row">
                <div className="layer-order-btns">
                  <button type="button" className="layer-order-btn" onClick={() => moveLayer(i, -1)}>↑</button>
                  <button type="button" className="layer-order-btn" onClick={() => moveLayer(i, 1)}>↓</button>
                </div>
                <div className="layer-num">{i + 1}</div>
                <select
                  className="layer-type-select"
                  value={layer.type}
                  onChange={e => updateLayer(i, 'type', e.target.value)}
                >
                  {LAYER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input
                  className="layer-recipe-input"
                  type="text"
                  placeholder="Recipe or product name"
                  value={layer.recipe}
                  onChange={e => updateLayer(i, 'recipe', e.target.value)}
                />
                <button type="button" className="layer-remove" onClick={() => removeLayer(i)}>✕</button>
              </div>
            ))}
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300">
            <Text variant="headingSm">Notes Before Firing</Text>
            <TextField
              label="Notes"
              labelHidden
              placeholder="Application notes, observations before the kiln..."
              value={notesBefore}
              onChange={setNotesBefore}
              multiline={3}
              autoComplete="off"
            />
          </BlockStack>
        </Card>

        {status === 'completed' && (
          <>
            <Card>
              <BlockStack gap="300">
                <Text variant="headingSm">Outcome</Text>
                <StarRating value={rating} onChange={setRating} />
                <TextField
                  label="Outcome"
                  labelHidden
                  placeholder="Describe the fired result..."
                  value={notesAfter}
                  onChange={setNotesAfter}
                  multiline={3}
                  autoComplete="off"
                />
                <TextField
                  label="Next steps"
                  labelHidden
                  placeholder="Adjustments to try next..."
                  value={nextSteps}
                  onChange={setNextSteps}
                  multiline={2}
                  autoComplete="off"
                />
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text variant="headingSm">Photos</Text>
                {photos.length > 0 && (
                  <div className="photo-preview-row">
                    {photos.map((p, i) => (
                      <div key={i} className="photo-preview-thumb">
                        {p.fileId && accessToken ? (
                          <img
                            src={`https://www.googleapis.com/drive/v3/files/${p.fileId}?alt=media&access_token=${accessToken}`}
                            alt={p.name}
                            className="photo-thumb-img"
                            onError={e => { e.target.style.display = 'none' }}
                          />
                        ) : (
                          <span className="photo-thumb-name">{p.name || String(p)}</span>
                        )}
                        <button type="button" className="photo-remove-btn" onClick={() => removePhoto(i)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
                {uploadingPhoto ? (
                  <InlineStack gap="200">
                    <Spinner size="small" />
                    <Text tone="subdued">Uploading...</Text>
                  </InlineStack>
                ) : (
                  <label className="photo-upload-btn">
                    📷 Add Photos
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoCapture}
                      style={{display: 'none'}}
                    />
                  </label>
                )}
              </BlockStack>
            </Card>
          </>
        )}

        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0 24px'}}>
          <div>
            {isEditing && onDelete ? (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                style={{padding: '9px 18px', background: '#cc2200', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'}}
              >
                Delete Result
              </button>
            ) : (
              <button
                type="button"
                onClick={onCancel}
                style={{padding: '9px 18px', background: 'white', color: '#1a1a1a', border: '1px solid #c9cccf', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'}}
              >
                Cancel
              </button>
            )}
          </div>
          <div style={{display: 'flex', gap: '8px'}}>
            {isEditing && (
              <button
                type="button"
                onClick={onCancel}
                style={{padding: '9px 18px', background: 'white', color: '#1a1a1a', border: '1px solid #c9cccf', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'}}
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              style={{padding: '9px 18px', background: '#1a7a1a', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'}}
            >
              {isEditing ? 'Save Changes' : status === 'pending' ? 'Save Pending Result' : 'Save Result'}
            </button>
          </div>
        </div>

      </BlockStack>

      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete test result?"
        primaryAction={{
          content: 'Delete',
          destructive: true,
          onAction: () => {
            setShowDeleteModal(false)
            onDelete(existingResult)
          }
        }}
        secondaryActions={[{
          content: 'Cancel',
          onAction: () => setShowDeleteModal(false)
        }]}
      >
        <Modal.Section>
          <Text>This test result will be permanently deleted and cannot be recovered.</Text>
        </Modal.Section>
      </Modal>
    </div>
  )
}