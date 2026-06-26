const express = require('express')
const router = express.Router()
const axios = require('axios')
const cheerio = require('cheerio')
const { db } = require('../config/firebase')
const verifyToken = require('../middleware/auth')

// ---------- LEETCODE ----------
// Using the official LeetCode GraphQL API directly - most reliable since it's first-party
const fetchLeetCode = async (username) => {
  try {
    const query = `
      query getUserProfile($username: String!) {
        matchedUser(username: $username) {
          submitStats {
            acSubmissionNum {
              difficulty
              count
            }
          }
          userCalendar {
            streak
            totalActiveDays
          }
        }
        recentAcSubmissionList(username: $username, limit: 10) {
          title
          timestamp
          lang
        }
      }
    `

    const response = await axios.post('https://leetcode.com/graphql', {
      query,
      variables: { username }
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 8000
    })

    const data = response.data.data
    const stats = data.matchedUser?.submitStats?.acSubmissionNum || []
    const calendar = data.matchedUser?.userCalendar || {}
    const recent = data.recentAcSubmissionList || []

    return {
      platform: 'leetcode',
      username,
      solved: {
        easy: stats.find(s => s.difficulty === 'Easy')?.count || 0,
        medium: stats.find(s => s.difficulty === 'Medium')?.count || 0,
        hard: stats.find(s => s.difficulty === 'Hard')?.count || 0
      },
      streak: calendar.streak || 0,
      totalActiveDays: calendar.totalActiveDays || 0,
      recentSolved: recent.map(r => ({
        title: r.title,
        date: new Date(r.timestamp * 1000).toISOString().split('T')[0],
        language: r.lang
      })),
      fetchedAt: new Date().toISOString()
    }
  } catch (error) {
    console.error('LeetCode fetch error:', error.message)
    // fallback to hosted stats API if official GraphQL fails
    try {
      const fallback = await axios.get(`https://leetcode-stats.tashif.codes/${username}`, { timeout: 8000 })
      const d = fallback.data
      return {
        platform: 'leetcode',
        username,
        solved: { easy: d.easySolved || 0, medium: d.mediumSolved || 0, hard: d.hardSolved || 0 },
        ranking: d.ranking || null,
        fetchedAt: new Date().toISOString(),
        source: 'fallback'
      }
    } catch (fallbackError) {
      return { platform: 'leetcode', username, error: error.message }
    }
  }
}

// ---------- HACKERRANK ----------
const fetchHackerRank = async (username) => {
  try {
    const response = await axios.get(
      `https://www.hackerrank.com/rest/hackers/${username}/scores_elo`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )

    const scores = response.data.models || []
    const totalBadges = scores.length

    return {
      platform: 'hackerrank',
      username,
      domains: scores.map(s => ({
        name: s.name,
        score: s.score,
        level: s.level
      })),
      totalDomains: totalBadges,
      fetchedAt: new Date().toISOString()
    }
  } catch (error) {
    console.error('HackerRank fetch error:', error.message)
    return { platform: 'hackerrank', username, error: error.message }
  }
}

// ---------- GEEKSFORGEEKS ----------
// GFG has no official API. We use a free, hosted third-party API
// (gfg-stats.tashif.codes) that handles the scraping for us reliably.
const fetchGFG = async (username) => {
  try {
    const response = await axios.get(
      `https://gfg-stats.tashif.codes/${username}`,
      { timeout: 8000 }
    )

    const data = response.data

    if (data.error) {
      return { platform: 'gfg', username, error: data.message || 'User not found' }
    }

    return {
      platform: 'gfg',
      username,
      totalProblemsSolved: data.totalProblemsSolved || 0,
      solvedByDifficulty: {
        school: data.School || 0,
        basic: data.Basic || 0,
        easy: data.Easy || 0,
        medium: data.Medium || 0,
        hard: data.Hard || 0
      },
      fetchedAt: new Date().toISOString()
    }
  } catch (error) {
    console.error('GFG fetch error:', error.message)
    return {
      platform: 'gfg',
      username,
      error: 'Could not fetch GFG profile. Check the username is correct.',
      fetchedAt: new Date().toISOString()
    }
  }
}

// ---------- CODECHEF ----------
const fetchCodeChef = async (username) => {
  try {
    const response = await axios.get(
      `https://www.codechef.com/users/${username}`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        timeout: 8000
      }
    )

    const $ = cheerio.load(response.data)

    const rating = $('.rating-number').first().text().trim()
    const stars = $('.rating').first().text().trim()
    const globalRank = $('.rating-ranks strong').first().text().trim()
    const problemsSolvedText = $('.problems-solved h3').last().text().trim()

    return {
      platform: 'codechef',
      username,
      rating: rating || null,
      stars: stars || null,
      globalRank: globalRank || null,
      problemsSolved: problemsSolvedText || null,
      fetchedAt: new Date().toISOString()
    }
  } catch (error) {
    console.error('CodeChef fetch error:', error.message)
    return {
      platform: 'codechef',
      username,
      error: 'Could not fetch CodeChef profile.',
      fetchedAt: new Date().toISOString()
    }
  }
}

// ---------- ROUTES ----------

// Save platform usernames to profile
router.post('/setup', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid
    const { leetcodeUsername, hackerrankUsername, gfgUsername, codechefUsername } = req.body

    await db.collection('users').doc(userId).update({
      platforms: {
        leetcode: leetcodeUsername || null,
        hackerrank: hackerrankUsername || null,
        gfg: gfgUsername || null,
        codechef: codechefUsername || null
      }
    })

    res.json({ message: 'Platform usernames saved' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Manually trigger a fetch of all configured platforms
router.get('/fetch', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid

    const profileDoc = await db.collection('users').doc(userId).get()
    const profile = profileDoc.data()
    const platforms = profile.platforms || {}

    const results = {}

    if (platforms.leetcode) results.leetcode = await fetchLeetCode(platforms.leetcode)
    if (platforms.hackerrank) results.hackerrank = await fetchHackerRank(platforms.hackerrank)
    if (platforms.gfg) results.gfg = await fetchGFG(platforms.gfg)
    if (platforms.codechef) results.codechef = await fetchCodeChef(platforms.codechef)

    await db
      .collection('users')
      .doc(userId)
      .collection('platformData')
      .doc(new Date().toISOString().split('T')[0])
      .set({ ...results, fetchedAt: new Date().toISOString() })

    res.json({ message: 'Platform data fetched', data: results })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get the most recently fetched platform data (for display)
router.get('/latest', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid

    const snapshot = await db
      .collection('users')
      .doc(userId)
      .collection('platformData')
      .orderBy('fetchedAt', 'desc')
      .limit(1)
      .get()

    if (snapshot.empty) {
      return res.json({ data: null })
    }

    res.json({ data: snapshot.docs[0].data() })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
module.exports.fetchLeetCode = fetchLeetCode
module.exports.fetchHackerRank = fetchHackerRank
module.exports.fetchGFG = fetchGFG
module.exports.fetchCodeChef = fetchCodeChef