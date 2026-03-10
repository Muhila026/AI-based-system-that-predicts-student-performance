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

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

// ─── Types ────────────────────────────────────────────────────
interface Message {
  id: number
  text: string
  sender: 'user' | 'bot'
  timestamp: string
  liked?: boolean | null
}

const SUGGESTIONS = [
  { label: 'Explain a concept', prompt: 'Explain the concept of machine learning in simple terms' },
  { label: 'Help with assignment', prompt: 'Help me structure an essay about software engineering' },
  { label: 'Exam tips', prompt: 'Give me exam preparation tips for a university student' },
  { label: 'Solve a problem', prompt: 'Explain how to approach algorithm problems step by step' },
]

const BotIcon = () => (
  <Box
    sx={{
      width: 28,
      height: 28,
      borderRadius: 1,
      bgcolor: THEME.primaryLight,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <SparkleIcon sx={{ fontSize: 18, color: THEME.primary }} />
  </Box>
)

const TypingDots = () => (
  <Box sx={{ display: 'flex', gap: 0.6, alignItems: 'center', py: 0.5, px: 0.5 }}>
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        style={{ width: 8, height: 8, borderRadius: '50%', background: THEME.primary }}
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
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <Box sx={{ mt: 0.4, flexShrink: 0 }}>
            <BotIcon />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                fontSize: '0.97rem',
                lineHeight: 1.75,
                color: THEME.textDark,
                fontFamily: "'Poppins', sans-serif",
                '& p': { m: 0, mb: 1.5 },
                '& ul, & ol': { pl: 2.5, mb: 1.5, mt: 0.5 },
                '& li': { mb: 0.5 },
                '& code': {
                  fontFamily: "'Roboto Mono', monospace",
                  fontSize: '0.85rem',
                  bgcolor: THEME.primaryLight,
                  px: 0.9,
                  py: 0.3,
                  borderRadius: 1,
                },
                '& pre': {
                  bgcolor: THEME.primaryLight,
                  p: 2,
                  borderRadius: 2,
                  overflowX: 'auto',
                  mb: 1.5,
                  '& code': { bgcolor: 'transparent', p: 0 },
                },
                '& strong': { fontWeight: 600, color: THEME.textDark },
                '& h1,& h2,& h3': { fontWeight: 600, mb: 1, mt: 1.5 },
                '& blockquote': {
                  borderLeft: `3px solid ${THEME.primaryBorder}`,
                  pl: 2,
                  color: THEME.muted,
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
                          color: message.liked === true ? THEME.primary : THEME.muted,
                          '&:hover': { bgcolor: THEME.primaryLight, color: THEME.primary },
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
                          color: message.liked === false ? '#dc2626' : THEME.muted,
                          '&:hover': { bgcolor: '#fef2f2', color: '#dc2626' },
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
                          color: THEME.muted,
                          '&:hover': { bgcolor: THEME.primaryLight, color: THEME.primary },
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
                          color: THEME.muted,
                          '&:hover': { bgcolor: THEME.primaryLight, color: THEME.primary },
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
          bgcolor: THEME.primaryLight,
          border: `1px solid ${THEME.primaryBorder}`,
          borderRadius: 2,
          px: 2.5,
          py: 1.5,
          fontSize: '0.97rem',
          fontFamily: "'Poppins', sans-serif",
          color: THEME.textDark,
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
          bgcolor: THEME.primary,
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
          bgcolor: THEME.primaryLight,
          border: `2px solid ${THEME.primaryBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 1,
          mx: 'auto',
        }}
      >
        <SparkleIcon sx={{ fontSize: 34, color: THEME.primary }} />
      </Box>
    </motion.div>

    <Box sx={{ textAlign: 'center' }}>
      <Typography
        sx={{
          fontSize: '1.5rem',
          fontWeight: 600,
          fontFamily: "'Poppins', sans-serif",
          color: THEME.textDark,
          mb: 0.5,
        }}
      >
        Hello, {userName}
      </Typography>
      <Typography sx={{ color: THEME.muted, fontSize: '1rem', fontFamily: "'Poppins', sans-serif" }}>
        How can I help you today?
      </Typography>
    </Box>

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
              borderRadius: 0,
              border: `1px solid ${THEME.primaryBorder}`,
              bgcolor: '#fff',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontFamily: "'Poppins', sans-serif",
              color: THEME.textDark,
              lineHeight: 1.4,
              transition: 'all 0.18s ease',
              '&:hover': {
                bgcolor: THEME.primaryLight,
                borderColor: THEME.primary,
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
        bgcolor: '#fff',
        fontFamily: "'Poppins', sans-serif",
        position: 'relative',
      }}
    >
      {/* Page header — same style as other pages */}
      <Box sx={{ mb: 0, pb: 2, borderBottom: `1px solid ${THEME.primaryBorder}`, flexShrink: 0 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Box>
            <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}>
              Chatbot Support
            </Typography>
            <Typography variant="body2" sx={{ color: THEME.muted }}>
              AI study assistant
            </Typography>
          </Box>
          <Tooltip title="New chat" arrow>
            <IconButton
              onClick={handleNewChat}
              size="small"
              sx={{
                color: THEME.muted,
                '&:hover': { bgcolor: THEME.primaryLight, color: THEME.primary },
                borderRadius: 0,
              }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: { xs: 2, md: 4, lg: 6 },
          pt: 3,
          pb: 2,
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-thumb': { bgcolor: THEME.primaryBorder, borderRadius: 0 },
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
                      <BotIcon />
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

      <Box
        sx={{
          px: { xs: 2, md: 4, lg: 6 },
          pb: 3,
          pt: 1,
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            maxWidth: 760,
            mx: 'auto',
            bgcolor: '#fff',
            borderRadius: 0,
            border: `1px solid ${THEME.primaryBorder}`,
            overflow: 'hidden',
            transition: 'border-color 0.2s ease',
            '&:focus-within': {
              borderColor: THEME.primary,
              boxShadow: `0 0 0 2px ${THEME.primaryLight}`,
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
                fontFamily: "'Poppins', sans-serif",
                fontSize: '0.97rem',
                color: THEME.textDark,
                lineHeight: 1.6,
              },
              '& .MuiInputBase-input::placeholder': { color: THEME.muted, opacity: 1 },
            }}
          />

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
            <Typography sx={{ fontSize: '0.72rem', color: THEME.muted, fontFamily: "'Poppins', sans-serif" }}>
              Enter to send · Shift+Enter for new line
            </Typography>

            <Tooltip title={sending ? 'Sending...' : 'Send message'} arrow>
              <span>
                <IconButton
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || sending}
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 0,
                    bgcolor: input.trim() && !sending ? THEME.primary : THEME.primaryLight,
                    color: input.trim() && !sending ? '#fff' : THEME.muted,
                    '&:hover': {
                      bgcolor: input.trim() && !sending ? '#1e40af' : THEME.primaryBorder,
                    },
                    '&:disabled': { color: THEME.muted, bgcolor: THEME.primaryLight },
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
            color: THEME.muted,
            mt: 1.5,
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          For guidance only — verify with your lecturer.
        </Typography>
      </Box>
    </Box>
  )
}

export default ChatbotSupport
