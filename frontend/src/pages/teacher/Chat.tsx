import React, { useState, useEffect, useRef } from 'react'
import {
  Box,
  Card,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Badge,
  Divider,
  InputAdornment,
  Paper,
  Chip,
} from '@mui/material'
import CenteredMessage from '../../components/CenteredMessage'
import {
  Send,
  Search,
  Person,
  Business,
  CheckCircle,
  Circle,
  Message,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { 
  getChatConversations, 
  getChatMessages, 
  sendChatMessage,
  getChatAvailableUsers,
  createChatConversation,
  getCurrentUser,
  type AdminUser,
} from '../../lib/api'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  senderRole: 'teacher' | 'student' | 'admin'
  message: string
  timestamp: string
  read: boolean
}

interface Conversation {
  id: string
  participantId: string
  participantName: string
  participantRole: 'student' | 'admin' | 'teacher'
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  avatar?: string
}

const Chat: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messageText, setMessageText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showUsers, setShowUsers] = useState(false)
  const [allUsers, setAllUsers] = useState<AdminUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'error' })

  useEffect(() => {
    fetchConversations()
  }, [])

  useEffect(() => {
    if (showUsers) {
      fetchAllUsers()
    }
  }, [showUsers])

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation)
    }
  }, [selectedConversation])

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    if (selectedConversation) {
      scrollToBottom()
    }
  }, [messages, selectedConversation])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchConversations = async () => {
    setLoading(true)
    try {
      const data = await getChatConversations()
      setConversations(data)
    } catch (err) {
      console.error('Error fetching conversations:', err)
      setConversations([])
    } finally {
      setLoading(false)
    }
  }

  const fetchAllUsers = async () => {
    setLoadingUsers(true)
    try {
      const users = await getChatAvailableUsers()
      setAllUsers(users)
    } catch (err) {
      console.error('Error fetching users:', err)
      setAllUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleStartConversation = async (user: AdminUser) => {
    try {
      const conversationId = await createChatConversation(
        user.email || (user.id as string),
        user.name || '',
        (user as { role?: string }).role === 'Teacher' ? 'teacher' : (user as { role?: string }).role === 'Admin' ? 'admin' : 'student'
      )
      if (!conversationId) return
      const role = (user as AdminUser & { role?: string }).role || 'User'
      const optimisticConv: Conversation = {
        id: conversationId,
        participantId: user.email || (user.id as string),
        participantName: user.name || '',
        participantRole: role === 'Teacher' ? 'teacher' : role === 'Admin' ? 'admin' : 'student',
        lastMessage: '',
        lastMessageTime: '',
        unreadCount: 0,
      }
      setConversations((prev) => [...prev, optimisticConv])
      setShowUsers(false)
      setSelectedConversation(conversationId)
      await fetchConversations()
    } catch (err) {
      console.error('Error creating conversation:', err)
      setSnackbar({ open: true, message: 'Failed to start conversation. Please try again.', severity: 'error' })
    }
  }

  const fetchMessages = async (conversationId: string) => {
    try {
      const data = await getChatMessages(conversationId)
      setMessages(data)
      // Refresh conversations to update unread counts
      const updatedConvs = await getChatConversations()
      setConversations(updatedConvs)
    } catch (err) {
      console.error('Error fetching messages:', err)
      setMessages([])
    }
  }

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation) return

    const currentUser = getCurrentUser()
    const myEmail = currentUser?.email || currentUser?.id || ''
    const myName = currentUser?.name || 'You'
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: myEmail,
      senderName: myName,
      senderRole: (currentUser?.role as 'teacher' | 'student' | 'admin') || 'student',
      message: messageText.trim(),
      timestamp: new Date().toISOString(),
      read: false,
    }

    setMessages((prev) => [...prev, newMessage])
    setMessageText('')

    try {
      await sendChatMessage(selectedConversation, messageText.trim())
      const updatedConvs = await getChatConversations()
      setConversations(updatedConvs)
      const updatedMsgs = await getChatMessages(selectedConversation)
      setMessages(updatedMsgs)
    } catch (err) {
      console.error('Error sending message:', err)
      setMessages((prev) => prev.filter((msg) => msg.id !== newMessage.id))
      setSnackbar({ open: true, message: 'Failed to send message. Please try again.', severity: 'error' })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const filteredConversations = conversations.filter((conv) =>
    conv.participantName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredUsers = allUsers.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedConv = conversations.find((c) => c.id === selectedConversation)

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const formatMessageTime = (timestamp: string) => {
    if (!timestamp) return '--'
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      <CenteredMessage
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        autoHideDuration={5000}
      />
      <Box sx={{ mb: 3, pb: 3, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}>
          Chat
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          Communicate with students and management
        </Typography>
      </Box>

      <Card elevation={0} sx={{ height: 'calc(100vh - 250px)', display: 'flex', overflow: 'hidden', border: `1px solid ${THEME.primaryBorder}` }}>
        {/* Conversations List */}
        <Box
          sx={{
            width: 350,
            borderRight: `1px solid ${THEME.primaryBorder}`,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: THEME.primaryLight,
          }}
        >
          {/* Tabs */}
          <Box sx={{ display: 'flex', borderBottom: `1px solid ${THEME.primaryBorder}` }}>
            <Box
              sx={{
                flex: 1,
                p: 1.5,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: !showUsers ? THEME.primaryLight : 'transparent',
                borderBottom: !showUsers ? `2px solid ${THEME.primary}` : 'none',
                '&:hover': { bgcolor: THEME.primaryLight },
              }}
              onClick={() => setShowUsers(false)}
            >
              <Typography variant="body2" fontWeight={!showUsers ? 600 : 500} sx={{ color: THEME.textDark }}>
                Conversations
              </Typography>
            </Box>
            <Box
              sx={{
                flex: 1,
                p: 1.5,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: showUsers ? THEME.primaryLight : 'transparent',
                borderBottom: showUsers ? `2px solid ${THEME.primary}` : 'none',
                '&:hover': { bgcolor: THEME.primaryLight },
              }}
              onClick={() => setShowUsers(true)}
            >
              <Typography variant="body2" fontWeight={showUsers ? 600 : 500} sx={{ color: THEME.textDark }}>
                All Users
              </Typography>
            </Box>
          </Box>

          {/* Search Bar */}
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <TextField
              fullWidth
              size="small"
              placeholder={showUsers ? "Search users..." : "Search conversations..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: 'action.active' }} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {/* Conversations or Users List */}
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {showUsers ? (
              loadingUsers ? (
                <Box textAlign="center" py={4}>
                  <Typography color="text.secondary">Loading users...</Typography>
                </Box>
              ) : filteredUsers.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <Typography color="text.secondary">No users found</Typography>
                </Box>
              ) : (
                filteredUsers.map((user) => {
                  const hasConversation = conversations.some(
                    (conv) => conv.participantId === user.email
                  )
                  return (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <Box
                        sx={{
                          p: 2,
                          cursor: 'pointer',
                          '&:hover': { bgcolor: '#f0f9ff' },
                          transition: 'all 0.2s',
                        }}
                        onClick={() => handleStartConversation(user)}
                      >
                        <Box display="flex" alignItems="center" gap={2}>
                          <Avatar
                            sx={{
                              bgcolor: '#6366f1',
                              width: 48,
                              height: 48,
                            }}
                          >
                            {user.name.charAt(0)}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                              <Typography variant="body2" fontWeight="bold" noWrap>
                                {user.name}
                              </Typography>
                              {hasConversation && (
                                <Chip
                                  label="Chat"
                                  size="small"
                                  icon={<Message sx={{ fontSize: 14 }} />}
                                  sx={{
                                    height: 20,
                                    fontSize: '0.65rem',
                                    bgcolor: '#dcfce7',
                                    color: '#15803d',
                                  }}
                                />
                              )}
                            </Box>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Chip
                                label={(user as AdminUser & { role?: string }).role || 'User'}
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: '0.65rem',
                                  bgcolor: '#e0e7ff',
                                  color: '#4338ca',
                                }}
                              />
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                noWrap
                                sx={{ flex: 1 }}
                              >
                                {user.email}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      </Box>
                      <Divider />
                    </motion.div>
                  )
                })
              )
            ) : loading ? (
              <Box textAlign="center" py={4}>
                <Typography color="text.secondary">Loading conversations...</Typography>
              </Box>
            ) : filteredConversations.length === 0 ? (
              <Box textAlign="center" py={4}>
                <Typography color="text.secondary">No conversations found</Typography>
              </Box>
            ) : (
              filteredConversations.map((conversation) => (
                <motion.div
                  key={conversation.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <Box
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      bgcolor: selectedConversation === conversation.id ? '#e0f2fe' : 'transparent',
                      borderLeft: selectedConversation === conversation.id ? '4px solid #10b981' : 'none',
                      '&:hover': { bgcolor: '#f0f9ff' },
                      transition: 'all 0.2s',
                    }}
                    onClick={() => setSelectedConversation(conversation.id)}
                  >
                    <Box display="flex" alignItems="center" gap={2}>
                      <Badge
                        badgeContent={conversation.unreadCount}
                        color="error"
                        invisible={conversation.unreadCount === 0}
                      >
                        <Avatar
                          sx={{
                            bgcolor:
                              conversation.participantRole === 'admin'
                                ? '#ef4444'
                                : '#6366f1',
                            width: 48,
                            height: 48,
                          }}
                        >
                          {conversation.participantRole === 'admin' ? (
                            <Business />
                          ) : (
                            <Person />
                          )}
                        </Avatar>
                      </Badge>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                          <Typography variant="body2" fontWeight="bold" noWrap>
                            {conversation.participantName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatTime(conversation.lastMessageTime)}
                          </Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Chip
                            label={
                              conversation.participantRole === 'admin'
                                ? 'Management'
                                : conversation.participantRole === 'teacher'
                                  ? 'Teacher'
                                  : 'Student'
                            }
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.65rem',
                              bgcolor:
                                conversation.participantRole === 'admin'
                                  ? '#fee2e2'
                                  : conversation.participantRole === 'teacher'
                                    ? '#dbeafe'
                                    : '#e0e7ff',
                              color:
                                conversation.participantRole === 'admin'
                                  ? '#dc2626'
                                  : conversation.participantRole === 'teacher'
                                    ? '#1d4ed8'
                                    : '#4338ca',
                            }}
                          />
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                            sx={{ flex: 1 }}
                          >
                            {conversation.lastMessage}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                  <Divider />
                </motion.div>
              ))
            )}
          </Box>
        </Box>

        {/* Chat Window */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedConversation && selectedConv ? (
            <>
              {/* Chat Header */}
              <Box
                sx={{
                  p: 2,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  bgcolor: '#f9fafb',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Avatar
                  sx={{
                    bgcolor: selectedConv.participantRole === 'admin' ? '#ef4444' : '#6366f1',
                    width: 40,
                    height: 40,
                  }}
                >
                  {selectedConv.participantRole === 'admin' ? <Business /> : <Person />}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedConv.participantName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedConv.participantRole === 'admin'
                      ? 'Management'
                      : selectedConv.participantRole === 'teacher'
                        ? 'Teacher'
                        : 'Student'}
                  </Typography>
                </Box>
              </Box>

              {/* Messages */}
              <Box
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  p: 2,
                  bgcolor: '#f0f2f5',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                }}
              >
                {messages.map((message) => {
                  const currentUser = getCurrentUser()
                  const isOwnMessage = (message.senderId || message.senderEmail) === (currentUser?.email || currentUser?.id)
                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        display: 'flex',
                        justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          maxWidth: '70%',
                          alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
                        }}
                      >
                        {!isOwnMessage && (
                          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, ml: 1 }}>
                            {message.senderName}
                          </Typography>
                        )}
                        <Paper
                          elevation={0}
                          sx={{
                            p: 1.5,
                            bgcolor: isOwnMessage ? '#dcfce7' : 'white',
                            borderRadius: 2,
                            borderTopLeftRadius: isOwnMessage ? 2 : 0,
                            borderTopRightRadius: isOwnMessage ? 0 : 2,
                            position: 'relative',
                          }}
                        >
                          <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                            {message.message}
                          </Typography>
                          <Box
                            display="flex"
                            alignItems="center"
                            justifyContent="flex-end"
                            gap={0.5}
                            mt={0.5}
                          >
                            <Typography variant="caption" color="text.secondary" fontSize="0.7rem">
                              {formatMessageTime(message.timestamp)}
                            </Typography>
                            {isOwnMessage && (
                              message.read ? (
                                <CheckCircle sx={{ fontSize: 14, color: '#10b981' }} />
                              ) : (
                                <Circle sx={{ fontSize: 14, color: '#9ca3af' }} />
                              )
                            )}
                          </Box>
                        </Paper>
                      </Box>
                    </motion.div>
                  )
                })}
                <div ref={messagesEndRef} />
              </Box>

              {/* Message Input */}
              <Box
                sx={{
                  p: 2,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'white',
                }}
              >
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          color="primary"
                          onClick={handleSendMessage}
                          disabled={!messageText.trim()}
                          sx={{ bgcolor: '#10b981', color: 'white', '&:hover': { bgcolor: '#059669' } }}
                        >
                          <Send />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
            </>
          ) : (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#f9fafb',
              }}
            >
              <Typography variant="h6" color="text.secondary" mb={1}>
                Select a conversation to start chatting
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Choose a student or management from the list
              </Typography>
            </Box>
          )}
        </Box>
      </Card>
    </Box>
  )
}

export default Chat

