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
import {
  Send,
  Search,
  Person,
  School,
  CheckCircle,
  Circle,
  People,
  Message,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { 
  getAdminChatConversations, 
  getAdminChatMessages, 
  sendAdminChatMessage,
  getTeachers,
  getStudents,
  createChatConversation,
  AdminUser,
} from '../../lib/api'

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
  participantRole: 'teacher' | 'student'
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  avatar?: string
}

const AdminChat: React.FC = () => {
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
      const data = await getAdminChatConversations()
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
      const [teachers, students] = await Promise.all([
        getTeachers(),
        getStudents(),
      ])
      // Combine and filter out current user
      const all = [...teachers, ...students]
      setAllUsers(all)
    } catch (err) {
      console.error('Error fetching users:', err)
      setAllUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleStartConversation = async (user: AdminUser) => {
    try {
      const role = user.role.toLowerCase() as 'teacher' | 'student'
      const conversationId = await createChatConversation(
        user.email,
        user.name,
        role
      )
      setShowUsers(false)
      setSelectedConversation(conversationId)
      await fetchConversations()
    } catch (err) {
      console.error('Error creating conversation:', err)
    }
  }

  const fetchMessages = async (conversationId: string) => {
    try {
      const data = await getAdminChatMessages(conversationId)
      setMessages(data)
      // Refresh conversations to update unread counts
      const updatedConvs = await getAdminChatConversations()
      setConversations(updatedConvs)
    } catch (err) {
      console.error('Error fetching messages:', err)
      setMessages([])
    }
  }

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation) return

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: 'admin-1',
      senderName: 'You',
      senderRole: 'admin',
      message: messageText.trim(),
      timestamp: new Date().toISOString(),
      read: false,
    }

    setMessages((prev) => [...prev, newMessage])
    setMessageText('')

    try {
      await sendAdminChatMessage(selectedConversation, messageText.trim())
      // Refresh conversations and messages
      const updatedConvs = await getAdminChatConversations()
      setConversations(updatedConvs)
      const updatedMsgs = await getAdminChatMessages(selectedConversation)
      setMessages(updatedMsgs)
    } catch (err) {
      console.error('Error sending message:', err)
      setMessages((prev) => prev.filter((msg) => msg.id !== newMessage.id))
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
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" mb={1}>
            Chat
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Communicate with teachers
          </Typography>
        </Box>
      </Box>

      <Card sx={{ height: 'calc(100vh - 250px)', display: 'flex', overflow: 'hidden' }}>
        {/* Conversations List */}
        <Box
          sx={{
            width: 350,
            borderRight: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: '#f9fafb',
          }}
        >
          {/* Tabs */}
          <Box sx={{ display: 'flex', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box
              sx={{
                flex: 1,
                p: 1.5,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: !showUsers ? '#fee2e2' : 'transparent',
                borderBottom: !showUsers ? '2px solid #ef4444' : 'none',
                '&:hover': { bgcolor: '#fef2f2' },
              }}
              onClick={() => setShowUsers(false)}
            >
              <Typography variant="body2" fontWeight={!showUsers ? 'bold' : 'normal'}>
                Conversations
              </Typography>
            </Box>
            <Box
              sx={{
                flex: 1,
                p: 1.5,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: showUsers ? '#fee2e2' : 'transparent',
                borderBottom: showUsers ? '2px solid #ef4444' : 'none',
                '&:hover': { bgcolor: '#fef2f2' },
              }}
              onClick={() => setShowUsers(true)}
            >
              <Typography variant="body2" fontWeight={showUsers ? 'bold' : 'normal'}>
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
                          '&:hover': { bgcolor: '#fef2f2' },
                          transition: 'all 0.2s',
                        }}
                        onClick={() => handleStartConversation(user)}
                      >
                        <Box display="flex" alignItems="center" gap={2}>
                          <Avatar
                            sx={{
                              bgcolor: user.role === 'Teacher' ? '#3b82f6' : '#10b981',
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
                                    bgcolor: '#fee2e2',
                                    color: '#dc2626',
                                  }}
                                />
                              )}
                            </Box>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Chip
                                label={user.role}
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: '0.65rem',
                                  bgcolor: user.role === 'Teacher' ? '#dbeafe' : '#dcfce7',
                                  color: user.role === 'Teacher' ? '#1e40af' : '#15803d',
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
                      bgcolor: selectedConversation === conversation.id ? '#fee2e2' : 'transparent',
                      borderLeft: selectedConversation === conversation.id ? '4px solid #ef4444' : 'none',
                      '&:hover': { bgcolor: '#fef2f2' },
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
                            bgcolor: '#10b981',
                            width: 48,
                            height: 48,
                          }}
                        >
                          <School />
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
                            label="Teacher"
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.65rem',
                              bgcolor: '#dbeafe',
                              color: '#1e40af',
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
                    bgcolor: '#10b981',
                    width: 40,
                    height: 40,
                  }}
                >
                  <School />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedConv.participantName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Teacher
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
                  const isOwnMessage = message.senderRole === 'admin'
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
                            bgcolor: isOwnMessage ? '#fee2e2' : 'white',
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
                                <CheckCircle sx={{ fontSize: 14, color: '#ef4444' }} />
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
                          sx={{ bgcolor: '#ef4444', color: 'white', '&:hover': { bgcolor: '#dc2626' } }}
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
                Choose a teacher from the list
              </Typography>
            </Box>
          )}
        </Box>
      </Card>
    </Box>
  )
}

export default AdminChat

