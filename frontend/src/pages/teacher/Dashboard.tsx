import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  LinearProgress,
  CircularProgress,
  ButtonBase,
} from '@mui/material'
import {
  People,
  Assignment,
  TrendingUp,
  Grade,
  Add,
  MenuBook,
  Assessment,
  ChevronRight,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import {
  getTeacherDashboard,
  getCourses,
  getTeacherAssignments,
} from '../../lib/api'
import type { AdminCourse } from '../../lib/api'

interface DashboardStats {
  title: string
  value: string
  change: string
}

interface DashboardData {
  stats: DashboardStats[]
}

interface TeacherDashboardProps {
  onSelectPage?: (page: string) => void
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onSelectPage }) => {
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<DashboardData>({ stats: [] })
  const [courses, setCourses] = useState<AdminCourse[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [teacherName, setTeacherName] = useState<string>('')

  useEffect(() => {
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setTeacherName(user.name || user.email || 'Teacher')
      } catch {
        setTeacherName('Teacher')
      }
    }
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [statsRes, coursesRes, assignmentsRes] = await Promise.all([
        getTeacherDashboard(),
        getCourses(),
        getTeacherAssignments(),
      ])
      setDashboardData(statsRes)
      setCourses(Array.isArray(coursesRes) ? coursesRes : [])
      setAssignments(Array.isArray(assignmentsRes) ? assignmentsRes : [])
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      setDashboardData({
        stats: [
          { title: 'Total Students', value: '—', change: 'Connect backend for live data' },
          { title: 'Active Courses', value: '—', change: '—' },
          { title: 'Avg Performance', value: '—', change: '—' },
          { title: 'Pending Grading', value: '—', change: '—' },
        ],
      })
      setCourses([])
      setAssignments([])
    } finally {
      setLoading(false)
    }
  }

  const getStatIcon = (title: string) => {
    if (title.includes('Students')) return <People />
    if (title.includes('Courses')) return <Assignment />
    if (title.includes('Performance')) return <TrendingUp />
    if (title.includes('Grading')) return <Grade />
    return <Assignment />
  }

  const getStatColor = (title: string) => {
    if (title.includes('Students')) return '#3b82f6'
    if (title.includes('Courses')) return '#10b981'
    if (title.includes('Performance')) return '#f59e0b'
    if (title.includes('Grading')) return '#8b5cf6'
    return '#6366f1'
  }

  const stats = dashboardData.stats.length > 0
    ? dashboardData.stats.map((stat) => ({
        ...stat,
        icon: getStatIcon(stat.title),
        color: getStatColor(stat.title),
      }))
    : [
        { title: 'Total Students', value: '—', change: '—', icon: <People />, color: '#3b82f6' },
        { title: 'Active Courses', value: '—', change: '—', icon: <Assignment />, color: '#10b981' },
        { title: 'Avg Performance', value: '—', change: '—', icon: <TrendingUp />, color: '#f59e0b' },
        { title: 'Pending Grading', value: '—', change: '—', icon: <Grade />, color: '#8b5cf6' },
      ]

  const pendingGradingCount = assignments.filter(
    (a) => (a.submitted ?? 0) > (a.graded ?? 0) || (a.status && a.status.toLowerCase() === 'active')
  ).length

  const recentActivities =
    assignments.length > 0
      ? assignments.slice(0, 5).map((a) => ({
          activity: a.title
            ? `Assignment "${a.title}"${a.subject ? ` (${a.subject})` : ''} — ${a.submitted ?? 0}/${a.students ?? 0} submitted`
            : 'Assignment',
          time: a.dueDate ? `Due ${a.dueDate}` : '—',
          type: 'assignment' as const,
        }))
      : [
          {
            activity: 'No assignments yet. Create one from Quick Actions.',
            time: '—',
            type: 'assignment' as const,
          },
        ]

  const classOverview = courses.map((c) => ({
    id: c.id,
    class: c.name || (c as any).code || 'Unnamed Course',
    students: typeof c.students === 'number' ? c.students : parseInt(String(c.students || 0), 10) || 0,
    avgScore: 0,
    assignments: 0,
    status: c.status,
  }))
  const activeCourses = classOverview.filter((c) => (c.status || 'Active').toLowerCase() !== 'inactive')

  const handleQuickAction = (page: string) => {
    if (onSelectPage) onSelectPage(page)
  }

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h4" fontWeight="bold" mb={0.5}>
          Teacher Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back, {teacherName}. Overview of your classes and student performance.
        </Typography>
      </Box>

      {/* Stats Cards */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : (
        <Box
          display="grid"
          gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }}
          gap={3}
          mb={4}
        >
          {stats.map((stat, index) => (
            <Box key={index}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
              >
                <Card sx={{ height: '100%', borderRadius: 2 }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box flexGrow={1}>
                        <Typography variant="body2" color="text.secondary" mb={0.5}>
                          {stat.title}
                        </Typography>
                        <Typography variant="h4" fontWeight="bold" mb={0.5}>
                          {stat.title === 'Pending Grading' && pendingGradingCount > 0
                            ? String(pendingGradingCount)
                            : stat.value}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {stat.change}
                        </Typography>
                      </Box>
                      <Avatar sx={{ bgcolor: stat.color, width: 48, height: 48 }}>
                        {stat.icon}
                      </Avatar>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Box>
          ))}
        </Box>
      )}

      <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '2fr 1fr' }} gap={3}>
        {/* Class Overview */}
        <Box>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2}>
                Class Overview
              </Typography>
              {classOverview.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No courses assigned yet. Contact admin to get assigned to courses.
                </Typography>
              ) : (
                activeCourses.map((cls, index) => (
                  <Box key={cls.id ?? index} mb={2.5}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body1" fontWeight={600}>
                        {cls.class}
                      </Typography>
                      <Chip
                        label={`${cls.students} students`}
                        size="small"
                        color={cls.students > 0 ? 'primary' : 'default'}
                        variant="outlined"
                      />
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={cls.avgScore || 0}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: '#e5e7eb',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: '#10b981',
                          borderRadius: 3,
                        },
                      }}
                    />
                  </Box>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Activities / Assignments */}
          <Card sx={{ mt: 3, borderRadius: 2 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight="bold">
                  Recent Assignments
                </Typography>
                {assignments.length > 0 && (
                  <ButtonBase
                    onClick={() => handleQuickAction('Assignments')}
                    sx={{ borderRadius: 1, p: 0.5 }}
                  >
                    <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
                      View all
                    </Typography>
                    <ChevronRight fontSize="small" color="primary" />
                  </ButtonBase>
                )}
              </Box>
              {recentActivities.map((item, index) => (
                <Box
                  key={index}
                  sx={{
                    py: 1.5,
                    borderBottom:
                      index < recentActivities.length - 1 ? '1px solid #e5e7eb' : 'none',
                  }}
                >
                  <Typography variant="body2" fontWeight={500}>
                    {item.activity}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.time}
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Box>

        {/* Quick Actions */}
        <Box>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2}>
                Quick Actions
              </Typography>
              <Box display="flex" flexDirection="column" gap={1.5}>
                <ButtonBase
                  onClick={() => handleQuickAction('Assignments')}
                  sx={{
                    display: 'block',
                    p: 2,
                    textAlign: 'left',
                    bgcolor: '#f0f9ff',
                    borderRadius: 2,
                    borderLeft: '4px solid #3b82f6',
                    '&:hover': { bgcolor: '#e0f2fe' },
                  }}
                >
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="body2" fontWeight="bold" mb={0.5}>
                        Create / Manage Assignments
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Add assignments and upload grades
                      </Typography>
                    </Box>
                    <Add fontSize="small" sx={{ color: '#3b82f6' }} />
                  </Box>
                </ButtonBase>
                <ButtonBase
                  onClick={() => handleQuickAction('Study Resources')}
                  sx={{
                    display: 'block',
                    p: 2,
                    textAlign: 'left',
                    bgcolor: '#f0fdf4',
                    borderRadius: 2,
                    borderLeft: '4px solid #10b981',
                    '&:hover': { bgcolor: '#dcfce7' },
                  }}
                >
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="body2" fontWeight="bold" mb={0.5}>
                        Upload Study Resource
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Share materials with students
                      </Typography>
                    </Box>
                    <MenuBook fontSize="small" sx={{ color: '#10b981' }} />
                  </Box>
                </ButtonBase>
                <ButtonBase
                  onClick={() => handleQuickAction('Student Performance')}
                  sx={{
                    display: 'block',
                    p: 2,
                    textAlign: 'left',
                    bgcolor: '#fef3c7',
                    borderRadius: 2,
                    borderLeft: '4px solid #f59e0b',
                    '&:hover': { bgcolor: '#fde68a' },
                  }}
                >
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="body2" fontWeight="bold" mb={0.5}>
                        View Student Performance
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Check detailed analytics
                      </Typography>
                    </Box>
                    <Assessment fontSize="small" sx={{ color: '#f59e0b' }} />
                  </Box>
                </ButtonBase>
                <ButtonBase
                  onClick={() => handleQuickAction('Attendance')}
                  sx={{
                    display: 'block',
                    p: 2,
                    textAlign: 'left',
                    bgcolor: '#f5f3ff',
                    borderRadius: 2,
                    borderLeft: '4px solid #8b5cf6',
                    '&:hover': { bgcolor: '#ede9fe' },
                  }}
                >
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="body2" fontWeight="bold" mb={0.5}>
                        Upload Attendance
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Mark daily attendance
                      </Typography>
                    </Box>
                    <ChevronRight fontSize="small" sx={{ color: '#8b5cf6' }} />
                  </Box>
                </ButtonBase>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  )
}

export default TeacherDashboard
