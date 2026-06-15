export function glazeInventoryToMarkdown(entry) {
  return `---
type: glaze-inventory
id: ${entry.id}
entry-type: ${entry.entryType || 'mixed'}
recipe-id: ${entry.recipeId || ''}
recipe-slug: ${entry.recipeSlug || ''}
recipe-name: ${entry.recipeName || ''}
brand: ${entry.brand || ''}
colour: ${entry.colour || ''}
cone-range: ${entry.coneRange || ''}
date-mixed: ${entry.dateMixed || ''}
batch-size: ${entry.batchSize || ''}
batch-unit: ${entry.batchUnit || ''}
batch-grams: ${entry.batchGrams || ''}
batch-cost: ${entry.batchCost || ''}
batch-cost-estimated: ${entry.batchCostEstimated ? 'true' : 'false'}
is-low: ${entry.isLow ? 'true' : 'false'}
is-used-up: ${entry.isUsedUp ? 'true' : 'false'}
sg: ${entry.sg || ''}
notes: ${entry.notes || ''}
created: ${entry.dateMixed || new Date().toISOString().split('T')[0]}
modified: ${new Date().toISOString().split('T')[0]}
---

## Notes

${entry.notes || ''}
`
}

export function markdownToGlazeInventory(content, fileId) {
  try {
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
    if (!fmMatch) return null
    const fm = fmMatch[1]

    const get = (key) => {
      const m = fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))
      return m ? m[1].trim() : ''
    }

    return {
      fileId,
      id: get('id') || fileId,
      entryType: get('entry-type') || 'mixed',
      recipeId: get('recipe-id'),
      recipeSlug: get('recipe-slug'),
      recipeName: get('recipe-name'),
      brand: get('brand'),
      colour: get('colour'),
      coneRange: get('cone-range'),
      dateMixed: get('date-mixed'),
      batchSize: parseFloat(get('batch-size')) || 0,
      batchUnit: get('batch-unit') || 'g',
      batchGrams: parseFloat(get('batch-grams')) || 0,
      batchCost: get('batch-cost') ? parseFloat(get('batch-cost')) : null,
      batchCostEstimated: get('batch-cost-estimated') === 'true',
      isLow: get('is-low') === 'true',
      isUsedUp: get('is-used-up') === 'true',
      sg: get('sg') ? parseFloat(get('sg')) : null,
      notes: get('notes'),
    }
  } catch (e) {
    console.error('Failed to parse glaze inventory entry:', e)
    return null
  }
}