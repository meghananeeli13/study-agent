const express = require('express')
const router = express.Router()
const { db } = require('../config/firebase')
const verifyToken = require('../middleware/auth')

router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid

    // fetch last 30 days of logs (enough to compute streak and weekly stats)
    const logsSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('logs')
      .orderBy('date', 'desc')
      .limit(30)
      .get()

    const logs = []
    logsSnapshot.forEach(doc => logs.push(doc.data()))

    // sort ascending by date for streak calc
    const sortedLogs = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date))

    // --- calculate streak ---
    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const logDates = new Set(logs.map(l => l.date))
    let cursor = new Date(today)

    // if today not logged yet, start checking from yesterday
    if (!logDates.has(cursor.toISOString().split('T')[0])) {
      cursor.setDate(cursor.getDate() - 1)
    }

    while (logDates.has(cursor.toISOString().split('T')[0])) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }

    // --- weekly stats (last 7 days) ---
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const weekLogs = logs.filter(l => new Date(l.date) >= sevenDaysAgo)

    let weeklyMinutes = 0
    let weeklyCompletedTasks = 0
    let weeklyTotalTasks = 0

    weekLogs.forEach(log => {
      if (log.entries) {
        log.entries.forEach(e => {
          weeklyTotalTasks++
          if (e.completed) {
            weeklyCompletedTasks++
            weeklyMinutes += e.minutes || 0
          }
        })
      }
    })

    const weeklyCompletionRate = weeklyTotalTasks > 0
      ? Math.round((weeklyCompletedTasks / weeklyTotalTasks) * 100)
      : 0

    // --- topic breakdown (last 7 days) ---
    const topicMinutes = {}
    weekLogs.forEach(log => {
      if (log.entries) {
        log.entries.forEach(e => {
          if (e.completed) {
            topicMinutes[e.topic] = (topicMinutes[e.topic] || 0) + (e.minutes || 0)
          }
        })
      }
    })

    // --- all time stats ---
    let totalProblemsSolved = 0
    logs.forEach(log => {
      if (log.entries) {
        log.entries.forEach(e => {
          if (e.completed && e.topic === 'DSA') totalProblemsSolved++
        })
      }
    })

    res.json({
        streak,
        weeklyMinutes,
        weeklyHours: Math.round((weeklyMinutes / 60) * 10) / 10,
        weeklyCompletionRate,
        weeklyTotalTasks,
        weeklyCompletedTasks,
        topicMinutes,
        totalDaysLogged: logs.length,
        totalProblemsSolved
    })
  } catch (error) {
    console.error('Stats error:', error)
    res.status(500).json({ error: error.message })
  }
})

module.exports = router