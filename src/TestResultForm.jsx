import { useState } from 'react'
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Select,
  TextField,
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

const FIRING_TYPES = [
  { label: 'Select firing type...', value: '' },
  { label: 'Cone 6 Oxidation', value: 'cone-6-ox' },
  { label: 'Cone 10 Reduction', value: 'cone-10-red' },
  { label: 'Cone 04 Oxidation', value: 'cone-04-ox' },
  { label: 'Wood Fire', value: 'wood' },
  { label: 'Soda Fire', value: 'soda' },
  { label: 'Salt Fire', value: 'salt' },
  { label: 'Raku', value: 'raku' },
  { label: 'Other', value: 'other' },
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

const PhotoSection = ({ photos, onAdd, onRemove, accessToken, uploading, label, required, hint }) => (
  <BlockStack gap="200">
    <InlineStack align="space-between">
      <Text variant="headingSm">{label}</Text>
      {required && <Text variant="bodySm" tone="critical">Required to complete</Text>}
    </InlineStack>
    {hint && <Text variant="bodySm" tone="subdued">{hint}</Text>}
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
            <button type="button" className="photo-remove-btn" onClick={() => onRemove(i)}>✕</button>
          </div>
        ))}
      </div>
    )}
    {uploading ? (
      <InlineStack gap="200">
        <Spinner size="small" />
        <Text tone="subdued">Uploading...</Text>
      </InlineStack>
    ) : (
      <label className="photo-upload-btn">
        📷 {photos.length > 0 ? 'Add More Photos' : 'Add Photos'}
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={onAdd}
          style={{display: 'none'}}
        />
      </label>
    )}
  </BlockStack>
)

export default function TestResultForm({ recipe, existingResult, onSave, onCancel, onDelete, accessToken, photosFolderId, clayBodies }) {
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
  const [firingType, setFiringType] = useState(existing.firingType || '')
  const [coneReached, setConeReached] = useState(existing.coneReached || '')
  const [photos, setPhotos] = useState(existing.photos || [])
  const [preFirePhotos, setPreFirePhotos] = useState(existing.preFirePhotos || [])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingPreFirePhoto, setUploadingPreFirePhoto] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [errors, setErrors] = useState({})

  const isEditing = !!existingResult

  const clayBodyOptions = clayBodies?.length > 0
    ? [
        { label: 'Select clay body...', value: '' },
        ...clayBodies.map(c => ({ label: c.name, value: c.name })),
        { label: 'Other (type below)', value: '__other__' },
      ]
    : null

  const [clayBodyOther, setClayBodyOther] = useState(
    clayBodies?.length > 0 && existing.clayBody && !clayBodies.find(c => c.name === existing.clayBody)
      ? existing.clayBody
      : ''
  )
  const [clayBodySelectVal, setClayBodySelectVal] = useState(
    clayBodies?.length > 0
      ? (clayBodies.find(c => c.name === existing.clayBody) ? existing.clayBody : (existing.clayBody ? '__other__' : ''))
      : ''
  )

  const effectiveClayBody = clayBodyOptions
    ? (clayBodySelectVal === '__other__' ? clayBodyOther : clayBodySelectVal)
    : clayBody

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

  const handlePhotoCapture = async (e, isPreFire = false) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    if (!accessToken || !photosFolderId) {
      alert('Not connected to Drive — cannot upload photos')
      return
    }
    isPreFire ? setUploadingPreFirePhoto(true) : setUploadingPhoto(true)
    try {
      const uploaded = await Promise.all(
        files.map(file => uploadImage(accessToken, photosFolderId, file))
      )
      const newPhotos = uploaded.map(f => ({ fileId: f.id, name: f.name }))
      if (isPreFire) {
        setPreFirePhotos(prev => [...prev, ...newPhotos])
      } else {
        setPhotos(prev => [...prev, ...newPhotos])
        if (errors.photos) setErrors(prev => ({ ...prev, photos: null }))
      }
    } catch (err) {
      console.error('Photo upload failed:', err)
      alert('Photo upload failed. Please try again.')
    } finally {
      isPreFire ? setUploadingPreFirePhoto(false) : setUploadingPhoto(false)
    }
  }

  const removePhoto = (i) => setPhotos(photos.filter((_, idx) => idx !== i))
  const removePreFirePhoto = (i) => setPreFirePhotos(preFirePhotos.filter((_, idx) => idx !== i))

  const handleSave = (saveStatus) => {
    const newErrors = {}
    const finalStatus = saveStatus || status

    if (!effectiveClayBody.trim()) newErrors.clayBody = 'Clay body is required'

    if (finalStatus === 'completed') {
      if (photos.length === 0) newErrors.photos = 'At least one post-fire photo is required'
      if (!firingType) newErrors.firingType = 'Firing type is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    onSave({
      ...(isEditing ? existing : {}),
      recipeSlug: recipe.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      recipeName: recipe.name,
      clayBody: effectiveClayBody,
      applicationMethod,
      thickness,
      numDips: numDips ? parseInt(numDips) : null,
      dipDuration: dipDuration ? parseInt(dipDuration) : null,
      layers,
      status: finalStatus,
      firingType: finalStatus === 'completed' ? firingType : '',
      coneReached: finalStatus === 'completed' ? coneReached : '',
      notesBefore,
      notesAfter: finalStatus === 'completed' ? notesAfter : '',
      nextSteps: finalStatus === 'completed' ? nextSteps : '',
      rating: finalStatus === 'completed' ? rating : 0,
      photos: finalStatus === 'completed' ? photos : [],
      preFirePhotos,
      date: existing.date || new Date().toISOString().split('T')[0],
      id: existing.id || Date.now().toString(),
    })
  }

  return (
    <div className="test-result-form">
      <BlockStack gap="400">

        <div className="test-phase-header">
          <div className="test-phase-label pre">Pre-fire</div>
        </div>

        <Card>
          <BlockStack gap="300">
            <Text variant="headingSm">Clay Body & Application</Text>
            {clayBodyOptions ? (
              <BlockStack gap="200">
                <Select
                  label="Clay body"
                  options={clayBodyOptions}
                  value={clayBodySelectVal}
                  onChange={val => {
                    setClayBodySelectVal(val)
                    if (errors.clayBody) setErrors(prev => ({ ...prev, clayBody: null }))
                  }}
                  error={errors.clayBody}
                />
                {clayBodySelectVal === '__other__' && (
                  <TextField
                    label="Clay body name"
                    placeholder="e.g. Scarva ES50, Plainsman M340"
                    value={clayBodyOther}
                    onChange={val => {
                      setClayBodyOther(val)
                      if (errors.clayBody) setErrors(prev => ({ ...prev, clayBody: null }))
                    }}
                    autoComplete="off"
                  />
                )}
              </BlockStack>
            ) : (
              <TextField
                label="Clay body"
                labelHidden
                placeholder="e.g. Scarva ES50, Plainsman M340"
                value={clayBody}
                onChange={val => {
                  setClayBody(val)
                  if (errors.clayBody) setErrors(prev => ({ ...prev, clayBody: null }))
                }}
                error={errors.clayBody}
                autoComplete="off"
              />
            )}
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
                  />
                </div>
              </InlineStack>
            )}
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300">
            <Text variant="headingSm">Layering Order</Text>
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
            <button
              type="button"
              onClick={addLayer}
              style={{padding: '7px 14px', background: 'white', border: '1px solid #c9cccf', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start'}}
            >
              + Add Layer
            </button>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300">
            <TextField
              label="Notes before firing"
              placeholder="Application notes, anything to watch for..."
              value={notesBefore}
              onChange={setNotesBefore}
              multiline={3}
              autoComplete="off"
            />
          </BlockStack>
        </Card>

        <Card>
          <PhotoSection
            photos={preFirePhotos}
            onAdd={(e) => handlePhotoCapture(e, true)}
            onRemove={removePreFirePhoto}
            accessToken={accessToken}
            uploading={uploadingPreFirePhoto}
            label="Pre-fire photos"
            hint="Optional — photograph the tile before it goes in the kiln"
          />
        </Card>

        {status === 'pending' && (
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0'}}>
            <div>
              {isEditing && onDelete ? (
                <button type="button" onClick={() => setShowDeleteModal(true)}
                  style={{padding: '9px 18px', background: '#cc2200', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'}}>
                  Delete
                </button>
              ) : (
                <button type="button" onClick={onCancel}
                  style={{padding: '9px 18px', background: 'white', color: '#1a1a1a', border: '1px solid #c9cccf', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'}}>
                  Cancel
                </button>
              )}
            </div>
            <div style={{display: 'flex', gap: '8px'}}>
              {isEditing && (
                <button type="button" onClick={onCancel}
                  style={{padding: '9px 18px', background: 'white', color: '#1a1a1a', border: '1px solid #c9cccf', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'}}>
                  Cancel
                </button>
              )}
              <button type="button" onClick={() => handleSave('pending')}
                style={{padding: '9px 18px', background: '#1a3a5c', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'}}>
                Save — Pending Firing
              </button>
            </div>
          </div>
        )}

        {(status === 'completed' || isEditing) && (
          <>
            <div className="test-phase-header">
              <div className="test-phase-label post">Post-fire</div>
            </div>

            <Card>
              <BlockStack gap="300">
                <Text variant="headingSm">Firing Details</Text>
                <Select
                  label="Firing type"
                  options={FIRING_TYPES}
                  value={firingType}
                  onChange={val => {
                    setFiringType(val)
                    if (errors.firingType) setErrors(prev => ({ ...prev, firingType: null }))
                  }}
                  error={errors.firingType}
                />
                <TextField
                  label="Cone reached"
                  placeholder="e.g. 6, 10, 04"
                  value={coneReached}
                  onChange={setConeReached}
                  autoComplete="off"
                />
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text variant="headingSm">Outcome</Text>
                <StarRating value={rating} onChange={setRating} />
                <TextField
                  label="What happened"
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
                  placeholder="Adjustments for next time..."
                  value={nextSteps}
                  onChange={setNextSteps}
                  multiline={2}
                  autoComplete="off"
                />
              </BlockStack>
            </Card>

            <Card>
              <PhotoSection
                photos={photos}
                onAdd={(e) => handlePhotoCapture(e, false)}
                onRemove={removePhoto}
                accessToken={accessToken}
                uploading={uploadingPhoto}
                label="Post-fire photos"
                required={true}
                hint="Required — photograph the fired tile"
              />
              {errors.photos && (
                <Text tone="critical" variant="bodySm">{errors.photos}</Text>
              )}
            </Card>

            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0 24px'}}>
              <div>
                {isEditing && onDelete ? (
                  <button type="button" onClick={() => setShowDeleteModal(true)}
                    style={{padding: '9px 18px', background: '#cc2200', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'}}>
                    Delete
                  </button>
                ) : (
                  <button type="button" onClick={onCancel}
                    style={{padding: '9px 18px', background: 'white', color: '#1a1a1a', border: '1px solid #c9cccf', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'}}>
                    Cancel
                  </button>
                )}
              </div>
              <div style={{display: 'flex', gap: '8px'}}>
                {isEditing && status === 'completed' && (
                  <button type="button" onClick={onCancel}
                    style={{padding: '9px 18px', background: 'white', color: '#1a1a1a', border: '1px solid #c9cccf', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'}}>
                    Cancel
                  </button>
                )}
                {status === 'pending' && isEditing && (
                  <button type="button" onClick={() => handleSave('pending')}
                    style={{padding: '9px 18px', background: '#1a3a5c', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'}}>
                    Save — Still Pending
                  </button>
                )}
                <button type="button" onClick={() => handleSave('completed')}
                  style={{padding: '9px 18px', background: '#1a7a1a', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'}}>
                  Save — Mark Complete
                </button>
              </div>
            </div>
          </>
        )}

        {status === 'pending' && !isEditing && (
          <button type="button" onClick={() => setStatus('completed')}
            style={{width: '100%', padding: '12px', background: 'white', border: '2px dashed #c9cccf', borderRadius: '10px', color: '#1a3a5c', fontSize: '14px', fontWeight: 600, cursor: 'pointer'}}>
            + Add Post-fire Results
          </button>
        )}

      </BlockStack>

      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete test result?"
        primaryAction={{
          content: 'Delete',
          destructive: true,
          onAction: () => { setShowDeleteModal(false); onDelete(existingResult) }
        }}
        secondaryActions={[{ content: 'Cancel', onAction: () => setShowDeleteModal(false) }]}
      >
        <Modal.Section>
          <Text>This test result will be permanently deleted and cannot be recovered.</Text>
        </Modal.Section>
      </Modal>
    </div>
  )
}