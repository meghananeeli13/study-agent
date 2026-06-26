require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { db } = require('./config/firebase')
const profileRoutes = require('./routes/profile')
const logRoutes = require('./routes/logs')
const plannerRoutes = require('./routes/planner')
const scraperRoutes = require('./routes/scraper')
const statsRoutes = require('./routes/stats')

const rateLimit = require('express-rate-limit')
const { ipKeyGenerator } = require('express-rate-limit')

// per-user daily limit on agent calls (the expensive operations)
const agentLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 15, // generous enough for real daily use, low enough to protect shared quota
  message: { error: 'Daily AI agent limit reached. This resets in 24 hours.' },
  keyGenerator: (req) => {
    // key by the Firebase auth token so each logged-in user gets their own limit,
    // not a shared IP-based bucket
    const auth = req.headers.authorization
    if (auth && auth.startsWith('Bearer ')) {
      return auth.split('Bearer ')[1].substring(0, 40)
    }
    return ipKeyGenerator(req.ip)
  },
  standardHeaders: true,
  legacyHeaders: false
})

const app = express()

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}))
app.use(express.json())

// IMPORTANT: rate limiters must be registered BEFORE the routes they protect,
// otherwise the route handler responds first and the limiter never runs.
app.use('/planner/plan', agentLimiter)
app.use('/planner/copilot', agentLimiter)

app.use('/profile', profileRoutes)
app.use('/logs', logRoutes)
app.use('/planner', plannerRoutes)
app.use('/scraper', scraperRoutes)
app.use('/stats', statsRoutes)

app.get('/', (req, res) => {
  res.json({ message: 'Study agent server is running' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})