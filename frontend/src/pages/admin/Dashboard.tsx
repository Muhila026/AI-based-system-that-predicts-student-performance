import React, { useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Button,
} from '@mui/material'
import {
  People,
  School,
  PersonAdd,
  TrendingUp,
  Assignment,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { getAdminDashboard } from '../../lib/api'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

interface AdminDashboardProps {
  onAddUserClick?: () => void
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onAddUserClick }) => {
  const [stats, setStats] = useState<Array<{ title: string; value: string; change: string }>>([])
  const [userBreakdown, setUserBreakdown] = useState<Array<{ type: string; count: number; percentage: number }>>([])
  const [recentActivities, setRecentActivities] = useState<Array<{ activity: string; user: string; time: string }>>([])

  const statConfig = [
    { title: 'Total Users', icon: <People />, color: THEME.primary },
    { title: 'Active Courses', icon: <School />, color: '#0d9488' },
  ]

  const localStats = [
    { title: 'Total Users', value: '0', change: 'No data available' },
    { title: 'Active Courses', value: '0', change: 'No data available' },
  ]

  useEffect(() => {
    getAdminDashboard().then((d: any) => {
      const filteredStats = (d?.stats || []).filter(
        (stat: any) => stat.title === 'Total Users' || stat.title === 'Active Courses'
      )
      setStats(filteredStats.length > 0 ? filteredStats : localStats)
      setUserBreakdown(d?.breakdown || [])
      setRecentActivities(d?.activities || [])
    }).catch(() => {
      setStats(localStats)
    })
  }, [])

  const displayStats = stats.length ? stats : localStats

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Header */}
      <Box
        sx={{
          mb: 3,
          pb: 3,
          borderBottom: `1px solid ${THEME.primaryBorder}`,
        }}
      >
        <Typography
          variant="h5"
          fontWeight="700"
          sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}
        >
          Admin Dashboard
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          System overview and platform analytics
        </Typography>
      </Box>

      {/* Add User */}
      {onAddUserClick && (
        <Box mb={3}>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<PersonAdd />}
              onClick={onAddUserClick}
              sx={{
                backgroundColor: THEME.primary,
                px: 3,
                py: 1.5,
                borderRadius: 0,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.95rem',
                boxShadow: '0 2px 8px rgba(30, 58, 138, 0.25)',
                '&:hover': {
                  backgroundColor: '#1e40af',
                  boxShadow: '0 4px 12px rgba(30, 58, 138, 0.35)',
                },
              }}
            >
              Add User
            </Button>
          </motion.div>
        </Box>
      )}

      {/* Stats Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
          gap: 2.5,
          mb: 4,
        }}
      >
        {displayStats.map((stat, index) => {
          const config = statConfig[index % statConfig.length]
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
            >
              <Card
                elevation={0}
                sx={{
                  border: `1px solid ${THEME.primaryBorder}`,
                  borderRadius: 0,
                  backgroundColor: '#fff',
                  overflow: 'hidden',
                }}
              >
                <CardContent sx={{ py: 2.5, px: 2.5 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{ color: THEME.muted, fontWeight: 500, mb: 0.5 }}
                      >
                        {stat.title}
                      </Typography>
                      <Typography
                        variant="h4"
                        fontWeight="700"
                        sx={{ color: THEME.textDark, letterSpacing: '-0.02em' }}
                      >
                        {stat.value}
                      </Typography>
                      <Typography variant="caption" sx={{ color: THEME.muted, mt: 0.5, display: 'block' }}>
                        {stat.change}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: 52,
                        height: 52,
                        borderRadius: 0,
                        backgroundColor: THEME.primaryLight,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: config.color,
                      }}
                    >
                      {config.icon}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </Box>

      {/* Two columns */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
          gap: 2.5,
        }}
      >
        {/* User Distribution */}
        <Card
          elevation={0}
          sx={{
            border: `1px solid ${THEME.primaryBorder}`,
            borderRadius: 0,
            backgroundColor: '#fff',
          }}
        >
          <CardContent sx={{ py: 2.5, px: 2.5 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2.5}>
              <TrendingUp sx={{ color: THEME.primary, fontSize: 22 }} />
              <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>
                User Distribution
              </Typography>
            </Box>
            {(userBreakdown || []).length === 0 ? (
              <Typography variant="body2" sx={{ color: THEME.muted }}>
                No distribution data yet.
              </Typography>
            ) : (
              (userBreakdown || []).map((user, index) => {
                const colors = [THEME.primary, '#0d9488', '#b45309']
                const barColor = colors[index % colors.length]
                return (
                  <Box key={index} sx={{ mb: 2.5 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.75}>
                      <Typography variant="body2" fontWeight="600" sx={{ color: THEME.textDark }}>
                        {user.type}
                      </Typography>
                      <Typography variant="caption" sx={{ color: THEME.muted }}>
                        {user.count} ({user.percentage}%)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={user.percentage}
                      sx={{
                        height: 8,
                        borderRadius: 0,
                        backgroundColor: THEME.primaryBorder,
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: barColor,
                          borderRadius: 0,
                        },
                      }}
                    />
                  </Box>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card
          elevation={0}
          sx={{
            border: `1px solid ${THEME.primaryBorder}`,
            borderRadius: 0,
            backgroundColor: '#fff',
          }}
        >
          <CardContent sx={{ py: 2.5, px: 2.5 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Assignment sx={{ color: THEME.primary, fontSize: 22 }} />
              <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>
                Recent Activities
              </Typography>
            </Box>
            {(recentActivities || []).length === 0 ? (
              <Typography variant="body2" sx={{ color: THEME.muted }}>
                No recent activity.
              </Typography>
            ) : (
              (recentActivities || []).map((item, index) => (
                <Box
                  key={index}
                  sx={{
                    py: 1.75,
                    borderBottom:
                      index < (recentActivities || []).length - 1
                        ? `1px solid ${THEME.primaryBorder}`
                        : 'none',
                  }}
                >
                  <Typography variant="body2" fontWeight="500" sx={{ color: THEME.textDark }}>
                    {item.activity}
                  </Typography>
                  <Typography variant="caption" sx={{ color: THEME.muted }}>
                    by {item.user} · {item.time}
                  </Typography>
                </Box>
              ))
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}

export default AdminDashboard
