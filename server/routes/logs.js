const express = require('express')
const router = express.Router()
const { db } = require('../config/firebase')
const verifyToken = require('../middleware/auth')

// Save today's log
router.post('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid
    const { date, entries, energyLevel, totalMinutes, notes } = req.body

    const log = {
      date,
      entries,
      energyLevel,
      totalMinutes,
      notes: notes || '',
      createdAt: new Date().toISOString()
    }

    await db
      .collection('users')
      .doc(userId)
      .collection('logs')
      .doc(date)
      .set(log)

    res.json({ message: 'Log saved', data: log })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get logs for last N days
router.get('/recent/:days', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid
    const days = parseInt(req.params.days) || 7

    const logsSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('logs')
      .orderBy('date', 'desc')
      .limit(days)
      .get()

    const logs = []
    logsSnapshot.forEach(doc => logs.push(doc.data()))

    res.json({ logs })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get a specific day's log
router.get('/:date', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid
    const { date } = req.params

    const logDoc = await db
      .collection('users')
      .doc(userId)
      .collection('logs')
      .doc(date)
      .get()

    if (!logDoc.exists) {
      return res.status(404).json({ error: 'No log found for this date' })
    }

    res.json(logDoc.data())
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router