export function testResultToMarkdown(session) {
  const tilesJson = JSON.stringify(session.tiles || [])

  return `---
type: test-session
id: ${session.id}
recipe: ${session.recipeSlug || ''}
recipe-name: ${session.recipeName || ''}
inventory-id: ${session.inventoryId || ''}
inventory-name: ${session.inventoryName || ''}
date: ${session.date}
modified: ${new Date().toISOString().split('T')[0]}
tiles: '${tilesJson}'
---

## Notes

${session.notes || ''}
`
}

export function markdownToTestResult(content, fileId) {
  try {
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
    if (!fmMatch) return null
    const fm = fmMatch[1]

    const get = (key) => {
      const m = fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))
      return m ? m[1].trim() : ''
    }

    let tiles = []
    try {
      const tilesRaw = get('tiles').replace(/^'|'$/g, '')
      tiles = JSON.parse(tilesRaw)
    } catch {
      tiles = []
    }

    const notesMatch = content.match(/## Notes\n\n([\s\S]*?)(?:\n##|$)/)
    const notes = notesMatch ? notesMatch[1].trim() : ''

    // Derive session-level status from tiles
    const allComplete = tiles.length > 0 && tiles.every(t => t.status === 'completed')
    const anyComplete = tiles.some(t => t.status === 'completed')
    const status = allComplete ? 'completed' : anyComplete ? 'partial' : 'pending'

    return {
      fileId,
      id: get('id') || fileId,
      recipeSlug: get('recipe'),
      recipeName: get('recipe-name'),
      inventoryId: get('inventory-id'),
      inventoryName: get('inventory-name'),
      date: get('date'),
      status,
      tiles,
      notes,
    }
  } catch (e) {
    console.error('Failed to parse test session:', e)
    return null
  }
}

export function newTile(recipeName) {
  return {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
    status: 'pending',
    clayBody: '',
    applicationMethod: 'dipping',
    thickness: 'medium',
    numDips: null,
    dipDuration: null,
    layers: [{ type: 'Base Glaze', recipe: recipeName || '' }],
    notesBefore: '',
    preFirePhotos: [],
    firingType: '',
    coneReached: '',
    rating: 0,
    notesAfter: '',
    nextSteps: '',
    photos: [],
  }
}