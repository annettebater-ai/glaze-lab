import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import MoreScreen from './MoreScreen'
import RecipeLibrary from './RecipeLibrary'
import RecipeForm from './RecipeForm'
import { ensureVaultStructure, listFiles, readFile, createFile, findFile, updateFile, recipeToMarkdown, markdownToRecipe } from './drive'
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

const IS_DESKTOP = window.innerWidth >= 100

function App() {
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)
  const [currentScreen, setCurrentScreen] = useState('recipes')
  const [accessToken, setAccessToken] = useState(null)
  const [showNewRecipe, setShowNewRecipe] = useState(false)
  const [recipes, setRecipes] = useState([])
  const [recipesLoading, setRecipesLoading] = useState(false)
  const [vaultFolders, setVaultFolders] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [isDesktop, setIsDesktop] = useState(IS_DESKTOP)

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
    setRecipesLoading(true)
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
    } finally {
      setRecipesLoading(false)
    }
  }

  const handleSaveRecipe = async (recipeData) => {
    if (!accessToken || !vaultFolders) { alert('Not connected to Drive'); return }
    const newRecipe = {
      ...recipeData,
      id: Date.now().toString(),
      created: new Date().toISOString().split('T')[0],
      favourite: false,
      testCount: 0
    }
    const slug = newRecipe.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const filename = `${slug}.md`
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
      setRecipes(prev => [newRecipe, ...prev.filter(r => r.name !== newRecipe.name)])
      setShowNewRecipe(false)
      setStatusMessage('Saved ✓')
      setTimeout(() => setStatusMessage(''), 2000)
    } catch (error) {
      console.error('Save error:', error)
      setStatusMessage('Save failed')
      setTimeout(() => setStatusMessage(''), 3000)
    }
  }

  const handleToggleFavourite = async (recipeId) => {
    setRecipes(prev => prev.map(r =>
      r.id === recipeId ? { ...r, favourite: !r.favourite } : r
    ))
  }

  const handleNavigate = (screen) => {
    setCurrentScreen(screen)
    setShowNewRecipe(false)
  }

  const handleSignIn = () => {
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&response_type=token` +
      `&scope=${encodeURIComponent(SCOPES)}` +
      `&prompt=consent`
    window.location.href = authUrl
  }

  const handleSignOut = () => {
    localStorage.removeItem('google_access_token')
    setIsSignedIn(false)
    setUserName('')
    setAccessToken(null)
    setVaultFolders(null)
    setRecipes([])
  }

  if (loading) {
    return (
      <div className="app">
        <div className="login-screen">
          <div className="login-card">
            <h1>Glaze Lab</h1>
            <p>{statusMessage || 'Loading...'}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="app">
        <div className="login-screen">
          <div className="login-card">
            <h1>Glaze Lab</h1>
            <p>Your personal glaze chemistry studio</p>
            <button onClick={handleSignIn} className="google-btn">
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderScreen = () => {
    if (currentScreen === 'recipes') {
      if (showNewRecipe) {
        return (
          <RecipeForm
            onSave={handleSaveRecipe}
            onCancel={() => setShowNewRecipe(false)}
          />
        )
      }
      return (
        <RecipeLibrary
          recipes={recipes}
          onNewRecipe={() => setShowNewRecipe(true)}
          onSelectRecipe={(recipe) => console.log('Selected:', recipe.name)}
          onToggleFavourite={handleToggleFavourite}
        />
      )
    }
    if (currentScreen === 'more') return <MoreScreen onNavigate={handleNavigate} />
    return (
      <div className="placeholder-screen">
        <p>{currentScreen.charAt(0).toUpperCase() + currentScreen.slice(1).replace('-', ' ')} coming soon</p>
      </div>
    )
  }

  return (
    <div className={`app ${isDesktop ? 'desktop' : 'mobile'}`}>
      {isDesktop && (
        <Sidebar
          currentScreen={currentScreen}
          onNavigate={handleNavigate}
          userName={userName}
          onSignOut={handleSignOut}
        />
      )}
      <div className={`main-content ${isDesktop ? 'with-sidebar' : 'with-bottom-nav'}`}>
        {!isDesktop && (
          <div className="mobile-header">
            <h1>Glaze Lab</h1>
            {statusMessage && <span className="status-msg">{statusMessage}</span>}
          </div>
        )}
        {isDesktop && statusMessage && (
          <div className="desktop-status">{statusMessage}</div>
        )}
        <div className="screen-content">
          {renderScreen()}
        </div>
      </div>
      {!isDesktop && (
        <BottomNav currentScreen={currentScreen} onNavigate={handleNavigate} />
      )}
    </div>
  )
}

export default App