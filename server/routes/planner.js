const express = require('express')
const router = express.Router()
const { db } = require('../config/firebase')
const verifyToken = require('../middleware/auth')
const { runAgent } = require('../agent/brain')
const scraper = require('./scraper')
const { isNonEmptyString, isValidNumber, sanitizeTask } = require('./validation')

// Get past co-pilot conversation history (for chat UI)
router.get('/copilot/history', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid

    const snapshot = await db
      .collection('users')
      .doc(userId)
      .collection('conversations')
      .orderBy('timestamp', 'asc')
      .limit(50)
      .get()

    const conversations = []
    snapshot.forEach(doc => conversations.push(doc.data()))

    res.json({ conversations })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get today's existing plan without regenerating
router.get('/today', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid
    const today = new Date().toISOString().split('T')[0]

    const planDoc = await db
      .collection('users')
      .doc(userId)
      .collection('plans')
      .doc(today)
      .get()

    if (planDoc.exists) {
      const data = planDoc.data()
      res.json({
        plan: data.plan,
        tasks: (data.workingTasks && data.workingTasks.length > 0) ? data.workingTasks : (data.tasks || [])
      })
    } else {
      res.json({ plan: null, tasks: [] })
    }
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Save current working state of today's tasks (ticks, removals, additions)
router.post('/today-tasks', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid
    const { date, tasks } = req.body

    if (!isNonEmptyString(date, 10)) {
      return res.status(400).json({ error: 'Invalid or missing date' })
    }
    if (!Array.isArray(tasks)) {
      return res.status(400).json({ error: 'Tasks must be an array' })
    }
    if (tasks.length > 50) {
      return res.status(400).json({ error: 'Too many tasks (max 50)' })
    }

    const cleanTasks = tasks.map(sanitizeTask)

    await db
      .collection('users')
      .doc(userId)
      .collection('plans')
      .doc(date)
      .set({ workingTasks: cleanTasks }, { merge: true })

    res.json({ message: 'Tasks saved' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Generate today's plan
router.get('/plan', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid
    const today = new Date().toISOString().split('T')[0]

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayDate = yesterday.toISOString().split('T')[0]

    const profileDoc = await db.collection('users').doc(userId).get()
    if (!profileDoc.exists) {
      return res.status(404).json({ error: 'Profile not found. Please set up your profile first.' })
    }
    const profile = profileDoc.data()

    // --- AUTO-FETCH PLATFORM DATA ---
    let platformData = null
    if (profile.platforms && Object.values(profile.platforms).some(v => v)) {
      try {
        console.log('Fetching platform data for user:', userId)
        const results = {}
        if (profile.platforms.leetcode) {
          results.leetcode = await scraper.fetchLeetCode(profile.platforms.leetcode)
        }
        if (profile.platforms.hackerrank) {
          results.hackerrank = await scraper.fetchHackerRank(profile.platforms.hackerrank)
        }
        if (profile.platforms.gfg) {
          results.gfg = await scraper.fetchGFG(profile.platforms.gfg)
        }
        if (profile.platforms.codechef) {
          results.codechef = await scraper.fetchCodeChef(profile.platforms.codechef)
        }
        platformData = results

        await db
          .collection('users')
          .doc(userId)
          .collection('platformData')
          .doc(today)
          .set({ ...results, fetchedAt: new Date().toISOString() })
      } catch (e) {
        console.log('Platform fetch failed:', e.message)
      }
    }

    const logsSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('logs')
      .orderBy('date', 'desc')
      .limit(7)
      .get()

    const logs = []
    logsSnapshot.forEach(doc => logs.push(doc.data()))

    const yesterdayDoc = await db
      .collection('users')
      .doc(userId)
      .collection('logs')
      .doc(yesterdayDate)
      .get()

    let yesterdayLog = yesterdayDoc.exists ? yesterdayDoc.data() : null

    console.log('Running agent for user:', userId)
    const agentResponse = await runAgent(profile, logs, yesterdayLog, null, platformData)

    // AUTO-FINALIZE: if yesterday has no log but has workingTasks saved, convert them into a log automatically
    if (!yesterdayLog) {
      const yesterdayPlanDoc = await db
        .collection('users')
        .doc(userId)
        .collection('plans')
        .doc(yesterdayDate)
        .get()

      if (yesterdayPlanDoc.exists) {
        const yesterdayPlanData = yesterdayPlanDoc.data()
        const tasksToFinalize = (yesterdayPlanData.workingTasks && yesterdayPlanData.workingTasks.length > 0)
          ? yesterdayPlanData.workingTasks
          : (yesterdayPlanData.tasks || [])

        if (tasksToFinalize.length > 0) {
          const entries = tasksToFinalize.map(t => ({
            topic: t.topic,
            minutes: t.minutes,
            completed: t.done || false,
            note: t.note || ''
          }))

          const totalMinutes = entries.filter(e => e.completed).reduce((sum, e) => sum + e.minutes, 0)

          const autoLog = {
            date: yesterdayDate,
            entries,
            totalMinutes,
            extraNote: '',
            agentNote: '',
            autoFinalized: true,
            createdAt: new Date().toISOString()
          }

          await db
            .collection('users')
            .doc(userId)
            .collection('logs')
            .doc(yesterdayDate)
            .set(autoLog)

          yesterdayLog = autoLog
          console.log(`Auto-finalized log for ${yesterdayDate}`)
        }
      }
    }

    // extract tasks from agent response
    let tasks = []
    let planText = agentResponse

    try {
      const jsonMatch = agentResponse.match(/```json\n?([\s\S]*?)\n?```/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1])
        tasks = (parsed.tasks || []).map(sanitizeTask)
        planText = agentResponse.replace(/```json\n?[\s\S]*?\n?```/, '').trim()
      }
    } catch (e) {
      console.log('Could not parse tasks from agent response:', e.message)
    }

    await db
      .collection('users')
      .doc(userId)
      .collection('plans')
      .doc(today)
      .set({
        date: today,
        plan: planText,
        tasks,
        workingTasks: [],
        generatedAt: new Date().toISOString()
      })

    res.json({ date: today, plan: planText, tasks })
  } catch (error) {
    console.error('Planner error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Co-pilot — ask the agent anything
router.post('/copilot', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid
    const { message } = req.body

    if (!isNonEmptyString(message, 2000)) {
      return res.status(400).json({ error: 'Message must be a non-empty string under 2000 characters' })
    }

    const profileDoc = await db.collection('users').doc(userId).get()
    if (!profileDoc.exists) {
      return res.status(404).json({ error: 'Profile not found' })
    }
    const profile = profileDoc.data()

    const logsSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('logs')
      .orderBy('date', 'desc')
      .limit(7)
      .get()

    const logs = []
    logsSnapshot.forEach(doc => logs.push(doc.data()))

    const conversationSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('conversations')
      .orderBy('timestamp', 'desc')
      .limit(6)
      .get()

    const conversationHistory = []
    conversationSnapshot.forEach(doc => conversationHistory.push(doc.data()))
    conversationHistory.reverse()

    const agentResponse = await runAgent(profile, logs, null, message.trim(), null, true, conversationHistory)

    await db
      .collection('users')
      .doc(userId)
      .collection('conversations')
      .add({
        message: message.trim(),
        response: agentResponse,
        timestamp: new Date().toISOString()
      })

    res.json({ response: agentResponse })
  } catch (error) {
    console.error('Copilot error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Save daily log
router.post('/log', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid
    const { tasks, extraNote } = req.body
    const today = new Date().toISOString().split('T')[0]

    if (!Array.isArray(tasks)) {
      return res.status(400).json({ error: 'Tasks must be an array' })
    }
    if (tasks.length > 50) {
      return res.status(400).json({ error: 'Too many tasks (max 50)' })
    }
    if (extraNote !== undefined && typeof extraNote !== 'string') {
      return res.status(400).json({ error: 'extraNote must be a string' })
    }
    if (extraNote && extraNote.length > 2000) {
      return res.status(400).json({ error: 'extraNote too long (max 2000 characters)' })
    }

    const cleanExtraNote = isNonEmptyString(extraNote, 2000) ? extraNote.trim() : ''

    const entries = tasks.map(task => ({
      topic: isNonEmptyString(task.topic, 100) ? task.topic.trim() : 'General',
      minutes: isValidNumber(task.minutes, 1, 480) ? task.minutes : 30,
      completed: Boolean(task.completed),
      note: isNonEmptyString(task.note, 500) ? task.note.trim() : ''
    }))

    const totalMinutes = entries
      .filter(e => e.completed)
      .reduce((sum, e) => sum + e.minutes, 0)

    let agentNote = ''
    if (cleanExtraNote) {
      const profileDoc = await db.collection('users').doc(userId).get()
      if (profileDoc.exists) {
        const profile = profileDoc.data()
        agentNote = await runAgent(
          profile, [], null,
          `The user added this note about today: "${cleanExtraNote}". Give a brief encouraging acknowledgement and note any insights.`,
          null, true
        )
      }
    }

    const log = {
      date: today,
      entries,
      totalMinutes,
      extraNote: cleanExtraNote,
      agentNote,
      createdAt: new Date().toISOString()
    }

    await db
      .collection('users')
      .doc(userId)
      .collection('logs')
      .doc(today)
      .set(log)

    res.json({ message: 'Log saved', data: log })
  } catch (error) {
    console.error('Log error:', error)
    res.status(500).json({ error: error.message })
  }
})

module.exports = router