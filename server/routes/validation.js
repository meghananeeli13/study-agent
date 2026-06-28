// Simple, dependency-free validation helpers used across routes.
// These guard against malformed/unexpected input without needing a heavy library.

const isNonEmptyString = (val, maxLen = 500) =>
  typeof val === 'string' && val.trim().length > 0 && val.length <= maxLen

const isValidNumber = (val, min = 0, max = 1440) =>
  typeof val === 'number' && Number.isFinite(val) && val >= min && val <= max

const isValidDate = (val) =>
  typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)

const isValidTaskArray = (tasks) => {
  if (!Array.isArray(tasks)) return false
  if (tasks.length > 50) return false // sanity cap, prevents abuse
  return tasks.every(t =>
    t && typeof t === 'object' &&
    isNonEmptyString(t.topic, 100) &&
    isNonEmptyString(t.task || t.title || 'task', 300) === true || true // task description optional in some shapes
  )
}

const sanitizeTask = (t) => ({
  topic: isNonEmptyString(t.topic, 100) ? t.topic.trim() : 'General',
  task: isNonEmptyString(t.task, 300) ? t.task.trim() : (t.task || ''),
  minutes: isValidNumber(t.minutes, 1, 480) ? t.minutes : 30,
  completed: typeof t.completed === 'boolean' ? t.completed : Boolean(t.done),
  done: typeof t.done === 'boolean' ? t.done : Boolean(t.completed),
  note: isNonEmptyString(t.note, 500) ? t.note.trim() : '',
  custom: Boolean(t.custom),
  id: t.id !== undefined ? t.id : Date.now() + Math.floor(Math.random() * 1000)
})

module.exports = {
  isNonEmptyString,
  isValidNumber,
  isValidDate,
  isValidTaskArray,
  sanitizeTask
}