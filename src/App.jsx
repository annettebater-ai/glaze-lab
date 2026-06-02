import { useState, useEffect } from 'react'
import {
  Frame,
  Navigation,
  TopBar,
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

function App() {
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)
  const [currentScreen, setCurrentScreen] = useState('recipes')
  const [accessToken, setAccessToken] = useState(null)
  const [showNewRecipe, setShowNewRecipe] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState(null)
  const [recipes, setRecipes] = useState([])
  const [vaultFolders, setVaultFolders] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [mixingRecipe, setMixingRecipe] = useState(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

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
          } catch (e) {
            return null
          }
        })
      )
      setRecipes(loaded.filter(Boolean))
    } catch (error) {
      console.error('Failed to load recipes:', error)
    }
  }

  const handleSaveRecipe = async (recipeData) => {
    if (!accessToken || !vaultFolders) { alert('Not connected to Drive'); return }
    const isEdit = !!editingRecipe
    const newRecipe = {
      ...recipeData,
      id: isEdit ? editingRecipe.id : Date.now().toString(),
      fileId: isEdit ? editingRecipe.fileId : undefined,
      created: isEdit ? editingRecipe.created : new Date().toISOString().split('T')[0],
      favourite: isEdit ? editingRecipe.favourite : false,
      testCount: isEdit ? editingRecipe.testCount : 0
    }
    const slug = newRecipe.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const filename = slug + '.md'
    const content = recipeToMarkdown(newRecipe)
    try {
      setStatusMessage('Saving...')
      const existing = await findFile(accessToken, vaultFolders.recipes, filename)
      if (existing) {
        await updateFile(accessToken, existing.id, content)
        newRecipe.fileId = existing.id
      } else {
        const created = await createFile(accessToken, vaultFolders.recipes, filename, content)
        newRecipe.fileId = created.id
      }
      setRecipes(prev => [newRecipe, ...prev.filter(r => r.id !== newRecipe.id)])
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
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        )
      } catch (e) {
        console.error('Delete from Drive failed:', e)
      }
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
    setMobileNavOpen(false)
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
    setAccessToken(null)
    setVaultFolders(null)
    setRecipes([])
    setSelectedRecipe(null)
    setMixingRecipe(null)
    setEditingRecipe(null)
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

  const navigationMarkup = (
    <Navigation location="/">
      <div style={{
        padding: '16px 16px 12px',
        borderBottom: '1px solid #e3e3e3',
        marginBottom: '4px'
      }}>
        <Text variant="headingMd" as="p" fontWeight="bold">Glaze Notes</Text>
        <Text variant="bodySm" tone="subdued">{userName}</Text>
      </div>
      <Navigation.Section
        items={[
          {
            label: 'Recipes',
            selected: currentScreen === 'recipes',
            onClick: () => handleNavigate('recipes'),
          },
          {
            label: 'Mix',
            selected: currentScreen === 'mix',
            onClick: () => handleNavigate('mix'),
          },
          {
            label: 'Tests',
            selected: currentScreen === 'tests',
            onClick: () => handleNavigate('tests'),
          },
        ]}
      />
      <Navigation.Section
        title="Library"
        items={[
          {
            label: 'Clay Bodies',
            selected: currentScreen === 'clay-bodies',
            onClick: () => handleNavigate('clay-bodies'),
          },
          {
            label: 'Materials',
            selected: currentScreen === 'materials',
            onClick: () => handleNavigate('materials'),
          },
        ]}
      />
      <Navigation.Section
        title="Account"
        items={[
          {
            label: 'Search',
            selected: currentScreen === 'search',
            onClick: () => handleNavigate('search'),
          },
          {
            label: 'Settings',
            selected: currentScreen === 'settings',
            onClick: () => handleNavigate('settings'),
          },
          {
            label: 'Sign out',
            onClick: handleSignOut,
          },
        ]}
      />
    </Navigation>
  )

  const topBarMarkup = (
    <TopBar
      showNavigationToggle
      onNavigationToggle={() => setMobileNavOpen(!mobileNavOpen)}
    />
  )

  const renderScreen = () => {
    if (mixingRecipe) {
      return (
        <MixingSession
          recipe={mixingRecipe}
          onComplete={(sessionData) => {
            console.log('Session complete:', sessionData)
            setMixingRecipe(null)
            setSelectedRecipe(null)
          }}
          onCancel={() => setMixingRecipe(null)}
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
              onAction: () => {
                setShowNewRecipe(false)
                setEditingRecipe(null)
              }
            }}
          >
            <RecipeForm
              recipe={editingRecipe}
              onSave={handleSaveRecipe}
              onCancel={() => {
                setShowNewRecipe(false)
                setEditingRecipe(null)
              }}
            />
          </Page>
        )
      }
      if (selectedRecipe) {
        return (
          <Page
            title={selectedRecipe.name}
            backAction={{ content: 'Recipes', onAction: () => setSelectedRecipe(null) }}
            primaryAction={{
              content: 'Start Mixing',
              onAction: () => setMixingRecipe(selectedRecipe)
            }}
            secondaryActions={[
              {
                content: 'Edit',
                onAction: () => handleEditRecipe(selectedRecipe)
              }
            ]}
          >
            <RecipeDetail
              recipe={selectedRecipe}
              onBack={() => setSelectedRecipe(null)}
              onStartMix={(recipe) => setMixingRecipe(recipe)}
              onDelete={handleDeleteRecipe}
            />
          </Page>
        )
      }
      return (
        <Page
          title="My Recipes"
          primaryAction={{
            content: 'New Recipe',
            onAction: () => {
              setEditingRecipe(null)
              setShowNewRecipe(true)
            }
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
            />
          </BlockStack>
        </Page>
      )
    }

    if (currentScreen === 'mix') {
      return (
        <Page title="Mix">
          <Card>
            <Text tone="subdued">Select a recipe and tap Start Mixing to begin a session.</Text>
          </Card>
        </Page>
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
    <Frame
      navigation={navigationMarkup}
      topBar={topBarMarkup}
      showMobileNavigation={mobileNavOpen}
      onNavigationDismiss={() => setMobileNavOpen(false)}
    >
      {renderScreen()}
    </Frame>
  )
}

export default App