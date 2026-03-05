import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  TextField,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Badge,
  Tabs,
  Tab,
} from '@mui/material'
import {
  Person,
  Email,
  School,
  Reply,
  MarkEmailRead,
  Delete,
  Search,
  FilterList,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { getContactMessages, markMessageAsRead, replyToMessage, deleteMessage } from '../../lib/api'

interface ContactMessage {
  id: string
  studentId: string
  studentName: string
  studentEmail: string
  subject: string
  message: string
  timestamp: string
  read: boolean
  reply?: string
  replyTimestamp?: string
}

const ContactMessages: React.FC = () => {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [filteredMessages, setFilteredMessages] = useState<ContactMessage[]>([])
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null)
  const [replyDialogOpen, setReplyDialogOpen] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [tabValue, setTabValue] = useState(0) // 0: All, 1: Unread, 2: Read
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchMessages()
  }, [])

  useEffect(() => {
    filterMessages()
  }, [messages, searchQuery, tabValue])

  const fetchMessages = async () => {
    setLoading(true)
    try {
      const data = await getContactMessages()
      setMessages(data)
    } catch (err) {
      console.error('Error fetching messages:', err)
      // Fallback mock data
      setMessages([
        {
          id: '1',
          studentId: 'STD-001',
          studentName: 'John Doe',
          studentEmail: 'john.doe@student.edu',
          subject: 'Question about Assignment 3',
          message: 'Hello Professor, I have a question about problem 5 in Assignment 3. I\'m not sure how to approach the integration part.',
          timestamp: '2025-01-15T10:30:00',
          read: false,
        },
        {
          id: '2',
          studentId: 'STD-002',
          studentName: 'Jane Smith',
          studentEmail: 'jane.smith@student.edu',
          subject: 'Grade Inquiry - Midterm Exam',
          message: 'Hi, I would like to discuss my midterm exam grade. I believe there might be an error in the grading.',
          timestamp: '2025-01-14T14:20:00',
          read: true,
          reply: 'I\'ve reviewed your exam and the grading is correct. However, I can schedule a meeting to go over the questions if you\'d like.',
          replyTimestamp: '2025-01-14T16:45:00',
        },
        {
          id: '3',
          studentId: 'STD-003',
          studentName: 'Mike Johnson',
          studentEmail: 'mike.johnson@student.edu',
          subject: 'Request for Extension',
          message: 'I would like to request an extension for the upcoming project deadline due to personal circumstances.',
          timestamp: '2025-01-13T09:15:00',
          read: false,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const filterMessages = () => {
    let filtered = [...messages]

    // Filter by tab (All, Unread, Read)
    if (tabValue === 1) {
      filtered = filtered.filter((msg) => !msg.read)
    } else if (tabValue === 2) {
      filtered = filtered.filter((msg) => msg.read)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (msg) =>
          msg.studentName.toLowerCase().includes(query) ||
          msg.subject.toLowerCase().includes(query) ||
          msg.message.toLowerCase().includes(query)
      )
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    setFilteredMessages(filtered)
  }

  const handleOpenMessage = async (message: ContactMessage) => {
    setSelectedMessage(message)
    if (!message.read) {
      try {
        await markMessageAsRead(message.id)
        setMessages((prev) =>
          prev.map((msg) => (msg.id === message.id ? { ...msg, read: true } : msg))
        )
      } catch (err) {
        console.error('Error marking message as read:', err)
      }
    }
  }

  const handleReply = async () => {
    if (!selectedMessage || !replyText.trim()) return

    try {
      await replyToMessage(selectedMessage.id, replyText.trim())
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === selectedMessage.id
            ? {
                ...msg,
                reply: replyText.trim(),
                replyTimestamp: new Date().toISOString(),
              }
            : msg
        )
      )
      setReplyDialogOpen(false)
      setReplyText('')
      setSelectedMessage(null)
    } catch (err) {
      console.error('Error replying to message:', err)
    }
  }

  const handleDelete = async (messageId: string) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return

    try {
      await deleteMessage(messageId)
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId))
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(null)
      }
    } catch (err) {
      console.error('Error deleting message:', err)
    }
  }

  const unreadCount = messages.filter((msg) => !msg.read).length

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" mb={1}>
            Contact Messages
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Messages from students
          </Typography>
        </Box>
        {unreadCount > 0 && (
          <Chip
            label={`${unreadCount} Unread`}
            color="error"
            icon={<MarkEmailRead />}
            sx={{ fontSize: '0.875rem', height: 32 }}
          />
        )}
      </Box>

      <Box display="grid" gridTemplateColumns={{ xs: '1fr', lg: '1fr 1.5fr' }} gap={3}>
        {/* Messages List */}
        <Card>
          <CardContent>
            <Box display="flex" gap={2} mb={3}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />,
                }}
              />
            </Box>

            <Tabs
              value={tabValue}
              onChange={(_, newValue) => setTabValue(newValue)}
              sx={{ mb: 2 }}
            >
              <Tab label="All" />
              <Tab
                label={
                  <Badge badgeContent={unreadCount} color="error">
                    Unread
                  </Badge>
                }
              />
              <Tab label="Read" />
            </Tabs>

            <Box sx={{ maxHeight: '600px', overflowY: 'auto' }}>
              {loading ? (
                <Box textAlign="center" py={4}>
                  <Typography color="text.secondary">Loading messages...</Typography>
                </Box>
              ) : filteredMessages.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <Typography color="text.secondary">No messages found</Typography>
                </Box>
              ) : (
                filteredMessages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Box
                      sx={{
                        p: 2,
                        mb: 1,
                        borderRadius: 2,
                        cursor: 'pointer',
                        bgcolor: selectedMessage?.id === message.id ? '#f0f9ff' : message.read ? '#f9fafb' : '#eff6ff',
                        borderLeft: selectedMessage?.id === message.id ? '4px solid #3b82f6' : message.read ? 'none' : '4px solid #3b82f6',
                        '&:hover': { bgcolor: '#f0f9ff' },
                      }}
                      onClick={() => handleOpenMessage(message)}
                    >
                      <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: '#6366f1' }}>
                            <Person fontSize="small" />
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {message.studentName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {message.studentId}
                            </Typography>
                          </Box>
                        </Box>
                        {!message.read && (
                          <Chip label="New" size="small" color="primary" sx={{ fontSize: '0.7rem' }} />
                        )}
                      </Box>
                      <Typography variant="body2" fontWeight={500} mb={0.5} noWrap>
                        {message.subject}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {new Date(message.timestamp).toLocaleString()}
                      </Typography>
                    </Box>
                  </motion.div>
                ))
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Message Detail */}
        <Card>
          <CardContent>
            {selectedMessage ? (
              <>
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={3}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold" mb={1}>
                      {selectedMessage.subject}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      <Avatar sx={{ bgcolor: '#6366f1' }}>
                        <Person />
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {selectedMessage.studentName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                          <Email fontSize="small" />
                          {selectedMessage.studentEmail}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {selectedMessage.studentId}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <IconButton
                    color="error"
                    size="small"
                    onClick={() => handleDelete(selectedMessage.id)}
                  >
                    <Delete />
                  </IconButton>
                </Box>

                <Divider sx={{ mb: 2 }} />

                <Typography variant="body2" color="text.secondary" mb={1}>
                  {new Date(selectedMessage.timestamp).toLocaleString()}
                </Typography>

                <Box
                  sx={{
                    p: 2,
                    mb: 3,
                    bgcolor: '#f9fafb',
                    borderRadius: 2,
                    minHeight: 200,
                  }}
                >
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedMessage.message}
                  </Typography>
                </Box>

                {selectedMessage.reply && (
                  <>
                    <Divider sx={{ my: 3 }}>
                      <Chip label="Your Reply" size="small" />
                    </Divider>
                    <Box
                      sx={{
                        p: 2,
                        mb: 3,
                        bgcolor: '#eff6ff',
                        borderRadius: 2,
                        borderLeft: '4px solid #3b82f6',
                      }}
                    >
                      <Typography variant="body2" color="text.secondary" mb={1}>
                        {selectedMessage.replyTimestamp && new Date(selectedMessage.replyTimestamp).toLocaleString()}
                      </Typography>
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {selectedMessage.reply}
                      </Typography>
                    </Box>
                  </>
                )}

                <Button
                  variant="contained"
                  startIcon={<Reply />}
                  onClick={() => setReplyDialogOpen(true)}
                  sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
                >
                  {selectedMessage.reply ? 'Reply Again' : 'Reply'}
                </Button>
              </>
            ) : (
              <Box textAlign="center" py={8}>
                <Email sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" mb={1}>
                  Select a message to view
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Choose a message from the list to read and reply
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onClose={() => setReplyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reply to {selectedMessage?.studentName}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={8}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your reply here..."
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReplyDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleReply}
            disabled={!replyText.trim()}
            sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
          >
            Send Reply
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ContactMessages

