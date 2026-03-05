import React, { useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
} from '@mui/material'
import { Send, Notifications } from '@mui/icons-material'
import { motion } from 'framer-motion'
import { getAnnouncements, sendAnnouncement, type Announcement } from '../../lib/api'

const Announcements: React.FC = () => {
  const [announcement, setAnnouncement] = useState({
    title: '',
    message: '',
    target: 'all',
    priority: 'normal',
  })

  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([])

  useEffect(() => { getAnnouncements().then(setRecentAnnouncements) }, [])

  const handleSend = async () => {
    // Validate form
    if (!announcement.title || !announcement.title.trim()) {
      alert('Announcement title is required')
      return
    }
    if (!announcement.message || !announcement.message.trim()) {
      alert('Announcement message is required')
      return
    }
    try {
      await sendAnnouncement({ 
        title: announcement.title.trim(), 
        message: announcement.message.trim(), 
        target: announcement.target, 
        priority: announcement.priority as 'low' | 'normal' | 'high' | 'urgent'
      })
      setAnnouncement({ title: '', message: '', target: 'all', priority: 'normal' })
      setRecentAnnouncements(await getAnnouncements())
    } catch (error: any) {
      alert(error.message || 'Failed to send announcement')
    }
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" mb={1}>
        Announcements
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Send important messages to users
      </Typography>

      {/* Create Announcement */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" mb={3}>
            📢 Create New Announcement
          </Typography>
          <Box display="grid" gap={3}>
            <TextField
              fullWidth
              label="Announcement Title"
              value={announcement.title}
              onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
            />
            <TextField
              fullWidth
              label="Message"
              multiline
              rows={4}
              value={announcement.message}
              onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
            />
            <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, 1fr)' }} gap={2}>
              <FormControl fullWidth>
                <InputLabel>Target Audience</InputLabel>
                <Select
                  value={announcement.target}
                  label="Target Audience"
                  onChange={(e) => setAnnouncement({ ...announcement, target: e.target.value })}
                >
                  <MenuItem value="all">All Users</MenuItem>
                  <MenuItem value="students">Students Only</MenuItem>
                  <MenuItem value="teachers">Teachers Only</MenuItem>
                  <MenuItem value="admins">Admins Only</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={announcement.priority}
                  label="Priority"
                  onChange={(e) => setAnnouncement({ ...announcement, priority: e.target.value })}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Button
              variant="contained"
              size="large"
              startIcon={<Send />}
              onClick={handleSend}
              sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              Send Announcement
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Recent Announcements */}
      <Typography variant="h6" fontWeight="bold" mb={2}>
        Recent Announcements
      </Typography>
      <Box display="grid" gap={2}>
        {recentAnnouncements.map((item, index) => (
          <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box flexGrow={1}>
                    <Box display="flex" alignItems="center" gap={2} mb={1}>
                      <Notifications color="primary" />
                      <Typography variant="h6" fontWeight="bold">{item.title}</Typography>
                      <Chip
                        label={item.priority}
                        size="small"
                        sx={{
                          bgcolor: item.priority === 'high' || item.priority === 'urgent' ? '#fee2e2' : '#e0e7ff',
                          color: item.priority === 'high' || item.priority === 'urgent' ? '#991b1b' : '#3730a3',
                        }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" mb={1}>
                      {item.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Sent to: {item.target === 'all' ? 'All Users' : item.target.charAt(0).toUpperCase() + item.target.slice(1)} • {item.date}
                    </Typography>
                  </Box>
                  <Button variant="outlined" size="small">Edit</Button>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </Box>
    </Box>
  )
}

export default Announcements

