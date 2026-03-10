import React, { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  LinearProgress,
  Button,
} from '@mui/material'
import {
  Timer,
  CheckCircle,
  People,
  Grade as GradeIcon,
  Psychology as PsychologyIcon,
  MenuBook as MenuBookIcon,
  Assignment as AssignmentIcon,
  FolderOpen as FolderOpenIcon,
  Chat as ChatIcon,
  SmartToy as SmartToyIcon,
  Settings as SettingsIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import {
  getPredictedScore,
  getStudentDashboardMetrics,
  getSchemaAssignments,
  getMyAssignmentSubmissions,
  StudentDashboardMetrics,
  type SchemaSubjectAssignment,
  type MySubmissionItem,
} from '../../lib/api'
import RunningTime from '../../components/RunningTime'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

export interface StudentDashboardProps {
  onSelectPage?: (page: string) => void
}

const shortcutItems = [
  { label: 'Performance Predictor', page: 'Performance Predictor', icon: <PsychologyIcon />, color: '#7c3aed' },
  { label: 'Modules', page: 'Modules', icon: <MenuBookIcon />, color: '#0d9488' },
  { label: 'Assessments', page: 'Assessments', icon: <AssignmentIcon />, color: '#b45309' },
  { label: 'My Results', page: 'My Results', icon: <GradeIcon />, color: '#059669' },
  { label: 'Study Resources', page: 'Study Resources', icon: <FolderOpenIcon />, color: '#1e3a8a' },
  { label: 'Chat', page: 'Chat', icon: <ChatIcon />, color: '#6366f1' },
  { label: 'Chatbot Support', page: 'Chatbot Support', icon: <SmartToyIcon />, color: '#0891b2' },
  { label: 'Profile & Settings', page: 'Profile & Settings', icon: <SettingsIcon />, color: '#6b7280' },
]

const STUDY_HOURS_GOAL = 40 // optional monthly goal for progress bar

const StudentDashboard = (props: StudentDashboardProps): React.ReactElement => {
  const { onSelectPage } = props
  const [predicted, setPredicted] = useState<number | null>(null)
  const [metrics, setMetrics] = useState<StudentDashboardMetrics | null>(null)
  const [assignments, setAssignments] = useState<SchemaSubjectAssignment[]>([])
  const [submissions, setSubmissions] = useState<MySubmissionItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)
        const [predictedScore, dashboardMetrics, assignmentsData, submissionsData] = await Promise.all([
          getPredictedScore({ attendanceRate: 0.9, avgAssignmentScore: 78, pastExamAvg: 74, engagementScore: 0.7 }).catch(() => 86),
          getStudentDashboardMetrics(),
          getSchemaAssignments(),
          getMyAssignmentSubmissions(),
        ])
        setPredicted(predictedScore)
        setMetrics(dashboardMetrics)
        setAssignments(Array.isArray(assignmentsData) ? assignmentsData : [])
        setSubmissions(Array.isArray(submissionsData) ? submissionsData : [])
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
        setPredicted(86)
        setMetrics({
          study_hours: 24.5,
          attendance_percentage: 89.2,
          class_participation: 85.7,
          total_score: 87.8,
          grade: 'A'
        })
        setAssignments([])
        setSubmissions([])
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  const pendingAssignments = useMemo(() => {
    const submittedIds = new Set((submissions || []).map((s) => s.assignment_id))
    return (assignments || [])
      .filter((a) => !submittedIds.has(a.id))
      .sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0
        const db = b.created_at ? new Date(b.created_at).getTime() : 0
        return db - da
      })
      .slice(0, 5)
  }, [assignments, submissions])

  const stats = useMemo(() => {
    if (!metrics) return []

    return [
      {
        title: 'Total Score',
        value: `${metrics.total_score}%`,
        change: `Grade: ${metrics.grade}`,
        icon: <GradeIcon />,
        color: '#10b981',
      },
      {
        title: 'Study Hours',
        value: `${metrics.study_hours}h`,
        change: 'This month',
        icon: <Timer />,
        color: '#f59e0b',
      },
      {
        title: 'Attendance',
        value: `${metrics.attendance_percentage}%`,
        change: 'Last 30 days',
        icon: <CheckCircle />,
        color: '#3b82f6',
      },
      {
        title: 'Class Participation',
        value: `${metrics.class_participation}%`,
        change: 'Active engagement',
        icon: <People />,
        color: '#8b5cf6',
      },
    ]
  }, [metrics])

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Header */}
      <Box
        sx={{
          mb: 3,
          pb: 3,
          borderBottom: `1px solid ${THEME.primaryBorder}`,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h5"
            fontWeight="700"
            sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}
          >
            Student Dashboard
          </Typography>
          <Typography variant="body2" sx={{ color: THEME.muted }}>
            Your progress, stats and quick links
          </Typography>
        </Box>
        <RunningTime sx={{ color: THEME.muted, flexShrink: 0 }} />
      </Box>

      {/* Shortcuts */}
      {onSelectPage && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle2" fontWeight="600" sx={{ color: THEME.muted, mb: 1.5 }}>
            Shortcuts
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(8, 1fr)' },
              gap: 1.5,
            }}
          >
            {shortcutItems.map((item, index) => (
              <motion.div
                key={item.page}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 + index * 0.04 }}
              >
                <Card
                  elevation={0}
                  onClick={() => onSelectPage(item.page)}
                  sx={{
                    border: `1px solid ${THEME.primaryBorder}`,
                    borderRadius: 0,
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      borderColor: item.color,
                      boxShadow: `0 2px 8px ${item.color}20`,
                    },
                  }}
                >
                  <CardContent sx={{ py: 1.5, px: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 0,
                        backgroundColor: THEME.primaryLight,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: item.color,
                        mb: 1,
                      }}
                    >
                      {item.icon}
                    </Box>
                    <Typography variant="caption" fontWeight="600" sx={{ color: THEME.textDark }}>
                      {item.label}
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </Box>
        </Box>
      )}

      {/* Stats Cards */}
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
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
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
                        color: stat.color,
                      }}
                    >
                      {stat.icon}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </Box>
      )}

      {/* Study hours highlight & New assignments – two columns on md+ */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2.5,
          mb: 4,
        }}
      >
        {/* Study hours card */}
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
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 0,
                  backgroundColor: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f59e0b',
                }}
              >
                <Timer />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight="700" sx={{ color: THEME.textDark }}>
                  Study Hours
                </Typography>
                <Typography variant="body2" sx={{ color: THEME.muted }}>
                  This month
                </Typography>
              </Box>
            </Box>
            {loading ? (
              <CircularProgress size={24} sx={{ color: THEME.primary }} />
            ) : (
              <>
                <Typography variant="h4" fontWeight="700" sx={{ color: '#f59e0b', mb: 1 }}>
                  {metrics ? `${metrics.study_hours}h` : '—'}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={metrics ? Math.min(100, (metrics.study_hours / STUDY_HOURS_GOAL) * 100) : 0}
                  sx={{
                    height: 8,
                    borderRadius: 0,
                    backgroundColor: THEME.primaryBorder,
                    '& .MuiLinearProgress-bar': { backgroundColor: '#f59e0b', borderRadius: 0 },
                  }}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* New / Pending assignments */}
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
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 0,
                    backgroundColor: THEME.primaryLight,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: THEME.primary,
                  }}
                >
                  <AssignmentIcon />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight="700" sx={{ color: THEME.textDark }}>
                    New Assignments
                  </Typography>
                  <Typography variant="body2" sx={{ color: THEME.muted }}>
                    Pending submission
                  </Typography>
                </Box>
              </Box>
              {onSelectPage && (
                <Button
                  size="small"
                  endIcon={<ChevronRightIcon />}
                  onClick={() => onSelectPage('Assessments')}
                  sx={{
                    color: THEME.primary,
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': { backgroundColor: THEME.primaryLight },
                  }}
                >
                  View all
                </Button>
              )}
            </Box>
            {loading ? (
              <Box display="flex" justifyContent="center" py={2}>
                <CircularProgress size={24} sx={{ color: THEME.primary }} />
              </Box>
            ) : pendingAssignments.length === 0 ? (
              <Typography variant="body2" sx={{ color: THEME.muted }}>
                No pending assignments. You’re all caught up!
              </Typography>
            ) : (
              <Box component="ul" sx={{ m: 0, pl: 2.5, listStyle: 'none' }}>
                {pendingAssignments.map((a) => (
                  <Box
                    component="li"
                    key={a.id}
                    sx={{
                      py: 1.25,
                      borderBottom: `1px solid ${THEME.primaryBorder}`,
                      '&:last-child': { borderBottom: 'none' },
                    }}
                  >
                    <Typography variant="body2" fontWeight="600" sx={{ color: THEME.textDark }}>
                      {a.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: THEME.muted }}>
                      {a.subject_name} · Max {a.max_marks} marks
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}

export default StudentDashboard
export type { StudentDashboardProps }
