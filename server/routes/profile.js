const express = require('express')
const router = express.Router()
const { db } = require('../config/firebase')
const verifyToken = require('../middleware/auth')
const { isNonEmptyString, isValidNumber } = require('./validation')

const defaultTopics = [
  { name: 'DSA', level: 'beginner', priority: 'high' },
  { name: 'CS Fundamentals', level: 'beginner', priority: 'high' },
  { name: 'Web Development', level: 'beginner', priority: 'medium' },
  { name: 'Machine Learning', level: 'beginner', priority: 'medium' },
  { name: 'Aptitude', level: 'beginner', priority: 'high' }
]

const validLevels = ['beginner', 'intermediate', 'advanced']
const validPriorities = ['low', 'medium', 'high']

const isValidTopicsArray = (topics) => {
  if (!Array.isArray(topics)) return false
  if (topics.length > 30) return false
  return topics.every(t =>
    t && typeof t === 'object' &&
    isNonEmptyString(t.name, 60) &&
    (t.level === undefined || validLevels.includes(t.level)) &&
    (t.priority === undefined || validPriorities.includes(t.priority))
  )
}

// GET profile
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid
    const profileDoc = await db.collection('users').doc(userId).get()

    if (!profileDoc.exists) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    res.json(profileDoc.data())
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// CREATE or UPDATE profile
// IMPORTANT: only writes fields that were actually provided in the request,
// and validates each field before writing. This prevents lightweight "touch"
// calls from clobbering Settings changes, and prevents malformed input
// from corrupting the stored profile.
router.post('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid
    const { name, topics, dailyHours, goal, background, onboardingDone } = req.body

    const existingDoc = await db.collection('users').doc(userId).get()
    const isNewProfile = !existingDoc.exists

    const profileData = {
      updatedAt: new Date().toISOString()
    }

    if (name !== undefined) {
      if (!isNonEmptyString(name, 100)) {
        return res.status(400).json({ error: 'Invalid name' })
      }
      profileData.name = name.trim()
    }

    if (goal !== undefined) {
      if (!isNonEmptyString(goal, 50)) {
        return res.status(400).json({ error: 'Invalid goal' })
      }
      profileData.goal = goal.trim()
    }

    if (dailyHours !== undefined) {
      if (!isValidNumber(dailyHours, 1, 16)) {
        return res.status(400).json({ error: 'dailyHours must be a number between 1 and 16' })
      }
      profileData.dailyHours = dailyHours
    }

    if (topics !== undefined) {
      if (!isValidTopicsArray(topics)) {
        return res.status(400).json({ error: 'Invalid topics array' })
      }
      profileData.topics = topics.map(t => ({
        name: t.name.trim(),
        level: validLevels.includes(t.level) ? t.level : 'beginner',
        priority: validPriorities.includes(t.priority) ? t.priority : 'medium'
      }))
    }

    if (background !== undefined) {
      if (typeof background !== 'string' || background.length > 3000) {
        return res.status(400).json({ error: 'background must be a string under 3000 characters' })
      }
      profileData.background = background.trim()
    }

    if (onboardingDone !== undefined) {
      profileData.onboardingDone = Boolean(onboardingDone)
    }

    // only apply defaults the very first time a profile is created,
    // never on subsequent updates (prevents clobbering Settings changes)
    if (isNewProfile) {
      if (profileData.goal === undefined) profileData.goal = 'placement'
      if (profileData.dailyHours === undefined) profileData.dailyHours = 4
      if (profileData.topics === undefined) profileData.topics = defaultTopics
      if (profileData.background === undefined) profileData.background = ''
    }

    await db.collection('users').doc(userId).set(profileData, { merge: true })

    const finalDoc = await db.collection('users').doc(userId).get()
    res.json({ message: 'Profile saved', data: finalDoc.data() })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ADD new topic
router.post('/topic', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid
    const { name, level, priority } = req.body

    if (!isNonEmptyString(name, 60)) {
      return res.status(400).json({ error: 'Invalid topic name' })
    }
    if (level !== undefined && !validLevels.includes(level)) {
      return res.status(400).json({ error: 'Invalid level' })
    }
    if (priority !== undefined && !validPriorities.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority' })
    }

    const profileDoc = await db.collection('users').doc(userId).get()
    if (!profileDoc.exists) {
      return res.status(404).json({ error: 'Profile not found' })
    }
    const profile = profileDoc.data()
    const topics = profile.topics || []

    if (topics.length >= 30) {
      return res.status(400).json({ error: 'Maximum number of topics reached (30)' })
    }

    const exists = topics.find(t => t.name.toLowerCase() === name.trim().toLowerCase())
    if (exists) {
      return res.status(400).json({ error: 'Topic already exists' })
    }

    topics.push({ name: name.trim(), level: level || 'beginner', priority: priority || 'medium' })
    await db.collection('users').doc(userId).update({ topics })

    res.json({ message: 'Topic added', topics })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router