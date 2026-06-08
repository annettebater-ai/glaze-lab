// ============================================================
// GLAZE LAB — GOOGLE DRIVE API MODULE
// ============================================================

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'
const VAULT_NAME = 'Glaze Lab'

function authHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

async function driveRequest(url, options) {
  const response = await fetch(url, options)
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(`Drive API error ${response.status}: ${error?.error?.message || 'Unknown error'}`)
  }
  return response.json()
}

async function findFolder(token, name, parentId = null) {
  let query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  if (parentId) query += ` and '${parentId}' in parents`
  const data = await driveRequest(
    `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
    { headers: authHeaders(token) }
  )
  return data.files?.[0] || null
}

async function createFolder(token, name, parentId = null) {
  const metadata = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    ...(parentId && { parents: [parentId] })
  }
  return driveRequest(
    `${DRIVE_API}/files?fields=id,name`,
    {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(metadata)
    }
  )
}

async function ensureFolder(token, name, parentId = null) {
  const existing = await findFolder(token, name, parentId)
  if (existing) return existing.id
  const created = await createFolder(token, name, parentId)
  return created.id
}

export async function ensureVaultStructure(token) {
  const rootId = await ensureFolder(token, VAULT_NAME)
  const [recipes, clayBodies, testResults, mixingSessions, materials, assets] = await Promise.all([
    ensureFolder(token, 'Recipes', rootId),
    ensureFolder(token, 'Clay Bodies', rootId),
    ensureFolder(token, 'Test Results', rootId),
    ensureFolder(token, 'Mixing Sessions', rootId),
    ensureFolder(token, 'Materials', rootId),
    ensureFolder(token, 'Assets', rootId),
  ])
  const [charts, photos] = await Promise.all([
    ensureFolder(token, 'charts', assets),
    ensureFolder(token, 'photos', assets),
  ])
  return { rootId, recipes, clayBodies, testResults, mixingSessions, materials, assets, charts, photos }
}

export async function listFiles(token, folderId) {
  const query = `'${folderId}' in parents and name contains '.md' and trashed=false`
  const data = await driveRequest(
    `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`,
    { headers: authHeaders(token) }
  )
  return data.files || []
}

export async function readFile(token, fileId) {
  const response = await fetch(
    `${DRIVE_API}/files/${fileId}?alt=media`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  )
  if (!response.ok) throw new Error(`Failed to read file: ${response.status}`)
  return response.text()
}

export async function createFile(token, folderId, filename, content) {
  const metadata = {
    name: filename,
    parents: [folderId],
    mimeType: 'text/markdown'
  }
  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', new Blob([content], { type: 'text/markdown' }))
  const response = await fetch(
    `${UPLOAD_API}/files?uploadType=multipart&fields=id,name`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: form
    }
  )
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`Failed to create file: ${err?.error?.message || response.status}`)
  }
  return response.json()
}

export async function updateFile(token, fileId, content) {
  const response = await fetch(
    `${UPLOAD_API}/files/${fileId}?uploadType=media`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'text/markdown'
      },
      body: content
    }
  )
  if (!response.ok) throw new Error(`Failed to update file: ${response.status}`)
  return response.json()
}

export async function findFile(token, folderId, filename) {
  const query = `name='${filename}' and '${folderId}' in parents and trashed=false`
  const data = await driveRequest(
    `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
    { headers: authHeaders(token) }
  )
  return data.files?.[0] || null
}

export async function uploadImage(token, folderId, file) {
  const filename = `${Date.now()}-${file.name}`
  const metadata = {
    name: filename,
    parents: [folderId],
    mimeType: file.type
  }
  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', file)
  const response = await fetch(
    `${UPLOAD_API}/files?uploadType=multipart&fields=id,name`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: form
    }
  )
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`Failed to upload image: ${err?.error?.message || response.status}`)
  }
  return response.json()
}

export function recipeToMarkdown(recipe) {
  const slug = recipe.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const umf = recipe.chemistry?.unity || {}
  const ratios = recipe.chemistry?.ratios || {}
  const stull = recipe.chemistry?.stull || {}

  const fluxLines = ['K2O','Na2O','Li2O','CaO','MgO','ZnO','BaO','SrO','MnO']
    .filter(ox => umf[ox] > 0.001)
    .map(ox => `    ${ox}: ${umf[ox].toFixed(3)}`)
    .join('\n')

  const amphotericLines = ['Al2O3','B2O3']
    .filter(ox => umf[ox] > 0.001)
    .map(ox => `    ${ox}: ${umf[ox].toFixed(3)}`)
    .join('\n')

  const glassLines = ['SiO2','TiO2','P2O5']
    .filter(ox => umf[ox] > 0.001)
    .map(ox => `    ${ox}: ${umf[ox].toFixed(3)}`)
    .join('\n')

  const baseTable = (recipe.baseIngredients || [])
    .map(i => `| ${i.material} | ${i.percent}% |`)
    .join('\n')

  const additiveTable = (recipe.additives || []).length > 0
    ? '\n## Additives\n\n| Material | % of base |\n|---|---|\n' +
      recipe.additives.map(i => `| ${i.material} | ${i.percent}% |`).join('\n')
    : ''

  return `---
type: glaze
id: ${recipe.id}
name: ${recipe.name}
slug: ${slug}
recipe-type: ${recipe.recipeType || 'Glaze'}
cone-target: ${recipe.cone}
atmosphere: ${recipe.atmosphere}
status: ${recipe.status}
created: ${recipe.created}
modified: ${new Date().toISOString().split('T')[0]}

umf:
  fluxes:
${fluxLines}
  amphoteric:
${amphotericLines}
  glass-formers:
${glassLines}

ratios:
  silica-alumina: ${ratios.silicaAlumina || 0}
  kna-camg: ${ratios.knaCamg || 0}
  food-safety: ${ratios.foodSafety || 'unknown'}

stull:
  x-Al2O3: ${stull.x || 0}
  y-SiO2: ${stull.y || 0}
  zone: ${stull.zone || 'unknown'}
---

## Base Glaze

| Material | % |
|---|---|
${baseTable}
${additiveTable}

## Notes

${recipe.notes || ''}
`
}

export function markdownToRecipe(content, fileId) {
  try {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
    if (!frontmatterMatch) return null

    const fm = frontmatterMatch[1]

    const get = (key) => {
      const match = fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))
      return match ? match[1].trim() : ''
    }

    const baseTableMatch = content.match(/## Base Glaze\n\n\|[^\n]+\|\n\|[^\n]+\|\n([\s\S]*?)(?:\n##|$)/)
    const baseIngredients = []
    if (baseTableMatch) {
      const rows = baseTableMatch[1].trim().split('\n')
      rows.forEach(row => {
        const cells = row.split('|').map(c => c.trim()).filter(Boolean)
        if (cells.length >= 2) {
          baseIngredients.push({
            material: cells[0],
            percent: parseFloat(cells[1]) || 0
          })
        }
      })
    }

    const additiveTableMatch = content.match(/## Additives\n\n\|[^\n]+\|\n\|[^\n]+\|\n([\s\S]*?)(?:\n##|$)/)
    const additives = []
    if (additiveTableMatch) {
      const rows = additiveTableMatch[1].trim().split('\n')
      rows.forEach(row => {
        const cells = row.split('|').map(c => c.trim()).filter(Boolean)
        if (cells.length >= 2) {
          additives.push({
            material: cells[0],
            percent: parseFloat(cells[1]) || 0
          })
        }
      })
    }

    const notesMatch = content.match(/## Notes\n\n([\s\S]*?)(?:\n##|$)/)
    const notes = notesMatch ? notesMatch[1].trim() : ''

    const parseUmfSection = (section) => {
      const result = {}
      const sectionMatch = fm.match(new RegExp(`${section}:\\n([\\s\\S]*?)(?:\\n\\w|$)`))
      if (sectionMatch) {
        const lines = sectionMatch[1].split('\n')
        lines.forEach(line => {
          const m = line.match(/^\s+(\w+):\s*([\d.]+)/)
          if (m) result[m[1]] = parseFloat(m[2])
        })
      }
      return result
    }

    const fluxes = parseUmfSection('fluxes')
    const amphoteric = parseUmfSection('amphoteric')
    const glassFormers = parseUmfSection('glass-formers')
    const unity = { ...fluxes, ...amphoteric, ...glassFormers }

    const getRatio = (key) => {
      const m = fm.match(new RegExp(`  ${key}:\\s*([\\d.]+)`))
      return m ? parseFloat(m[1]) : 0
    }

    return {
      fileId,
      id: get('id') || fileId,
      name: get('name'),
      recipeType: get('recipe-type') || 'Glaze',
      cone: get('cone-target'),
      atmosphere: get('atmosphere'),
      status: get('status'),
      created: get('created'),
      baseIngredients,
      additives,
      notes,
      chemistry: {
        unity,
        ratios: {
          silicaAlumina: getRatio('silica-alumina'),
          knaCamg: getRatio('kna-camg'),
          foodSafety: get('food-safety') || 'unknown'
        },
        stull: {
          x: getRatio('x-Al2O3'),
          y: getRatio('y-SiO2'),
          zone: get('zone') || 'unknown'
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse recipe markdown:', e)
    return null
  }
}