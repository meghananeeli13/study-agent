import React, { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { auth } from '../config/firebase'
import api from '../config/api'
import ReactMarkdown from 'react-markdown'
import { RefreshCw, CheckSquare, Square, Send, Clock, Flame, BarChart2, Brain, Plus, X } from 'lucide-react'

const Dashboard = () => {
  const { todayPlan, setTodayPlan, todayTasks, setTodayTasks, planDate, setPlanDate } = useApp()
  const plan = todayPlan
  const tasks = todayTasks
  const setPlan = setTodayPlan
  const setTasks = setTodayTasks

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTaskText, setNewTaskText] = useState('')
  const [newTaskMinutes, setNewTaskMinutes] = useState(30)
  const [dailyTarget, setDailyTarget] = useState(4)
  const user = auth.currentUser

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  const [stats, setStats] = useState({
  streak: 0,
  weeklyHours: 0,
  weeklyCompletionRate: 0
})

  useEffect(() => {
  const todayDate = new Date().toISOString().split('T')[0]
  loadStats()
  if (todayPlan && planDate === todayDate) {
    setLoading(false)
    return
  }
  loadPlan()
}, [])
useEffect(() => {
  if (tasks.length === 0) return
  const todayDate = new Date().toISOString().split('T')[0]
  const timer = setTimeout(() => {
    api.post('/planner/today-tasks', { date: todayDate, tasks }).catch(() => {})
  }, 800)
  return () => clearTimeout(timer)
}, [tasks])
const loadStats = async () => {
  try {
    const res = await api.get('/stats')
    setStats(res.data)
  } catch (e) {
    console.log('Stats not available yet')
  }
}

  const loadPlan = async (forceRegenerate = false) => {
    setLoading(true)
    setError(null)
    const todayDate = new Date().toISOString().split('T')[0]

    try {
      const profileRes = await api.post('/profile', { name: user.displayName, goal: 'placement' })
      console.log('PROFILE POST RESPONSE:', profileRes.data)
if (profileRes.data?.data?.dailyHours) {
  setDailyTarget(profileRes.data.data.dailyHours)
}

      if (!forceRegenerate) {
        try {
          const existingRes = await api.get('/planner/today')
          if (existingRes.data.plan) {
            setPlan(existingRes.data.plan)
            setPlanDate(todayDate)

            if (existingRes.data.tasks && existingRes.data.tasks.length > 0 && todayTasks.length === 0) {
  setTasks(existingRes.data.tasks.map((t, i) => ({
    id: t.id || i + 1, ...t
  })))
}
            
            setLoading(false)
            return
          }
        } catch (e) {}
      }

      const res = await api.get('/planner/plan')
      setPlan(res.data.plan)
      setPlanDate(todayDate)
      if (res.data.tasks && res.data.tasks.length > 0) {
        setTasks(res.data.tasks.map((t, i) => ({
          id: i + 1, ...t, done: false, note: ''
        })))
      } else {
        setTasks([])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  const removeTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id))
  }

  const updateTaskNote = (id, val) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, note: val } : t))
  }

const addCustomTask = () => {
  if (!newTaskText.trim()) return
  setTasks([...tasks, {
    id: Date.now(),
    topic: 'Custom',
    task: newTaskText,
    minutes: parseInt(newTaskMinutes) || 30,
    done: false,
    note: '',
    custom: true
  }])
  setNewTaskText('')
  setNewTaskMinutes(30)
  setShowAddTask(false)
}

  const submitDay = async () => {
    setSubmitting(true)
    try {
      await api.post('/planner/log', {
        tasks: tasks.map(t => ({
          topic: t.topic,
          minutes: t.minutes,
          completed: t.done,
          note: t.note
        })),
        extraNote: note
      })
      setSubmitted(true)
    } catch (err) {
      alert('Failed to save: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const completedCount = tasks.filter(t => t.done).length
  const completionPct = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0
  const focusMinutes = tasks.filter(t => t.done).reduce((sum, t) => sum + t.minutes, 0)
const totalPlannedMinutes = tasks.reduce((sum, t) => sum + t.minutes, 0)
const targetMinutes = Math.max(dailyTarget * 60, totalPlannedMinutes)
const targetHours = Math.round((targetMinutes / 60) * 10) / 10

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.greeting}>{greeting()}, {user?.displayName?.split(' ')[0]} 👋</h1>
          <p style={s.date}>{today}</p>
        </div>
        <button style={s.regenBtn} onClick={() => loadPlan(true)} disabled={loading}>
          <RefreshCw size={14} />
          {loading ? 'Generating...' : 'Regenerate Plan'}
        </button>
      </div>

      {/* 3 column grid */}
      <div style={s.grid}>

        {/* Left — Today's Plan */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <div style={s.cardTitle}><Brain size={16} color="var(--accent-400)" /> Today's Plan</div>
          </div>
          <div style={s.cardBody}>
            {loading && <div style={s.loading}>🤖 Agent is building your plan...</div>}
            {error && (
              <div style={s.error}>
                <p>⚠️ {error}</p>
                <button style={s.retryBtn} onClick={() => loadPlan(true)}>Retry</button>
              </div>
            )}
            {plan && !loading && (
              <div className="markdown" style={s.planText}>
                <ReactMarkdown>{plan}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>

        {/* Middle — Today's Tasks */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <div style={s.cardTitle}><CheckSquare size={16} color="var(--accent-400)" /> Today's Tasks</div>
            <span style={s.badge}>{completedCount}/{tasks.length}</span>
          </div>
          <div style={s.cardBody}>
            {tasks.length === 0 && !loading && (
              <div style={s.emptyState}>No tasks yet. Generate a plan or add your own.</div>
            )}

            {tasks.map(task => (
              <div key={task.id} style={{ ...s.taskItem, ...(task.done ? s.taskDone : {}) }}>
                <div style={s.taskTop}>
                  <div
                    onClick={() => toggleTask(task.id)}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, cursor: 'pointer' }}
                  >
                    <div style={s.taskCheck}>
                      {task.done
                        ? <CheckSquare size={18} color="var(--green-400)" />
                        : <Square size={18} color="var(--text-muted)" />
                      }
                    </div>
                    <div style={s.taskInfo}>
                      <div style={s.taskName}>{task.task}</div>
                      <div style={s.taskMeta}>
                        <span style={{
                          ...s.topicTag,
                          ...(task.custom ? s.topicTagCustom : {})
                        }}>{task.topic}</span>
                        <span style={s.taskTime}><Clock size={11} /> {task.minutes}m</span>
                      </div>
                    </div>
                  </div>
                  <button style={s.removeTaskBtn} onClick={() => removeTask(task.id)}>
                    <X size={14} />
                  </button>
                </div>
                {task.done && (
                  <input
                    style={s.taskNoteInput}
                    placeholder="How did it go? (optional)"
                    value={task.note}
                    onChange={e => updateTaskNote(task.id, e.target.value)}
                  />
                )}
              </div>
            ))}

            {/* Add custom task */}
            <div style={s.addTaskRow}>
  {!showAddTask ? (
    <button style={s.addTaskBtn} onClick={() => setShowAddTask(true)}>
      <Plus size={14} /> Add custom task
    </button>
  ) : (
    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
      <input
        style={{ ...s.taskNoteInput, flex: 1, marginTop: 0 }}
        placeholder="What do you want to add?"
        value={newTaskText}
        onChange={e => setNewTaskText(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && addCustomTask()}
        autoFocus
      />
      <input
        style={{ ...s.taskNoteInput, width: '70px', marginTop: 0 }}
        placeholder="mins"
        type="number"
        value={newTaskMinutes}
        onChange={e => setNewTaskMinutes(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && addCustomTask()}
      />
      <button style={s.addConfirmBtn} onClick={addCustomTask}>Add</button>
      <button style={s.addCancelBtn} onClick={() => setShowAddTask(false)}>✕</button>
    </div>
  )}
</div>
</div>

{/* Submit day */}
          <div style={s.submitSection}>
            <p style={s.submitLabel}>Anything else to tell the agent?</p>
            <textarea
              style={s.textarea}
              placeholder="e.g. 'struggled with recursion today, felt low energy after lunch...'"
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
            />
            <button
              style={{ ...s.submitBtn, ...(submitted ? s.submitBtnDone : {}) }}
              onClick={submitDay}
              disabled={submitting || submitted}
            >
              <Send size={14} />
              {submitted ? 'Day logged ✓' : submitting ? 'Saving...' : 'Submit Day'}
            </button>
          </div>
        </div>

        {/* Right — Quick Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={s.card}>
            <div style={s.cardHeader}>
              <div style={s.cardTitle}><BarChart2 size={16} color="var(--accent-400)" /> Quick Stats</div>
            </div>
            <div style={s.statsGrid}>
              <div style={s.statBox}>
  <Flame size={20} color="#db575b" />
  <div style={s.statNum}>{stats.streak}</div>
  <div style={s.statLabel}>Day Streak</div>
</div>
              <div style={s.statBox}>
                <Clock size={20} color="var(--accent-400)" />
                <div style={s.statNum}>{(focusMinutes / 60).toFixed(1)}h</div>
                <div style={s.statLabel}>Focus Today</div>
              </div>
              <div style={s.statBox}>
                <BarChart2 size={20} color="var(--green-400)" />
                <div style={s.statNum}>{completionPct}%</div>
                <div style={s.statLabel}>Completion</div>
              </div>
            </div>
            <div style={s.progressSection}>
              <div style={s.progressLabel}>
                <span>Today's Progress</span>
                <span>{completedCount}/{tasks.length} tasks</span>
              </div>
              <div style={s.progressBar}>
                <div style={{ ...s.progressFill, width: completionPct + '%' }} />
              </div>
            </div>
          </div>

          <div style={s.card}>
            <div style={s.cardHeader}>
              <div style={s.cardTitle}><Clock size={16} color="var(--accent-400)" /> Focus Time</div>
            </div>
            <div style={{ padding: '12px 16px' }}>
              <div style={s.focusNum}>{(focusMinutes / 60).toFixed(1)} hrs</div>
              <div style={s.focusTarget}>of {targetHours} hrs target</div>
              <div style={s.progressBar}>
                <div style={{
                  ...s.progressFill,
                  width: Math.min((focusMinutes / targetMinutes) * 100, 100) + '%'
                }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const s = {
  page: { padding: '24px', maxWidth: '1400px' },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: '24px'
  },
  greeting: { fontSize: '22px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' },
  date: { fontSize: '13px', color: 'var(--text-secondary)' },
  regenBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    background: 'var(--bg-800)', border: '1px solid var(--border)',
    borderRadius: '8px', padding: '8px 14px', color: 'var(--text-secondary)',
    cursor: 'pointer', fontSize: '13px'
  },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr 320px', gap: '16px', alignItems: 'start' },
  card: {
    background: 'var(--bg-900)', border: '1px solid var(--border)',
    borderRadius: '12px', overflow: 'hidden'
  },
  cardHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 16px', borderBottom: '1px solid var(--border)'
  },
  cardTitle: {
    display: 'flex', alignItems: 'center', gap: '8px',
    fontSize: '13.5px', fontWeight: '600', color: 'var(--text-primary)'
  },
  cardBody: { padding: '16px', maxHeight: '520px', overflowY: 'auto' },
  badge: {
    background: 'var(--bg-800)', borderRadius: '20px', padding: '2px 10px',
    fontSize: '12px', color: 'var(--text-secondary)'
  },
  loading: { color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', padding: '20px' },
  error: { textAlign: 'center', padding: '16px' },
  retryBtn: {
    marginTop: '10px', background: 'var(--accent-500)', border: 'none',
    borderRadius: '6px', padding: '6px 16px', color: '#fff', cursor: 'pointer', fontSize: '13px'
  },
  planText: { fontSize: '13px' },
  emptyState: {
    textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px'
  },
  taskItem: { padding: '10px 0', borderBottom: '1px solid var(--border)', transition: 'opacity 0.2s' },
  taskDone: { opacity: 0.6 },
  taskTop: { display: 'flex', alignItems: 'flex-start', gap: '8px' },
  taskCheck: { marginTop: '2px', flexShrink: 0 },
  taskInfo: { flex: 1 },
  taskName: { fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px' },
  taskMeta: { display: 'flex', alignItems: 'center', gap: '8px' },
  topicTag: {
    fontSize: '11px', padding: '2px 8px', borderRadius: '20px',
    background: 'rgba(100,139,206,0.12)', color: 'var(--accent-300)'
  },
  topicTagCustom: {
    background: 'rgba(175,124,80,0.12)', color: 'var(--muted-300)'
  },
  taskTime: { display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: 'var(--text-muted)' },
  taskNoteInput: {
    width: '100%', marginTop: '8px', background: 'var(--bg-800)',
    border: '1px solid var(--border)', borderRadius: '6px',
    padding: '6px 10px', color: 'var(--text-secondary)', fontSize: '12px', outline: 'none'
  },
  removeTaskBtn: {
    background: 'transparent', border: 'none', color: 'var(--text-muted)',
    cursor: 'pointer', padding: '2px 4px', borderRadius: '4px', flexShrink: 0,
    display: 'flex', alignItems: 'center'
  },
  addTaskRow: { paddingTop: '12px' },
  addTaskBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    background: 'transparent', border: '1px dashed var(--border)',
    borderRadius: '8px', padding: '8px 14px', color: 'var(--text-secondary)',
    cursor: 'pointer', fontSize: '13px', width: '100%', justifyContent: 'center'
  },
  addConfirmBtn: {
    background: 'var(--accent-500)', border: 'none', borderRadius: '6px',
    padding: '6px 14px', color: '#fff', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap'
  },
  addCancelBtn: {
    background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px',
    padding: '6px 10px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px'
  },
  submitSection: { padding: '16px', borderTop: '1px solid var(--border)' },
  submitLabel: { fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' },
  textarea: {
    width: '100%', background: 'var(--bg-800)', border: '1px solid var(--border)',
    borderRadius: '8px', padding: '10px', color: 'var(--text-primary)',
    fontSize: '13px', resize: 'none', outline: 'none', marginBottom: '10px'
  },
  submitBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    background: 'var(--accent-500)', border: 'none', borderRadius: '8px',
    padding: '9px 18px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '500'
  },
  submitBtnDone: { background: 'var(--green-500)' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', padding: '16px' },
  statBox: {
    background: 'var(--bg-800)', borderRadius: '10px', padding: '14px 10px',
    textAlign: 'center', border: '1px solid var(--border)'
  },
  statNum: { fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)', margin: '6px 0 2px' },
  statLabel: { fontSize: '11px', color: 'var(--text-secondary)' },
  progressSection: { padding: '0 16px 16px' },
  progressLabel: {
    display: 'flex', justifyContent: 'space-between',
    fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px'
  },
  progressBar: { height: '6px', background: 'var(--bg-800)', borderRadius: '3px', overflow: 'hidden' },
  progressFill: { height: '100%', background: 'var(--accent-400)', borderRadius: '3px', transition: 'width 0.4s' },
  focusNum: { fontSize: '28px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '2px' },
  focusTarget: { fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }
}

export default Dashboard