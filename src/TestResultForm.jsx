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
import { newTile } from './testResults'
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
  'Underglaze', 'Base Glaze', 'Overglaze', 'Wash', 'Slip', 'Engobe',
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
      <button key={n} className={`star ${n <= value ? 'active' : ''}`}
        onClick={() => onChange(n)} type="button">★</button>
    ))}
  </div>
)

function PhotoUpload({ photos, onAdd, onRemove, accessToken, uploading, label, hint, required }) {
  return (
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
                  alt={p.name} className="photo-thumb-img"
                  onError={e => { e.target.style.display = 'none' }}
                />
              ) : (
                <span className="photo-thumb-name">{p.name}</span>
              )}
              <button type="button" className="photo-remove-btn" onClick={() => onRemove(i)}>✕</button>
            </div>
          ))}
        </div>
      )}
      {uploading ? (
        <InlineStack gap="200"><Spinner size="small" /><Text tone="subdued">Uploading...</Text></InlineStack>
      ) : (
        <label className="photo-upload-btn">
          📷 {photos.length > 0 ? 'Add More' : 'Add Photos'}
          <input type="file" accept="image/*" multiple onChange={onAdd} style={{display: 'none'}} />
        </label>
      )}
    </BlockStack>
  )
}

function TileEditor({
  tile, index, recipeName, clayBodies, accessToken, photosFolderId,
  onChange, onDelete, showDelete, layeringSuggestion, onAskLayering, loadingLayering
}) {
  const [uploadingPre, setUploadingPre] = useState(false)
  const [uploadingPost, setUploadingPost] = useState(false)
  const [showPostFire, setShowPostFire] = useState(tile.status === 'completed')

  const update = (field, value) => onChange({ ...tile, [field]: value })

  const updateLayer = (i, field, value) => {
    const layers = [...tile.layers]
    layers[i] = { ...layers[i], [field]: value }
    update('layers', layers)
  }

  const moveLayer = (i, dir) => {
    const layers = [...tile.layers]
    const swap = i + dir
    if (swap < 0 || swap >= layers.length) return
    ;[layers[i], layers[swap]] = [layers[swap], layers[i]]
    update('layers', layers)
  }

  const handlePhotoUpload = async (e, isPreFire) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    if (!accessToken || !photosFolderId) { alert('Not connected to Drive'); return }
    isPreFire ? setUploadingPre(true) : setUploadingPost(true)
    try {
      const uploaded = await Promise.all(files.map(f => uploadImage(accessToken, photosFolderId, f)))
      const newPhotos = uploaded.map(f => ({ fileId: f.id, name: f.name }))
      if (isPreFire) {
        update('preFirePhotos', [...(tile.preFirePhotos || []), ...newPhotos])
      } else {
        update('photos', [...(tile.photos || []), ...newPhotos])
      }
    } catch (err) {
      alert('Photo upload failed.')
    } finally {
      isPreFire ? setUploadingPre(false) : setUploadingPost(false)
    }
  }

  const clayBodyOptions = clayBodies?.length > 0
    ? [
        { label: 'Select clay body...', value: '' },
        ...clayBodies.map(c => ({ label: c.name, value: c.name })),
        { label: 'Other (type below)', value: '__other__' },
      ]
    : null

  const [clayOther, setClayOther] = useState(
    clayBodies?.length > 0 && tile.clayBody && !clayBodies.find(c => c.name === tile.clayBody)
      ? tile.clayBody : ''
  )
  const [claySelect, setClaySelect] = useState(
    clayBodies?.length > 0
      ? (clayBodies.find(c => c.name === tile.clayBody) ? tile.clayBody : (tile.clayBody ? '__other__' : ''))
      : ''
  )

  const effectiveClay = clayBodyOptions
    ? (claySelect === '__other__' ? clayOther : claySelect)
    : tile.clayBody

  return (
    <div style={{border: '2px solid #e8e8e8', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px'}}>

      <div style={{background: '#1a1a1a', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
          <div style={{width: '24px', height: '24px', borderRadius: '50%', background: '#c8a96e', color: '#1a1a1a', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            {index + 1}
          </div>
          <Text variant="bodySm" fontWeight="semibold" tone="textInverse">Tile {index + 1}</Text>
          <span style={{fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '8px',
            background: tile.status === 'completed' ? '#d4edda' : '#fff3cd',
            color: tile.status === 'completed' ? '#155724' : '#856404'}}>
            {tile.status === 'completed' ? 'Complete' : 'Pending'}
          </span>
        </div>
        {showDelete && (
          <button type="button" onClick={onDelete}
            style={{background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '18px', cursor: 'pointer', padding: '0 4px'}}>
            ✕
          </button>
        )}
      </div>

      <div style={{padding: '16px', background: 'white'}}>
        <BlockStack gap="300">

          <div className="test-phase-header">
            <div className="test-phase-label pre">Pre-fire</div>
          </div>

          {clayBodyOptions ? (
            <BlockStack gap="200">
              <Select
                label="Clay body"
                options={clayBodyOptions}
                value={claySelect}
                onChange={val => {
                  setClaySelect(val)
                  update('clayBody', val === '__other__' ? clayOther : val)
                }}
              />
              {claySelect === '__other__' && (
                <TextField
                  label="Clay body name"
                  placeholder="e.g. Scarva ES50"
                  value={clayOther}
                  onChange={val => { setClayOther(val); update('clayBody', val) }}
                  autoComplete="off"
                />
              )}
            </BlockStack>
          ) : (
            <TextField
              label="Clay body"
              placeholder="e.g. Scarva ES50"
              value={tile.clayBody}
              onChange={val => update('clayBody', val)}
              autoComplete="off"
            />
          )}

          <InlineStack gap="300">
            <div style={{flex: 1}}>
              <Select label="Application" options={APPLICATION_METHODS}
                value={tile.applicationMethod} onChange={val => update('applicationMethod', val)} />
            </div>
            <div style={{flex: 1}}>
              <Select label="Thickness" options={THICKNESS_OPTIONS}
                value={tile.thickness} onChange={val => update('thickness', val)} />
            </div>
          </InlineStack>

          {tile.applicationMethod === 'dipping' && (
            <InlineStack gap="300">
              <div style={{flex: 1}}>
                <TextField label="Dips" type="number" placeholder="e.g. 2"
                  value={tile.numDips ? String(tile.numDips) : ''}
                  onChange={val => update('numDips', val ? parseInt(val) : null)}
                  autoComplete="off" />
              </div>
              <div style={{flex: 1}}>
                <TextField label="Duration (sec)" type="number" placeholder="e.g. 3"
                  value={tile.dipDuration ? String(tile.dipDuration) : ''}
                  onChange={val => update('dipDuration', val ? parseInt(val) : null)}
                  autoComplete="off" />
              </div>
            </InlineStack>
          )}

          <BlockStack gap="200">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <Text variant="headingSm">Layering Order</Text>
              {onAskLayering && index === 0 && (
                <button type="button" onClick={onAskLayering} disabled={loadingLayering}
                  style={{padding: '6px 12px', background: '#1a1a1a', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: loadingLayering ? 'not-allowed' : 'pointer', opacity: loadingLayering ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '4px'}}>
                  {loadingLayering ? <Spinner size="small" /> : '✦'} Ask Sidekick
                </button>
              )}
            </div>
            {layeringSuggestion && index === 0 && (
              <div style={{padding: '10px 12px', background: '#f9f7f4', borderRadius: '8px', fontSize: '13px', color: '#333', lineHeight: 1.6, whiteSpace: 'pre-wrap'}}>
                <div style={{fontSize: '11px', fontWeight: 700, color: '#1a3a5c', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px'}}>✦ Sidekick Suggestion</div>
                {layeringSuggestion}
              </div>
            )}
            <Text variant="bodySm" tone="subdued">First applied to last.</Text>
            {tile.layers.map((layer, i) => (
              <div key={i} className="layer-row">
                <div className="layer-order-btns">
                  <button type="button" className="layer-order-btn" onClick={() => moveLayer(i, -1)}>↑</button>
                  <button type="button" className="layer-order-btn" onClick={() => moveLayer(i, 1)}>↓</button>
                </div>
                <div className="layer-num">{i + 1}</div>
                <select className="layer-type-select" value={layer.type}
                  onChange={e => updateLayer(i, 'type', e.target.value)}>
                  {LAYER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input className="layer-recipe-input" type="text"
                  placeholder="Recipe or product name" value={layer.recipe}
                  onChange={e => updateLayer(i, 'recipe', e.target.value)} />
                <button type="button" className="layer-remove"
                  onClick={() => update('layers', tile.layers.filter((_, idx) => idx !== i))}>✕</button>
              </div>
            ))}
            <button type="button"
              onClick={() => update('layers', [...tile.layers, { type: 'Underglaze', recipe: '' }])}
              style={{padding: '7px 14px', background: 'white', border: '1px solid #c9cccf', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start'}}>
              + Add Layer
            </button>
          </BlockStack>

          <TextField label="Notes before firing"
            placeholder="Application notes, anything to watch for..."
            value={tile.notesBefore} onChange={val => update('notesBefore', val)}
            multiline={2} autoComplete="off" />

          <PhotoUpload
            photos={tile.preFirePhotos || []}
            onAdd={e => handlePhotoUpload(e, true)}
            onRemove={i => update('preFirePhotos', (tile.preFirePhotos || []).filter((_, idx) => idx !== i))}
            accessToken={accessToken}
            uploading={uploadingPre}
            label="Pre-fire photos"
            hint="Optional — photograph before the kiln"
          />

          {!showPostFire && (
            <button type="button" onClick={() => setShowPostFire(true)}
              style={{width: '100%', padding: '10px', background: 'white', border: '2px dashed #c9cccf', borderRadius: '8px', color: '#1a3a5c', fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginTop: '8px'}}>
              + Add Post-fire Results
            </button>
          )}

          {showPostFire && (
            <BlockStack gap="300">
              <div className="test-phase-header" style={{marginTop: '8px'}}>
                <div className="test-phase-label post">Post-fire</div>
              </div>

              <Select label="Firing type" options={FIRING_TYPES}
                value={tile.firingType} onChange={val => update('firingType', val)} />

              <TextField label="Cone reached" placeholder="e.g. 6, 10, 04"
                value={tile.coneReached} onChange={val => update('coneReached', val)}
                autoComplete="off" />

              <BlockStack gap="200">
                <Text variant="headingSm">Outcome</Text>
                <StarRating value={tile.rating} onChange={val => update('rating', val)} />
                <TextField label="What happened" labelHidden
                  placeholder="Describe the fired result..."
                  value={tile.notesAfter} onChange={val => update('notesAfter', val)}
                  multiline={3} autoComplete="off" />
                <TextField label="What to try next" labelHidden
                  placeholder="Adjustments for next time..."
                  value={tile.nextSteps} onChange={val => update('nextSteps', val)}
                  multiline={2} autoComplete="off" />
              </BlockStack>

              <PhotoUpload
                photos={tile.photos || []}
                onAdd={e => handlePhotoUpload(e, false)}
                onRemove={i => update('photos', (tile.photos || []).filter((_, idx) => idx !== i))}
                accessToken={accessToken}
                uploading={uploadingPost}
                label="Post-fire photos"
                required={true}
                hint="Required to mark complete"
              />

              <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
                <button type="button"
                  onClick={() => { update('status', 'pending'); setShowPostFire(false) }}
                  style={{padding: '8px 14px', background: 'white', border: '1px solid #c9cccf', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'}}>
                  Save as Pending
                </button>
                <button type="button"
                  onClick={() => {
                    if (!tile.photos?.length) { alert('Add at least one post-fire photo'); return }
                    if (!tile.firingType) { alert('Select a firing type'); return }
                    update('status', 'completed')
                  }}
                  style={{padding: '8px 14px', background: '#1a7a1a', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'}}>
                  Mark Complete
                </button>
              </div>
            </BlockStack>
          )}

        </BlockStack>
      </div>
    </div>
  )
}

export default function TestResultForm({
  recipe, existingSession, onSave, onCancel, onDelete,
  accessToken, photosFolderId, clayBodies,
  layeringSuggestion, onAskLayering, loadingLayering,
}) {
  const [tiles, setTiles] = useState(
    existingSession?.tiles?.length > 0
      ? existingSession.tiles
      : [newTile(recipe?.name || '')]
  )
  const [notes, setNotes] = useState(existingSession?.notes || '')
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const isEditing = !!existingSession

  const updateTile = (index, updated) => {
    const next = [...tiles]
    next[index] = updated
    setTiles(next)
  }

  const addTile = () => setTiles([...tiles, newTile(recipe?.name || '')])

  const deleteTile = (index) => {
    if (tiles.length === 1) return
    setTiles(tiles.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    onSave({
      ...(isEditing ? existingSession : {}),
      id: existingSession?.id || Date.now().toString(),
      recipeSlug: recipe?.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || '',
      recipeName: recipe?.name || '',
      inventoryId: existingSession?.inventoryId || '',
      inventoryName: existingSession?.inventoryName || '',
      date: existingSession?.date || new Date().toISOString().split('T')[0],
      tiles,
      notes,
    })
  }

  return (
    <div className="test-result-form">
      <BlockStack gap="400">

        {tiles.map((tile, i) => (
          <TileEditor
            key={tile.id}
            tile={tile}
            index={i}
            recipeName={recipe?.name || ''}
            clayBodies={clayBodies}
            accessToken={accessToken}
            photosFolderId={photosFolderId}
            onChange={(updated) => updateTile(i, updated)}
            onDelete={() => deleteTile(i)}
            showDelete={tiles.length > 1}
            layeringSuggestion={i === 0 ? layeringSuggestion : ''}
            onAskLayering={i === 0 ? onAskLayering : null}
            loadingLayering={loadingLayering}
          />
        ))}

        <button type="button" onClick={addTile}
          style={{width: '100%', padding: '14px', background: 'white', border: '2px dashed #c9cccf', borderRadius: '12px', color: '#1a3a5c', fontSize: '14px', fontWeight: 600, cursor: 'pointer'}}>
          + Add Test Tile
        </button>

        <Card>
          <TextField label="Session notes" labelHidden
            placeholder="Overall session notes..."
            value={notes} onChange={setNotes}
            multiline={2} autoComplete="off" />
        </Card>

        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0 24px'}}>
          <div>
            {isEditing && onDelete ? (
              <button type="button" onClick={() => setShowDeleteModal(true)}
                style={{padding: '9px 18px', background: '#cc2200', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'}}>
                Delete Session
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
            <button type="button" onClick={handleSave}
              style={{padding: '9px 18px', background: '#1a3a5c', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'}}>
              {isEditing ? 'Save Changes' : 'Save Session'}
            </button>
          </div>
        </div>

      </BlockStack>

      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)}
        title="Delete test session?"
        primaryAction={{ content: 'Delete', destructive: true, onAction: () => { setShowDeleteModal(false); onDelete(existingSession) } }}
        secondaryActions={[{ content: 'Cancel', onAction: () => setShowDeleteModal(false) }]}>
        <Modal.Section>
          <Text>This will permanently delete this test session and all its tiles.</Text>
        </Modal.Section>
      </Modal>
    </div>
  )
}