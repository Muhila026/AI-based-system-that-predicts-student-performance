import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Avatar,
  Chip,
  Divider,
} from '@mui/material'
import { Send } from '@mui/icons-material'
import { motion } from 'framer-motion'

const TeacherFeedback: React.FC = () => {
  const [message, setMessage] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<string | null>('John Doe')

  const students = [
    { name: 'John Doe', id: 'STD-001', unread: 2, lastMessage: 'Thank you for the feedback!' },
    { name: 'Emma Wilson', id: 'STD-004', unread: 5, lastMessage: 'Can you help me with question 5?' },
    { name: 'Sarah Davis', id: 'STD-006', unread: 0, lastMessage: 'I understand now, thanks!' },
    { name: 'Mike Johnson', id: 'STD-003', unread: 1, lastMessage: 'When is the next quiz?' },
  ]

  const conversations = [
    { sender: 'student', text: 'Hi Professor, I need help with the last assignment.', time: '10:30 AM' },
    { sender: 'teacher', text: 'Of course! Which part are you having trouble with?', time: '10:32 AM' },
    { sender: 'student', text: 'The quadratic equation in problem 5.', time: '10:35 AM' },
    { sender: 'teacher', text: 'Let me explain the steps to solve it...', time: '10:37 AM' },
    { sender: 'student', text: 'Thank you for the feedback!', time: '10:40 AM' },
  ]

  const handleSend = () => {
    if (message.trim()) {
      // Add message logic here
      setMessage('')
    }
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" mb={1}>
        Student Feedback & Guidance
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Provide personalized feedback and respond to student inquiries
      </Typography>

      <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 2fr' }} gap={3}>
        {/* Student List */}
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" mb={2}>
              Students
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Search students..."
              sx={{ mb: 2 }}
            />
            {students.map((student, index) => (
              <Box
                key={index}
                onClick={() => setSelectedStudent(student.name)}
                sx={{
                  p: 2,
                  mb: 1,
                  bgcolor: selectedStudent === student.name ? '#f0f9ff' : '#f9fafb',
                  borderRadius: 2,
                  cursor: 'pointer',
                  border: selectedStudent === student.name ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                  '&:hover': { bgcolor: '#f3f4f6' },
                }}
              >
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: '#6366f1' }}>
                      {student.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {student.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {student.id}
                      </Typography>
                    </Box>
                  </Box>
                  {student.unread > 0 && (
                    <Chip
                      label={student.unread}
                      size="small"
                      sx={{ bgcolor: '#ef4444', color: 'white', height: 20, minWidth: 20 }}
                    />
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {student.lastMessage}
                </Typography>
              </Box>
            ))}
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card>
          <CardContent>
            {/* Chat Header */}
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Avatar sx={{ bgcolor: '#6366f1' }}>
                {selectedStudent?.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  {selectedStudent}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Active now
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* Messages */}
            <Box
              sx={{
                height: '50vh',
                overflowY: 'auto',
                mb: 2,
                p: 2,
                bgcolor: '#f9fafb',
                borderRadius: 2,
              }}
            >
              {conversations.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: msg.sender === 'teacher' ? 'flex-end' : 'flex-start',
                      mb: 2,
                    }}
                  >
                    <Box
                      sx={{
                        maxWidth: '70%',
                        p: 2,
                        borderRadius: 2,
                        bgcolor: msg.sender === 'teacher' ? '#6366f1' : 'white',
                        color: msg.sender === 'teacher' ? 'white' : 'black',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      }}
                    >
                      <Typography variant="body2">{msg.text}</Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          opacity: 0.7,
                          mt: 0.5,
                          display: 'block',
                          textAlign: 'right',
                        }}
                      >
                        {msg.time}
                      </Typography>
                    </Box>
                  </Box>
                </motion.div>
              ))}
            </Box>

            {/* Input Area */}
            <Box display="flex" gap={1}>
              <TextField
                fullWidth
                placeholder="Type your feedback or response..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                multiline
                maxRows={3}
              />
              <Button
                variant="contained"
                onClick={handleSend}
                sx={{
                  minWidth: 'auto',
                  px: 3,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
              >
                <Send />
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}

export default TeacherFeedback

