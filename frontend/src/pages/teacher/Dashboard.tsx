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
  getTeacherMySubjects,
  getTeacherAssignments,
  getTeacherStudentPerformance,
  getSchemaStudentSubjects,
} from '../../lib/api'
import type {
  TeacherSubjectWithName,
  TeacherStudentPerformanceItem,
  SchemaStudentSubject,
} from '../../lib/api'

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
  /** Aligned with My Subjects: count = teacher_subjects rows (same as subject list). */
  { title: 'Subjects', icon: <School />, color: '#0d9488' },
  { title: 'Avg Performance', icon: <TrendingUp />, color: '#b45309' },
  { title: 'Pending Grading', icon: <Grade />, color: '#7c3aed' },
]

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onSelectPage }) => {
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<DashboardData>({ stats: [] })
  /** Teacher's assigned subjects (same source as My Subjects / Assessments). */
  const [mySubjects, setMySubjects] = useState<TeacherSubjectWithName[]>([])
  /** Class Overview bars: subject name + enrolled count + percentage of total. */
  const [classDistribution, setClassDistribution] = useState<
    { type: string; count: number; percentage: number }[]
  >([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [studentPerf, setStudentPerf] = useState<TeacherStudentPerformanceItem[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      // Each call isolated so one failure does not throw and wipe the whole dashboard
      const [subjectsRes, assignmentsRes, perfRes, studentSubjectsRes] = await Promise.all([
        getTeacherMySubjects().catch(() => [] as TeacherSubjectWithName[]),
        getTeacherAssignments().catch(() => [] as any[]),
        getTeacherStudentPerformance().catch(() => [] as TeacherStudentPerformanceItem[]),
        getSchemaStudentSubjects().catch(() => [] as SchemaStudentSubject[]),
      ])

      const subjectsArr = Array.isArray(subjectsRes) ? subjectsRes : []
      const assignmentsArr = Array.isArray(assignmentsRes) ? assignmentsRes : []
      const perfArr = Array.isArray(perfRes) ? perfRes : []
      const studentSubjectsArr = Array.isArray(studentSubjectsRes) ? studentSubjectsRes : []

      // subject_id -> set of student_id (enrollment per subject from student_subjects)
      const subjectStudentMap: Record<string, Set<number>> = {}
      studentSubjectsArr.forEach((record) => {
        const subjectId = String(record.subject_id ?? '').trim()
        const studentIdNum = Number(record.student_id)
        if (!subjectId || Number.isNaN(studentIdNum)) return
        if (!subjectStudentMap[subjectId]) subjectStudentMap[subjectId] = new Set()
        subjectStudentMap[subjectId].add(studentIdNum)
      })
      // Subjects count = same as My Subjects (teacher_subjects rows)
      const subjectsCount = subjectsArr.length

      // Total students = unique students enrolled in any of the teacher's subjects
      const teacherSubjectIds = new Set(
        subjectsArr.map((s) => String(s.subject_id ?? '').trim()).filter(Boolean)
      )
      const uniqueStudentIds = new Set<number>()
      teacherSubjectIds.forEach((subjectId) => {
        const set = subjectStudentMap[subjectId]
        if (set) set.forEach((id) => uniqueStudentIds.add(id))
      })
      const totalStudentsInSubjects = uniqueStudentIds.size

      // Class Overview: distribution by subject (enrollment from student_subjects)
      let distribution: { type: string; count: number; percentage: number }[] = []
      if (subjectsArr.length > 0) {
        const rows = subjectsArr.map((s) => {
          const subjectId = String(s.subject_id ?? '').trim()
          const count =
            subjectId && subjectStudentMap[subjectId] ? subjectStudentMap[subjectId].size : 0
          return {
            type: s.subject_name || subjectId || 'Unnamed subject',
            count,
          }
        })
        const total = rows.reduce((sum, r) => sum + r.count, 0)
        distribution = rows.map((r) => ({
          type: r.type,
          count: r.count,
          percentage: total > 0 ? Math.round((r.count / total) * 100) : 0,
        }))
      }
      setClassDistribution(distribution)

      const pendingGradingCount = assignmentsArr.filter(
        (a) =>
          (a.submitted ?? 0) > (a.graded ?? 0) ||
          (a.status && String(a.status).toLowerCase() === 'active')
      ).length

      const avgPerformance =
        perfArr.length > 0
          ? perfArr.reduce((sum, s) => {
              const score = s.totalScore ?? s.avgScore ?? 0
              return sum + (typeof score === 'number' ? score : 0)
            }, 0) / perfArr.length
          : 0

      // Total students: prefer enrollment in your subjects; fallback to performance list length
      const totalStudentsValue =
        totalStudentsInSubjects > 0
          ? totalStudentsInSubjects
          : perfArr.length > 0
            ? perfArr.length
            : 0

      const stats: DashboardStats[] = [
        {
          title: 'Total Students',
          value: String(totalStudentsValue),
          change:
            totalStudentsInSubjects > 0
              ? 'Unique students enrolled in your subjects'
              : perfArr.length > 0
                ? 'Students with performance records'
                : 'No students yet — assign subjects and enrollments',
        },
        {
          title: 'Subjects',
          value: String(subjectsCount),
          change: 'Subjects assigned to you (My Subjects)',
        },
        {
          title: 'Avg Performance',
          value:
            perfArr.length > 0
              ? `${avgPerformance.toFixed(1).replace(/\.0$/, '')}%`
              : '—',
          change:
            perfArr.length > 0
              ? 'Average total score of your students'
              : 'No performance data yet',
        },
        {
          title: 'Pending Grading',
          value: String(pendingGradingCount),
          change: 'Assignments that still need grading',
        },
      ]

      setDashboardData({ stats })
      setMySubjects(subjectsArr)
      setAssignments(assignmentsArr)
      setStudentPerf(perfArr)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      setDashboardData({
        stats: [
          { title: 'Total Students', value: '—', change: '—' },
          { title: 'Subjects', value: '—', change: '—' },
          { title: 'Avg Performance', value: '—', change: '—' },
          { title: 'Pending Grading', value: '—', change: '—' },
        ],
      })
      setMySubjects([])
      setClassDistribution([])
      setAssignments([])
    } finally {
      setLoading(false)
    }
  }

  const displayStats = dashboardData.stats.length > 0
    ? dashboardData.stats
    : [
        { title: 'Total Students', value: '—', change: '—' },
        { title: 'Subjects', value: '—', change: '—' },
        { title: 'Avg Performance', value: '—', change: '—' },
        { title: 'Pending Grading', value: '—', change: '—' },
      ]

  const pendingGradingCount = assignments.filter(
    (a) => (a.submitted ?? 0) > (a.graded ?? 0) || (a.status && a.status.toLowerCase() === 'active')
  ).length

  const recentActivities =
    assignments.length > 0
      ? assignments.slice(0, 5).map((a) => {
          const title = (a.title || 'Untitled').trim()
          const subject = a.subject ? ` (${a.subject})` : ''
          const submitted = a.submitted ?? 0
          const total = a.students ?? 0
          const count = total > 0 ? `${submitted}/${total}` : '—'
          return {
            title: `${title}${subject}`,
            count,
            due: a.dueDate ? `Due ${a.dueDate}` : null,
          }
        })
      : []

  const handleQuickAction = (page: string) => {
    if (onSelectPage) onSelectPage(page)
  }

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
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
          Overview of your classes and performance.
        </Typography>
      </Box>

      {/* Stats */}
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

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
          gap: 2.5,
        }}
        >
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
                No subjects assigned. Open My Subjects or contact admin to assign subjects.
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
                  Recent Assessments
                </Typography>
              </Box>
              {assignments.length > 0 && (
                <ButtonBase
                  onClick={() => handleQuickAction('Assessments')}
                  sx={{ borderRadius: 0, p: 0.5 }}
                >
                  <Typography variant="body2" sx={{ color: THEME.primary, fontWeight: 600 }}>
                    View all
                  </Typography>
                  <ChevronRight fontSize="small" sx={{ color: THEME.primary }} />
                </ButtonBase>
              )}
            </Box>
            {recentActivities.length === 0 ? (
              <Typography variant="body2" sx={{ color: THEME.muted }}>
                No assignments yet.
              </Typography>
            ) : (
              recentActivities.map((item, index) => (
                <Box
                  key={index}
                  sx={{
                    py: 1.5,
                    borderBottom:
                      index < recentActivities.length - 1
                        ? `1px solid ${THEME.primaryBorder}`
                        : 'none',
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
                    <Typography
                      variant="body2"
                      fontWeight="500"
                      sx={{
                        color: THEME.textDark,
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: THEME.muted, flexShrink: 0 }}>
                      {item.count}
                    </Typography>
                  </Box>
                  {item.due && (
                    <Typography variant="caption" sx={{ color: THEME.muted, display: 'block', mt: 0.25 }}>
                      {item.due}
                    </Typography>
                  )}
                </Box>
              ))
            )}
          </CardContent>
        </Card>
      </Box>

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
              onClick={() => handleQuickAction('Assessments')}
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
                Assessments
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
