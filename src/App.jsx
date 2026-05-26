import { useState, useEffect } from 'react'
import Navigation from './Navigation'
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
      } else {
        localStorage.removeItem('google_access_token')
      }
    } catch (error) {
      localStorage.removeItem('google_access_token')
    }
    setLoading(false)
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
  }

  if (loading) {
    return (
      <div className="app">
        <div className="login-screen">
          <div className="login-card">
            <h1>Glaze Lab</h1>
            <p>Loading...</p>
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

  return (
    <div className="app">
      <div className="screen-container">
        <div className="screen-header">
          <h1>Glaze Lab</h1>
          <button onClick={handleSignOut} className="signout-btn">
            Sign out
          </button>
        </div>
        <div className="screen-content">
          {currentScreen === 'recipes' && (
            <div className="placeholder-screen">
              <p>Recipes coming next</p>
            </div>
          )}
          {currentScreen === 'tests' && (
            <div className="placeholder-screen">
              <p>Test Results coming soon</p>
            </div>
          )}
          {currentScreen === 'mix' && (
            <div className="placeholder-screen">
              <p>Mixing Sessions coming soon</p>
            </div>
          )}
          {currentScreen === 'firings' && (
            <div className="placeholder-screen">
              <p>Firings coming soon</p>
            </div>
          )}
          {currentScreen === 'search' && (
            <div className="placeholder-screen">
              <p>Search coming soon</p>
            </div>
          )}
        </div>
      </div>
      <Navigation currentScreen={currentScreen} onNavigate={setCurrentScreen} />
    </div>
  )
}

export default App