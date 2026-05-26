import { useState, useEffect } from 'react'
import './App.css'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPES = 'https://www.googleapis.com/auth/drive.file'

function App() {
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if we're returning from Google OAuth
    const hash = window.location.hash
    if (hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1))
      const token = params.get('access_token')
      if (token) {
        localStorage.setItem('google_access_token', token)
        window.location.hash = ''
        fetchUserInfo(token)
      }
    } else {
      // Check if we have a stored token
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
      if (response.ok) {
        const data = await response.json()
        setUserName(data.given_name || data.email)
        setIsSignedIn(true)
      } else {
        localStorage.removeItem('google_access_token')
      }
    } catch (error) {
      console.error('Error fetching user info:', error)
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
          </div>
        </div>
      ) : (
        <div className="home-screen">
          <div className="home-header">
            <h1>Glaze Lab</h1>
            <button onClick={handleSignOut} className="signout-btn">
              Sign out
            </button>
          </div>
          <p>Welcome, {userName}. Your vault is connected.</p>
        </div>
      )}
    </div>
  )
}

export default App