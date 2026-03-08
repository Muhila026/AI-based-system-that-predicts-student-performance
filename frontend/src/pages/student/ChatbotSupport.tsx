import React, { useState, useRef, useEffect } from 'react'
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Tooltip,
} from '@mui/material'
import {
  Send as SendIcon,
  ContentCopy as CopyIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Refresh as RefreshIcon,
  AutoAwesome as SparkleIcon,
  Add as AddIcon,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { chatWithAI } from '../../lib/api'
import { getCurrentUser } from '../../lib/api'

// ─── Types ────────────────────────────────────────────────────
interface Message {
  id: number
  text: string
  sender: 'user' | 'bot'
  timestamp: string
  liked?: boolean | null
}

// ─── Suggestion chips shown on welcome screen ─────────────────
const SUGGESTIONS = [
  { label: '📚 Explain a concept', prompt: 'Explain the concept of machine learning in simple terms' },
  { label: '✍️ Help with assignment', prompt: 'Help me structure an essay about software engineering' },
  { label: '📝 Exam tips', prompt: 'Give me exam preparation tips for a university student' },
  { label: '🔢 Solve a problem', prompt: 'Explain how to approach algorithm problems step by step' },
]

// ─── Gemini sparkle icon SVG ──────────────────────────────────
const GeminiSpark = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <path
      d="M14 2C14 2 15.5 9.5 20 14C15.5 18.5 14 26 14 26C14 26 12.5 18.5 8 14C12.5 9.5 14 2 14 2Z"
      fill="url(#gem_grad)"
    />
    <defs>
      <linearGradient id="gem_grad" x1="8" y1="2" x2="20" y2="26" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4285F4" />
        <stop offset="0.5" stopColor="#9B4FDB" />
        <stop offset="1" stopColor="#EA4335" />
      </linearGradient>
    </defs>
  </svg>
)

// ─── Typing dots animation ────────────────────────────────────
const TypingDots = () => (
  <Box sx={{ display: 'flex', gap: 0.6, alignItems: 'center', py: 0.5, px: 0.5 }}>
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        style={{ width: 8, height: 8, borderRadius: '50%', background: '#4285F4' }}
        animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
      />
    ))}
  </Box>
)

// ─── Bot message with Gemini-style layout ─────────────────────
const BotMessage: React.FC<{
  message: Message
  onCopy: () => void
  onLike: (val: boolean) => void
  onRetry: () => void
}> = ({ message, onCopy, onLike, onRetry }) => {
  const [showActions, setShowActions] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        sx={{ mb: 4 }}
      >
        {/* Gemini icon + response text */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <Box sx={{ mt: 0.4, flexShrink: 0 }}>
            <GeminiSpark />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                fontSize: '0.97rem',
                lineHeight: 1.75,
                color: '#1f2937',
                fontFamily: "'Google Sans', 'Inter', sans-serif",
                '& p': { m: 0, mb: 1.5 },
                '& ul, & ol': { pl: 2.5, mb: 1.5, mt: 0.5 },
                '& li': { mb: 0.5 },
                '& code': {
                  fontFamily: "'Roboto Mono', monospace",
                  fontSize: '0.85rem',
                  bgcolor: '#f1f3f4',
                  px: 0.9,
                  py: 0.3,
                  borderRadius: 1,
                },
                '& pre': {
                  bgcolor: '#f1f3f4',
                  p: 2,
                  borderRadius: 2,
                  overflowX: 'auto',
                  mb: 1.5,
                  '& code': { bgcolor: 'transparent', p: 0 },
                },
                '& strong': { fontWeight: 600, color: '#111827' },
                '& h1,& h2,& h3': { fontWeight: 600, mb: 1, mt: 1.5 },
                '& blockquote': {
                  borderLeft: '3px solid #d1d5db',
                  pl: 2,
                  color: '#6b7280',
                  my: 1.5,
                },
              }}
            >
              <ReactMarkdown>{message.text}</ReactMarkdown>
            </Box>

            {/* Action buttons — appear on hover */}
            <AnimatePresence>
              {showActions && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                    <Tooltip title="Good response" arrow>
                      <IconButton
                        size="small"
                        onClick={() => onLike(true)}
                        sx={{
                          color: message.liked === true ? '#4285F4' : '#6b7280',
                          '&:hover': { bgcolor: '#f1f3f4', color: '#4285F4' },
                          p: 0.8,
                        }}
                      >
                        <ThumbUpIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Bad response" arrow>
                      <IconButton
                        size="small"
                        onClick={() => onLike(false)}
                        sx={{
                          color: message.liked === false ? '#ea4335' : '#6b7280',
                          '&:hover': { bgcolor: '#f1f3f4', color: '#ea4335' },
                          p: 0.8,
                        }}
                      >
                        <ThumbDownIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Regenerate" arrow>
                      <IconButton
                        size="small"
                        onClick={onRetry}
                        sx={{
                          color: '#6b7280',
                          '&:hover': { bgcolor: '#f1f3f4', color: '#4285F4' },
                          p: 0.8,
                        }}
                      >
                        <RefreshIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Copy" arrow>
                      <IconButton
                        size="small"
                        onClick={onCopy}
                        sx={{
                          color: '#6b7280',
                          '&:hover': { bgcolor: '#f1f3f4', color: '#4285F4' },
                          p: 0.8,
                        }}
                      >
                        <CopyIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </motion.div>
              )}
            </AnimatePresence>
          </Box>
        </Box>
      </Box>
    </motion.div>
  )
}

// ─── User message ─────────────────────────────────────────────
const UserMessage: React.FC<{ message: Message; userName: string }> = ({ message, userName }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2 }}
  >
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 4, gap: 2 }}>
      <Box
        sx={{
          maxWidth: '70%',
          bgcolor: '#f1f3f4',
          borderRadius: 4,
          px: 2.5,
          py: 1.5,
          fontSize: '0.97rem',
          fontFamily: "'Google Sans', 'Inter', sans-serif",
          color: '#1f2937',
          lineHeight: 1.65,
          wordBreak: 'break-word',
        }}
      >
        {message.text}
      </Box>
      <Avatar
        sx={{
          width: 34,
          height: 34,
          bgcolor: '#4285F4',
          fontSize: '0.85rem',
          fontWeight: 700,
          flexShrink: 0,
          alignSelf: 'flex-start',
        }}
      >
        {userName.charAt(0).toUpperCase()}
      </Avatar>
    </Box>
  </motion.div>
)

// ─── Welcome / empty state ────────────────────────────────────
const WelcomeScreen: React.FC<{ userName: string; onSuggest: (p: string) => void }> = ({
  userName,
  onSuggest,
}) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      pb: 4,
      gap: 3,
    }}
  >
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18 }}
    >
      <Box
        sx={{
          width: 68,
          height: 68,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #e8f0fe 0%, #f3e8fd 50%, #fde8e8 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 1,
          mx: 'auto',
        }}
      >
        <SparkleIcon sx={{ fontSize: 34, color: '#4285F4' }} />
      </Box>
    </motion.div>

    <Box sx={{ textAlign: 'center' }}>
      <Typography
        sx={{
          fontSize: '1.9rem',
          fontWeight: 400,
          fontFamily: "'Google Sans', 'Inter', sans-serif",
          background: 'linear-gradient(90deg, #4285F4, #9B4FDB, #EA4335)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          mb: 0.5,
        }}
      >
        Hello, {userName}
      </Typography>
      <Typography sx={{ color: '#6b7280', fontSize: '1rem', fontFamily: "'Google Sans', 'Inter', sans-serif" }}>
        How can I help you today?
      </Typography>
    </Box>

    {/* Suggestion chips */}
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
        gap: 1.5,
        width: '100%',
        maxWidth: 700,
        px: 2,
      }}
    >
      {SUGGESTIONS.map((s, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.07 }}
        >
          <Box
            onClick={() => onSuggest(s.prompt)}
            sx={{
              p: 2,
              borderRadius: 3,
              border: '1px solid #e5e7eb',
              bgcolor: 'white',
              cursor: 'pointer',
              fontSize: '0.83rem',
              fontFamily: "'Google Sans', 'Inter', sans-serif",
              color: '#374151',
              lineHeight: 1.4,
              transition: 'all 0.18s ease',
              '&:hover': {
                bgcolor: '#f8f9fa',
                borderColor: '#d1d5db',
                boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
                transform: 'translateY(-1px)',
              },
            }}
          >
            {s.label}
          </Box>
        </motion.div>
      ))}
    </Box>
  </Box>
)

// ─── Main component ───────────────────────────────────────────
const ChatbotSupport: React.FC = () => {
  const user = getCurrentUser()
  const userName = user?.name || 'there'

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || sending) return

    const userMsg: Message = {
      id: Date.now(),
      text: trimmed,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setSending(true)

    try {
      const res = await chatWithAI(trimmed)
      const botMsg: Message = {
        id: Date.now() + 1,
        text: res.response,
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, botMsg])
    } catch {
      const botMsg: Message = {
        id: Date.now() + 1,
        text: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, botMsg])
    } finally {
      setSending(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleLike = (id: number, val: boolean) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, liked: m.liked === val ? null : val } : m))
    )
  }

  const handleCopy = (id: number, text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleRetry = async () => {
    // find last user message and resend
    const lastUser = [...messages].reverse().find((m) => m.sender === 'user')
    if (!lastUser) return
    // remove last bot message if exists
    const withoutLastBot = messages.filter(
      (m, i) => !(m.sender === 'bot' && i === messages.length - 1)
    )
    setMessages(withoutLastBot)
    await sendMessage(lastUser.text)
  }

  const handleNewChat = () => {
    setMessages([])
    setInput('')
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 80px)',
        bgcolor: '#ffffff',
        fontFamily: "'Google Sans', 'Inter', sans-serif",
        position: 'relative',
      }}
    >
      {/* ── Top bar ── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 1.5,
          borderBottom: '1px solid #f3f4f6',
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SparkleIcon sx={{ color: '#4285F4', fontSize: 22 }} />
          <Typography
            sx={{
              fontWeight: 500,
              fontSize: '1.05rem',
              fontFamily: "'Google Sans', 'Inter', sans-serif",
              color: '#1f2937',
            }}
          >
            AI Study Assistant
          </Typography>
          <Box
            sx={{
              px: 1,
              py: 0.2,
              bgcolor: '#e8f0fe',
              borderRadius: 2,
              fontSize: '0.7rem',
              color: '#4285F4',
              fontWeight: 600,
            }}
          >
            Powered by Gemini
          </Box>
        </Box>

        <Tooltip title="New chat" arrow>
          <IconButton
            onClick={handleNewChat}
            size="small"
            sx={{ color: '#6b7280', '&:hover': { bgcolor: '#f3f4f6', color: '#4285F4' } }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── Messages area ── */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: { xs: 2, md: 6, lg: 10 },
          pt: 4,
          pb: 2,
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-thumb': { bgcolor: '#e5e7eb', borderRadius: 3 },
        }}
      >
        {messages.length === 0 ? (
          <WelcomeScreen
            userName={userName.split(' ')[0]}
            onSuggest={(p) => sendMessage(p)}
          />
        ) : (
          <Box sx={{ maxWidth: 760, mx: 'auto' }}>
            {messages.map((msg) =>
              msg.sender === 'user' ? (
                <UserMessage key={msg.id} message={msg} userName={userName} />
              ) : (
                <BotMessage
                  key={msg.id}
                  message={msg}
                  onCopy={() => handleCopy(msg.id, msg.text)}
                  onLike={(val) => handleLike(msg.id, val)}
                  onRetry={handleRetry}
                />
              )
            )}

            {/* Typing indicator */}
            <AnimatePresence>
              {sending && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 4 }}>
                    <Box sx={{ mt: 0.4 }}>
                      <GeminiSpark />
                    </Box>
                    <TypingDots />
                  </Box>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={bottomRef} />
          </Box>
        )}
      </Box>

      {/* ── Input area ── */}
      <Box
        sx={{
          px: { xs: 2, md: 6, lg: 10 },
          pb: 3,
          pt: 1,
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            maxWidth: 760,
            mx: 'auto',
            bgcolor: 'white',
            borderRadius: 4,
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            overflow: 'hidden',
            transition: 'box-shadow 0.2s ease',
            '&:focus-within': {
              boxShadow: '0 4px 20px rgba(66,133,244,0.15)',
              borderColor: '#c7d7f9',
            },
          }}
        >
          <TextField
            inputRef={inputRef}
            fullWidth
            multiline
            maxRows={6}
            placeholder="Ask me anything about your studies..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage(input)
              }
            }}
            disabled={sending}
            variant="standard"
            InputProps={{ disableUnderline: true }}
            sx={{
              px: 2.5,
              pt: 2,
              pb: 0.5,
              '& .MuiInputBase-root': {
                fontFamily: "'Google Sans', 'Inter', sans-serif",
                fontSize: '0.97rem',
                color: '#1f2937',
                lineHeight: 1.6,
              },
              '& .MuiInputBase-input::placeholder': { color: '#9ca3af', opacity: 1 },
            }}
          />

          {/* Bottom row of input card */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              pb: 1.5,
              pt: 0.5,
            }}
          >
            <Typography sx={{ fontSize: '0.72rem', color: '#9ca3af' }}>
              Press Enter to send · Shift+Enter for new line
            </Typography>

            <Tooltip title={sending ? 'Sending...' : 'Send message'} arrow>
              <span>
                <IconButton
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || sending}
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: input.trim() && !sending ? '#4285F4' : '#f1f3f4',
                    color: input.trim() && !sending ? 'white' : '#9ca3af',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: input.trim() && !sending ? '#3367d6' : '#f1f3f4',
                      transform: input.trim() && !sending ? 'scale(1.05)' : 'none',
                    },
                    '&:disabled': { color: '#9ca3af', bgcolor: '#f1f3f4' },
                  }}
                >
                  <SendIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>

        <Typography
          sx={{
            textAlign: 'center',
            fontSize: '0.72rem',
            color: '#9ca3af',
            mt: 1.5,
            fontFamily: "'Google Sans', 'Inter', sans-serif",
          }}
        >
          AI Study Assistant can make mistakes. Academic guidance only — always verify with your lecturer.
        </Typography>
      </Box>
    </Box>
  )
}

export default ChatbotSupport
