import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
} from '@mui/material'
import {
  Search,
  People,
  TrendingUp,
  WarningAmber,
  Assignment,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { getTeacherStudentPerformance, type TeacherStudentPerformanceItem } from '../../lib/api'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

const StudentPerformance: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [students, setStudents] = useState<TeacherStudentPerformanceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getTeacherStudentPerformance()
        setStudents(Array.isArray(data) ? data : [])
      } catch (e: any) {
        setError(e.message || 'Failed to load student performance')
        setStudents([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return { bg: '#dcfce7', color: '#15803d' }
      case 'good':
        return { bg: '#dbeafe', color: '#1e40af' }
      case 'average':
        return { bg: '#fef3c7', color: '#92400e' }
      case 'at-risk':
        return { bg: '#fee2e2', color: '#991b1b' }
      default:
        return { bg: '#f3f4f6', color: '#374151' }
    }
  }

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.class && student.class.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const totalStudents = students.length
  const performingWell = students.filter((s) => s.status === 'excellent' || s.status === 'good').length
  const averageCount = students.filter((s) => s.status === 'average').length
  const atRiskCount = students.filter((s) => s.status === 'at-risk').length

  const summaryStats = [
    { title: 'Total Students', value: totalStudents, icon: <People />, color: THEME.primary },
    { title: 'Performing Well', value: performingWell, icon: <TrendingUp />, color: '#0d9488' },
    { title: 'Average', value: averageCount, icon: <Assignment />, color: '#b45309' },
    { title: 'At-Risk', value: atRiskCount, icon: <WarningAmber />, color: '#991b1b' },
  ]

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="320px">
        <CircularProgress sx={{ color: THEME.primary }} />
      </Box>
    )
  }

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Header — same style as Admin / Teacher Dashboard */}
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
          Student Performance Analytics
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          Track individual student progress from assignment scores and attendance
        </Typography>
      </Box>

      {error && (
        <Alert
          severity="warning"
          sx={{ mb: 2.5, borderRadius: 0, border: `1px solid ${THEME.primaryBorder}` }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Search — same card style as Admin */}
      <Card
        elevation={0}
        sx={{
          border: `1px solid ${THEME.primaryBorder}`,
          borderRadius: 0,
          backgroundColor: '#fff',
          mb: 2.5,
        }}
      >
        <CardContent sx={{ py: 2, px: 2.5 }}>
          <TextField
            fullWidth
            placeholder="Search by student name, ID, email, or class..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: THEME.muted, fontSize: 20 }} />
                </InputAdornment>
              ),
              sx: {
                borderRadius: 0,
                backgroundColor: '#fff',
                '& fieldset': { borderColor: THEME.primaryBorder },
              },
            }}
          />
        </CardContent>
      </Card>

      {/* Performance Summary — same card style as Admin / Teacher Dashboard */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2.5,
          mb: 2.5,
        }}
      >
        {summaryStats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
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

      {/* Student Table — same card style */}
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
            <People sx={{ color: THEME.primary, fontSize: 22 }} />
            <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>
              Student Performance Details
            </Typography>
          </Box>
          {filteredStudents.length === 0 ? (
            <Typography variant="body2" sx={{ color: THEME.muted }}>
              {students.length === 0
                ? 'No students in the system yet. Students appear here once they are registered and have assignment/attendance data.'
                : 'No students match your search.'}
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ borderBottom: `2px solid ${THEME.primaryBorder}` }}>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark, py: 1.5 }}>
                      Student
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark, py: 1.5 }}>
                      Class
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark, py: 1.5 }}>
                      Avg Score
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark, py: 1.5 }}>
                      Attendance
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark, py: 1.5 }}>
                      Assignments
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark, py: 1.5 }}>
                      Status
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark, py: 1.5 }}>
                      Action
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredStudents.map((student, index) => (
                    <TableRow
                      key={student.id}
                      sx={{
                        borderBottom: `1px solid ${THEME.primaryBorder}`,
                        '&:hover': { backgroundColor: THEME.primaryLight },
                      }}
                    >
                      <TableCell sx={{ py: 1.5 }}>
                        <Box display="flex" alignItems="center" gap={1.5}>
                          <Box
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: 0,
                              backgroundColor: THEME.primaryLight,
                              color: THEME.primary,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.9rem',
                            }}
                          >
                            {student.name.charAt(0).toUpperCase()}
                          </Box>
                          <Box>
                            <Typography variant="body2" fontWeight="600" sx={{ color: THEME.textDark }}>
                              {student.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: THEME.muted }}>
                              {student.id}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: THEME.textDark, py: 1.5 }}>{student.class}</TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Chip
                          label={`${student.avgScore}%`}
                          size="small"
                          sx={{
                            borderRadius: 0,
                            fontWeight: 600,
                            bgcolor:
                              student.avgScore >= 80
                                ? '#dcfce7'
                                : student.avgScore >= 60
                                  ? '#fef3c7'
                                  : '#fee2e2',
                            color:
                              student.avgScore >= 80
                                ? '#15803d'
                                : student.avgScore >= 60
                                  ? '#92400e'
                                  : '#991b1b',
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: THEME.textDark, py: 1.5 }}>{student.attendance}%</TableCell>
                      <TableCell sx={{ color: THEME.textDark, py: 1.5 }}>{student.assignments}</TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Chip
                          label={student.status}
                          size="small"
                          sx={{
                            borderRadius: 0,
                            bgcolor: getStatusColor(student.status).bg,
                            color: getStatusColor(student.status).color,
                            textTransform: 'capitalize',
                            fontWeight: 500,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: THEME.primary,
                            fontWeight: 600,
                            cursor: 'pointer',
                            '&:hover': { textDecoration: 'underline' },
                          }}
                        >
                          View Details
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}

export default StudentPerformance
