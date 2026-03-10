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

      <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 0 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: THEME.primary, width: 40, height: 40 }}>
              {selectedStudentEmail && selectedStudentEmail.charAt(0).toUpperCase()}
            </Avatar>
            <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>
              Student details
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {loadingDetails ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="160px">
              <CircularProgress sx={{ color: THEME.primary }} />
            </Box>
          ) : studentDetails ? (
            <Box component="dl" sx={{ m: 0, mt: 2, '& > div': { display: 'flex', alignItems: 'center', gap: 1.5, py: 1.25, borderBottom: `1px solid ${THEME.primaryBorder}` } }}>
              <Box>
                <Email sx={{ color: THEME.muted, fontSize: 20 }} />
                <Box>
                  <Typography component="dt" variant="caption" sx={{ color: THEME.muted, display: 'block' }}>Email</Typography>
                  <Typography component="dd" variant="body2" sx={{ color: THEME.textDark }}>{studentDetails.email}</Typography>
                </Box>
              </Box>
              <Box>
                <School sx={{ color: THEME.muted, fontSize: 20 }} />
                <Box>
                  <Typography component="dt" variant="caption" sx={{ color: THEME.muted, display: 'block' }}>Student ID</Typography>
                  <Typography component="dd" variant="body2" sx={{ color: THEME.textDark }}>{studentDetails.studentId || '—'}</Typography>
                </Box>
              </Box>
              <Box>
                <School sx={{ color: THEME.muted, fontSize: 20 }} />
                <Box>
                  <Typography component="dt" variant="caption" sx={{ color: THEME.muted, display: 'block' }}>Batch / Program</Typography>
                  <Typography component="dd" variant="body2" sx={{ color: THEME.textDark }}>{[studentDetails.batch, studentDetails.program].filter(Boolean).join(' · ') || '—'}</Typography>
                </Box>
              </Box>
              <Box>
                <Phone sx={{ color: THEME.muted, fontSize: 20 }} />
                <Box>
                  <Typography component="dt" variant="caption" sx={{ color: THEME.muted, display: 'block' }}>Contact</Typography>
                  <Typography component="dd" variant="body2" sx={{ color: THEME.textDark }}>{studentDetails.contactNumber || '—'}</Typography>
                </Box>
              </Box>
              <Box>
                <Person sx={{ color: THEME.muted, fontSize: 20 }} />
                <Box>
                  <Typography component="dt" variant="caption" sx={{ color: THEME.muted, display: 'block' }}>Guardian</Typography>
                  <Typography component="dd" variant="body2" sx={{ color: THEME.textDark }}>{studentDetails.guardianName || '—'}</Typography>
                </Box>
              </Box>
              <Box sx={{ borderBottom: 'none' }}>
                <Home sx={{ color: THEME.muted, fontSize: 20 }} />
                <Box>
                  <Typography component="dt" variant="caption" sx={{ color: THEME.muted, display: 'block' }}>Address</Typography>
                  <Typography component="dd" variant="body2" sx={{ color: THEME.textDark }}>{studentDetails.address || '—'}</Typography>
                </Box>
              </Box>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ color: THEME.muted }} textAlign="center" py={4}>
              No details available
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${THEME.primaryBorder}`, px: 2.5, py: 2 }}>
          <Button onClick={() => setDetailsDialogOpen(false)} variant="outlined" size="small" sx={{ borderRadius: 0, textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ManageStudents

