import { useState } from 'react'
import './App.css'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY
const SCOPES = 'https://www.googleapis.com/auth/drive.file'

function App() {
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [userName, setUserName] = useState('')

  const handleSignIn = () => {
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(window.location.origin)}` +
      `&response_type=token` +
      `&scope=${encodeURIComponent(SCOPES)}` +
      `&prompt=consent`
    window.location.href = authUrl
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
          <h1>Welcome, {userName}</h1>
          <p>Your vault is connected.</p>
        </div>
      )}
    </div>
  )
}

export default App