require('dotenv').config()
const Groq = require('groq-sdk')

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const runAgent = async (profile, logs, yesterdayLog, userMessage = null, platformData = null, isCopilotChat = false, conversationHistory = []) => {
  const today = new Date().toISOString().split('T')[0]

  const historyContext = logs.length === 0 ? 'No study history yet — this is the first day.' :
    logs.map(log => {
      const entries = log.entries ? log.entries.map(e =>
        `  - ${e.topic}: ${e.minutes}min (${e.completed ? 'completed' : 'incomplete'})`
      ).join('\n') : '  - No entries'
      return `Date: ${log.date}\n${entries}\n  Notes: ${log.extraNote || log.notes || 'none'}`
    }).join('\n\n')

  const yesterdayContext = yesterdayLog ?
    `Yesterday's incomplete tasks: ${yesterdayLog.entries ?
      yesterdayLog.entries.filter(e => !e.completed).map(e => e.topic).join(', ') || 'none'
      : 'none'}` : 'No yesterday log available.'

  const profileContext = `
Student: ${profile.name}
Goal: ${profile.goal}
Daily target: ${profile.dailyHours} hours
Topics: ${profile.topics.map(t => `${t.name} (${t.level})`).join(', ')}
Background: ${profile.background || 'Not provided'}
  `.trim()

  const platformContext = platformData ? `
Real-time coding platform activity (auto-tracked, factual data):
${platformData.leetcode && !platformData.leetcode.error ? `LeetCode (${platformData.leetcode.username}): ${platformData.leetcode.solved.easy} easy, ${platformData.leetcode.solved.medium} medium, ${platformData.leetcode.solved.hard} hard problems solved. Current streak: ${platformData.leetcode.streak} days.` : ''}
${platformData.gfg && !platformData.gfg.error ? `GeeksForGeeks (${platformData.gfg.username}): ${platformData.gfg.totalProblemsSolved} total problems solved.` : ''}
${platformData.hackerrank && !platformData.hackerrank.error ? `HackerRank (${platformData.hackerrank.username}): active in ${platformData.hackerrank.totalDomains} domains.` : ''}
${platformData.codechef && !platformData.codechef.error ? `CodeChef (${platformData.codechef.username}): rating ${platformData.codechef.rating || 'unrated'}.` : ''}
Use this real data to gauge actual DSA progress — don't just rely on what they log manually.
`.trim() : ''

  const planningInstructions = `
TASK DECOMPOSITION RULES — follow these strictly when creating a study plan:
- If the student mentions multiple distinct sub-topics (e.g. "DP, tries, recursion, backtracking"), create a SEPARATE task for EACH one. Never merge multiple sub-topics into a single task.
- Each task should cover exactly ONE specific concept or activity, not a list of concepts.
- Give each task a realistic, focused time allocation (don't assign 90 minutes to "everything" — split it proportionally across the separate tasks instead).
- Task descriptions must be concrete and actionable, e.g. "Practice 3 recursion problems on LeetCode" not "Work on recursion and backtracking".
- If the student is a beginner, prefer fewer sub-topics per day done deeply over many sub-topics done shallowly. Suggest spreading remaining sub-topics across the next few days rather than cramming all of them today.
- Order tasks by logical learning progression where it matters (e.g. recursion before backtracking, since backtracking builds on recursion).

IMPORTANT: Always end your response with a JSON block in EXACTLY this format, no variations:
\`\`\`json
{
  "tasks": [
    { "topic": "DSA", "task": "Specific, single-concept task description", "minutes": 45 },
    { "topic": "DSA", "task": "Another specific, single-concept task", "minutes": 45 },
    { "topic": "CS Fundamentals", "task": "Specific task description", "minutes": 60 }
  ]
}
\`\`\``

  const copilotInstructions = `
You are in CONVERSATION mode right now — the student is talking to you in an open chat, not asking for a new day plan.
Respond naturally and conversationally, like a knowledgeable mentor who knows their full history.
Give specific, honest, useful answers — suggest problems, analyze their progress, give study advice, or just discuss whatever they bring up.
Do NOT end with a JSON tasks block in this mode — only do that when explicitly asked to build or update a day's plan.
Keep responses focused and not overly long unless the question genuinely needs depth.`

  const systemPrompt = `You are a smart study planning agent for a student preparing for placements.
You analyze study history and build personalized daily plans, and you're also available as a conversational mentor.
Always prioritize DSA and CS Fundamentals for placement prep.
Be encouraging, specific, and honest about neglected areas.
Do NOT use any function call syntax like <function=...>. Just respond in plain text.
${isCopilotChat ? copilotInstructions : planningInstructions}`

  const isFollowUp = isCopilotChat && conversationHistory.length > 0

  const userPrompt = isFollowUp
    ? userMessage
    : (
      logs.length === 0
        ? `This is my first day. Here is my profile:
${profileContext}
${platformContext}

${userMessage ? `Specific request from the student: "${userMessage}"\n\n${isCopilotChat ? 'Respond conversationally to this.' : 'Use this request as the basis for today\'s tasks, applying the task decomposition rules above.'}` : `Build me a solid first day study plan for ${profile.dailyHours} hours.`}
${isCopilotChat ? '' : 'Be encouraging and explain why you chose each task.\nRemember to end with the JSON tasks block.'}`
        : `Here is my profile:
${profileContext}
${platformContext}

My study history (last ${logs.length} days):
${historyContext}

${yesterdayContext}

Today is ${today}.
${userMessage ? `Specific request from the student: "${userMessage}"\n\n${isCopilotChat ? 'Respond conversationally to this, using the context above as needed.' : 'Use this request as the basis for today\'s tasks, applying the task decomposition rules above, while still considering my history and any incomplete tasks from yesterday.'}` : `Analyze my history, identify patterns and neglected topics, carry over any incomplete tasks from yesterday, and build me a balanced study plan for today.`}
${isCopilotChat ? '' : 'Remember to end with the JSON tasks block.'}`
    )

  const messages = [{ role: 'system', content: systemPrompt }]

  // include recent conversation turns so follow-up questions work naturally
  if (isCopilotChat && conversationHistory.length > 0) {
    conversationHistory.slice(-6).forEach(turn => {
      messages.push({ role: 'user', content: turn.message })
      if (turn.response) messages.push({ role: 'assistant', content: turn.response })
    })
  }

  messages.push({ role: 'user', content: userPrompt })

  const response = await groq.chat.completions.create({
    model: isCopilotChat ? 'llama-3.3-70b-versatile' : 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages,
    max_tokens: 2048,
    temperature: isCopilotChat ? 0.4 : 0.7
  })

  return response.choices[0].message.content
}

module.exports = { runAgent }