import React, { useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Avatar,
  Button,
} from '@mui/material'
import {
  People,
  School,
  PersonAdd,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { getAdminDashboard } from '../../lib/api'

interface AdminDashboardProps {
  onAddUserClick?: () => void
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onAddUserClick }) => {
  const [stats, setStats] = useState<Array<{title:string; value:string; change:string; color:string}>>([])
  const [userBreakdown, setUserBreakdown] = useState<Array<{ type:string; count:number; percentage:number }>>([])
  const [recentActivities, setRecentActivities] = useState<Array<{activity:string; user:string; time:string}>>([])

  const statIcons = [<People />, <School />]

  const localStats = [
    {
      title: 'Total Users',
      value: '0',
      change: 'No data available',
      color: '#3b82f6',
    },
    {
      title: 'Active Courses',
      value: '0',
      change: 'No data available',
      color: '#10b981',
    },
  ]

  useEffect(() => {
    getAdminDashboard().then((d: any) => {
      // Only keep Total Users and Active Courses stats
      const filteredStats = (d?.stats || []).filter((stat: any) => 
        stat.title === 'Total Users' || stat.title === 'Active Courses'
      )
      setStats(filteredStats.length > 0 ? filteredStats : localStats)
      setUserBreakdown(d?.breakdown || [])
      setRecentActivities(d?.activities || [])
    }).catch((error) => {
      console.error('Error loading dashboard data:', error)
      // Keep default empty arrays on error
      setStats(localStats)
    })
  }, [])

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" mb={1}>
        Admin Dashboard
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        System overview and platform analytics
      </Typography>

      {/* Quick action: Add User */}
      {onAddUserClick && (
        <Box mb={3}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<PersonAdd />}
              onClick={onAddUserClick}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                px: 3,
                py: 1.5,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Add User
            </Button>
          </motion.div>
        </Box>
      )}

      {/* Stats Cards */}
      <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)' }} gap={3} mb={4}>
        {(stats.length ? stats : localStats).map((stat, index) => (
          <Box key={index}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="body2" color="text.secondary" mb={1}>
                        {stat.title}
                      </Typography>
                      <Typography variant="h4" fontWeight="bold" mb={0.5}>
                        {stat.value}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {stat.change}
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: stat.color, width: 56, height: 56 }}>
                      {statIcons[index % statIcons.length]}
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Box>
        ))}
      </Box>

      <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '2fr 1fr' }} gap={3}>
        {/* User Distribution */}
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={3}>
                User Distribution
              </Typography>
              {(userBreakdown || []).map((user, index) => (
                <Box key={index} mb={3}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body1" fontWeight={600}>
                      {user.type}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {user.count} ({user.percentage}%)
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={user.percentage}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: '#e5e7eb',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: index === 0 ? '#3b82f6' : index === 1 ? '#10b981' : '#f59e0b',
                        borderRadius: 4,
                      },
                    }}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Box>

        {/* Recent Activities */}
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2}>
                Recent System Activities
              </Typography>
              {(recentActivities || []).map((item, index) => (
                <Box
                  key={index}
                  sx={{
                    py: 2,
                    borderBottom: index < (recentActivities || []).length - 1 ? '1px solid #e5e7eb' : 'none',
                  }}
                >
                  <Typography variant="body2" fontWeight={500}>
                    {item.activity}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    by {item.user} • {item.time}
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  )
}

export default AdminDashboard

