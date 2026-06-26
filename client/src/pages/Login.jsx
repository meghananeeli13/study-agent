import React, { useState } from 'react'
import { auth, googleProvider } from '../config/firebase'
import { signInWithPopup } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'

const Login = () => {
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      await signInWithPopup(auth, googleProvider)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>🧠</div>
        <h1 style={styles.title}>StudyAgent</h1>
        <p style={styles.subtitle}>Your personal AI learning companion for placement prep</p>

        <div style={styles.features}>
          <div style={styles.feature}>📅 Plans your day automatically</div>
          <div style={styles.feature}>📊 Tracks your progress across all topics</div>
          <div style={styles.feature}>🤖 Scrapes your LeetCode & HackerRank</div>
          <div style={styles.feature}>💬 Co-pilot for learning decisions</div>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <button
          style={styles.googleBtn}
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <img
            src="https://www.google.com/favicon.ico"
            alt="Google"
            style={{ width: 18, height: 18 }}
          />
          {loading ? 'Signing in...' : 'Continue with Google'}
        </button>

        <p style={styles.note}>Free forever · Your data stays private</p>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#0d0f14',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Inter, sans-serif'
  },
  card: {
    background: '#161920',
    border: '0.5px solid #2a2e3d',
    borderRadius: '16px',
    padding: '40px',
    width: '100%',
    maxWidth: '420px',
    textAlign: 'center'
  },
  logo: {
    fontSize: '48px',
    marginBottom: '12px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#e8eaf2',
    margin: '0 0 8px'
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7080',
    margin: '0 0 28px',
    lineHeight: '1.5'
  },
  features: {
    background: '#1e2230',
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '24px',
    textAlign: 'left'
  },
  feature: {
    fontSize: '13px',
    color: '#9aa0b8',
    padding: '6px 0',
    lineHeight: '1.5'
  },
  error: {
    background: 'rgba(255,100,100,0.1)',
    border: '0.5px solid rgba(255,100,100,0.3)',
    borderRadius: '8px',
    padding: '10px',
    color: '#ff6464',
    fontSize: '13px',
    marginBottom: '16px'
  },
  googleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    width: '100%',
    padding: '12px',
    background: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    color: '#333',
    marginBottom: '16px'
  },
  note: {
    fontSize: '12px',
    color: '#6b7080'
  }
}

export default Login