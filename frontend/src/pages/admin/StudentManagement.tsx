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
  IconButton,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  CircularProgress,
  Alert,
} from '@mui/material'
import CenteredMessage from '../../components/CenteredMessage'
import { Add, Edit, Delete, Search, Visibility, VisibilityOff } from '@mui/icons-material'
import { getStudents, addStudent, deleteStudent, getStudentDetails, AdminUser, StudentDetail } from '../../lib/api'

const StudentManagement: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [openDialog, setOpenDialog] = useState(false)
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<AdminUser[]>([])
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })

  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    password: '',
  })
  const [showAddStudentPassword, setShowAddStudentPassword] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [selectedStudentEmail, setSelectedStudentEmail] = useState<string>('')
  const [studentDetails, setStudentDetails] = useState<StudentDetail | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  useEffect(() => {
    loadStudents()
  }, [])

  const loadStudents = async () => {
    try {
      setLoading(true)
      const allUsers = await getStudents()
      setStudents(allUsers)
    } catch (error) {
      console.error('Failed to load students:', error)
      setSnackbar({
        open: true,
        message: 'Failed to load students',
        severity: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredStudents = students.filter((student) =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.name.trim()) {
      setSnackbar({ open: true, message: 'Name is required', severity: 'error' })
      return
    }
    if (!newStudent.email || !newStudent.email.trim()) {
      setSnackbar({ open: true, message: 'Email is required', severity: 'error' })
      return
    }
    if (!newStudent.password || newStudent.password.length < 6) {
      setSnackbar({ open: true, message: 'Password must be at least 6 characters', severity: 'error' })
      return
    }

    try {
      await addStudent({
        name: newStudent.name.trim(),
        email: newStudent.email.trim().toLowerCase(),
        role: 'Student',
        status: 'Active',
        password: newStudent.password,
      })
      setSnackbar({ open: true, message: 'Student added successfully', severity: 'success' })
      setOpenDialog(false)
      setNewStudent({ name: '', email: '', password: '' })
      await loadStudents()
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || 'Failed to add student',
        severity: 'error',
      })
    }
  }

  const handleViewDetails = async (email: string) => {
    setSelectedStudentEmail(email)
    setDetailsDialogOpen(true)
    setLoadingDetails(true)
    
    try {
      const details = await getStudentDetails(email)
      setStudentDetails(details)
    } catch (error) {
      console.error('Failed to load student details:', error)
      setSnackbar({
        open: true,
        message: 'Failed to load student details',
        severity: 'error',
      })
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleDelete = async (studentId: number | string) => {
    if (!window.confirm('Are you sure you want to delete this student?')) {
      return
    }

    try {
      await deleteStudent(studentId)
      setSnackbar({ open: true, message: 'Student deleted successfully', severity: 'success' })
      await loadStudents()
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || 'Failed to delete student',
        severity: 'error',
      })
    }
  }

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
            Student Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage all students in the system
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        >
          Add Student
        </Button>
      </Box>

      {/* Stats */}
      <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(3, 1fr)' }} gap={2} mb={3}>
        <Card>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" color="#15803d">
              {students.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Students
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" color="#15803d">
              {students.filter((s) => s.status === 'Active').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Active Students
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" color="#6b7280">
              {students.filter((s) => s.status === 'Inactive').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Inactive Students
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Search Bar */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            placeholder="Search by name or email..."
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

      {/* Students Table */}
      <Card>
        <CardContent>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : filteredStudents.length === 0 ? (
            <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
              No students found
            </Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Student</strong></TableCell>
                    <TableCell><strong>Email</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Joined Date</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id} sx={{ '&:hover': { bgcolor: '#f9fafb' } }}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Avatar sx={{ bgcolor: '#10b981', width: 32, height: 32 }}>
                            {student.name.charAt(0)}
                          </Avatar>
                          <Typography variant="body2" fontWeight={600}>
                            {student.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={student.status}
                          size="small"
                          sx={{
                            bgcolor: student.status === 'Active' ? '#dcfce7' : '#f3f4f6',
                            color: student.status === 'Active' ? '#15803d' : '#6b7280',
                          }}
                        />
                      </TableCell>
                      <TableCell>{student.joinedDate}</TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <IconButton
                            size="small"
                            color="info"
                            onClick={() => handleViewDetails(student.email)}
                            title="View Details"
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="primary">
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(student.id)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Add Student Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            Add New Student
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box display="grid" gap={3} mt={2}>
            <TextField
              fullWidth
              label="Full Name"
              value={newStudent.name}
              onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
            />
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={newStudent.email}
              onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
            />
            <TextField
              fullWidth
              label="Password"
              type={showAddStudentPassword ? 'text' : 'password'}
              value={newStudent.password}
              onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
              helperText="Password must be at least 6 characters"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showAddStudentPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowAddStudentPassword((v) => !v)}
                      edge="end"
                    >
                      {showAddStudentPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddStudent}>
            Add Student
          </Button>
        </DialogActions>
      </Dialog>

      {/* Student Details Dialog */}
      <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            Student Details {studentDetails?.name ? `- ${studentDetails.name}` : selectedStudentEmail ? `- ${selectedStudentEmail}` : ''}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {loadingDetails ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : studentDetails ? (
            <Box display="grid" gap={3} mt={2}>
              <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, 1fr)' }} gap={2}>
                {studentDetails.name && (
                  <TextField
                    fullWidth
                    label="Name"
                    value={studentDetails.name}
                    disabled
                  />
                )}
                <TextField
                  fullWidth
                  label="Email"
                  value={studentDetails.email}
                  disabled
                />
                <TextField
                  fullWidth
                  label="Student ID"
                  value={studentDetails.studentId || 'Not set'}
                  disabled
                />
                <TextField
                  fullWidth
                  label="Batch"
                  value={studentDetails.batch || 'Not set'}
                  disabled
                />
                <TextField
                  fullWidth
                  label="Program"
                  value={studentDetails.program || 'Not set'}
                  disabled
                />
                <TextField
                  fullWidth
                  label="Current Semester"
                  value={studentDetails.currentSemester || 'Not set'}
                  disabled
                />
                <TextField
                  fullWidth
                  label="Contact Number"
                  value={studentDetails.contactNumber || 'Not set'}
                  disabled
                />
              </Box>
              <TextField
                fullWidth
                label="Guardian Name"
                value={studentDetails.guardianName || 'Not set'}
                disabled
              />
              <TextField
                fullWidth
                label="Address"
                value={studentDetails.address || 'Not set'}
                disabled
                multiline
                rows={2}
              />
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
              No details available for this student
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default StudentManagement

