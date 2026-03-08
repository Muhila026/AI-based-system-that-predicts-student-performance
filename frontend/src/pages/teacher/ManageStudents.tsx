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
  Button,
} from '@mui/material'
import CenteredMessage from '../../components/CenteredMessage'
import { Search, Visibility, Email, Phone, School, Person, Home } from '@mui/icons-material'
import { getStudents, getStudentDetails, AdminUser, StudentDetail } from '../../lib/api'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

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
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      <CenteredMessage
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        autoHideDuration={6000}
      />

      <Box sx={{ mb: 3, pb: 3, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}>
          Manage Students
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          Search by name or email.
        </Typography>
      </Box>

      <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0, backgroundColor: '#fff' }}>
        <CardContent sx={{ py: 2.5, px: 2.5 }}>
          <TextField
            fullWidth
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: THEME.muted }} />
                </InputAdornment>
              ),
            }}
          />
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress sx={{ color: THEME.primary }} />
            </Box>
          ) : filteredStudents.length === 0 ? (
            <Typography variant="body2" sx={{ color: THEME.muted }} textAlign="center" py={4}>
              No students found
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ borderBottom: `2px solid ${THEME.primaryBorder}` }}>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark, py: 1.5 }}>Student</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark, py: 1.5 }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark, py: 1.5 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark, py: 1.5 }}>Joined</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark, py: 1.5 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id} sx={{ borderBottom: `1px solid ${THEME.primaryBorder}`, '&:hover': { backgroundColor: THEME.primaryLight } }}>
                      <TableCell sx={{ py: 1.5 }}>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Avatar sx={{ bgcolor: THEME.primary, width: 32, height: 32 }}>{student.name.charAt(0)}</Avatar>
                          <Typography variant="body2" fontWeight={600} sx={{ color: THEME.textDark }}>{student.name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: THEME.textDark, py: 1.5 }}>{student.email}</TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Chip label={student.status} size="small" sx={{ borderRadius: 0, bgcolor: student.status === 'Active' ? '#dcfce7' : '#f3f4f6', color: student.status === 'Active' ? '#15803d' : THEME.muted }} />
                      </TableCell>
                      <TableCell sx={{ color: THEME.muted, py: 1.5 }}>{student.joinedDate}</TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <IconButton size="small" onClick={() => handleViewDetails(student.email)} title="View Details" sx={{ color: THEME.primary }}>
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
            <Avatar sx={{ bgcolor: THEME.primary, width: 48, height: 48 }}>
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
        <DialogActions sx={{ borderTop: `1px solid ${THEME.primaryBorder}` }}>
          <Button onClick={() => setDetailsDialogOpen(false)} sx={{ color: THEME.muted }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ManageStudents

