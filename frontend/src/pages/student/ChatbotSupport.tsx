import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Chip,
} from '@mui/material'
import { Send, SmartToy, Person } from '@mui/icons-material'
import { motion } from 'framer-motion'
import { chatWithAI } from '../../lib/api'

interface Message {
  id: number
  text: string
  sender: 'user' | 'bot'
  timestamp: string
}

const ChatbotSupport: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: 'Hello! I\'m your study assistant. Ask me questions about your subjects, assignments, or exams.',
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [inputMessage, setInputMessage] = useState('')

  const quickActions = [
    'Explain this concept',
    'Give me practice questions',
    'Help me prepare for an exam',
    'Give me study tips',
  ]

  const handleSendMessage = async () => {
    if (inputMessage.trim()) {
      const newUserMessage: Message = {
        id: Date.now(),
        text: inputMessage,
        sender: 'user',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => [...prev, newUserMessage])
      const currentInput = inputMessage
      setInputMessage('')

      try {
        const response = await chatWithAI(currentInput)

        const botResponse: Message = {
          id: Date.now() + 1,
          text: response.response,
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
        setMessages((prev) => [...prev, botResponse])
      } catch (error) {
        console.error("Error calling AI:", error)
        const botResponse: Message = {
          id: Date.now() + 1,
          text: "I'm sorry, I'm having trouble connecting to the school servers. Please try again in a moment.",
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
        setMessages((prev) => [...prev, botResponse])
      }
    }
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" mb={1}>
        AI Chatbot Support
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Your 24/7 study companion. Please ask only learning-related questions.
      </Typography>

      <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '2fr 1fr' }} gap={3}>
        {/* Chat Interface */}
        <Box>
          <Card sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
            {/* Chat Header */}
            <Box
              sx={{
                p: 2,
                borderBottom: '1px solid #e5e7eb',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
              }}
            >
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                  <SmartToy />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    AI Learning Assistant
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    Online • Always here to help
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Messages Area */}
            <CardContent
              sx={{
                flexGrow: 1,
                overflowY: 'auto',
                bgcolor: '#f9fafb',
                p: 3,
              }}
            >
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                      mb: 2,
                    }}
                  >
                    {message.sender === 'bot' && (
                      <Avatar sx={{ mr: 1, bgcolor: '#6366f1' }}>
                        <SmartToy />
                      </Avatar>
                    )}
                    <Box
                      sx={{
                        maxWidth: '70%',
                        p: 2,
                        borderRadius: 2,
                        bgcolor: message.sender === 'user' ? '#6366f1' : 'white',
                        color: message.sender === 'user' ? 'white' : 'black',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      }}
                    >
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                        {message.text}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          opacity: 0.7,
                          mt: 0.5,
                          display: 'block',
                          textAlign: 'right',
                        }}
                      >
                        {message.timestamp}
                      </Typography>
                    </Box>
                    {message.sender === 'user' && (
                      <Avatar sx={{ ml: 1, bgcolor: '#10b981' }}>
                        <Person />
                      </Avatar>
                    )}
                  </Box>
                </motion.div>
              ))}
            </CardContent>

            {/* Input Area */}
            <Box sx={{ p: 2, borderTop: '1px solid #e5e7eb', bgcolor: 'white' }}>
              <Box display="flex" gap={1}>
                <TextField
                  fullWidth
                  placeholder="Type your message..."
                  variant="outlined"
                  size="small"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <IconButton
                  color="primary"
                  onClick={handleSendMessage}
                  sx={{
                    bgcolor: '#6366f1',
                    color: 'white',
                    '&:hover': { bgcolor: '#4f46e5' },
                  }}
                >
                  <Send />
                </IconButton>
              </Box>
            </Box>
          </Card>
        </Box>

        {/* Quick Actions & Info */}
        <Box>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2}>
                🚀 Quick Actions
              </Typography>
              {quickActions.map((action, index) => (
                <Chip
                  key={index}
                  label={action}
                  onClick={() => setInputMessage(action)}
                  sx={{
                    m: 0.5,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#e0e7ff' },
                  }}
                />
              ))}
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2}>
                💬 What I Can Help With
              </Typography>
              <Box component="ul" sx={{ pl: 2 }}>
                <Typography component="li" variant="body2" mb={1}>
                  Subject explanations
                </Typography>
                <Typography component="li" variant="body2" mb={1}>
                  Homework and assignment help
                </Typography>
                <Typography component="li" variant="body2" mb={1}>
                  Study strategies
                </Typography>
                <Typography component="li" variant="body2" mb={1}>
                  Exam preparation
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  )
}

export default ChatbotSupport

