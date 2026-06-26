import React, { useEffect, useState, useRef } from 'react'
import api from '../config/api'
import ReactMarkdown from 'react-markdown'
import { Send, Brain, MessageSquare, Sparkles } from 'lucide-react'

const suggestedPrompts = [
  "What should I focus on today?",
  "How am I doing for placements?",
  "I'm struggling with dynamic programming — what should I do?",
  "Give me a problem to practice recursion",
  "Should I skip aptitude this week?",
  "What are my weak areas right now?"
]

const Copilot = () => {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const scrollRef = useRef(null)

  useEffect(() => {
    loadHistory()
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, sending])

  const loadHistory = async () => {
    try {
      const res = await api.get('/planner/copilot/history')
      setMessages(res.data.conversations || [])
    } catch (e) {
      console.log('No conversation history yet')
    } finally {
      setLoadingHistory(false)
    }
  }

  const sendMessage = async (text) => {
    const messageText = text || input
    if (!messageText.trim() || sending) return

    setInput('')
    setSending(true)

    const tempMessage = { message: messageText, response: null, timestamp: new Date().toISOString(), pending: true }
    setMessages(prev => [...prev, tempMessage])

    try {
      const res = await api.post('/planner/copilot', { message: messageText })
      setMessages(prev => prev.map((m, i) =>
        i === prev.length - 1 ? { ...m, response: res.data.response, pending: false } : m
      ))
    } catch (err) {
      setMessages(prev => prev.map((m, i) =>
        i === prev.length - 1 ? { ...m, response: `⚠️ ${err.response?.data?.error || err.message}`, pending: false, error: true } : m
      ))
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.headerLeft}>
          <Brain size={20} color="var(--accent-400)" />
          <div>
            <h1 style={s.title}>Co-pilot</h1>
            <p style={s.subtitle}>Your thinking space — ask anything, get context-aware answers</p>
          </div>
        </div>
      </div>

      <div style={s.chatArea} ref={scrollRef}>
        {loadingHistory && (
          <div style={s.emptyState}>Loading conversation history...</div>
        )}

        {!loadingHistory && messages.length === 0 && (
          <div style={s.welcomeBox}>
            <MessageSquare size={28} color="var(--accent-400)" />
            <h2 style={s.welcomeTitle}>Talk to your agent</h2>
            <p style={s.welcomeText}>
              Ask for suggestions, tell it what you did, get problem recommendations,
              or just think out loud — the agent knows your full study history.
            </p>
            <div style={s.promptsGrid}>
              {suggestedPrompts.map((p, i) => (
                <button key={i} style={s.promptChip} onClick={() => sendMessage(p)}>
                  <Sparkles size={12} />
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={s.messagePair}>
            <div style={s.userMessage}>
              <div style={s.userBubble}>{m.message}</div>
            </div>
            <div style={s.agentMessage}>
              <div style={s.agentAvatar}><Brain size={14} color="#fff" /></div>
              <div style={{ ...s.agentBubble, ...(m.error ? s.agentBubbleError : {}) }}>
                {m.pending ? (
                  <span style={s.thinking}>🤖 Thinking...</span>
                ) : (
                  <div className="markdown">
                    <ReactMarkdown>{m.response}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {messages.length > 0 && (
        <div style={s.promptsRow}>
          {suggestedPrompts.slice(0, 3).map((p, i) => (
            <button key={i} style={s.promptChipSmall} onClick={() => sendMessage(p)}>
              {p}
            </button>
          ))}
        </div>
      )}

      <div style={s.inputBar}>
        <input
          style={s.input}
          placeholder="Ask your agent anything..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          disabled={sending}
        />
        <button style={s.sendBtn} onClick={() => sendMessage()} disabled={sending || !input.trim()}>
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}

const s = {
  page: {
    display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)',
    maxWidth: '900px', margin: '0 auto', padding: '0 24px'
  },
  header: { padding: '20px 0 16px', borderBottom: '1px solid var(--border)' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  title: { fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 },
  subtitle: { fontSize: '12.5px', color: 'var(--text-secondary)', margin: '2px 0 0' },
  chatArea: { flex: 1, overflowY: 'auto', padding: '20px 0' },
  emptyState: { textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '40px' },
  welcomeBox: {
    textAlign: 'center', padding: '40px 20px', display: 'flex',
    flexDirection: 'column', alignItems: 'center', gap: '10px'
  },
  welcomeTitle: { fontSize: '17px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 },
  welcomeText: { fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '420px', lineHeight: '1.6', margin: '0 0 16px' },
  promptsGrid: { display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '420px' },
  promptChip: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: 'var(--bg-800)', border: '1px solid var(--border)', borderRadius: '8px',
    padding: '10px 14px', color: 'var(--text-secondary)', fontSize: '13px',
    cursor: 'pointer', textAlign: 'left'
  },
  messagePair: { marginBottom: '20px' },
  userMessage: { display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' },
  userBubble: {
    background: 'var(--accent-500)', color: '#fff', borderRadius: '14px 14px 4px 14px',
    padding: '10px 14px', fontSize: '13.5px', maxWidth: '75%', lineHeight: '1.5'
  },
  agentMessage: { display: 'flex', gap: '8px', alignItems: 'flex-start' },
  agentAvatar: {
    width: '26px', height: '26px', borderRadius: '50%', background: 'var(--accent-500)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px'
  },
  agentBubble: {
    background: 'var(--bg-900)', border: '1px solid var(--border)',
    borderRadius: '4px 14px 14px 14px', padding: '12px 14px', fontSize: '13.5px',
    color: 'var(--text-primary)', maxWidth: '85%', lineHeight: '1.6'
  },
  agentBubbleError: { borderColor: 'var(--red-400)' },
  thinking: { color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '13px' },
  promptsRow: { display: 'flex', gap: '8px', paddingBottom: '10px', overflowX: 'auto' },
  promptChipSmall: {
    background: 'var(--bg-800)', border: '1px solid var(--border)', borderRadius: '20px',
    padding: '6px 12px', color: 'var(--text-secondary)', fontSize: '12px',
    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0
  },
  inputBar: {
    display: 'flex', gap: '10px', padding: '14px 0 20px',
    borderTop: '1px solid var(--border)'
  },
  input: {
    flex: 1, background: 'var(--bg-800)', border: '1px solid var(--border)',
    borderRadius: '10px', padding: '12px 16px', color: 'var(--text-primary)',
    fontSize: '13.5px', outline: 'none', fontFamily: 'Inter, sans-serif'
  },
  sendBtn: {
    width: '44px', height: '44px', borderRadius: '10px', background: 'var(--accent-500)',
    border: 'none', color: '#fff', cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0
  }
}

export default Copilot