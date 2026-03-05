import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Avatar,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
} from '@mui/material'
import {
  Send,
  Person,
  Email,
  School,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { sendContactMessage, getAvailableTeachers } from '../../lib/api'

interface Teacher {
  id: string
  name: string
  email: string
  subject: string
}

const ContactTeacher: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [selectedTeacher, setSelectedTeacher] = useState<string>('')
  const [subject, setSubject] = useState<string>('')
  const [message, setMessage] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    // Fetch available teachers
    const fetchTeachers = async () => {
      try {
        const teacherList = await getAvailableTeachers()
        setTeachers(teacherList)
      } catch (err) {
        console.error('Error fetching teachers:', err)
        // Fallback mock data
        setTeachers([
          { id: '1', name: 'Dr. Sarah Johnson', email: 'sarah.johnson@edu.com', subject: 'Mathematics' },
          { id: '2', name: 'Prof. Michael Chen', email: 'michael.chen@edu.com', subject: 'Physics' },
          { id: '3', name: 'Dr. Emily Davis', email: 'emily.davis@edu.com', subject: 'Chemistry' },
          { id: '4', name: 'Prof. James Wilson', email: 'james.wilson@edu.com', subject: 'Biology' },
        ])
      }
    }
    fetchTeachers()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!selectedTeacher || !subject || !message.trim()) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      await sendContactMessage({
        teacherId: selectedTeacher,
        subject,
        message: message.trim(),
      })
      setSuccess(true)
      setSubject('')
      setMessage('')
      setSelectedTeacher('')
      setTimeout(() => setSuccess(false), 5000)
    } catch (err: any) {
      setError(err.message || 'Failed to send message. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const selectedTeacherData = teachers.find((t) => t.id === selectedTeacher)

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" mb={1}>
        Contact Teacher
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Send a message to your teacher for questions, concerns, or assistance
      </Typography>

      <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3}>
        {/* Message Form */}
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" mb={3}>
              Send Message
            </Typography>

            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Message sent successfully! Your teacher will respond soon.
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Select Teacher</InputLabel>
                <Select
                  value={selectedTeacher}
                  onChange={(e) => setSelectedTeacher(e.target.value)}
                  label="Select Teacher"
                >
                  {teachers.map((teacher) => (
                    <MenuItem key={teacher.id} value={teacher.id}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Person fontSize="small" />
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {teacher.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {teacher.subject}
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedTeacherData && (
                <Box
                  sx={{
                    p: 2,
                    mb: 3,
                    bgcolor: '#f0f9ff',
                    borderRadius: 2,
                    borderLeft: '4px solid #3b82f6',
                  }}
                >
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar sx={{ bgcolor: '#3b82f6' }}>
                      <Person />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {selectedTeacherData.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                        <Email fontSize="small" />
                        {selectedTeacherData.email}
                      </Typography>
                      <Chip
                        label={selectedTeacherData.subject}
                        size="small"
                        sx={{ mt: 0.5, bgcolor: '#dbeafe', color: '#1e40af' }}
                      />
                    </Box>
                  </Box>
                </Box>
              )}

              <TextField
                fullWidth
                label="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Question about Assignment 3"
                sx={{ mb: 3 }}
                required
              />

              <TextField
                fullWidth
                label="Message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
                multiline
                rows={8}
                sx={{ mb: 3 }}
                required
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Send />}
                disabled={loading || !selectedTeacher || !subject || !message.trim()}
                sx={{
                  bgcolor: '#6366f1',
                  '&:hover': { bgcolor: '#4f46e5' },
                }}
              >
                {loading ? 'Sending...' : 'Send Message'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Instructions & Tips */}
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2}>
                📝 Guidelines
              </Typography>
              <Box component="ul" sx={{ pl: 2, mb: 3 }}>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  Be clear and specific about your question or concern
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  Include relevant details (assignment name, course, etc.)
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  Use a descriptive subject line
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  Be respectful and professional
                </Typography>
                <Typography component="li" variant="body2">
                  Allow 24-48 hours for a response
                </Typography>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2}>
                Tips
              </Typography>
              <Box
                sx={{
                  p: 2,
                  bgcolor: '#fef3c7',
                  borderRadius: 2,
                  borderLeft: '4px solid #f59e0b',
                }}
              >
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>For Assignment Questions:</strong> Mention the assignment number and specific problem you're stuck on.
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>For Grade Inquiries:</strong> Include the assignment/exam name and your submission date.
                </Typography>
                <Typography variant="body2">
                  <strong>For General Questions:</strong> Provide context about the topic or chapter you're asking about.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  )
}

export default ContactTeacher

