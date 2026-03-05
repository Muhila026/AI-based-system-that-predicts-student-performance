import React, { useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
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
  Snackbar,
  Button,
} from '@mui/material'
import { Search, Visibility, Email, Phone, Home, School, Person } from '@mui/icons-material'
import { getStudents, getStudentDetails, AdminUser, StudentDetail } from '../../lib/api'

const ManageStudents: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<AdminUser[]>([])
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })

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

  return (
    <Box>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Manage Students
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View and manage student information
          </Typography>
        </Box>
      </Box>

      {/* Stats */}
      <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(3, 1fr)' }} gap={2} mb={3}>
        <Card>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" color="#10b981">
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
                        <IconButton
                          size="small"
                          color="info"
                          onClick={() => handleViewDetails(student.email)}
                          title="View Details"
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Student Details Dialog */}
      <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: '#10b981', width: 48, height: 48 }}>
              {selectedStudentEmail && selectedStudentEmail.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Student Details
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {selectedStudentEmail}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {loadingDetails ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : studentDetails ? (
            <Box display="grid" gap={3} mt={2}>
              <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, 1fr)' }} gap={2}>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2} mb={1}>
                      <Email color="primary" />
                      <Typography variant="subtitle2" fontWeight="bold">Email</Typography>
                    </Box>
                    <Typography variant="body2">{studentDetails.email}</Typography>
                  </CardContent>
                </Card>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2} mb={1}>
                      <School color="primary" />
                      <Typography variant="subtitle2" fontWeight="bold">Student ID</Typography>
                    </Box>
                    <Typography variant="body2">{studentDetails.studentId || 'Not set'}</Typography>
                  </CardContent>
                </Card>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2} mb={1}>
                      <School color="primary" />
                      <Typography variant="subtitle2" fontWeight="bold">Batch</Typography>
                    </Box>
                    <Typography variant="body2">{studentDetails.batch || 'Not set'}</Typography>
                  </CardContent>
                </Card>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2} mb={1}>
                      <School color="primary" />
                      <Typography variant="subtitle2" fontWeight="bold">Program</Typography>
                    </Box>
                    <Typography variant="body2">{studentDetails.program || 'Not set'}</Typography>
                  </CardContent>
                </Card>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2} mb={1}>
                      <School color="primary" />
                      <Typography variant="subtitle2" fontWeight="bold">Current Semester</Typography>
                    </Box>
                    <Typography variant="body2">{studentDetails.currentSemester || 'Not set'}</Typography>
                  </CardContent>
                </Card>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2} mb={1}>
                      <Phone color="primary" />
                      <Typography variant="subtitle2" fontWeight="bold">Contact Number</Typography>
                    </Box>
                    <Typography variant="body2">{studentDetails.contactNumber || 'Not set'}</Typography>
                  </CardContent>
                </Card>
              </Box>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2} mb={1}>
                    <Person color="primary" />
                    <Typography variant="subtitle2" fontWeight="bold">Guardian Name</Typography>
                  </Box>
                  <Typography variant="body2">{studentDetails.guardianName || 'Not set'}</Typography>
                </CardContent>
              </Card>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2} mb={1}>
                    <Home color="primary" />
                    <Typography variant="subtitle2" fontWeight="bold">Address</Typography>
                  </Box>
                  <Typography variant="body2">{studentDetails.address || 'Not set'}</Typography>
                </CardContent>
              </Card>
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

export default ManageStudents

