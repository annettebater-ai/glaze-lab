
import { useState, useEffect } from 'react'
import {
  Page,
  Text,
  Button,
  InlineStack,
  Spinner,
  Card,
  BlockStack,
} from '@shopify/polaris'
import RecipeTable from './RecipeTable'
import RecipeForm from './RecipeForm'
import RecipeDetail from './RecipeDetail'
import MixingSession from './MixingSession'
import MaterialsScreen from './MaterialsScreen'
import ClayBodiesScreen from './ClayBodiesScreen'
import TestsResultsScreen from './TestsResultsScreen'
import GlazeInventoryScreen from './GlazeInventoryScreen'
import {
  ensureVaultStructure,
  listFiles,
  readFile,
  createFile,
  findFile,
  updateFile,
  recipeToMarkdown,
  markdownToRecipe
} from './drive'
import { testResultToMarkdown, markdownToTestResult } from './testResults'
import { materialToMarkdown, markdownToMaterial, toGrams, fromGrams } from './materials'
import { clayBodyToMarkdown, markdownToClayBody } from './clayBodies'
import { glazeInventoryToMarkdown, markdownToGlazeInventory } from './glazeInventory'
import { DEFAULT_OBJECT_TYPES } from './objectTypes'
import './App.css'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const REDIRECT_URI = window.location.hostname === 'localhost'
  ? 'http://localhost:5173'
  : 'https://glaze-lab-six.vercel.app'
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
].join(' ')

const GlazeNotesLogo = () => (
  <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
    <rect x="5" y="12" width="18" height="13" rx="2" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
    <rect x="10" y="17" width="8" height="8" rx="1" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.4)" strokeWidth="1"/>
    <path d="M14 11 C14 11 11 8 12 5 C12 5 13 7 14 6 C14 6 15 4 16 5 C17 7 14 11 14 11Z" fill="#c8a96e"/>
    <path d="M14 10 C14 10 12.5 8.5 13 7 C13.5 8 14 7.5 14 7.5 C14 7.5 14.5 8 15 7 C15.5 8.5 14 10 14 10Z" fill="#f0c878"/>
    <line x1="12" y1="20" x2="16" y2="20" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeLinecap="round"/>
    <line x1="12" y1="22" x2="15" y2="22" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeLinecap="round"/>
  </svg>
)

const BurgerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M2 5h16M2 10h16M2 15h16" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
    <circle cx="9" cy="9" r="7" stroke="rgba(255,255,255,0.6)" strokeWidth="2"/>
    <path d="M15 15l3 3" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

const NAV_ITEMS = [
  { id: 'glaze-inventory', label: 'Glaze Inventory' },
  { id: 'recipes', label: 'Recipes' },
  { id: 'tests', label: 'Tests' },
  { id: 'clay-bodies', label: 'Clay Bodies' },
  { id: 'materials', label: 'Materials' },
]

function App() {
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [currentScreen, setCurrentScreen] = useState('glaze-inventory')
  const [accessToken, setAccessToken] = useState(null)
  const [showNewRecipe, setShowNewRecipe] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState(null)
  const [recipes, setRecipes] = useState([])
  const [testResults, setTestResults] = useState([])
  const [mixingSessions, setMixingSessions] = useState([])
  const [materials, setMaterials] = useState([])
  const [clayBodies, setClayBodies] = useState([])
  const [objectTypes, setObjectTypes] = useState(DEFAULT_OBJECT_TYPES)
  const [glazeInventory, setGlazeInventory] = useState([])
  const [vaultFolders, setVaultFolders] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [mixingRecipe, setMixingRecipe] = useState(null)
  const [navOpen, setNavOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  useEffect(() => {
    const hash = window.location.hash
    if (hash && hash.includes('access_token')) {
      const tokenMatch = hash.match(/access_token=([^&]+)/)
      const token = tokenMatch ? tokenMatch[1] : null
      if (token) {
        localStorage.setItem('google_access_token', token)
        history.replaceState(null, null, window.location.pathname)
        fetchUserInfo(token)
      } else {
        setLoading(false)
      }
    } else {
      const storedToken = localStorage.getItem('google_access_token')
      if (storedToken) {
        fetchUserInfo(storedToken)
      } else {
        setLoading(false)
      }
    }
  }, [])

  const fetchUserInfo = async (token) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      if (response.ok) {
        setUserName(data.given_name || data.email)
        setUserEmail(data.email || '')
        setAccessToken(token)
        setIsSignedIn(true)
        initVault(token)
      } else {
        localStorage.removeItem('google_access_token')
        setLoading(false)
      }
    } catch (error) {
      localStorage.removeItem('google_access_token')
      setLoading(false)
    }
  }

  const initVault = async (token) => {
    try {
      setStatusMessage('Setting up vault...')
      const folders = await ensureVaultStructure(token)
      setVaultFolders(folders)
      setStatusMessage('Loading recipes...')
      await loadRecipes(token, folders.recipes)
      setStatusMessage('Loading tests...')
      await loadTestResults(token, folders.testResults)
      setStatusMessage('Loading materials...')
      await loadMaterials(token, folders.materials)
      setStatusMessage('Loading clay bodies...')
      await loadClayBodies(token, folders.clayBodies)
      setStatusMessage('Loading glaze inventory...')
      await loadGlazeInventory(token, folders.glazeInventory)
      setStatusMessage('')
    } catch (error) {
      console.error('Vault init error:', error)
      setStatusMessage('Error connecting to Drive')
    } finally {
      setLoading(false)
    }
  }

  const loadRecipes = async (token, folderId) => {
    try {
      const files = await listFiles(token, folderId)
      const loaded = await Promise.all(
        files.map(async (file) => {
          try {
            const content = await readFile(token, file.id)
            return markdownToRecipe(content, file.id)
          } catch (e) { return null }
        })
      )
      setRecipes(loaded.filter(Boolean))
    } catch (error) {
      console.error('Failed to load recipes:', error)
    }
  }

  const loadTestResults = async (token, folderId) => {
    if (!folderId) return
    try {
      const files = await listFiles(token, folderId)
      const loaded = await Promise.all(
        files.map(async (file) => {
          try {
            const content = await readFile(token, file.id)
            return markdownToTestResult(content, file.id)
          } catch (e) { return null }
        })
      )
      setTestResults(loaded.filter(Boolean))
    } catch (error) {
      console.error('Failed to load test results:', error)
    }
  }

  const loadMaterials = async (token, folderId) => {
    if (!folderId) return
    try {
      const files = await listFiles(token, folderId)
      const loaded = await Promise.all(
        files.map(async (file) => {
          try {
            const content = await readFile(token, file.id)
            return markdownToMaterial(content, file.id)
          } catch (e) { return null }
        })
      )
      setMaterials(loaded.filter(Boolean))
    } catch (error) {
      console.error('Failed to load materials:', error)
    }
  }

  const loadClayBodies = async (token, folderId) => {
    if (!folderId) return
    try {
      const files = await listFiles(token, folderId)
      const loaded = await Promise.all(
        files.map(async (file) => {
          try {
            const content = await readFile(token, file.id)
            return markdownToClayBody(content, file.id)
          } catch (e) { return null }
        })
      )
      setClayBodies(loaded.filter(Boolean))
    } catch (error) {
      console.error('Failed to load clay bodies:', error)
    }
  }

  const loadGlazeInventory = async (token, folderId) => {
    if (!folderId) return
    try {
      const files = await listFiles(token, folderId)
      const loaded = await Promise.all(
        files.map(async (file) => {
          try {
            const content = await readFile(token, file.id)
            return markdownToGlazeInventory(content, file.id)
          } catch (e) { return null }
        })
      )
      setGlazeInventory(loaded.filter(Boolean))
    } catch (error) {
      console.error('Failed to load glaze inventory:', error)
    }
  }

  const handleSaveRecipe = async (recipeData) => {
    if (!accessToken || !vaultFolders) { alert('Not connected to Drive'); return }
    const isEdit = !!editingRecipe || !!recipeData.fileId
    const existingRecipe = editingRecipe || recipes.find(r => r.id === recipeData.id)
    const newRecipe = {
      ...recipeData,
      id: isEdit ? (existingRecipe?.id || recipeData.id) : Date.now().toString(),
      fileId: isEdit ? (existingRecipe?.fileId || recipeData.fileId) : undefined,
      created: isEdit ? (existingRecipe?.created || recipeData.created) : new Date().toISOString().split('T')[0],
      favourite: isEdit ? (existingRecipe?.favourite || false) : false,
      testCount: isEdit ? (existingRecipe?.testCount || 0) : 0
    }
    const slug = newRecipe.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const filename = slug + '.md'
    const content = recipeToMarkdown(newRecipe)
    try {
      setStatusMessage('Saving...')
      if (newRecipe.fileId) {
        await updateFile(accessToken, newRecipe.fileId, content)
      } else {
        const existing = await findFile(accessToken, vaultFolders.recipes, filename)
        if (existing) {
          await updateFile(accessToken, existing.id, content)
          newRecipe.fileId = existing.id
        } else {
          const created = await createFile(accessToken, vaultFolders.recipes, filename, content)
          newRecipe.fileId = created.id
        }
      }
      setRecipes(prev => [newRecipe, ...prev.filter(r => r.id !== newRecipe.id)])
      if (selectedRecipe?.id === newRecipe.id) setSelectedRecipe(newRecipe)
      setShowNewRecipe(false)
      setEditingRecipe(null)
      setStatusMessage('Saved')
      setTimeout(() => setStatusMessage(''), 2000)
    } catch (error) {
      console.error('Save error:', error)
      setStatusMessage('Save failed')
      setTimeout(() => setStatusMessage(''), 3000)
    }
  }

  const handleSaveTestResult = async (resultData) => {
    if (!accessToken || !vaultFolders) { alert('Not connected to Drive'); return }
    try {
      setStatusMessage('Saving...')
      const filename = `${resultData.recipeSlug}-${resultData.id}.md`
      const content = testResultToMarkdown(resultData)
      if (resultData.fileId) {
        await updateFile(accessToken, resultData.fileId, content)
        setTestResults(prev => prev.map(r => r.id === resultData.id ? resultData : r))
      } else {
        const created = await createFile(accessToken, vaultFolders.testResults, filename, content)
        resultData.fileId = created.id
        setTestResults(prev => {
          const exists = prev.find(r => r.id === resultData.id)
          if (exists) return prev.map(r => r.id === resultData.id ? resultData : r)
          return [resultData, ...prev]
        })
      }
      setStatusMessage('Saved')
      setTimeout(() => setStatusMessage(''), 2000)
    } catch (error) {
      console.error('Save test result error:', error)
      setStatusMessage('Save failed')
      setTimeout(() => setStatusMessage(''), 3000)
    }
  }

  const handleDeleteTestResult = async (result) => {
    if (result.fileId && accessToken) {
      try {
        await fetch(
          `https://www.googleapis.com/drive/v3/files/${result.fileId}`,
          { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
        )
      } catch (e) { console.error('Delete test result failed:', e) }
    }
    setTestResults(prev => prev.filter(r => r.id !== result.id))
  }

  const handleSaveMaterial = async (materialData) => {
    if (!accessToken || !vaultFolders) { alert('Not connected to Drive'); return }
    try {
      setStatusMessage('Saving...')
      const filename = materialData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + materialData.id + '.md'
      const content = materialToMarkdown(materialData)
      if (materialData.fileId) {
        await updateFile(accessToken, materialData.fileId, content)
        setMaterials(prev => prev.map(m => m.id === materialData.id ? materialData : m))
      } else {
        const created = await createFile(accessToken, vaultFolders.materials, filename, content)
        materialData.fileId = created.id
        setMaterials(prev => {
          const exists = prev.find(m => m.id === materialData.id)
          if (exists) return prev.map(m => m.id === materialData.id ? materialData : m)
          return [materialData, ...prev]
        })
      }
      setStatusMessage('Saved')
      setTimeout(() => setStatusMessage(''), 2000)
    } catch (error) {
      console.error('Save material error:', error)
      setStatusMessage('Save failed')
      setTimeout(() => setStatusMessage(''), 3000)
    }
  }

  const handleDeleteMaterial = async (material) => {
    if (material.fileId && accessToken) {
      try {
        await fetch(
          `https://www.googleapis.com/drive/v3/files/${material.fileId}`,
          { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
        )
      } catch (e) { console.error('Delete material failed:', e) }
    }
    setMaterials(prev => prev.filter(m => m.id !== material.id))
  }

  const handleSaveClayBody = async (clayBodyData) => {
    if (!accessToken || !vaultFolders) { alert('Not connected to Drive'); return }
    try {
      setStatusMessage('Saving...')
      const filename = clayBodyData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + clayBodyData.id + '.md'
      const content = clayBodyToMarkdown(clayBodyData)
      if (clayBodyData.fileId) {
        await updateFile(accessToken, clayBodyData.fileId, content)
        setClayBodies(prev => prev.map(c => c.id === clayBodyData.id ? clayBodyData : c))
      } else {
        const created = await createFile(accessToken, vaultFolders.clayBodies, filename, content)
        clayBodyData.fileId = created.id
        setClayBodies(prev => {
          const exists = prev.find(c => c.id === clayBodyData.id)
          if (exists) return prev.map(c => c.id === clayBodyData.id ? clayBodyData : c)
          return [clayBodyData, ...prev]
        })
      }
      setStatusMessage('Saved')
      setTimeout(() => setStatusMessage(''), 2000)
    } catch (error) {
      console.error('Save clay body error:', error)
      setStatusMessage('Save failed')
      setTimeout(() => setStatusMessage(''), 3000)
    }
  }

  const handleDeleteClayBody = async (clayBody) => {
    if (clayBody.fileId && accessToken) {
      try {
        await fetch(
          `https://www.googleapis.com/drive/v3/files/${clayBody.fileId}`,
          { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
        )
      } catch (e) { console.error('Delete clay body failed:', e) }
    }
    setClayBodies(prev => prev.filter(c => c.id !== clayBody.id))
  }

  const handleSaveObjectType = (objectType) => {
    setObjectTypes(prev => {
      const exists = prev.find(o => o.id === objectType.id)
      if (exists) return prev.map(o => o.id === objectType.id ? objectType : o)
      return [...prev, objectType]
    })
  }

  const handleDeleteObjectType = (objectType) => {
    setObjectTypes(prev => prev.filter(o => o.id !== objectType.id))
  }

  const handleSaveGlazeInventoryEntry = async (entry) => {
    if (!accessToken || !vaultFolders) return
    try {
      const filename = `${entry.recipeSlug || entry.id}-${entry.id}.md`
      const content = glazeInventoryToMarkdown(entry)
      if (entry.fileId) {
        await updateFile(accessToken, entry.fileId, content)
        setGlazeInventory(prev => prev.map(e => e.id === entry.id ? entry : e))
      } else {
        const created = await createFile(accessToken, vaultFolders.glazeInventory, filename, content)
        entry.fileId = created.id
        setGlazeInventory(prev => {
          const exists = prev.find(e => e.id === entry.id)
          if (exists) return prev.map(e => e.id === entry.id ? entry : e)
          return [entry, ...prev]
        })
      }
    } catch (error) {
      console.error('Save glaze inventory error:', error)
    }
  }

  const handleDeleteGlazeInventoryEntry = async (entry) => {
    if (entry.fileId && accessToken) {
      try {
        await fetch(
          `https://www.googleapis.com/drive/v3/files/${entry.fileId}`,
          { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
        )
      } catch (e) { console.error('Delete glaze inventory entry failed:', e) }
    }
    setGlazeInventory(prev => prev.filter(e => e.id !== entry.id))
  }

  const handleSessionComplete = async (sessionData) => {
    const recipe = sessionData.recipe
    const batchGrams = sessionData.batchGrams
    if (!batchGrams || !recipe) return

    const allIngredients = [
      ...(recipe.baseIngredients || []),
      ...(recipe.additives || [])
    ].filter(i => i.material)

    const updatedMaterials = [...materials]
    for (const ing of allIngredients) {
      const usedGrams = batchGrams * ing.percent / 100
      const matIndex = updatedMaterials.findIndex(
        m => m.name.toLowerCase() === ing.material.toLowerCase()
      )
      if (matIndex >= 0) {
        const mat = updatedMaterials[matIndex]
        const currentGrams = toGrams(mat.amount, mat.unit)
        const newGrams = Math.max(0, currentGrams - usedGrams)
        const newAmount = fromGrams(newGrams, mat.unit)
        updatedMaterials[matIndex] = {
          ...mat,
          amount: parseFloat(newAmount.toFixed(3)),
          isApproximate: true
        }
        await handleSaveMaterial(updatedMaterials[matIndex])
      }
    }
    setMaterials(updatedMaterials)

    const inventoryEntry = {
      id: sessionData.id || Date.now().toString(),
      entryType: 'mixed',
      recipeId: recipe.id,
      recipeSlug: recipe.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      recipeName: recipe.name,
      dateMixed: sessionData.date,
      batchSize: sessionData.batchSize,
      batchUnit: sessionData.unit,
      batchGrams: sessionData.batchGrams,
      batchCost: sessionData.batchCost || null,
      batchCostEstimated: sessionData.batchCostEstimated || false,
      sg: sessionData.sgMeasured || null,
      isLow: false,
      isUsedUp: false,
      notes: sessionData.notes || '',
    }
    await handleSaveGlazeInventoryEntry(inventoryEntry)

    setMixingSessions(prev => [sessionData, ...prev])
    setMixingRecipe(null)
    setSelectedRecipe(null)
  }

  const handleToggleFavourite = (recipeId) => {
    setRecipes(prev => prev.map(r =>
      r.id === recipeId ? { ...r, favourite: !r.favourite } : r
    ))
  }

  const handleDeleteRecipe = async (recipe) => {
    if (recipe.fileId && accessToken) {
      try {
        await fetch(
          `https://www.googleapis.com/drive/v3/files/${recipe.fileId}`,
          { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
        )
      } catch (e) { console.error('Delete from Drive failed:', e) }
    }
    setRecipes(prev => prev.filter(r => r.id !== recipe.id))
    setSelectedRecipe(null)
  }

  const handleEditRecipe = (recipe) => {
    setEditingRecipe(recipe)
    setShowNewRecipe(true)
    setSelectedRecipe(null)
  }

  const handleNavigate = (screen) => {
    setCurrentScreen(screen)
    setShowNewRecipe(false)
    setEditingRecipe(null)
    setSelectedRecipe(null)
    setMixingRecipe(null)
    setNavOpen(false)
    setUserMenuOpen(false)
  }

  const handleSignIn = () => {
    const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' +
      'client_id=' + GOOGLE_CLIENT_ID +
      '&redirect_uri=' + encodeURIComponent(REDIRECT_URI) +
      '&response_type=token' +
      '&scope=' + encodeURIComponent(SCOPES) +
      '&prompt=consent'
    window.location.href = authUrl
  }

  const handleSignOut = () => {
    localStorage.removeItem('google_access_token')
    setIsSignedIn(false)
    setUserName('')
    setUserEmail('')
    setAccessToken(null)
    setVaultFolders(null)
    setRecipes([])
    setTestResults([])
    setMixingSessions([])
    setMaterials([])
    setClayBodies([])
    setObjectTypes(DEFAULT_OBJECT_TYPES)
    setGlazeInventory([])
    setSelectedRecipe(null)
    setMixingRecipe(null)
    setEditingRecipe(null)
    setNavOpen(false)
    setUserMenuOpen(false)
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-card">
          <BlockStack gap="400" inlineAlign="center">
            <Text variant="headingXl" as="h1">Glaze Notes</Text>
            <Spinner size="small" />
            <Text variant="bodyMd" tone="subdued">{statusMessage || 'Loading...'}</Text>
          </BlockStack>
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <BlockStack gap="400" inlineAlign="center">
            <GlazeNotesLogo />
            <Text variant="headingXl" as="h1">Glaze Notes</Text>
            <Text variant="bodyMd" tone="subdued">Your personal glaze chemistry studio</Text>
            <Button variant="primary" size="large" onClick={handleSignIn}>
              Sign in with Google
            </Button>
          </BlockStack>
        </div>
      </div>
    )
  }

  const userInitial = userName ? userName.charAt(0).toUpperCase() : '?'

  const renderScreen = () => {
    if (mixingRecipe) {
      return (
        <MixingSession
          recipe={mixingRecipe}
          materials={materials}
          objectTypes={objectTypes}
          onComplete={handleSessionComplete}
          onCancel={() => setMixingRecipe(null)}
        />
      )
    }

    if (currentScreen === 'glaze-inventory') {
      return (
        <GlazeInventoryScreen
          glazeInventory={glazeInventory}
          recipes={recipes}
          testResults={testResults}
          materials={materials}
          accessToken={accessToken}
          objectTypes={objectTypes}
          onUpdateEntry={handleSaveGlazeInventoryEntry}
          onDeleteEntry={handleDeleteGlazeInventoryEntry}
          onMixNew={(recipe) => setMixingRecipe(recipe)}
        />
      )
    }

    if (currentScreen === 'recipes') {
      if (showNewRecipe) {
        return (
          <Page
            title={editingRecipe ? 'Edit Recipe' : 'New Recipe'}
            backAction={{
              content: 'Recipes',
              onAction: () => { setShowNewRecipe(false); setEditingRecipe(null) }
            }}
          >
            <RecipeForm
              recipe={editingRecipe}
              onSave={handleSaveRecipe}
              onCancel={() => { setShowNewRecipe(false); setEditingRecipe(null) }}
              materials={materials}
              onAddMaterial={handleSaveMaterial}
            />
          </Page>
        )
      }
      if (selectedRecipe) {
        return (
          <Page
            title={selectedRecipe.name}
            backAction={{ content: 'Recipes', onAction: () => setSelectedRecipe(null) }}
          >
            <RecipeDetail
              recipe={selectedRecipe}
              onBack={() => setSelectedRecipe(null)}
              onStartMix={(recipe) => setMixingRecipe(recipe)}
              onDelete={handleDeleteRecipe}
              onSaveRecipe={handleSaveRecipe}
              onEditRecipe={handleEditRecipe}
              testResults={testResults}
              mixingSessions={mixingSessions.filter(s => s.recipeId === selectedRecipe.id)}
              onSaveTestResult={handleSaveTestResult}
              onDeleteTestResult={handleDeleteTestResult}
              accessToken={accessToken}
              photosFolderId={vaultFolders?.photos}
              materials={materials}
              clayBodies={clayBodies}
            />
          </Page>
        )
      }
      return (
        <Page
          title="Recipes"
          primaryAction={{
            content: 'New Recipe',
            onAction: () => { setEditingRecipe(null); setShowNewRecipe(true) }
          }}
        >
          <BlockStack gap="400">
            {statusMessage ? (
              <InlineStack gap="200" align="center">
                <Spinner size="small" />
                <Text tone="subdued">{statusMessage}</Text>
              </InlineStack>
            ) : null}
            <RecipeTable
              recipes={recipes}
              onSelectRecipe={(recipe) => setSelectedRecipe(recipe)}
              onToggleFavourite={handleToggleFavourite}
              onDeleteRecipe={handleDeleteRecipe}
              onEditRecipe={handleEditRecipe}
              testResults={testResults}
              materials={materials}
            />
          </BlockStack>
        </Page>
      )
    }

    if (currentScreen === 'tests') {
      return (
        <TestsResultsScreen
          testResults={testResults}
          recipes={recipes}
          clayBodies={clayBodies}
          glazeInventory={glazeInventory}
          onSaveTestResult={handleSaveTestResult}
          onDeleteTestResult={handleDeleteTestResult}
          accessToken={accessToken}
          photosFolderId={vaultFolders?.photos}
        />
      )
    }

    if (currentScreen === 'materials') {
      return (
        <MaterialsScreen
          materials={materials}
          onSaveMaterial={handleSaveMaterial}
          onDeleteMaterial={handleDeleteMaterial}
        />
      )
    }

    if (currentScreen === 'clay-bodies') {
      return (
        <ClayBodiesScreen
          clayBodies={clayBodies}
          onSaveClayBody={handleSaveClayBody}
          onDeleteClayBody={handleDeleteClayBody}
          objectTypes={objectTypes}
          onSaveObjectType={handleSaveObjectType}
          onDeleteObjectType={handleDeleteObjectType}
        />
      )
    }

    return (
      <Page title={currentScreen.charAt(0).toUpperCase() + currentScreen.slice(1).replace('-', ' ')}>
        <Card>
          <Text tone="subdued">Coming soon</Text>
        </Card>
      </Page>
    )
  }

  return (
    <div className="app-shell">
      <div className="app-topbar">
        <button className="topbar-burger" onClick={() => setNavOpen(!navOpen)}>
          <BurgerIcon />
        </button>
        <div className="topbar-logo">
          <GlazeNotesLogo />
          <span className="topbar-logo-text">Glaze Notes</span>
        </div>
        <div className="topbar-search">
          <div className="topbar-search-field" onClick={() => handleNavigate('search')}>
            <SearchIcon />
            <input type="text" placeholder="Search recipes, materials..." readOnly />
          </div>
        </div>
        <div className="topbar-right">
          <div className="topbar-user" onClick={() => setUserMenuOpen(!userMenuOpen)}>
            <div className="topbar-avatar">{userInitial}</div>
            <span className="topbar-username">{userName}</span>
            {userMenuOpen && (
              <div className="user-menu-dropdown">
                <div className="user-menu-name">{userName}</div>
                <div className="user-menu-email">{userEmail}</div>
                <div className="user-menu-divider" />
                <button className="user-menu-item" onClick={handleSignOut}>Sign out</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {navOpen && (
        <>
          <div className="nav-overlay" onClick={() => setNavOpen(false)} />
          <div className="nav-drawer">
            <div className="nav-items">
              {NAV_ITEMS.map(item => (
                <button
                  key={item.id}
                  className={`nav-item ${currentScreen === item.id ? 'active' : ''}`}
                  onClick={() => handleNavigate(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="nav-settings">
              <button
                className={`nav-item ${currentScreen === 'settings' ? 'active' : ''}`}
                onClick={() => handleNavigate('settings')}
              >
                Settings
              </button>
            </div>
          </div>
        </>
      )}

      <div className="app-main">
        {renderScreen()}
      </div>
    </div>
  )
}

export default App