import { useState, useEffect } from 'react'
import './App.css'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
].join(' ')

function App() {
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)
  const [debugInfo, setDebugInfo] = useState('')

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
        setDebugInfo('Token extraction failed')
        setLoading(false)
      }
    } else {
      const storedToken = localStorage.getItem('google_access_token')
      if (storedToken) {
        fetchUserInfo(storedToken)
      } else {
        setDebugInfo('No token — please sign in')
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
        setIsSignedIn(true)
      } else {
        setDebugInfo(`Error ${response.status}: ${JSON.stringify(data)}`)
        localStorage.removeItem('google_access_token')
      }
    } catch (error) {
      setDebugInfo(`Fetch error: ${error.message}`)
      localStorage.removeItem('google_access_token')
    }
    setLoading(false)
  }

  const handleSignIn = () => {
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(window.location.origin)}` +
      `&response_type=token` +
      `&scope=${encodeURIComponent(SCOPES)}` +
      `&prompt=consent`
    window.location.href = authUrl
  }

  const handleSignOut = () => {
    localStorage.removeItem('google_access_token')
    setIsSignedIn(false)
    setUserName('')
  }

  if (loading) {
    return (
      <div className="app">
        <div className="login-screen">
          <div className="login-card">
            <h1>Glaze Lab</h1>
            <p>Loading...</p>
            <p style={{fontSize: '10px', marginTop: '16px', color: '#999', wordBreak: 'break-all'}}>
              {debugInfo}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {!isSignedIn ? (
        <div className="login-screen">
          <div className="login-card">
            <h1>Glaze Lab</h1>
            <p>Your personal glaze chemistry studio</p>
            <button onClick={handleSignIn} className="google-btn">
              Sign in with Google
            </button>
            <p style={{fontSize: '10px', marginTop: '16px', color: '#999', wordBreak: 'break-all'}}>
              {debugInfo}
            </p>
          </div>
        </div>
      ) : (
        <div className="app">
          <div className="home-screen">
            <div className="home-header">
              <h1>Glaze Lab</h1>
              <button onClick={handleSignOut} className="signout-btn">
                Sign out
              </button>
            </div>
            <p>Welcome, {userName}. Your vault is connected.</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default App