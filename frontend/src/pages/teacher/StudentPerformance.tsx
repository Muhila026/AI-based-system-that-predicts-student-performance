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
  Avatar,
  CircularProgress,
  Alert,
} from '@mui/material'
import { Search } from '@mui/icons-material'
import { getTeacherStudentPerformance, type TeacherStudentPerformanceItem } from '../../lib/api'

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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="320px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" mb={1}>
        Student Performance Analytics
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Track individual student progress from assignment scores and attendance
      </Typography>

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Search Bar */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            placeholder="Search by student name, ID, email, or class..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <Box
        display="grid"
        gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }}
        gap={2}
        mb={3}
      >
        <Card sx={{ bgcolor: '#f0f9ff', border: '1px solid #bae6fd' }}>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" color="#0369a1">
              {totalStudents}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Students
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" color="#15803d">
              {performingWell}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Performing Well
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ bgcolor: '#fffbeb', border: '1px solid #fde68a' }}>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" color="#92400e">
              {averageCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Average
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ bgcolor: '#fef2f2', border: '1px solid #fecaca' }}>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" color="#991b1b">
              {atRiskCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              At-Risk
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Student Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" mb={2}>
            Student Performance Details
          </Typography>
          {filteredStudents.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {students.length === 0
                ? 'No students in the system yet. Students appear here once they are registered and have assignment/attendance data.'
                : 'No students match your search.'}
            </Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <strong>Student</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Class</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Avg Score</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Attendance</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Assignments</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Status</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Action</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id} sx={{ '&:hover': { bgcolor: '#f9fafb' } }}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Avatar sx={{ bgcolor: '#6366f1', width: 32, height: 32 }}>
                            {student.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {student.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {student.id}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{student.class}</TableCell>
                      <TableCell>
                        <Chip
                          label={`${student.avgScore}%`}
                          size="small"
                          sx={{
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
                            fontWeight: 'bold',
                          }}
                        />
                      </TableCell>
                      <TableCell>{student.attendance}%</TableCell>
                      <TableCell>{student.assignments}</TableCell>
                      <TableCell>
                        <Chip
                          label={student.status}
                          size="small"
                          sx={{
                            bgcolor: getStatusColor(student.status).bg,
                            color: getStatusColor(student.status).color,
                            textTransform: 'capitalize',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="caption"
                          color="primary"
                          sx={{ cursor: 'pointer', fontWeight: 600 }}
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
