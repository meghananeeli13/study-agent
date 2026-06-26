import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../config/firebase'
import api from '../config/api'
import { Brain, ArrowRight, ArrowLeft, Check, Plus, X } from 'lucide-react'

const steps = [
  { id: 'goal', title: "What's your main goal?", subtitle: 'This helps the agent prioritize your tasks' },
  { id: 'topics', title: 'What are you learning?', subtitle: 'Add the topics you want to study' },
  { id: 'hours', title: 'How many hours can you study daily?', subtitle: 'Be realistic — consistency matters more than quantity' },
  { id: 'platforms', title: 'Your coding platforms', subtitle: 'Optional — agent will auto-track your progress' },
  { id: 'background', title: 'Tell the agent about yourself', subtitle: 'The more context, the better the plan' },
]

const defaultTopics = [
  { name: 'DSA', level: 'beginner', selected: true },
  { name: 'CS Fundamentals', level: 'beginner', selected: true },
  { name: 'Web Development', level: 'beginner', selected: false },
  { name: 'Machine Learning', level: 'beginner', selected: false },
  { name: 'Aptitude', level: 'beginner', selected: true },
]

const Onboarding = ({ onComplete }) => {
  const navigate = useNavigate()
  const user = auth.currentUser
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [topics, setTopics] = useState(defaultTopics)
  const [newTopic, setNewTopic] = useState('')
  const [showAddTopic, setShowAddTopic] = useState(false)
  const [data, setData] = useState({
    goal: '',
    hours: 4,
    leetcode: '',
    hackerrank: '',
    gfg: '',
    codechef: '',
    background: ''
  })

  const goals = [
    { id: 'placement', label: '🎯 Placement preparation', desc: 'Crack campus or off-campus interviews' },
    { id: 'skills', label: '🛠 Build real skills', desc: 'Learn and grow without a deadline' },
    { id: 'project', label: '🚀 Build a project', desc: 'Apply what I learn to real work' },
    { id: 'competitive', label: '🏆 Competitive programming', desc: 'Improve DSA and contest ranking' },
  ]

  const hourOptions = [1, 2, 3, 4, 5, 6, 8]

  const toggleTopic = (name) => {
    setTopics(topics.map(t => t.name === name ? { ...t, selected: !t.selected } : t))
  }

  const setTopicLevel = (name, level) => {
    setTopics(topics.map(t => t.name === name ? { ...t, level } : t))
  }

  const addCustomTopic = () => {
    if (!newTopic.trim()) return
    setTopics([...topics, { name: newTopic.trim(), level: 'beginner', selected: true }])
    setNewTopic('')
    setShowAddTopic(false)
  }

  const canProceed = () => {
    if (step === 0) return data.goal !== ''
    if (step === 1) return topics.filter(t => t.selected).length > 0
    return true
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const selectedTopics = topics
        .filter(t => t.selected)
        .map(t => ({ name: t.name, level: t.level, priority: 'medium' }))

      await api.post('/profile', {
        name: user.displayName,
        goal: data.goal,
        dailyHours: data.hours,
        topics: selectedTopics,
        background: data.background,
        onboardingDone: true
      })

      if (data.leetcode || data.hackerrank || data.gfg || data.codechef) {
        await api.post('/scraper/setup', {
          leetcodeUsername: data.leetcode,
          hackerrankUsername: data.hackerrank,
          gfgUsername: data.gfg,
          codechefUsername: data.codechef
        })
      }

      onComplete()
      navigate('/dashboard')
    } catch (err) {
      alert('Something went wrong: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const renderStep = () => {
    switch (steps[step].id) {
      case 'goal':
        return (
          <div style={s.optionsGrid}>
            {goals.map(g => (
              <div
                key={g.id}
                style={{ ...s.optionCard, ...(data.goal === g.id ? s.optionCardActive : {}) }}
                onClick={() => setData({ ...data, goal: g.id })}
              >
                <div style={s.optionLabel}>{g.label}</div>
                <div style={s.optionDesc}>{g.desc}</div>
              </div>
            ))}
          </div>
        )

      case 'topics':
        return (
          <div>
            <div style={s.topicsGrid}>
              {topics.map(t => (
                <div key={t.name} style={{ ...s.topicCard, ...(t.selected ? s.topicCardActive : {}) }}>
                  <div style={s.topicTop} onClick={() => toggleTopic(t.name)}>
                    <div style={s.topicCheck}>
                      {t.selected ? <Check size={14} color="var(--accent-400)" /> : null}
                    </div>
                    <span style={s.topicName}>{t.name}</span>
                  </div>
                  {t.selected && (
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
                  )}
                </div>
              ))}
            </div>

            {showAddTopic ? (
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <input
                  style={s.input}
                  placeholder="Topic name e.g. System Design"
                  value={newTopic}
                  onChange={e => setNewTopic(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustomTopic()}
                  autoFocus
                />
                <button style={s.addBtn} onClick={addCustomTopic}>Add</button>
                <button style={s.cancelBtn} onClick={() => setShowAddTopic(false)}><X size={14} /></button>
              </div>
            ) : (
              <button style={s.addTopicBtn} onClick={() => setShowAddTopic(true)}>
                <Plus size={14} /> Add another topic
              </button>
            )}
          </div>
        )

      case 'hours':
        return (
          <div style={s.hoursGrid}>
            {hourOptions.map(h => (
              <div
                key={h}
                style={{ ...s.hourCard, ...(data.hours === h ? s.hourCardActive : {}) }}
                onClick={() => setData({ ...data, hours: h })}
              >
                <div style={s.hourNum}>{h}</div>
                <div style={s.hourLabel}>hr{h > 1 ? 's' : ''}</div>
              </div>
            ))}
          </div>
        )

      case 'platforms':
        return (
          <div style={s.platformsForm}>
            <div style={s.platformRow}>
              <div style={s.platformLabel}>LeetCode username</div>
              <input
                style={s.input}
                placeholder="e.g. neeli_codes"
                value={data.leetcode}
                onChange={e => setData({ ...data, leetcode: e.target.value })}
              />
            </div>
            <div style={s.platformRow}>
              <div style={s.platformLabel}>HackerRank username</div>
              <input
                style={s.input}
                placeholder="e.g. neeli_codes"
                value={data.hackerrank}
                onChange={e => setData({ ...data, hackerrank: e.target.value })}
              />
            </div>
            <div style={s.platformRow}>
              <div style={s.platformLabel}>GeeksForGeeks username</div>
              <input
                style={s.input}
                placeholder="e.g. neeli_codes"
                value={data.gfg}
                onChange={e => setData({ ...data, gfg: e.target.value })}
              />
            </div>
            <div style={s.platformRow}>
              <div style={s.platformLabel}>CodeChef username</div>
              <input
                style={s.input}
                placeholder="e.g. neeli_codes"
                value={data.codechef}
                onChange={e => setData({ ...data, codechef: e.target.value })}
              />
            </div>
            <p style={s.skipNote}>You can skip this and add later in Settings</p>
          </div>
        )

      case 'background':
        return (
          <div>
            <textarea
              style={{ ...s.input, height: '140px', resize: 'none' }}
              placeholder="e.g. I'm a 3rd year CS student. I know basic Python and have done some HTML/CSS. I've solved about 20 LeetCode problems. I want to get placed in a product company..."
              value={data.background}
              onChange={e => setData({ ...data, background: e.target.value })}
            />
            <p style={s.skipNote}>This helps the agent understand where you are right now. Be as detailed as you want.</p>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        {/* Logo */}
        <div style={s.logo}>
          <Brain size={28} color="var(--accent-400)" />
          <span style={s.logoText}>StudyAgent</span>
        </div>

        {/* Progress dots */}
        <div style={s.dots}>
          {steps.map((_, i) => (
            <div key={i} style={{ ...s.dot, ...(i === step ? s.dotActive : i < step ? s.dotDone : {}) }} />
          ))}
        </div>

        {/* Step content */}
        <div style={s.stepHeader}>
          <h2 style={s.stepTitle}>{steps[step].title}</h2>
          <p style={s.stepSubtitle}>{steps[step].subtitle}</p>
        </div>

        <div style={s.stepBody}>
          {renderStep()}
        </div>

        {/* Navigation */}
        <div style={s.nav}>
          {step > 0 && (
            <button style={s.backBtn} onClick={() => setStep(step - 1)}>
              <ArrowLeft size={16} /> Back
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < steps.length - 1 ? (
            <button
              style={{ ...s.nextBtn, ...(canProceed() ? {} : s.nextBtnDisabled) }}
              onClick={() => canProceed() && setStep(step + 1)}
            >
              Next <ArrowRight size={16} />
            </button>
          ) : (
            <button style={s.submitBtn} onClick={handleSubmit} disabled={loading}>
              {loading ? 'Setting up...' : 'Start learning 🚀'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh', background: 'var(--bg-950)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'Inter, sans-serif', padding: '24px'
  },
  card: {
    background: 'var(--bg-900)', border: '1px solid var(--border)',
    borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '560px'
  },
  logo: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' },
  logoText: { fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' },
  dots: { display: 'flex', gap: '6px', marginBottom: '32px' },
  dot: { width: '8px', height: '8px', borderRadius: '50%', background: 'var(--bg-700)' },
  dotActive: { background: 'var(--accent-400)', width: '24px', borderRadius: '4px' },
  dotDone: { background: 'var(--green-400)' },
  stepHeader: { marginBottom: '24px' },
  stepTitle: { fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' },
  stepSubtitle: { fontSize: '13px', color: 'var(--text-secondary)' },
  stepBody: { minHeight: '200px', marginBottom: '32px' },
  optionsGrid: { display: 'flex', flexDirection: 'column', gap: '10px' },
  optionCard: {
    padding: '14px 16px', borderRadius: '10px', border: '1px solid var(--border)',
    background: 'var(--bg-800)', cursor: 'pointer', transition: 'all 0.15s'
  },
  optionCardActive: { border: '1px solid var(--accent-400)', background: 'rgba(100,139,206,0.1)' },
  optionLabel: { fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '3px' },
  optionDesc: { fontSize: '12px', color: 'var(--text-secondary)' },
  topicsGrid: { display: 'flex', flexDirection: 'column', gap: '8px' },
  topicCard: {
    padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)',
    background: 'var(--bg-800)', transition: 'all 0.15s'
  },
  topicCardActive: { border: '1px solid var(--accent-400)', background: 'rgba(100,139,206,0.08)' },
  topicTop: { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' },
  topicCheck: {
    width: '20px', height: '20px', borderRadius: '5px', border: '1.5px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    background: 'var(--bg-700)'
  },
  topicName: { fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500' },
  levelRow: { display: 'flex', gap: '6px', marginTop: '10px', paddingLeft: '30px' },
  levelBtn: {
    padding: '3px 10px', borderRadius: '20px', border: '1px solid var(--border)',
    background: 'transparent', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer'
  },
  levelBtnActive: { background: 'var(--accent-500)', color: '#fff', border: '1px solid var(--accent-500)' },
  addTopicBtn: {
    display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px',
    background: 'transparent', border: '1px dashed var(--border)', borderRadius: '8px',
    padding: '8px 14px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px'
  },
  hoursGrid: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  hourCard: {
    width: '72px', height: '72px', borderRadius: '12px', border: '1px solid var(--border)',
    background: 'var(--bg-800)', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
  },
  hourCardActive: { border: '1px solid var(--accent-400)', background: 'rgba(100,139,206,0.1)' },
  hourNum: { fontSize: '24px', fontWeight: '600', color: 'var(--text-primary)' },
  hourLabel: { fontSize: '11px', color: 'var(--text-secondary)' },
  platformsForm: { display: 'flex', flexDirection: 'column', gap: '16px' },
  platformRow: { display: 'flex', flexDirection: 'column', gap: '6px' },
  platformLabel: { fontSize: '13px', color: 'var(--text-secondary)' },
  input: {
    width: '100%', background: 'var(--bg-800)', border: '1px solid var(--border)',
    borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)',
    fontSize: '13px', outline: 'none', fontFamily: 'Inter, sans-serif'
  },
  skipNote: { fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' },
  addBtn: {
    background: 'var(--accent-500)', border: 'none', borderRadius: '8px',
    padding: '10px 16px', color: '#fff', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap'
  },
  cancelBtn: {
    background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px',
    padding: '10px', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center'
  },
  nav: { display: 'flex', alignItems: 'center' },
  backBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px',
    padding: '9px 16px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px'
  },
  nextBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    background: 'var(--accent-500)', border: 'none', borderRadius: '8px',
    padding: '9px 20px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '500'
  },
  nextBtnDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  submitBtn: {
    background: 'var(--green-500)', border: 'none', borderRadius: '8px',
    padding: '10px 24px', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '500'
  }
}

export default Onboarding