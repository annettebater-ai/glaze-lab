export function testResultToMarkdown(result) {
  const layers = (result.layers || [])
    .map((l, i) => `${i + 1}. ${l.type} — ${l.recipe || ''}`)
    .join('\n')

  const photosJson = JSON.stringify(result.photos || [])
  const preFirePhotosJson = JSON.stringify(result.preFirePhotos || [])

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
num-dips: ${result.numDips || ''}
dip-duration: ${result.dipDuration || ''}
firing-type: ${result.firingType || ''}
cone-reached: ${result.coneReached || ''}
rating: ${result.rating || 0}
photos: '${photosJson}'
pre-fire-photos: '${preFirePhotosJson}'
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
      const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const m = content.match(new RegExp(`## ${escaped}\\n\\n([\\s\\S]*?)(?:\\n##|$)`))
      return m ? m[1].trim() : ''
    }

    let photos = []
    try {
      const photosRaw = get('photos').replace(/^'|'$/g, '')
      photos = JSON.parse(photosRaw)
    } catch {
      photos = []
    }

    let preFirePhotos = []
    try {
      const preRaw = get('pre-fire-photos').replace(/^'|'$/g, '')
      preFirePhotos = JSON.parse(preRaw)
    } catch {
      preFirePhotos = []
    }

    const layersText = getSection('Layering Order')
    const layers = layersText && layersText !== 'Not recorded'
      ? layersText.split('\n').map(l => {
          const m = l.match(/^\d+\.\s+(.+?)\s+—\s+(.*)$/)
          return m ? { type: m[1].trim(), recipe: m[2].trim() } : null
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
      numDips: get('num-dips') ? parseInt(get('num-dips')) : null,
      dipDuration: get('dip-duration') ? parseInt(get('dip-duration')) : null,
      firingType: get('firing-type'),
      coneReached: get('cone-reached'),
      rating: parseInt(get('rating')) || 0,
      photos,
      preFirePhotos,
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