import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  CircularProgress,
  ButtonBase,
} from '@mui/material'
import {
  People,
  School,
  TrendingUp,
  Grade,
  Add,
  MenuBook,
  Assessment,
  ChevronRight,
  Assignment,
  EventNote,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import {
  getTeacherDashboard,
  getCourses,
  getTeacherAssignments,
} from '../../lib/api'
import type { AdminCourse } from '../../lib/api'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

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

const statConfig = [
  { title: 'Total Students', icon: <People />, color: THEME.primary },
  { title: 'Active Courses', icon: <School />, color: '#0d9488' },
  { title: 'Avg Performance', icon: <TrendingUp />, color: '#b45309' },
  { title: 'Pending Grading', icon: <Grade />, color: '#7c3aed' },
]

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
      const raw = statsRes as { stats?: DashboardStats[]; data?: { stats?: DashboardStats[] } }
      const stats = raw?.stats ?? raw?.data?.stats ?? []
      setDashboardData({ stats })
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

  const displayStats = dashboardData.stats.length > 0
    ? dashboardData.stats
    : [
        { title: 'Total Students', value: '—', change: '—' },
        { title: 'Active Courses', value: '—', change: '—' },
        { title: 'Avg Performance', value: '—', change: '—' },
        { title: 'Pending Grading', value: '—', change: '—' },
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
        }))
      : [{ activity: 'No assignments yet. Create one from Quick Actions.', time: '—' }]

  const classOverview = courses.map((c) => ({
    id: c.id ?? (c as any)._id ?? '',
    class: c.name || (c as any).code || (c as any).courseTitle || 'Unnamed Course',
    students: typeof c.students === 'number' ? c.students : parseInt(String((c as any).students ?? (c as any).totalEnrolledStudents ?? 0), 10) || 0,
    avgScore: 0,
    status: (c as any).status ?? 'Active',
  }))
  const activeCourses = classOverview.filter((c) => (c.status || 'Active').toLowerCase() !== 'inactive')
  const totalStudents = activeCourses.reduce((sum, c) => sum + c.students, 0)
  const classDistribution = activeCourses.map((cls) => ({
    type: cls.class,
    count: cls.students,
    percentage: totalStudents > 0 ? Math.round((cls.students / totalStudents) * 100) : 0,
  }))

  const handleQuickAction = (page: string) => {
    if (onSelectPage) onSelectPage(page)
  }

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Header — same style as Admin */}
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
          Teacher Dashboard
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          Welcome back, {teacherName}. Overview of your classes and student performance.
        </Typography>
      </Box>

      {/* Stats Cards — same style as Admin */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress sx={{ color: THEME.primary }} />
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 2.5,
            mb: 4,
          }}
        >
          {displayStats.map((stat, index) => {
            const config = statConfig[index % statConfig.length]
            const value = stat.title === 'Pending Grading' && pendingGradingCount > 0
              ? String(pendingGradingCount)
              : stat.value
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
                          {value}
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
      )}

      {/* Two columns — same layout as Admin */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
          gap: 2.5,
        }}
      >
        {/* Class Overview — same card style as Admin User Distribution */}
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
                Class Overview
              </Typography>
            </Box>
            {classDistribution.length === 0 ? (
              <Typography variant="body2" sx={{ color: THEME.muted }}>
                No courses assigned yet. Contact admin to get assigned to courses.
              </Typography>
            ) : (
              classDistribution.map((item, index) => {
                const colors = [THEME.primary, '#0d9488', '#b45309', '#7c3aed']
                const barColor = colors[index % colors.length]
                return (
                  <Box key={index} sx={{ mb: 2.5 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.75}>
                      <Typography variant="body2" fontWeight="600" sx={{ color: THEME.textDark }}>
                        {item.type}
                      </Typography>
                      <Typography variant="caption" sx={{ color: THEME.muted }}>
                        {item.count} students ({item.percentage}%)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={item.percentage}
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

        {/* Recent Assignments — same card style as Admin Recent Activities */}
        <Card
          elevation={0}
          sx={{
            border: `1px solid ${THEME.primaryBorder}`,
            borderRadius: 0,
            backgroundColor: '#fff',
          }}
        >
          <CardContent sx={{ py: 2.5, px: 2.5 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <Assignment sx={{ color: THEME.primary, fontSize: 22 }} />
                <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>
                  Recent Assignments
                </Typography>
              </Box>
              {assignments.length > 0 && (
                <ButtonBase
                  onClick={() => handleQuickAction('Assignments')}
                  sx={{ borderRadius: 0, p: 0.5 }}
                >
                  <Typography variant="body2" sx={{ color: THEME.primary, fontWeight: 600 }}>
                    View all
                  </Typography>
                  <ChevronRight fontSize="small" sx={{ color: THEME.primary }} />
                </ButtonBase>
              )}
            </Box>
            {recentActivities.map((item, index) => (
              <Box
                key={index}
                sx={{
                  py: 1.75,
                  borderBottom:
                    index < recentActivities.length - 1
                      ? `1px solid ${THEME.primaryBorder}`
                      : 'none',
                }}
              >
                <Typography variant="body2" fontWeight="500" sx={{ color: THEME.textDark }}>
                  {item.activity}
                </Typography>
                <Typography variant="caption" sx={{ color: THEME.muted }}>
                  {item.time}
                </Typography>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Box>

      {/* Quick Actions — same button style as Admin Add User */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="subtitle2" fontWeight="600" sx={{ color: THEME.textDark, mb: 1.5 }}>
          Quick Actions
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <ButtonBase
              onClick={() => handleQuickAction('Assignments')}
              sx={{
                px: 2,
                py: 1.5,
                borderRadius: 0,
                backgroundColor: THEME.primaryLight,
                border: `1px solid ${THEME.primaryBorder}`,
                '&:hover': { backgroundColor: '#DBEAFE' },
              }}
            >
              <Add sx={{ color: THEME.primary, mr: 1, fontSize: 20 }} />
              <Typography variant="body2" fontWeight="600" sx={{ color: THEME.primary }}>
                Assignments
              </Typography>
            </ButtonBase>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <ButtonBase
              onClick={() => handleQuickAction('Study Resources')}
              sx={{
                px: 2,
                py: 1.5,
                borderRadius: 0,
                backgroundColor: THEME.primaryLight,
                border: `1px solid ${THEME.primaryBorder}`,
                '&:hover': { backgroundColor: '#DBEAFE' },
              }}
            >
              <MenuBook sx={{ color: THEME.primary, mr: 1, fontSize: 20 }} />
              <Typography variant="body2" fontWeight="600" sx={{ color: THEME.primary }}>
                Study Resources
              </Typography>
            </ButtonBase>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <ButtonBase
              onClick={() => handleQuickAction('Student Performance')}
              sx={{
                px: 2,
                py: 1.5,
                borderRadius: 0,
                backgroundColor: THEME.primaryLight,
                border: `1px solid ${THEME.primaryBorder}`,
                '&:hover': { backgroundColor: '#DBEAFE' },
              }}
            >
              <Assessment sx={{ color: THEME.primary, mr: 1, fontSize: 20 }} />
              <Typography variant="body2" fontWeight="600" sx={{ color: THEME.primary }}>
                Student Performance
              </Typography>
            </ButtonBase>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <ButtonBase
              onClick={() => handleQuickAction('Attendance')}
              sx={{
                px: 2,
                py: 1.5,
                borderRadius: 0,
                backgroundColor: THEME.primaryLight,
                border: `1px solid ${THEME.primaryBorder}`,
                '&:hover': { backgroundColor: '#DBEAFE' },
              }}
            >
              <EventNote sx={{ color: THEME.primary, mr: 1, fontSize: 20 }} />
              <Typography variant="body2" fontWeight="600" sx={{ color: THEME.primary }}>
                Attendance
              </Typography>
            </ButtonBase>
          </motion.div>
        </Box>
      </Box>
    </Box>
  )
}

export default TeacherDashboard
