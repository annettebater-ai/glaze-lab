// ── Test Result markdown builder ──────────────────────────────

export function testResultToMarkdown(result) {
  const layers = (result.layers || [])
    .map((l, i) => `${i + 1}. ${l.type} — ${l.recipe || l.name}`)
    .join('\n')

  const photos = (result.photos || [])
    .map(p => `![[Assets/photos/${p}]]`)
    .join('\n')

  return `---
type: test-result
id: ${result.id}
recipe: ${result.recipeSlug}
recipe-name: ${result.recipeName}
mixing-session: ${result.mixingSessionId || 'none'}
clay-body: ${result.clayBody || ''}
date: ${result.date}
status: ${result.status}
application-method: ${result.applicationMethod || ''}
application-thickness: ${result.thickness || ''}
rating: ${result.rating || 0}
photos: [${(result.photos || []).join(', ')}]
created: ${result.date}
modified: ${new Date().toISOString().split('T')[0]}
---

## Layering Order

${layers || 'Not recorded'}

## Notes (Pre-firing)

${result.notesBefore || ''}

## Outcome

${result.notesAfter || ''}

## What To Try Next

${result.nextSteps || ''}

## Photos

${photos}

## AI Diagnosis

${result.aiDiagnosis || ''}

[[Recipes/${result.recipeSlug}]]
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

    const getSection = (heading) => {
      const m = content.match(new RegExp(`## ${heading}\\n\\n([\\s\\S]*?)(?:\\n##|$)`))
      return m ? m[1].trim() : ''
    }

    const photosStr = get('photos')
    const photos = photosStr
      ? photosStr.replace(/[\[\]]/g, '').split(',').map(p => p.trim()).filter(Boolean)
      : []

    const layersText = getSection('Layering Order')
    const layers = layersText && layersText !== 'Not recorded'
      ? layersText.split('\n').map(l => {
          const m = l.match(/^\d+\.\s+(.+?)\s+—\s+(.+)$/)
          return m ? { type: m[1], recipe: m[2] } : null
        }).filter(Boolean)
      : []

    return {
      fileId,
      id: get('id') || fileId,
      recipeSlug: get('recipe'),
      recipeName: get('recipe-name'),
      mixingSessionId: get('mixing-session'),
      clayBody: get('clay-body'),
      date: get('date'),
      status: get('status') || 'pending',
      applicationMethod: get('application-method'),
      thickness: get('application-thickness'),
      rating: parseInt(get('rating')) || 0,
      photos,
      layers,
      notesBefore: getSection('Notes \\(Pre-firing\\)'),
      notesAfter: getSection('Outcome'),
      nextSteps: getSection('What To Try Next'),
      aiDiagnosis: getSection('AI Diagnosis'),
    }
  } catch (e) {
    console.error('Failed to parse test result:', e)
    return null
  }
}
