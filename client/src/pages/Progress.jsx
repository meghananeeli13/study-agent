import React, { useEffect, useState } from 'react'
import api from '../config/api'
import { useApp } from '../context/AppContext'
import { Flame, Clock, BarChart2, Trophy, TrendingUp, Calendar, Code } from 'lucide-react'

const topicColors = {
  'DSA': '#648bce',
  'CS Fundamentals': '#7ebc76',
  'Web Development': '#bf9673',
  'Machine Learning': '#db575b',
  'Aptitude': '#8ba8da',
  'Custom': '#cfb196'
}

const Progress = () => {
  const { todayTasks, planDate } = useApp()
  const [stats, setStats] = useState(null)
  const [history, setHistory] = useState([])
  const [platformData, setPlatformData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [statsRes, logsRes, platformRes] = await Promise.all([
        api.get('/stats'),
        api.get('/logs/recent/14'),
        api.get('/scraper/latest').catch(() => ({ data: { data: null } }))
      ])
      setStats(statsRes.data)
      setHistory(logsRes.data.logs || [])
      setPlatformData(platformRes.data.data)
    } catch (e) {
      console.log('Progress load error:', e.message)
    } finally {
      setLoading(false)
    }
  }

  const dayScore = (log) => {
    if (!log.entries || log.entries.length === 0) return 0
    const completed = log.entries.filter(e => e.completed).length
    return Math.round((completed / log.entries.length) * 100)
  }

  const scoreLabel = (score) => {
    if (score === 100) return { text: 'Perfect day', color: 'var(--green-400)' }
    if (score >= 70) return { text: 'Great day', color: 'var(--green-400)' }
    if (score >= 40) return { text: 'Partial', color: 'var(--muted-300)' }
    if (score > 0) return { text: 'Low completion', color: 'var(--red-400)' }
    return { text: 'No activity', color: 'var(--text-muted)' }
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const todayDateStr = new Date().toISOString().split('T')[0]

  const liveToday = (todayTasks.length > 0 && planDate === todayDateStr) ? {
    date: todayDateStr,
    entries: todayTasks.map(t => ({
      topic: t.topic,
      minutes: t.minutes,
      completed: t.done,
      note: t.note || ''
    })),
    isLive: true
  } : null

  const historyAlreadyHasToday = history.some(log => log.date === todayDateStr)
  const displayHistory = liveToday && !historyAlreadyHasToday
    ? [liveToday, ...history]
    : history

  // merge today's live activity into derived stats so they feel accurate in real time
  const effectiveStreak = (() => {
    if (!stats) return 0
    const todayHasActivity = liveToday && liveToday.entries.some(e => e.completed)
    if (todayHasActivity && !historyAlreadyHasToday) {
      // if yesterday was already part of the streak, today extends it
      return stats.streak + (stats.streakIncludesYesterday ? 1 : 1)
    }
    return stats.streak
  })()

  const liveWeeklyMinutes = liveToday
    ? liveToday.entries.filter(e => e.completed).reduce((sum, e) => sum + e.minutes, 0)
    : 0

  const effectiveWeeklyMinutes = (stats?.weeklyMinutes || 0) + (historyAlreadyHasToday ? 0 : liveWeeklyMinutes)
  const effectiveWeeklyHours = Math.round((effectiveWeeklyMinutes / 60) * 10) / 10

  const liveTotalTasks = liveToday ? liveToday.entries.length : 0
  const liveCompletedTasks = liveToday ? liveToday.entries.filter(e => e.completed).length : 0

  const baseTotalTasks = (stats?.weeklyTotalTasks) || 0
  const baseCompletedTasks = (stats?.weeklyCompletedTasks) || 0

  const effectiveTotalTasks = baseTotalTasks + (historyAlreadyHasToday ? 0 : liveTotalTasks)
  const effectiveCompletedTasks = baseCompletedTasks + (historyAlreadyHasToday ? 0 : liveCompletedTasks)
  const effectiveCompletionRate = effectiveTotalTasks > 0
    ? Math.round((effectiveCompletedTasks / effectiveTotalTasks) * 100)
    : 0

  const effectiveTopicMinutes = { ...(stats?.topicMinutes || {}) }
  if (liveToday && !historyAlreadyHasToday) {
    liveToday.entries.forEach(e => {
      if (e.completed) {
        effectiveTopicMinutes[e.topic] = (effectiveTopicMinutes[e.topic] || 0) + e.minutes
      }
    })
  }

  const topicEntries = Object.entries(effectiveTopicMinutes)
  const maxTopicMinutes = topicEntries.length > 0 ? Math.max(...topicEntries.map(([, m]) => m)) : 1

  if (loading) {
    return (
      <div style={s.page}>
        <div style={s.loadingState}>Loading your progress...</div>
      </div>
    )
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Your Progress</h1>
        <p style={s.subtitle}>Patterns the agent has learned from your history</p>
      </div>

      {/* Weekly overview */}
      <div style={s.statsRow}>
        <div style={s.statCard}>
          <Flame size={22} color="#db575b" />
          <div style={s.statValue}>{effectiveStreak}</div>
          <div style={s.statLabel}>Day Streak</div>
        </div>
        <div style={s.statCard}>
          <Clock size={22} color="var(--accent-400)" />
          <div style={s.statValue}>{effectiveWeeklyHours}h</div>
          <div style={s.statLabel}>This Week</div>
        </div>
        <div style={s.statCard}>
          <BarChart2 size={22} color="var(--green-400)" />
          <div style={s.statValue}>{effectiveCompletionRate}%</div>
          <div style={s.statLabel}>Completion Rate</div>
        </div>
        <div style={s.statCard}>
          <Trophy size={22} color="var(--muted-300)" />
          <div style={s.statValue}>{stats?.totalProblemsSolved || 0}</div>
          <div style={s.statLabel}>Problems Solved</div>
        </div>
      </div>

      <div style={s.grid}>
        {/* Topic breakdown */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <TrendingUp size={16} color="var(--accent-400)" />
            <span style={s.cardTitle}>Topic Breakdown (This Week)</span>
          </div>
          <div style={s.cardBody}>
            {topicEntries.length === 0 ? (
              <div style={s.emptyState}>No completed tasks yet this week.</div>
            ) : (
              topicEntries.map(([topic, minutes]) => (
                <div key={topic} style={s.topicRow}>
                  <div style={s.topicRowHeader}>
                    <span style={s.topicName}>{topic}</span>
                    <span style={s.topicMinutes}>{Math.round(minutes / 60 * 10) / 10}h</span>
                  </div>
                  <div style={s.topicBarTrack}>
                    <div style={{
                      ...s.topicBarFill,
                      width: `${(minutes / maxTopicMinutes) * 100}%`,
                      background: topicColors[topic] || 'var(--accent-400)'
                    }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* History */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <Calendar size={16} color="var(--accent-400)" />
            <span style={s.cardTitle}>Recent Days</span>
          </div>
          <div style={s.cardBody}>
            {displayHistory.length === 0 ? (
              <div style={s.emptyState}>No history yet. Complete your first day to see it here.</div>
            ) : (
              displayHistory.map(log => {
                const score = dayScore(log)
                const label = log.isLive
                  ? { text: 'In progress', color: 'var(--accent-300)' }
                  : scoreLabel(score)
                const completedMinutes = log.entries
                  ? log.entries.filter(e => e.completed).reduce((sum, e) => sum + e.minutes, 0)
                  : 0
                return (
                  <div key={log.date} style={s.historyRow}>
                    <div style={s.historyDate}>{log.isLive ? 'Today' : formatDate(log.date)}</div>
                    <div style={s.historyMain}>
                      <div style={s.historyScore}>{score}%</div>
                      <div style={s.historyDetail}>
                        {log.entries ? log.entries.filter(e => e.completed).length : 0}/{log.entries?.length || 0} tasks · {Math.round(completedMinutes / 60 * 10) / 10}h focus
                        {log.autoFinalized && <span style={s.autoTag}> · auto-saved</span>}
                      </div>
                    </div>
                    <span style={{ ...s.historyPill, color: label.color, borderColor: label.color }}>
                      {label.text}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Coding Platforms */}
      {platformData && (
        <div style={{ ...s.card, marginTop: '16px' }}>
          <div style={s.cardHeader}>
            <Code size={16} color="var(--accent-400)" />
            <span style={s.cardTitle}>Coding Platforms</span>
            <span style={s.fetchedNote}>
              Updated {platformData.fetchedAt ? new Date(platformData.fetchedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
            </span>
          </div>
          <div style={{ ...s.cardBody, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            {platformData.leetcode && !platformData.leetcode.error && (
              <div style={s.platformCard}>
                <div style={s.platformName}>LeetCode</div>
                <div style={s.platformUsername}>@{platformData.leetcode.username}</div>
                <div style={s.platformStatsRow}>
                  <div style={s.platformStat}><span style={s.platformStatNum}>{platformData.leetcode.solved?.easy || 0}</span> Easy</div>
                  <div style={s.platformStat}><span style={s.platformStatNum}>{platformData.leetcode.solved?.medium || 0}</span> Medium</div>
                  <div style={s.platformStat}><span style={s.platformStatNum}>{platformData.leetcode.solved?.hard || 0}</span> Hard</div>
                </div>
                {platformData.leetcode.streak > 0 && (
                  <div style={s.platformExtra}>🔥 {platformData.leetcode.streak} day streak</div>
                )}
              </div>
            )}

            {platformData.gfg && !platformData.gfg.error && (
              <div style={s.platformCard}>
                <div style={s.platformName}>GeeksForGeeks</div>
                <div style={s.platformUsername}>@{platformData.gfg.username}</div>
                <div style={s.platformStatsRow}>
                  <div style={s.platformStat}><span style={s.platformStatNum}>{platformData.gfg.solvedByDifficulty?.easy || 0}</span> Easy</div>
                  <div style={s.platformStat}><span style={s.platformStatNum}>{platformData.gfg.solvedByDifficulty?.medium || 0}</span> Medium</div>
                  <div style={s.platformStat}><span style={s.platformStatNum}>{platformData.gfg.solvedByDifficulty?.hard || 0}</span> Hard</div>
                </div>
                <div style={s.platformExtra}>{platformData.gfg.totalProblemsSolved || 0} total solved</div>
              </div>
            )}

            {platformData.hackerrank && !platformData.hackerrank.error && (
              <div style={s.platformCard}>
                <div style={s.platformName}>HackerRank</div>
                <div style={s.platformUsername}>@{platformData.hackerrank.username}</div>
                <div style={s.platformExtra}>{platformData.hackerrank.totalDomains || 0} active domains</div>
              </div>
            )}

            {platformData.codechef && !platformData.codechef.error && (
              <div style={s.platformCard}>
                <div style={s.platformName}>CodeChef</div>
                <div style={s.platformUsername}>@{platformData.codechef.username}</div>
                <div style={s.platformExtra}>
                  {platformData.codechef.rating ? `Rating: ${platformData.codechef.rating}` : 'Unrated'}
                  {platformData.codechef.stars ? ` · ${platformData.codechef.stars}` : ''}
                </div>
              </div>
            )}

            {Object.values(platformData).every(p => !p || p.error || typeof p !== 'object') && (
              <div style={s.emptyState}>No platform data fetched yet. Add usernames in Settings, then regenerate your plan.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  page: { padding: '24px', maxWidth: '1200px' },
  header: { marginBottom: '24px' },
  title: { fontSize: '22px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' },
  subtitle: { fontSize: '13px', color: 'var(--text-secondary)' },
  loadingState: { color: 'var(--text-secondary)', fontSize: '13px', padding: '40px', textAlign: 'center' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' },
  statCard: {
    background: 'var(--bg-900)', border: '1px solid var(--border)', borderRadius: '12px',
    padding: '18px', textAlign: 'center'
  },
  statValue: { fontSize: '24px', fontWeight: '600', color: 'var(--text-primary)', margin: '8px 0 2px' },
  statLabel: { fontSize: '11.5px', color: 'var(--text-secondary)' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' },
  card: { background: 'var(--bg-900)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' },
  cardHeader: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '14px 16px', borderBottom: '1px solid var(--border)'
  },
  cardTitle: { fontSize: '13.5px', fontWeight: '600', color: 'var(--text-primary)' },
  cardBody: { padding: '16px', maxHeight: '480px', overflowY: 'auto' },
  emptyState: { textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' },
  topicRow: { marginBottom: '14px' },
  topicRowHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' },
  topicName: { fontSize: '13px', color: 'var(--text-primary)' },
  topicMinutes: { fontSize: '12px', color: 'var(--text-secondary)' },
  topicBarTrack: { height: '8px', background: 'var(--bg-800)', borderRadius: '4px', overflow: 'hidden' },
  topicBarFill: { height: '100%', borderRadius: '4px', transition: 'width 0.4s' },
  historyRow: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '12px 0', borderBottom: '1px solid var(--border)'
  },
  historyDate: { fontSize: '12px', color: 'var(--text-muted)', minWidth: '50px' },
  historyMain: { flex: 1 },
  historyScore: { fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' },
  historyDetail: { fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' },
  autoTag: { color: 'var(--accent-300)' },
  historyPill: {
    fontSize: '11px', padding: '3px 10px', borderRadius: '20px',
    border: '1px solid', whiteSpace: 'nowrap'
  },
  fetchedNote: { fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' },
  platformCard: {
    background: 'var(--bg-800)', border: '1px solid var(--border)',
    borderRadius: '10px', padding: '14px'
  },
  platformName: { fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '2px' },
  platformUsername: { fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '10px' },
  platformStatsRow: { display: 'flex', gap: '14px', marginBottom: '8px' },
  platformStat: { fontSize: '11px', color: 'var(--text-secondary)' },
  platformStatNum: { fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', display: 'block' },
  platformExtra: { fontSize: '11.5px', color: 'var(--accent-300)' }
}

export default Progress