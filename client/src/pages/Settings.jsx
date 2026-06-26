import React, { useEffect, useState } from 'react'
import api from '../config/api'
import { Save, Plus, X, Check, User, Code, Target } from 'lucide-react'

const Settings = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [profile, setProfile] = useState({
    name: '',
    goal: 'placement',
    dailyHours: 4,
    background: ''
  })
  const [topics, setTopics] = useState([])
  const [newTopic, setNewTopic] = useState('')
  const [showAddTopic, setShowAddTopic] = useState(false)

  const [platforms, setPlatforms] = useState({
    leetcode: '',
    hackerrank: '',
    gfg: '',
    codechef: ''
  })

  const goals = [
    { id: 'placement', label: '🎯 Placement preparation' },
    { id: 'skills', label: '🛠 Build real skills' },
    { id: 'project', label: '🚀 Build a project' },
    { id: 'competitive', label: '🏆 Competitive programming' },
  ]

  const hourOptions = [1, 2, 3, 4, 5, 6, 8]

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const res = await api.get('/profile')
      const data = res.data
      setProfile({
        name: data.name || '',
        goal: data.goal || 'placement',
        dailyHours: data.dailyHours || 4,
        background: data.background || ''
      })
      setTopics(data.topics || [])
      if (data.platforms) {
        setPlatforms({
          leetcode: data.platforms.leetcode || '',
          hackerrank: data.platforms.hackerrank || '',
          gfg: data.platforms.gfg || '',
          codechef: data.platforms.codechef || ''
        })
      }
    } catch (e) {
      console.log('Could not load profile')
    } finally {
      setLoading(false)
    }
  }

  const toggleTopicSelected = (name) => {
    setTopics(topics.map(t => t.name === name ? { ...t, removed: !t.removed } : t))
  }

  const setTopicLevel = (name, level) => {
    setTopics(topics.map(t => t.name === name ? { ...t, level } : t))
  }

  const addCustomTopic = () => {
    if (!newTopic.trim()) return
    setTopics([...topics, { name: newTopic.trim(), level: 'beginner', priority: 'medium' }])
    setNewTopic('')
    setShowAddTopic(false)
  }

  const removeTopic = (name) => {
    setTopics(topics.filter(t => t.name !== name))
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const activeTopics = topics.filter(t => !t.removed).map(t => ({
        name: t.name, level: t.level, priority: t.priority || 'medium'
      }))

      await api.post('/profile', {
        name: profile.name,
        goal: profile.goal,
        dailyHours: profile.dailyHours,
        topics: activeTopics,
        background: profile.background
      })

      if (platforms.leetcode || platforms.hackerrank || platforms.gfg || platforms.codechef) {
        await api.post('/scraper/setup', {
          leetcodeUsername: platforms.leetcode,
          hackerrankUsername: platforms.hackerrank,
          gfgUsername: platforms.gfg,
          codechefUsername: platforms.codechef
        })
      }

      setTopics(activeTopics)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      alert('Failed to save: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div style={s.page}><div style={s.loading}>Loading settings...</div></div>
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Settings</h1>
        <p style={s.subtitle}>Update your profile, topics, and connected platforms</p>
      </div>

      <div style={s.grid}>
        {/* Profile section */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <User size={16} color="var(--accent-400)" />
            <span style={s.cardTitle}>Profile</span>
          </div>
          <div style={s.cardBody}>
            <div style={s.field}>
              <label style={s.label}>Name</label>
              <input
                style={s.input}
                value={profile.name}
                onChange={e => setProfile({ ...profile, name: e.target.value })}
              />
            </div>

            <div style={s.field}>
              <label style={s.label}>Goal</label>
              <div style={s.goalGrid}>
                {goals.map(g => (
                  <div
                    key={g.id}
                    style={{ ...s.goalCard, ...(profile.goal === g.id ? s.goalCardActive : {}) }}
                    onClick={() => setProfile({ ...profile, goal: g.id })}
                  >
                    {g.label}
                  </div>
                ))}
              </div>
            </div>

            <div style={s.field}>
              <label style={s.label}>Daily study hours</label>
              <div style={s.hoursRow}>
                {hourOptions.map(h => (
                  <div
                    key={h}
                    style={{ ...s.hourChip, ...(profile.dailyHours === h ? s.hourChipActive : {}) }}
                    onClick={() => setProfile({ ...profile, dailyHours: h })}
                  >
                    {h}h
                  </div>
                ))}
              </div>
            </div>

            <div style={s.field}>
              <label style={s.label}>Background / context for the agent</label>
              <textarea
                style={{ ...s.input, height: '90px', resize: 'none' }}
                value={profile.background}
                onChange={e => setProfile({ ...profile, background: e.target.value })}
                placeholder="Tell the agent about your current level, experience, what you know..."
              />
            </div>
          </div>
        </div>

        {/* Topics section */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <Target size={16} color="var(--accent-400)" />
            <span style={s.cardTitle}>Learning Topics</span>
          </div>
          <div style={s.cardBody}>
            {topics.filter(t => !t.removed).map(t => (
              <div key={t.name} style={s.topicRow}>
                <div style={s.topicRowTop}>
                  <span style={s.topicName}>{t.name}</span>
                  <button style={s.removeBtn} onClick={() => removeTopic(t.name)}>
                    <X size={14} />
                  </button>
                </div>
                <div style={s.levelRow}>
                  {['beginner', 'intermediate', 'advanced'].map(l => (
                    <button
                      key={l}
                      style={{ ...s.levelBtn, ...(t.level === l ? s.levelBtnActive : {}) }}
                      onClick={() => setTopicLevel(t.name, l)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {showAddTopic ? (
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <input
                  style={{ ...s.input, flex: 1 }}
                  placeholder="Topic name e.g. System Design"
                  value={newTopic}
                  onChange={e => setNewTopic(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustomTopic()}
                  autoFocus
                />
                <button style={s.addConfirmBtn} onClick={addCustomTopic}>Add</button>
                <button style={s.cancelBtn} onClick={() => setShowAddTopic(false)}><X size={14} /></button>
              </div>
            ) : (
              <button style={s.addTopicBtn} onClick={() => setShowAddTopic(true)}>
                <Plus size={14} /> Add topic
              </button>
            )}
          </div>
        </div>

        {/* Platforms section */}
        <div style={{ ...s.card, gridColumn: '1 / -1' }}>
          <div style={s.cardHeader}>
            <Code size={16} color="var(--accent-400)" />
            <span style={s.cardTitle}>Coding Platforms</span>
          </div>
          <div style={{ ...s.cardBody, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div style={s.field}>
              <label style={s.label}>LeetCode username</label>
              <input
                style={s.input}
                placeholder="e.g. neeli_codes"
                value={platforms.leetcode}
                onChange={e => setPlatforms({ ...platforms, leetcode: e.target.value })}
              />
            </div>
            <div style={s.field}>
              <label style={s.label}>HackerRank username</label>
              <input
                style={s.input}
                placeholder="e.g. neeli_codes"
                value={platforms.hackerrank}
                onChange={e => setPlatforms({ ...platforms, hackerrank: e.target.value })}
              />
            </div>
            <div style={s.field}>
              <label style={s.label}>GeeksForGeeks username</label>
              <input
                style={s.input}
                placeholder="e.g. neeli_codes"
                value={platforms.gfg}
                onChange={e => setPlatforms({ ...platforms, gfg: e.target.value })}
              />
            </div>
            <div style={s.field}>
              <label style={s.label}>CodeChef username</label>
              <input
                style={s.input}
                placeholder="e.g. neeli_codes"
                value={platforms.codechef}
                onChange={e => setPlatforms({ ...platforms, codechef: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      <div style={s.saveBar}>
        <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
          <Save size={14} />
          {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save changes'}
        </button>
        {saved && <span style={s.savedNote}><Check size={14} color="var(--green-400)" /> Your agent will use these updates from the next plan</span>}
      </div>
    </div>
  )
}

const s = {
  page: { padding: '24px', maxWidth: '1100px' },
  header: { marginBottom: '24px' },
  title: { fontSize: '22px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' },
  subtitle: { fontSize: '13px', color: 'var(--text-secondary)' },
  loading: { color: 'var(--text-secondary)', fontSize: '13px', padding: '40px', textAlign: 'center' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' },
  card: { background: 'var(--bg-900)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' },
  cardHeader: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '14px 16px', borderBottom: '1px solid var(--border)'
  },
  cardTitle: { fontSize: '13.5px', fontWeight: '600', color: 'var(--text-primary)' },
  cardBody: { padding: '16px' },
  field: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' },
  input: {
    width: '100%', background: 'var(--bg-800)', border: '1px solid var(--border)',
    borderRadius: '8px', padding: '9px 12px', color: 'var(--text-primary)',
    fontSize: '13px', outline: 'none', fontFamily: 'Inter, sans-serif'
  },
  goalGrid: { display: 'flex', flexDirection: 'column', gap: '6px' },
  goalCard: {
    padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)',
    background: 'var(--bg-800)', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)'
  },
  goalCardActive: {
    border: '1px solid var(--accent-400)', background: 'rgba(100,139,206,0.1)', color: 'var(--text-primary)'
  },
  hoursRow: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  hourChip: {
    padding: '6px 14px', borderRadius: '20px', border: '1px solid var(--border)',
    background: 'var(--bg-800)', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)'
  },
  hourChipActive: {
    border: '1px solid var(--accent-400)', background: 'var(--accent-500)', color: '#fff'
  },
  topicRow: { padding: '10px 0', borderBottom: '1px solid var(--border)' },
  topicRowTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  topicName: { fontSize: '13.5px', color: 'var(--text-primary)', fontWeight: '500' },
  removeBtn: { background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' },
  levelRow: { display: 'flex', gap: '6px' },
  levelBtn: {
    padding: '3px 10px', borderRadius: '20px', border: '1px solid var(--border)',
    background: 'transparent', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer'
  },
  levelBtnActive: { background: 'var(--accent-500)', color: '#fff', border: '1px solid var(--accent-500)' },
  addTopicBtn: {
    display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px',
    background: 'transparent', border: '1px dashed var(--border)', borderRadius: '8px',
    padding: '8px 14px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', width: '100%',
    justifyContent: 'center'
  },
  addConfirmBtn: {
    background: 'var(--accent-500)', border: 'none', borderRadius: '6px',
    padding: '9px 16px', color: '#fff', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap'
  },
  cancelBtn: {
    background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px',
    padding: '9px 10px', color: 'var(--text-secondary)', cursor: 'pointer'
  },
  saveBar: { display: 'flex', alignItems: 'center', gap: '12px' },
  saveBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    background: 'var(--accent-500)', border: 'none', borderRadius: '8px',
    padding: '10px 20px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '500'
  },
  savedNote: {
    display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--text-secondary)'
  }
}

export default Settings