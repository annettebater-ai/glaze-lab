// ── Clay Body markdown builder/parser ──────────────────────────

export function clayBodyToMarkdown(clayBody) {
  return `---
type: clay-body
id: ${clayBody.id}
name: ${clayBody.name}
cone: ${clayBody.cone || ''}
atmosphere: ${clayBody.atmosphere || ''}
thermal-expansion: ${clayBody.thermalExpansion || ''}
silica: ${clayBody.silica || ''}
alumina: ${clayBody.alumina || ''}
flux: ${clayBody.flux || ''}
manufacturer: ${clayBody.manufacturer || ''}
chemistry-source: ${clayBody.chemistrySource || 'manual'}
chemistry-verified: ${clayBody.chemistryVerified ? 'true' : 'false'}
created: ${clayBody.created}
modified: ${new Date().toISOString().split('T')[0]}
---

## Notes

${clayBody.notes || ''}

## Chemistry Notes

${clayBody.chemistryNotes || ''}
`
}

export function markdownToClayBody(content, fileId) {
  try {
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
    if (!fmMatch) return null
    const fm = fmMatch[1]

    const get = (key) => {
      const m = fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))
      return m ? m[1].trim() : ''
    }

    const getSection = (heading) => {
      const m = content.match(new RegExp(`## ${heading}\\n\\n([\\s\\S]*?)(?:\\n##|$)`))
      return m ? m[1].trim() : ''
    }

    return {
      fileId,
      id: get('id') || fileId,
      name: get('name'),
      cone: get('cone'),
      atmosphere: get('atmosphere'),
      thermalExpansion: parseFloat(get('thermal-expansion')) || null,
      silica: parseFloat(get('silica')) || null,
      alumina: parseFloat(get('alumina')) || null,
      flux: parseFloat(get('flux')) || null,
      manufacturer: get('manufacturer'),
      chemistrySource: get('chemistry-source') || 'manual',
      chemistryVerified: get('chemistry-verified') === 'true',
      notes: getSection('Notes'),
      chemistryNotes: getSection('Chemistry Notes'),
      created: get('created'),
    }
  } catch (e) {
    console.error('Failed to parse clay body:', e)
    return null
  }
}

export function getCompatibilityWarnings(glaze, clayBody) {
  const warnings = []
  if (!glaze?.chemistry || !clayBody) return warnings

  // Thermal expansion check
  if (clayBody.thermalExpansion && glaze.chemistry.thermalExpansion) {
    const diff = Math.abs(glaze.chemistry.thermalExpansion - clayBody.thermalExpansion)
    if (diff > 1.5) {
      warnings.push({
        type: 'chemistry',
        severity: 'high',
        message: `Thermal expansion mismatch (glaze: ${glaze.chemistry.thermalExpansion}, clay: ${clayBody.thermalExpansion}). Difference of ${diff.toFixed(1)} may cause crazing or shivering.`
      })
    } else if (diff > 0.8) {
      warnings.push({
        type: 'chemistry',
        severity: 'medium',
        message: `Slight thermal expansion difference (${diff.toFixed(1)}). Monitor for crazing in testing.`
      })
    }
  }

  return warnings
}