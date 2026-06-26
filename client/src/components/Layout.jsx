import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { auth } from '../config/firebase'
import { signOut } from 'firebase/auth'
import {
  LayoutDashboard,
  MessageSquare,
  BarChart2,
  Settings,
  Bell,
  LogOut,
  Brain,
  ChevronDown
} from 'lucide-react'

const Layout = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const user = auth.currentUser
  const [showUserMenu, setShowUserMenu] = useState(false)

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/copilot', label: 'Co-pilot', icon: MessageSquare },
    { path: '/progress', label: 'Progress', icon: BarChart2 },
    { path: '/settings', label: 'Settings', icon: Settings },
  ]

  const handleSignOut = async () => {
    await signOut(auth)
    navigate('/login')
  }

  return (
    <div style={styles.shell}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        {/* Logo */}
        <div style={styles.logo}>
          <Brain size={24} color="var(--accent-400)" />
          <span style={styles.logoText}>StudyAgent</span>
        </div>

        {/* Nav items */}
        <nav style={styles.nav}>
          {navItems.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path
            return (
              <div
                key={path}
                style={{
                  ...styles.navItem,
                  ...(active ? styles.navItemActive : {})
                }}
                onClick={() => navigate(path)}
              >
                <Icon size={18} color={active ? 'var(--accent-400)' : 'var(--text-secondary)'} />
                <span style={{ color: active ? 'var(--accent-400)' : 'var(--text-secondary)' }}>
                  {label}
                </span>
              </div>
            )
          })}
        </nav>

        {/* Bottom section */}
        <div style={styles.sidebarBottom}>
          <div style={styles.quoteBox}>
            <span style={styles.quoteText}>
              "Consistency is better than intensity. Keep going! 🚀"
            </span>
          </div>
        </div>
      </div>

      {/* Main area */}
      <div style={styles.main}>
        {/* Top bar */}
        <div style={styles.topbar}>
          <div style={styles.topbarLeft}>
            {navItems.map(({ path, label }) =>
              location.pathname === path ? (
                <span key={path} style={styles.pageTitle}>{label}</span>
              ) : null
            )}
          </div>
          <div style={styles.topbarRight}>
            <div style={styles.iconBtn}>
              <Bell size={18} color="var(--text-secondary)" />
            </div>
            <div
              style={styles.userMenu}
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <img
                src={user?.photoURL || 'https://ui-avatars.com/api/?name=' + user?.displayName}
                alt="avatar"
                style={styles.avatar}
              />
              <span style={styles.userName}>{user?.displayName?.split(' ')[0]}</span>
              <ChevronDown size={14} color="var(--text-secondary)" />

              {showUserMenu && (
                <div style={styles.dropdown}>
                  <div style={styles.dropdownItem} onClick={handleSignOut}>
                    <LogOut size={14} />
                    <span>Sign out</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page content */}
        <div style={styles.content}>
          {children}
        </div>
      </div>
    </div>
  )
}

const styles = {
  shell: {
    display: 'flex',
    minHeight: '100vh',
    background: 'var(--bg-950)'
  },
  sidebar: {
    width: '200px',
    background: 'var(--bg-900)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 12px',
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh'
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '0 8px 24px',
    borderBottom: '1px solid var(--border)',
    marginBottom: '16px'
  },
  logoText: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-primary)'
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.15s',
    fontSize: '13.5px'
  },
  navItemActive: {
    background: 'rgba(100, 139, 206, 0.12)',
    borderLeft: '2px solid var(--accent-400)'
  },
  sidebarBottom: {
    marginTop: 'auto'
  },
  quoteBox: {
    background: 'var(--bg-800)',
    borderRadius: '8px',
    padding: '12px',
    border: '1px solid var(--border)'
  },
  quoteText: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
    fontStyle: 'italic'
  },
  main: {
    marginLeft: '200px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh'
  },
  topbar: {
    height: '56px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    background: 'var(--bg-900)',
    position: 'sticky',
    top: 0,
    zIndex: 10
  },
  topbarLeft: {},
  pageTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--text-primary)'
  },
  topbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  iconBtn: {
    width: '34px',
    height: '34px',
    borderRadius: '8px',
    background: 'var(--bg-800)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: '1px solid var(--border)'
  },
  userMenu: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    padding: '6px 10px',
    borderRadius: '8px',
    background: 'var(--bg-800)',
    border: '1px solid var(--border)',
    position: 'relative'
  },
  avatar: {
    width: '26px',
    height: '26px',
    borderRadius: '50%'
  },
  userName: {
    fontSize: '13px',
    color: 'var(--text-primary)'
  },
  dropdown: {
    position: 'absolute',
    top: '110%',
    right: 0,
    background: 'var(--bg-800)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '6px',
    minWidth: '140px',
    zIndex: 100
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    fontSize: '13px'
  }
}

export default Layout