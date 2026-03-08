import React, { useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Avatar,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material'
import CenteredMessage from '../../components/CenteredMessage'
import { Add, Edit, Delete, CheckCircle, Cancel, Schedule, Check } from '@mui/icons-material'
import { motion } from 'framer-motion'
import { getStudents, AdminUser } from '../../lib/api'

interface AttendanceRecord {
  id: string
  studentId: string
  studentName: string
  studentEmail: string
  date: string
  status: 'present' | 'absent' | 'late' | 'excused'
  subject?: string
  class_name?: string
  notes?: string
}

const Attendance: React.FC = () => {
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [students, setStudents] = useState<AdminUser[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [openDialog, setOpenDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })
  const [studentAttendance, setStudentAttendance] = useState<Record<string, 'present' | 'absent' | 'late' | 'excused'>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})

  useEffect(() => {
    loadStudents()
    loadAttendance()
  }, [attendanceDate, selectedSubject, selectedClass])

  const loadStudents = async () => {
    try {
      setLoadingStudents(true)
      const allStudents = await getStudents()
      setStudents(allStudents)
      // Initialize attendance status
      const initialStatus: Record<string, 'present' | 'absent' | 'late' | 'excused'> = {}
      allStudents.forEach((student) => {
        initialStatus[student.email] = 'present'
      })
      setStudentAttendance(initialStatus)
    } catch (error) {
      console.error('Failed to load students:', error)
      setSnackbar({
        open: true,
        message: 'Failed to load students',
        severity: 'error',
      })
    } finally {
      setLoadingStudents(false)
    }
  }

  const loadAttendance = async () => {
    try {
      setLoading(true)
      // Try sessionStorage first, fallback to localStorage for migration
      let token = sessionStorage.getItem('user')
      if (!token) {
        token = localStorage.getItem('user')
      }
      if (!token) return

      const user = JSON.parse(token)
      const role = user.role

      let endpoint = '/teachers/attendance'
      const params = new URLSearchParams()
      if (attendanceDate) params.append('date', attendanceDate)
      if (selectedSubject) params.append('subject', selectedSubject)
      if (selectedClass) params.append('class_name', selectedClass)

      if (params.toString()) {
        endpoint += `?${params.toString()}`
      }

      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setAttendanceRecords(data)
        // Update student attendance status from records
        const statusMap: Record<string, 'present' | 'absent' | 'late' | 'excused'> = {}
        data.forEach((record: AttendanceRecord) => {
          statusMap[record.studentEmail] = record.status
        })
        setStudentAttendance((prev) => ({ ...prev, ...statusMap }))
      }
    } catch (error) {
      console.error('Failed to load attendance:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAttendance = async () => {
    try {
      // Try sessionStorage first, fallback to localStorage for migration
      let token = sessionStorage.getItem('user')
      if (!token) {
        token = localStorage.getItem('user')
      }
      if (!token) return

      const user = JSON.parse(token)
      const records = students.map((student) => ({
        studentId: student.id?.toString() || student.email,
        studentName: student.name,
        studentEmail: student.email,
        status: studentAttendance[student.email] || 'absent',
        notes: notes[student.email] || undefined,
      }))

      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
      const response = await fetch(`${API_BASE_URL}/teachers/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          date: attendanceDate,
          subject: selectedSubject || undefined,
          class_name: selectedClass || undefined,
          records,
        }),
      })

      if (response.ok) {
        setSnackbar({ open: true, message: 'Attendance marked successfully', severity: 'success' })
        setOpenDialog(false)
        await loadAttendance()
      } else {
        const error = await response.json().catch(() => ({ detail: 'Failed to mark attendance' }))
        throw new Error(error.detail || 'Failed to mark attendance')
      }
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || 'Failed to mark attendance',
        severity: 'error',
      })
    }
  }

  const handleUpdateStatus = async (recordId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    try {
      // Try sessionStorage first, fallback to localStorage for migration
      let token = sessionStorage.getItem('user')
      if (!token) {
        token = localStorage.getItem('user')
      }
      if (!token) return

      const user = JSON.parse(token)
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
      const response = await fetch(`${API_BASE_URL}/teachers/attendance/${recordId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        setSnackbar({ open: true, message: 'Attendance updated successfully', severity: 'success' })
        await loadAttendance()
      } else {
        throw new Error('Failed to update attendance')
      }
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || 'Failed to update attendance',
        severity: 'error',
      })
    }
  }

  const handleDelete = async (recordId: string) => {
    if (!window.confirm('Are you sure you want to delete this attendance record?')) {
      return
    }

    try {
      // Try sessionStorage first, fallback to localStorage for migration
      let token = sessionStorage.getItem('user')
      if (!token) {
        token = localStorage.getItem('user')
      }
      if (!token) return

      const user = JSON.parse(token)
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
      const response = await fetch(`${API_BASE_URL}/teachers/attendance/${recordId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      })

      if (response.ok) {
        setSnackbar({ open: true, message: 'Attendance record deleted successfully', severity: 'success' })
        await loadAttendance()
      } else {
        throw new Error('Failed to delete attendance record')
      }
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || 'Failed to delete attendance record',
        severity: 'error',
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return { bg: '#dcfce7', color: '#15803d' }
      case 'absent':
        return { bg: '#fee2e2', color: '#dc2626' }
      case 'late':
        return { bg: '#fef3c7', color: '#d97706' }
      case 'excused':
        return { bg: '#e0e7ff', color: '#4338ca' }
      default:
        return { bg: '#f3f4f6', color: '#6b7280' }
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle sx={{ fontSize: 18 }} />
      case 'absent':
        return <Cancel sx={{ fontSize: 18 }} />
      case 'late':
        return <Schedule sx={{ fontSize: 18 }} />
      case 'excused':
        return <Check sx={{ fontSize: 18 }} />
      default:
        return null
    }
  }

  const presentCount = attendanceRecords.filter((r) => r.status === 'present').length
  const absentCount = attendanceRecords.filter((r) => r.status === 'absent').length
  const lateCount = attendanceRecords.filter((r) => r.status === 'late').length
  const excusedCount = attendanceRecords.filter((r) => r.status === 'excused').length

  return (
    <Box>
      <CenteredMessage
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        autoHideDuration={6000}
      />

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Attendance Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Mark and manage student attendance
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
          sx={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          }}
        >
          Mark Attendance
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(3, 1fr)' }} gap={2}>
            <TextField
              fullWidth
              label="Date"
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="Subject"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              placeholder="Optional"
            />
            <TextField
              fullWidth
              label="Class"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              placeholder="Optional"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Stats */}
      <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(4, 1fr)' }} gap={2} mb={3}>
        <Card>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" color="#15803d">
              {presentCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">Present</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" color="#dc2626">
              {absentCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">Absent</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" color="#d97706">
              {lateCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">Late</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" color="#4338ca">
              {excusedCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">Excused</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Attendance Table */}
      <Card>
        <CardContent>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : attendanceRecords.length === 0 ? (
            <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
              No attendance records found for the selected date
            </Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Student</strong></TableCell>
                    <TableCell><strong>Date</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Subject</strong></TableCell>
                    <TableCell><strong>Class</strong></TableCell>
                    <TableCell><strong>Notes</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attendanceRecords.map((record) => {
                    const statusColor = getStatusColor(record.status)
                    return (
                      <TableRow key={record.id} sx={{ '&:hover': { bgcolor: '#f9fafb' } }}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={2}>
                            <Avatar sx={{ bgcolor: '#10b981', width: 32, height: 32 }}>
                              {record.studentName.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {record.studentName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {record.studentEmail}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Chip
                            icon={getStatusIcon(record.status)}
                            label={record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                            size="small"
                            sx={{
                              bgcolor: statusColor.bg,
                              color: statusColor.color,
                            }}
                          />
                        </TableCell>
                        <TableCell>{record.subject || '-'}</TableCell>
                        <TableCell>{record.class_name || '-'}</TableCell>
                        <TableCell>{record.notes || '-'}</TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            <FormControl size="small" sx={{ minWidth: 100 }}>
                              <Select
                                value={record.status}
                                onChange={(e) => handleUpdateStatus(record.id, e.target.value as any)}
                                sx={{ fontSize: '0.875rem' }}
                              >
                                <MenuItem value="present">Present</MenuItem>
                                <MenuItem value="absent">Absent</MenuItem>
                                <MenuItem value="late">Late</MenuItem>
                                <MenuItem value="excused">Excused</MenuItem>
                              </Select>
                            </FormControl>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(record.id)}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Mark Attendance Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            Mark Attendance - {new Date(attendanceDate).toLocaleDateString()}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {loadingStudents ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : (
            <Box display="grid" gap={2} mt={2}>
              <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, 1fr)' }} gap={2}>
                <TextField
                  fullWidth
                  label="Subject"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  placeholder="Optional"
                />
                <TextField
                  fullWidth
                  label="Class"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  placeholder="Optional"
                />
              </Box>
              <Box sx={{ maxHeight: 400, overflowY: 'auto', mt: 2 }}>
                {students.map((student) => (
                  <Card key={student.id} sx={{ mb: 2 }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                        <Box display="flex" alignItems="center" gap={2} flex={1}>
                          <Avatar sx={{ bgcolor: '#10b981', width: 40, height: 40 }}>
                            {student.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {student.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {student.email}
                            </Typography>
                          </Box>
                        </Box>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <Select
                            value={studentAttendance[student.email] || 'present'}
                            onChange={(e) =>
                              setStudentAttendance({
                                ...studentAttendance,
                                [student.email]: e.target.value as any,
                              })
                            }
                          >
                            <MenuItem value="present">Present</MenuItem>
                            <MenuItem value="absent">Absent</MenuItem>
                            <MenuItem value="late">Late</MenuItem>
                            <MenuItem value="excused">Excused</MenuItem>
                          </Select>
                        </FormControl>
                        <TextField
                          size="small"
                          placeholder="Notes (optional)"
                          value={notes[student.email] || ''}
                          onChange={(e) =>
                            setNotes({
                              ...notes,
                              [student.email]: e.target.value,
                            })
                          }
                          sx={{ minWidth: 150 }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleMarkAttendance}>
            Mark Attendance
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Attendance

