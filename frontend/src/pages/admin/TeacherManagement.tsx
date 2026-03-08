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
import { getTeachers, addTeacher, deleteTeacher, getTeacherDetails, saveTeacherDetails, AdminUser, TeacherDetail } from '../../lib/api'

const TeacherManagement: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [openDialog, setOpenDialog] = useState(false)
  const [loading, setLoading] = useState(true)
  const [teachers, setTeachers] = useState<AdminUser[]>([])
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })

  const [newTeacher, setNewTeacher] = useState({
    name: '',
    email: '',
    password: '',
  })
  const [showAddTeacherPassword, setShowAddTeacherPassword] = useState(false)
  const [addTeacherSubmitting, setAddTeacherSubmitting] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedTeacherEmail, setSelectedTeacherEmail] = useState<string>('')
  const [teacherDetails, setTeacherDetails] = useState<TeacherDetail | null>(null)
  const [editableDetails, setEditableDetails] = useState<TeacherDetail | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  useEffect(() => {
    loadTeachers()
  }, [])

  const loadTeachers = async () => {
    try {
      setLoading(true)
      const allUsers = await getTeachers()
      setTeachers(allUsers)
    } catch (error) {
      console.error('Failed to load teachers:', error)
      setSnackbar({
        open: true,
        message: 'Failed to load teachers',
        severity: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredTeachers = teachers.filter((teacher) =>
    teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddTeacher = async () => {
    if (!newTeacher.name || !newTeacher.name.trim()) {
      setSnackbar({ open: true, message: 'Name is required', severity: 'error' })
      return
    }
    if (!newTeacher.email || !newTeacher.email.trim()) {
      setSnackbar({ open: true, message: 'Email is required', severity: 'error' })
      return
    }
    if (!newTeacher.password || newTeacher.password.length < 6) {
      setSnackbar({ open: true, message: 'Password must be at least 6 characters', severity: 'error' })
      return
    }

    setAddTeacherSubmitting(true)
    try {
      await addTeacher({
        name: newTeacher.name.trim(),
        email: newTeacher.email.trim().toLowerCase(),
        role: 'Teacher',
        status: 'Active',
        password: newTeacher.password,
      })
      setSnackbar({ open: true, message: 'Teacher added successfully', severity: 'success' })
      setOpenDialog(false)
      setNewTeacher({ name: '', email: '', password: '' })
      await loadTeachers()
    } catch (error: any) {
      const msg = error?.message || error?.detail || (typeof error?.detail === 'string' ? error.detail : 'Failed to add teacher')
      setSnackbar({
        open: true,
        message: msg,
        severity: 'error',
      })
    } finally {
      setAddTeacherSubmitting(false)
    }
  }

  const handleViewDetails = async (email: string) => {
    setSelectedTeacherEmail(email)
    setDetailsDialogOpen(true)
    setLoadingDetails(true)
    
    try {
      const details = await getTeacherDetails(email)
      setTeacherDetails(details)
      setEditableDetails({ ...details })
    } catch (error) {
      console.error('Failed to load teacher details:', error)
      setSnackbar({
        open: true,
        message: 'Failed to load teacher details',
        severity: 'error',
      })
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleEditClick = async (email: string) => {
    setSelectedTeacherEmail(email)
    setEditDialogOpen(true)
    setLoadingDetails(true)
    
    try {
      const details = await getTeacherDetails(email)
      setEditableDetails({ ...details })
    } catch (error) {
      console.error('Failed to load teacher details:', error)
      setSnackbar({
        open: true,
        message: 'Failed to load teacher details',
        severity: 'error',
      })
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleSaveDetails = async () => {
    if (!editableDetails) return

    // Validate required fields
    if (!editableDetails.employeeId || !editableDetails.employeeId.trim()) {
      setSnackbar({ open: true, message: 'Employee ID is required', severity: 'error' })
      return
    }
    if (!editableDetails.department || !editableDetails.department.trim()) {
      setSnackbar({ open: true, message: 'Department is required', severity: 'error' })
      return
    }
    if (!editableDetails.designation || !editableDetails.designation.trim()) {
      setSnackbar({ open: true, message: 'Designation is required', severity: 'error' })
      return
    }
    if (!editableDetails.specialization || !editableDetails.specialization.trim()) {
      setSnackbar({ open: true, message: 'Specialization is required', severity: 'error' })
      return
    }
    if (!editableDetails.joinedDate || !editableDetails.joinedDate.trim()) {
      setSnackbar({ open: true, message: 'Joined Date is required', severity: 'error' })
      return
    }

    try {
      await saveTeacherDetails(editableDetails)
      setSnackbar({ open: true, message: 'Teacher details updated successfully', severity: 'success' })
      setEditDialogOpen(false)
      setEditableDetails(null)
      // Reload details if view dialog is open
      if (detailsDialogOpen) {
        await handleViewDetails(selectedTeacherEmail)
      }
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || 'Failed to update teacher details',
        severity: 'error',
      })
    }
  }

  const handleDelete = async (teacherId: number | string) => {
    if (!window.confirm('Are you sure you want to delete this teacher?')) {
      return
    }

    try {
      await deleteTeacher(teacherId)
      setSnackbar({ open: true, message: 'Teacher deleted successfully', severity: 'success' })
      await loadTeachers()
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || 'Failed to delete teacher',
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
            Teacher Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage all teachers in the system
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
          Add Teacher
        </Button>
      </Box>

      {/* Stats */}
      <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(3, 1fr)' }} gap={2} mb={3}>
        <Card>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" color="#1e40af">
              {teachers.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Teachers
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" color="#15803d">
              {teachers.filter((t) => t.status === 'Active').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Active Teachers
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" color="#6b7280">
              {teachers.filter((t) => t.status === 'Inactive').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Inactive Teachers
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

      {/* Teachers Table */}
      <Card>
        <CardContent>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : filteredTeachers.length === 0 ? (
            <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
              No teachers found
            </Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Teacher</strong></TableCell>
                    <TableCell><strong>Email</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Joined Date</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTeachers.map((teacher) => (
                    <TableRow key={teacher.id} sx={{ '&:hover': { bgcolor: '#f9fafb' } }}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Avatar sx={{ bgcolor: '#3b82f6', width: 32, height: 32 }}>
                            {teacher.name.charAt(0)}
                          </Avatar>
                          <Typography variant="body2" fontWeight={600}>
                            {teacher.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{teacher.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={teacher.status}
                          size="small"
                          sx={{
                            bgcolor: teacher.status === 'Active' ? '#dcfce7' : '#f3f4f6',
                            color: teacher.status === 'Active' ? '#15803d' : '#6b7280',
                          }}
                        />
                      </TableCell>
                      <TableCell>{teacher.joinedDate}</TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <IconButton
                            size="small"
                            color="info"
                            onClick={() => handleViewDetails(teacher.email)}
                            title="View Details"
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handleEditClick(teacher.email)}
                            title="Edit Details"
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(teacher.id)}
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

      {/* Add Teacher Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            Add New Teacher
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box display="grid" gap={3} mt={2}>
            <TextField
              fullWidth
              label="Full Name"
              value={newTeacher.name}
              onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
            />
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={newTeacher.email}
              onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
            />
            <TextField
              fullWidth
              label="Password"
              type={showAddTeacherPassword ? 'text' : 'password'}
              value={newTeacher.password}
              onChange={(e) => setNewTeacher({ ...newTeacher, password: e.target.value })}
              helperText="Password must be at least 6 characters"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showAddTeacherPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowAddTeacherPassword((v) => !v)}
                      edge="end"
                    >
                      {showAddTeacherPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} disabled={addTeacherSubmitting}>Cancel</Button>
          <Button variant="contained" onClick={handleAddTeacher} disabled={addTeacherSubmitting}>
            {addTeacherSubmitting ? 'Adding...' : 'Add Teacher'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Teacher Details Dialog */}
      <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            Teacher Details {selectedTeacherEmail && `- ${selectedTeacherEmail}`}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {loadingDetails ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : teacherDetails ? (
            <Box display="grid" gap={3} mt={2}>
              <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, 1fr)' }} gap={2}>
                <TextField
                  fullWidth
                  label="Email"
                  value={teacherDetails.email}
                  disabled
                />
                <TextField
                  fullWidth
                  label="Employee ID"
                  value={teacherDetails.employeeId || 'Not set'}
                  disabled
                />
                <TextField
                  fullWidth
                  label="Department"
                  value={teacherDetails.department || 'Not set'}
                  disabled
                />
                <TextField
                  fullWidth
                  label="Designation"
                  value={teacherDetails.designation || 'Not set'}
                  disabled
                />
                <TextField
                  fullWidth
                  label="Specialization"
                  value={teacherDetails.specialization || 'Not set'}
                  disabled
                />
                <TextField
                  fullWidth
                  label="Joined Date"
                  value={teacherDetails.joinedDate || 'Not set'}
                  disabled
                />
              </Box>
              <TextField
                fullWidth
                label="Qualifications"
                value={teacherDetails.qualifications && teacherDetails.qualifications.length > 0 
                  ? teacherDetails.qualifications.join(', ') 
                  : 'Not set'}
                disabled
                multiline
                rows={2}
              />
              <TextField
                fullWidth
                label="Bio"
                value={teacherDetails.bio || 'Not set'}
                disabled
                multiline
                rows={3}
              />
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
              No details available for this teacher
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
          <Button 
            variant="contained" 
            onClick={() => {
              setDetailsDialogOpen(false)
              handleEditClick(selectedTeacherEmail)
            }}
          >
            Edit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Teacher Details Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            Edit Teacher Details {selectedTeacherEmail && `- ${selectedTeacherEmail}`}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {loadingDetails ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : editableDetails ? (
            <Box display="grid" gap={3} mt={2}>
              <TextField
                fullWidth
                label="Email"
                value={editableDetails.email}
                disabled
              />
              <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, 1fr)' }} gap={2}>
                <TextField
                  fullWidth
                  label="Employee ID *"
                  value={editableDetails.employeeId}
                  onChange={(e) => setEditableDetails({ ...editableDetails, employeeId: e.target.value })}
                  required
                />
                <TextField
                  fullWidth
                  label="Department *"
                  value={editableDetails.department}
                  onChange={(e) => setEditableDetails({ ...editableDetails, department: e.target.value })}
                  required
                />
                <TextField
                  fullWidth
                  label="Designation *"
                  value={editableDetails.designation}
                  onChange={(e) => setEditableDetails({ ...editableDetails, designation: e.target.value })}
                  required
                />
                <TextField
                  fullWidth
                  label="Specialization *"
                  value={editableDetails.specialization}
                  onChange={(e) => setEditableDetails({ ...editableDetails, specialization: e.target.value })}
                  required
                />
                <TextField
                  fullWidth
                  label="Joined Date *"
                  type="date"
                  value={editableDetails.joinedDate}
                  onChange={(e) => setEditableDetails({ ...editableDetails, joinedDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Box>
              <TextField
                fullWidth
                label="Qualifications (comma-separated)"
                value={editableDetails.qualifications ? editableDetails.qualifications.join(', ') : ''}
                onChange={(e) => {
                  const quals = e.target.value.split(',').map(q => q.trim()).filter(q => q.length > 0)
                  setEditableDetails({ ...editableDetails, qualifications: quals })
                }}
                helperText="Enter qualifications separated by commas"
                multiline
                rows={2}
              />
              <TextField
                fullWidth
                label="Bio"
                value={editableDetails.bio || ''}
                onChange={(e) => setEditableDetails({ ...editableDetails, bio: e.target.value })}
                multiline
                rows={3}
              />
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
              Loading teacher details...
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setEditDialogOpen(false)
            setEditableDetails(null)
          }}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveDetails}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default TeacherManagement

