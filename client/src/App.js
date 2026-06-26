import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { auth } from './config/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Onboarding from './pages/Onboarding'
import Layout from './components/Layout'
import api from './config/api'
import Progress from './pages/Progress'
import Settings from './pages/Settings'
import Copilot from './pages/Copilot'


const App = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [onboardingDone, setOnboardingDone] = useState(null) // null = unknown

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)
      if (currentUser) {
         try {
        const res = await api.get('/profile')
        console.log('PROFILE RESPONSE:', res.data)
        setOnboardingDone(res.data.onboardingDone === true)
      } catch (e) {
        console.log('PROFILE ERROR:', e.response?.data || e.message)
        setOnboardingDone(false)
      }
      } else {
        setOnboardingDone(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  // still checking
  if (loading || (user && onboardingDone === null)) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg-950)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif'
      }}>
        Loading...
      </div>
    )
  }

  const ProtectedLayout = ({ children }) => {
    if (!user) return <Navigate to="/login" />
    if (onboardingDone === false) return <Navigate to="/onboarding" />
    return <Layout>{children}</Layout>
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          !user ? <Login /> : <Navigate to={onboardingDone ? "/dashboard" : "/onboarding"} />
        } />
        <Route path="/onboarding" element={
          !user ? <Navigate to="/login" /> :
          onboardingDone ? <Navigate to="/dashboard" /> :
          <Onboarding onComplete={() => setOnboardingDone(true)} />
        } />
        <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
        <Route path="/copilot" element={<ProtectedLayout><Copilot /></ProtectedLayout>} />
        <Route path="/progress" element={<ProtectedLayout><Progress /></ProtectedLayout>} />
        <Route path="/settings" element={<ProtectedLayout><Settings /></ProtectedLayout>} />
        <Route path="*" element={<Navigate to={!user ? "/login" : onboardingDone ? "/dashboard" : "/onboarding"} />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App