export function materialToMarkdown(material) {
  return `---
type: material
id: ${material.id}
name: ${material.name}
amount: ${material.amount}
unit: ${material.unit}
starting-amount: ${material.startingAmount}
is-approximate: ${material.isApproximate ? 'true' : 'false'}
price: ${material.price || ''}
price-unit: ${material.priceUnit || ''}
price-approximate: ${material.priceApproximate ? 'true' : 'false'}
notes: ${material.notes || ''}
created: ${material.created}
modified: ${new Date().toISOString().split('T')[0]}
---

## Notes

${material.notes || ''}
`
}

export function markdownToMaterial(content, fileId) {
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
      name: get('name'),
      amount: parseFloat(get('amount')) || 0,
      unit: get('unit') || 'g',
      startingAmount: parseFloat(get('starting-amount')) || 0,
      isApproximate: get('is-approximate') === 'true',
      price: get('price') ? parseFloat(get('price')) : null,
      priceUnit: get('price-unit') || 'kg',
      priceApproximate: get('price-approximate') === 'true',
      notes: get('notes'),
      created: get('created'),
    }
  } catch (e) {
    console.error('Failed to parse material:', e)
    return null
  }
}

export function getStockStatus(material) {
  if (!material) return 'unknown'
  if (material.amount <= 0) return 'out'
  if (material.startingAmount > 0) {
    const pct = material.amount / material.startingAmount
    if (pct <= 0.25) return 'low'
  }
  return 'ok'
}

export function hasEnoughForRecipe(material, neededGrams) {
  const amountInGrams = toGrams(material.amount, material.unit)
  return amountInGrams >= neededGrams
}

export function toGrams(amount, unit) {
  switch (unit) {
    case 'kg': return amount * 1000
    case 'lb': return amount * 453.592
    case 'oz': return amount * 28.3495
    default: return amount
  }
}

export function fromGrams(grams, unit) {
  switch (unit) {
    case 'kg': return grams / 1000
    case 'lb': return grams / 453.592
    case 'oz': return grams / 28.3495
    default: return grams
  }
}

export function getPricePerGram(material) {
  if (!material.price || !material.priceUnit) return null
  // Convert price per priceUnit to price per gram
  const unitsToGrams = { g: 1, kg: 1000, lb: 453.592, oz: 28.3495 }
  const gramsPerUnit = unitsToGrams[material.priceUnit] || 1000
  return material.price / gramsPerUnit
}

export function calcIngredientCost(material, usedGrams) {
  const ppg = getPricePerGram(material)
  if (ppg === null) return null
  return ppg * usedGrams
}