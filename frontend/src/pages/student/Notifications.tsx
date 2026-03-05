import React, { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Divider,
} from '@mui/material'
import {
  Notifications as NotificationsIcon,
  Assignment,
  Event,
  EmojiEvents,
  Info,
  Warning,
  Close,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { dismissNotification, getNotifications, NotificationItem } from '../../lib/api'

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  useEffect(() => {
    getNotifications().then(setNotifications)
  }, [])

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications])

  const seed = [
    {
      id: 1,
      type: 'assignment',
      title: 'New Assignment Posted',
      message: 'Physics Lab Report: Projectile Motion is now available',
      time: '2 hours ago',
      read: false,
      icon: <Assignment />,
      color: '#3b82f6',
    },
    {
      id: 2,
      type: 'exam',
      title: 'Upcoming Exam Reminder',
      message: 'Mathematics exam is scheduled for Nov 5, 2025 at 10:00 AM',
      time: '5 hours ago',
      read: false,
      icon: <Event />,
      color: '#f59e0b',
    },
    {
      id: 3,
      type: 'achievement',
      title: 'New Achievement Unlocked!',
      message: 'Congratulations! You\'ve earned the "7-Day Streak" badge',
      time: '1 day ago',
      read: false,
      icon: <EmojiEvents />,
      color: '#8b5cf6',
    },
    {
      id: 4,
      type: 'grade',
      title: 'Grade Posted',
      message: 'Your grade for Calculus Problem Set 5 is now available: A (95%)',
      time: '1 day ago',
      read: true,
      icon: <Info />,
      color: '#10b981',
    },
    {
      id: 5,
      type: 'warning',
      title: 'Assignment Overdue',
      message: 'Cell Biology Essay was due on Oct 28, 2025. Submit as soon as possible.',
      time: '2 days ago',
      read: false,
      icon: <Warning />,
      color: '#ef4444',
    },
    {
      id: 6,
      type: 'info',
      title: 'Study Plan Updated',
      message: 'Your AI-powered study plan has been updated based on recent performance',
      time: '3 days ago',
      read: true,
      icon: <Info />,
      color: '#6366f1',
    },
    {
      id: 7,
      type: 'exam',
      title: 'Exam Schedule Released',
      message: 'Final exam schedule for this semester is now available',
      time: '4 days ago',
      read: true,
      icon: <Event />,
      color: '#f59e0b',
    },
  ]

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Notifications
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Stay updated with your academic activities
          </Typography>
        </Box>
        <Chip
          icon={<NotificationsIcon />}
          label={`${unreadCount} Unread`}
          sx={{
            bgcolor: '#fee2e2',
            color: '#991b1b',
            fontWeight: 'bold',
          }}
        />
      </Box>

      {/* Notification Categories */}
      <Box display="flex" gap={1} mb={3} flexWrap="wrap">
        <Chip label="All" sx={{ bgcolor: '#e0e7ff', color: '#3730a3' }} />
        <Chip label="Assignments" variant="outlined" />
        <Chip label="Exams" variant="outlined" />
        <Chip label="Grades" variant="outlined" />
        <Chip label="Achievements" variant="outlined" />
      </Box>

      {/* Notifications List */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          {notifications.map((notification, index) => (
            <React.Fragment key={notification.id}>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Box
                  sx={{
                    p: 3,
                    bgcolor: notification.read ? 'transparent' : '#f9fafb',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      bgcolor: '#f3f4f6',
                    },
                    borderLeft: notification.read ? 'none' : `4px solid ${notification.color}`,
                  }}
                >
                  <Box display="flex" alignItems="flex-start" gap={2}>
                    <Avatar
                      sx={{
                        bgcolor: notification.color,
                        width: 48,
                        height: 48,
                      }}
                    >
                      {notification.icon}
                    </Avatar>

                    <Box flexGrow={1}>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography
                            variant="body1"
                            fontWeight={notification.read ? 500 : 700}
                            mb={0.5}
                          >
                            {notification.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" mb={1}>
                            {notification.message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            🕐 {notification.time}
                          </Typography>
                        </Box>
                        <IconButton size="small" onClick={() => dismissNotification(notification.id).then(setNotifications)}>
                          <Close fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>

                    {!notification.read && (
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: notification.color,
                          mt: 1,
                        }}
                      />
                    )}
                  </Box>
                </Box>
              </motion.div>
              {index < notifications.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </CardContent>
      </Card>

      {/* Empty State (if needed) */}
      {notifications.length === 0 && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: '#f3f4f6',
                margin: '0 auto',
                mb: 2,
              }}
            >
              <NotificationsIcon sx={{ fontSize: 40, color: '#9ca3af' }} />
            </Avatar>
            <Typography variant="h6" color="text.secondary" mb={1}>
              No notifications
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You're all caught up! Check back later for updates.
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}

export default Notifications

