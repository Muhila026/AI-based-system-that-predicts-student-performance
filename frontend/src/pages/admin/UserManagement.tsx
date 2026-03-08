import React, { useEffect, useState } from 'react'
import {
  Alert,
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
} from '@mui/material'
import CenteredMessage from '../../components/CenteredMessage'
import { Add, Edit, Delete, Search, Block, LockReset, Visibility, VisibilityOff, Security } from '@mui/icons-material'
import {
  addUser,
  AdminUser,
  deleteUser,
  updateUser,
  getUsers,
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  changeUserPassword,
  getStudentDetails,
  getTeacherDetails,
  type UserRole,
  type StudentDetail,
  type TeacherDetail,
} from '../../lib/api'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

interface UserManagementProps {
  initialOpenAddDialog?: boolean
  onAddDialogHandled?: () => void
}

const UserManagement: React.FC<UserManagementProps> = ({ initialOpenAddDialog, onAddDialogHandled }) => {
  const [usersLoading, setUsersLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [openDialog, setOpenDialog] = useState(false)
  const [openEditDialog, setOpenEditDialog] = useState(false)
  const [editUser, setEditUser] = useState<AdminUser | null>(null)
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false)
  const [passwordUser, setPasswordUser] = useState<AdminUser | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [roles, setRoles] = useState<UserRole[]>([])
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [openRoleManagementPopup, setOpenRoleManagementPopup] = useState(false)
  const [openRoleDialog, setOpenRoleDialog] = useState(false)
  const [openEditRoleDialog, setOpenEditRoleDialog] = useState(false)
  const [editRole, setEditRole] = useState<UserRole | null>(null)
  const [newRole, setNewRole] = useState({ roleKey: '', displayName: '', description: '' })
  const [roleSubmitLoading, setRoleSubmitLoading] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [detailsUser, setDetailsUser] = useState<AdminUser | null>(null)
  const [detailsData, setDetailsData] = useState<StudentDetail | TeacherDetail | null>(null)
  const [detailsType, setDetailsType] = useState<'student' | 'teacher' | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' })
  const SYSTEM_ROLE_KEYS = ['Student', 'Teacher', 'Admin']

  /** Role options for user forms: system roles only, from API (displayName + roleKey) */
  const systemRoles = roles.filter((r) => SYSTEM_ROLE_KEYS.includes(r.roleKey))
  const roleOptionsForForms = systemRoles.length > 0
    ? systemRoles
    : SYSTEM_ROLE_KEYS.map((key) => ({ roleKey: key, displayName: key === 'Admin' ? 'Administrator' : key, description: '' }))

  useEffect(() => {
    setUsersLoading(true)
    getUsers()
      .then(setUsers)
      .finally(() => setUsersLoading(false))
  }, [])
  useEffect(() => { getRoles().then(setRoles) }, [])

  useEffect(() => {
    if (initialOpenAddDialog) {
      setOpenDialog(true)
      onAddDialogHandled?.()
    }
  }, [initialOpenAddDialog, onAddDialogHandled])

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: '',
    password: '',
  })
  const [showAddUserPassword, setShowAddUserPassword] = useState(false)
  const [addUserLoading, setAddUserLoading] = useState(false)
  const [addUserError, setAddUserError] = useState<string | null>(null)

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin':
        return { bg: '#fee2e2', color: '#991b1b' }
      case 'Teacher':
        return { bg: '#dbeafe', color: '#1e40af' }
      case 'Student':
        return { bg: '#dcfce7', color: '#15803d' }
      default:
        return { bg: '#f3f4f6', color: '#374151' }
    }
  }

  const getRoleDisplayName = (roleKey: string) =>
    roles.find((r) => r.roleKey === roleKey)?.displayName ?? roleKey

  const handleResetPassword = async () => {
    if (!passwordUser || !newPassword || newPassword.length < 6) {
      setSnackbar({ open: true, message: 'Password must be at least 6 characters', severity: 'error' })
      return
    }
    setPasswordLoading(true)
    try {
      await changeUserPassword({ email: passwordUser.email, new_password: newPassword })
      setOpenPasswordDialog(false)
      setPasswordUser(null)
      setNewPassword('')
      setSnackbar({ open: true, message: 'Password updated successfully', severity: 'success' })
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Failed to reset password', severity: 'error' })
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.name.trim()) {
      setSnackbar({ open: true, message: 'Full name is required', severity: 'error' })
      return
    }
    if (!newUser.email || !newUser.email.trim()) {
      setSnackbar({ open: true, message: 'Email is required', severity: 'error' })
      return
    }
    const emailTrimmed = newUser.email.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailTrimmed)) {
      setSnackbar({ open: true, message: 'Please enter a valid email address', severity: 'error' })
      return
    }
    if (!newUser.role || !['Student', 'Teacher', 'Admin'].includes(newUser.role)) {
      setSnackbar({ open: true, message: 'Please select a valid role', severity: 'error' })
      return
    }
    if (!newUser.password || newUser.password.length < 6) {
      setSnackbar({ open: true, message: 'Password must be at least 6 characters long', severity: 'error' })
      return
    }
    setAddUserError(null)
    setAddUserLoading(true)
    try {
      await addUser({
        name: newUser.name.trim(),
        email: emailTrimmed,
        role: newUser.role as 'Student' | 'Teacher' | 'Admin',
        status: 'Active',
        password: newUser.password,
      })
      setOpenDialog(false)
      setNewUser({ name: '', email: '', role: '', password: '' })
      setAddUserError(null)
      setUsers(await getUsers())
      setSnackbar({ open: true, message: 'User added successfully', severity: 'success' })
    } catch (error: any) {
      const errorMessage = error?.message || error?.detail || 'Failed to create user'
      setAddUserError(errorMessage)
      setSnackbar({ open: true, message: errorMessage, severity: 'error' })
    } finally {
      setAddUserLoading(false)
    }
  }

  const handleEditUser = async () => {
    if (!editUser) return
    if (!editUser.name || !editUser.name.trim()) {
      setSnackbar({ open: true, message: 'Name is required', severity: 'error' })
      return
    }
    if (!['Student', 'Teacher', 'Admin'].includes(editUser.role)) {
      setSnackbar({ open: true, message: 'Please select a valid role', severity: 'error' })
      return
    }
    try {
      await updateUser(editUser.id, {
        name: editUser.name.trim(),
        role: editUser.role as 'Student' | 'Teacher' | 'Admin',
        status: editUser.status,
      })
      setOpenEditDialog(false)
      setEditUser(null)
      setUsers(await getUsers())
      setSnackbar({ open: true, message: 'User updated successfully', severity: 'success' })
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Failed to update user', severity: 'error' })
    }
  }

  const handleToggleStatus = async (user: AdminUser) => {
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active'
    try {
      await updateUser(user.id, { status: newStatus })
      setUsers(await getUsers())
      setSnackbar({ open: true, message: `User ${newStatus === 'Active' ? 'activated' : 'deactivated'}`, severity: 'success' })
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Failed to update status', severity: 'error' })
    }
  }

  const handleAddRole = async () => {
    if (!newRole.roleKey?.trim() || !newRole.displayName?.trim()) {
      setSnackbar({ open: true, message: 'Role key and display name are required', severity: 'error' })
      return
    }
    const key = newRole.roleKey.trim()
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(key)) {
      setSnackbar({ open: true, message: 'Role key must start with a letter and contain only letters, numbers, and underscore', severity: 'error' })
      return
    }
    setRoleSubmitLoading(true)
    try {
      await createRole({
        roleKey: key,
        displayName: newRole.displayName.trim(),
        description: newRole.description?.trim() || undefined,
      })
      setOpenRoleDialog(false)
      setNewRole({ roleKey: '', displayName: '', description: '' })
      setRoles(await getRoles())
      setSnackbar({ open: true, message: 'Role added successfully', severity: 'success' })
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Failed to add role', severity: 'error' })
    } finally {
      setRoleSubmitLoading(false)
    }
  }

  const handleEditRole = async () => {
    if (!editRole?.roleKey?.trim() || !editRole?.displayName?.trim()) return
    setRoleSubmitLoading(true)
    try {
      await updateRole(editRole.roleKey, {
        displayName: editRole.displayName.trim(),
        description: editRole.description?.trim() || undefined,
      })
      setOpenEditRoleDialog(false)
      setEditRole(null)
      setRoles(await getRoles())
      setSnackbar({ open: true, message: 'Role updated successfully', severity: 'success' })
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Failed to update role', severity: 'error' })
    } finally {
      setRoleSubmitLoading(false)
    }
  }

  const handleDeleteRole = async (roleKey: string) => {
    if (SYSTEM_ROLE_KEYS.includes(roleKey)) {
      setSnackbar({ open: true, message: 'System roles (Student, Teacher, Admin) cannot be deleted.', severity: 'error' })
      return
    }
    if (!window.confirm(`Delete role "${roleKey}"? Users with this role will need to be reassigned.`)) return
    try {
      await deleteRole(roleKey)
      setRoles(await getRoles())
      setSnackbar({ open: true, message: 'Role deleted', severity: 'success' })
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Failed to delete role', severity: 'error' })
    }
  }

  const handleViewDetails = async (user: AdminUser) => {
    setDetailsUser(user)
    setDetailsData(null)
    setDetailsError(null)
    setDetailsDialogOpen(true)
    if (user.role === 'Admin') {
      setDetailsType(null)
      setDetailsLoading(false)
      setDetailsError(null)
      return
    }
    setDetailsType(user.role === 'Student' ? 'student' : 'teacher')
    setDetailsLoading(true)
    try {
      if (user.role === 'Student') {
        const data = await getStudentDetails(user.email)
        setDetailsData(data)
      } else {
        const data = await getTeacherDetails(user.email)
        setDetailsData(data)
      }
      setDetailsError(null)
    } catch (error: any) {
      setDetailsError(error.message || 'Failed to load details')
      setDetailsData(null)
    } finally {
      setDetailsLoading(false)
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      (!roleFilter || u.role === roleFilter) &&
      (!searchQuery.trim() ||
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
          mb: 3,
          pb: 3,
          borderBottom: `1px solid ${THEME.primaryBorder}`,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}>
            User Management
          </Typography>
          <Typography variant="body2" sx={{ color: THEME.muted }}>
            Manage students, teachers, and admins in one place
          </Typography>
        </Box>
        <Box display="flex" gap={1.5} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<Security />}
            onClick={() => setOpenRoleManagementPopup(true)}
            sx={{
              borderColor: THEME.primary,
              color: THEME.primary,
              borderRadius: 0,
              textTransform: 'none',
              fontWeight: 600,
              px: 2.5,
              py: 1.25,
              '&:hover': { borderColor: '#1e40af', backgroundColor: THEME.primaryLight },
            }}
          >
            User Role
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setNewUser({ name: '', email: '', role: 'Student', password: '' })
              setOpenDialog(true)
            }}
            sx={{
              backgroundColor: '#15803d',
              borderRadius: 0,
              textTransform: 'none',
              fontWeight: 600,
              px: 2.5,
              py: 1.25,
              boxShadow: '0 2px 8px rgba(21, 128, 61, 0.25)',
              '&:hover': { backgroundColor: '#166534', boxShadow: '0 4px 12px rgba(21, 128, 61, 0.35)' },
            }}
          >
            Add Student
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setNewUser({ name: '', email: '', role: '', password: '' })
              setOpenDialog(true)
            }}
            sx={{
              backgroundColor: THEME.primary,
              borderRadius: 0,
              textTransform: 'none',
              fontWeight: 600,
              px: 2.5,
              py: 1.25,
              boxShadow: '0 2px 8px rgba(30, 58, 138, 0.25)',
              '&:hover': { backgroundColor: '#1e40af', boxShadow: '0 4px 12px rgba(30, 58, 138, 0.35)' },
            }}
          >
            Add User
          </Button>
        </Box>
      </Box>

      {/* Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
          <CardContent sx={{ py: 2, px: 2 }}>
            <Typography variant="h4" fontWeight="700" sx={{ color: THEME.primary }}>
              {users.length}
            </Typography>
            <Typography variant="body2" sx={{ color: THEME.muted }}>Total Users</Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
          <CardContent sx={{ py: 2, px: 2 }}>
            <Typography variant="h4" fontWeight="700" sx={{ color: '#15803d' }}>
              {users.filter((u) => u.role === 'Student').length}
            </Typography>
            <Typography variant="body2" sx={{ color: THEME.muted }}>Students</Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
          <CardContent sx={{ py: 2, px: 2 }}>
            <Typography variant="h4" fontWeight="700" sx={{ color: '#1e40af' }}>
              {users.filter((u) => u.role === 'Teacher').length}
            </Typography>
            <Typography variant="body2" sx={{ color: THEME.muted }}>Teachers</Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
          <CardContent sx={{ py: 2, px: 2 }}>
            <Typography variant="h4" fontWeight="700" sx={{ color: '#991b1b' }}>
              {users.filter((u) => u.role === 'Admin').length}
            </Typography>
            <Typography variant="body2" sx={{ color: THEME.muted }}>Admins</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Search and role filter */}
      <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0, mb: 3 }}>
        <CardContent sx={{ py: 2, px: 2.5 }}>
          <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2} alignItems="stretch">
            <TextField
              fullWidth
              size="small"
              placeholder="Search by name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ flex: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: THEME.muted, fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Filter by role</InputLabel>
              <Select
                value={roleFilter}
                label="Filter by role"
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <MenuItem value="">All (Students, Teachers, Admins)</MenuItem>
                <MenuItem value="Student">Students only</MenuItem>
                <MenuItem value="Teacher">Teachers only</MenuItem>
                <MenuItem value="Admin">Admins only</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* Users Table (main) */}
      <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0, mb: 3 }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
            <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>
              Users
            </Typography>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: THEME.primaryLight }}>
                  <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Joined</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: THEME.textDark }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {usersLoading && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={32} sx={{ color: THEME.primary }} />
                    </TableCell>
                  </TableRow>
                )}
                {!usersLoading && filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: THEME.muted }}>
                      {roleFilter || searchQuery.trim()
                        ? 'No users match your filter.'
                        : 'No users yet. Add a user to get started.'}
                    </TableCell>
                  </TableRow>
                )}
                {!usersLoading && filteredUsers.map((user) => (
                  <TableRow key={user.id} sx={{ '&:hover': { backgroundColor: THEME.primaryLight } }}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 0,
                            backgroundColor: THEME.primary,
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                          }}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </Box>
                        <Typography variant="body2" fontWeight={600} sx={{ color: THEME.textDark }}>
                          {user.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={getRoleDisplayName(user.role)}
                        size="small"
                        sx={{
                          bgcolor: getRoleColor(user.role).bg,
                          color: getRoleColor(user.role).color,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.status}
                        size="small"
                        sx={{
                          bgcolor: user.status === 'Active' ? '#dcfce7' : '#f3f4f6',
                          color: user.status === 'Active' ? '#15803d' : '#6b7280',
                        }}
                      />
                    </TableCell>
                    <TableCell>{user.joinedDate}</TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <IconButton
                          size="small"
                          color="primary"
                          title="View details"
                          onClick={() => handleViewDetails(user)}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="primary"
                          title="Reset password"
                          onClick={() => {
                            setPasswordUser(user)
                            setNewPassword('')
                            setOpenPasswordDialog(true)
                          }}
                        >
                          <LockReset fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="primary"
                          title="Edit user"
                          onClick={() => {
                            setEditUser({ ...user })
                            setOpenEditDialog(true)
                          }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color={user.status === 'Active' ? 'warning' : 'success'}
                          title={user.status === 'Active' ? 'Deactivate' : 'Activate'}
                          onClick={() => handleToggleStatus(user)}
                        >
                          <Block fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          title="Delete user"
                          onClick={async () => {
                            if (window.confirm(`Are you sure you want to delete ${user.name}? This cannot be undone.`)) {
                              try {
                                await deleteUser(user.id)
                                setUsers(await getUsers())
                                setSnackbar({ open: true, message: 'User deleted', severity: 'success' })
                              } catch (error: any) {
                                setSnackbar({ open: true, message: error.message || 'Failed to delete user', severity: 'error' })
                              }
                            }
                          }}
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
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => {
          if (!addUserLoading) {
            setOpenDialog(false)
            setAddUserError(null)
          }
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 0,
            border: `1px solid ${THEME.primaryBorder}`,
            boxShadow: '0 4px 20px rgba(30, 58, 138, 0.12)',
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            fontSize: '1.25rem',
            color: THEME.textDark,
            borderBottom: `1px solid ${THEME.primaryBorder}`,
            pb: 2,
            pt: 2.5,
            px: 3,
          }}
        >
          Add New User
        </DialogTitle>
        <DialogContent sx={{ px: 3, pt: 3, pb: 2 }}>
          {addUserError && (
            <Alert
              severity="error"
              onClose={() => setAddUserError(null)}
              sx={{ mb: 2, borderRadius: 0 }}
            >
              {addUserError}
            </Alert>
          )}
          <Box display="grid" gap={2.5}>
            <TextField
              fullWidth
              required
              label="Full Name"
              placeholder="John Doe"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              disabled={addUserLoading}
              variant="outlined"
              margin="normal"
              InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 0,
                  '& fieldset': { borderColor: THEME.primaryBorder },
                  '&:hover fieldset': { borderColor: THEME.primary },
                  '&.Mui-focused fieldset': { borderColor: THEME.primary, borderWidth: 1 },
                },
              }}
            />
            <TextField
              fullWidth
              required
              label="Email Address"
              type="email"
              placeholder="john@example.com"
              value={newUser.email}
              onChange={(e) => {
                setNewUser({ ...newUser, email: e.target.value })
                if (addUserError) setAddUserError(null)
              }}
              disabled={addUserLoading}
              error={!!addUserError}
              helperText={addUserError && addUserError.toLowerCase().includes('email') ? addUserError : undefined}
              variant="outlined"
              margin="normal"
              InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 0,
                  '& fieldset': { borderColor: THEME.primaryBorder },
                  '&:hover fieldset': { borderColor: THEME.primary },
                  '&.Mui-focused fieldset': { borderColor: THEME.primary, borderWidth: 1 },
                },
              }}
            />
            <FormControl fullWidth required disabled={addUserLoading} variant="outlined" margin="normal">
              <InputLabel id="add-user-role-label" shrink sx={{ color: THEME.textDark }}>
                Role
              </InputLabel>
              <Select
                labelId="add-user-role-label"
                value={newUser.role}
                label="Role"
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                sx={{
                  borderRadius: 0,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: THEME.primaryBorder },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: THEME.primary },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: THEME.primary },
                }}
              >
                {roleOptionsForForms.map((r) => (
                  <MenuItem key={r.roleKey} value={r.roleKey}>{r.displayName}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              required
              label="Password"
              type={showAddUserPassword ? 'text' : 'password'}
              placeholder="Min 6 characters"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              disabled={addUserLoading}
              variant="outlined"
              margin="normal"
              InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showAddUserPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowAddUserPassword((v) => !v)}
                      edge="end"
                      size="small"
                    >
                      {showAddUserPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 0,
                  '& fieldset': { borderColor: THEME.primaryBorder },
                  '&:hover fieldset': { borderColor: THEME.primary },
                  '&.Mui-focused fieldset': { borderColor: THEME.primary, borderWidth: 1 },
                },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: `1px solid ${THEME.primaryBorder}`,
            backgroundColor: THEME.primaryLight,
            gap: 1,
          }}
        >
          <Button
            onClick={() => setOpenDialog(false)}
            disabled={addUserLoading}
            variant="outlined"
            sx={{
              borderRadius: 0,
              textTransform: 'none',
              fontWeight: 600,
              borderColor: THEME.primaryBorder,
              color: THEME.textDark,
              '&:hover': { borderColor: THEME.primary, backgroundColor: 'transparent' },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={addUserLoading ? <CircularProgress size={18} color="inherit" /> : <Add />}
            onClick={handleAddUser}
            disabled={addUserLoading || !newUser.name.trim() || !newUser.email.trim() || !newUser.role || (newUser.password?.length ?? 0) < 6}
            sx={{
              borderRadius: 0,
              textTransform: 'none',
              fontWeight: 600,
              backgroundColor: THEME.primary,
              '&:hover': { backgroundColor: '#1e40af' },
            }}
          >
            {addUserLoading ? 'Adding...' : 'Add User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={openEditDialog}
        onClose={() => { setOpenEditDialog(false); setEditUser(null) }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>Edit User</DialogTitle>
        <DialogContent>
          {editUser && (
            <Box display="grid" gap={3} mt={2}>
              <TextField
                fullWidth
                label="Full Name"
                value={editUser.name}
                onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
              />
              <TextField
                fullWidth
                label="Email"
                value={editUser.email}
                disabled
              />
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={editUser.role}
                  label="Role"
                  onChange={(e) => setEditUser({ ...editUser, role: e.target.value as 'Student' | 'Teacher' | 'Admin' })}
                >
                  {roleOptionsForForms.map((r) => (
                    <MenuItem key={r.roleKey} value={r.roleKey}>{r.displayName}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={editUser.status}
                  label="Status"
                  onChange={(e) => setEditUser({ ...editUser, status: e.target.value as 'Active' | 'Inactive' })}
                >
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenEditDialog(false); setEditUser(null) }}>Cancel</Button>
          <Button variant="contained" onClick={handleEditUser} disabled={!editUser}>
            Save changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={openPasswordDialog}
        onClose={() => {
          setOpenPasswordDialog(false)
          setPasswordUser(null)
          setNewPassword('')
          setShowResetPassword(false)
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Reset password</DialogTitle>
        <DialogContent>
          {passwordUser && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              User: {passwordUser.name} ({passwordUser.email})
            </Typography>
          )}
          <TextField
            fullWidth
            label="New password"
            type={showResetPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min 6 characters"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showResetPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowResetPassword((v) => !v)}
                    edge="end"
                  >
                    {showResetPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenPasswordDialog(false)
              setPasswordUser(null)
              setNewPassword('')
              setShowResetPassword(false)
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleResetPassword}
            disabled={passwordLoading || !newPassword || newPassword.length < 6}
          >
            {passwordLoading ? 'Saving...' : 'Reset password'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => {
          setDetailsDialogOpen(false)
          setDetailsUser(null)
          setDetailsData(null)
          setDetailsType(null)
          setDetailsError(null)
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>User details {detailsUser ? `— ${detailsUser.name}` : ''}</DialogTitle>
        <DialogContent>
          {detailsUser && (
            <Box mt={1}>
              {detailsUser.role === 'Admin' && (
                <Typography color="text.secondary">
                  No extended details for administrators. Edit name, role, and status in Edit user.
                </Typography>
              )}
              {detailsType === 'student' && (
                <>
                  {detailsLoading && (
                    <Box display="flex" justifyContent="center" py={3}>
                      <CircularProgress />
                    </Box>
                  )}
                  {!detailsLoading && detailsError && (
                    <Typography color="error">{detailsError}</Typography>
                  )}
                  {!detailsLoading && detailsData && detailsType === 'student' && (
                    <Box display="grid" gap={2}>
                      <Typography variant="subtitle2" color="text.secondary">Student details</Typography>
                      <TextField fullWidth size="small" label="Email" value={(detailsData as StudentDetail).email} disabled InputProps={{ readOnly: true }} />
                      <TextField fullWidth size="small" label="Student ID" value={(detailsData as StudentDetail).studentId} disabled InputProps={{ readOnly: true }} />
                      <TextField fullWidth size="small" label="Batch" value={(detailsData as StudentDetail).batch} disabled InputProps={{ readOnly: true }} />
                      <TextField fullWidth size="small" label="Program" value={(detailsData as StudentDetail).program} disabled InputProps={{ readOnly: true }} />
                      <TextField fullWidth size="small" label="Current semester" type="number" value={(detailsData as StudentDetail).currentSemester} disabled InputProps={{ readOnly: true }} />
                      <TextField fullWidth size="small" label="Guardian" value={(detailsData as StudentDetail).guardianName || '—'} disabled InputProps={{ readOnly: true }} />
                      <TextField fullWidth size="small" label="Contact" value={(detailsData as StudentDetail).contactNumber || '—'} disabled InputProps={{ readOnly: true }} />
                      <TextField fullWidth size="small" label="Address" value={(detailsData as StudentDetail).address || '—'} disabled InputProps={{ readOnly: true }} multiline />
                    </Box>
                  )}
                </>
              )}
              {detailsType === 'teacher' && (
                <>
                  {detailsLoading && (
                    <Box display="flex" justifyContent="center" py={3}>
                      <CircularProgress />
                    </Box>
                  )}
                  {!detailsLoading && detailsError && (
                    <Typography color="error">{detailsError}</Typography>
                  )}
                  {!detailsLoading && detailsData && detailsType === 'teacher' && (
                    <Box display="grid" gap={2}>
                      <Typography variant="subtitle2" color="text.secondary">Teacher details</Typography>
                      <TextField fullWidth size="small" label="Email" value={(detailsData as TeacherDetail).email} disabled InputProps={{ readOnly: true }} />
                      <TextField fullWidth size="small" label="Employee ID" value={(detailsData as TeacherDetail).employeeId} disabled InputProps={{ readOnly: true }} />
                      <TextField fullWidth size="small" label="Department" value={(detailsData as TeacherDetail).department} disabled InputProps={{ readOnly: true }} />
                      <TextField fullWidth size="small" label="Designation" value={(detailsData as TeacherDetail).designation} disabled InputProps={{ readOnly: true }} />
                      <TextField fullWidth size="small" label="Specialization" value={(detailsData as TeacherDetail).specialization} disabled InputProps={{ readOnly: true }} />
                      <TextField fullWidth size="small" label="Joined date" value={(detailsData as TeacherDetail).joinedDate} disabled InputProps={{ readOnly: true }} />
                      <TextField fullWidth size="small" label="Qualifications" value={Array.isArray((detailsData as TeacherDetail).qualifications) ? (detailsData as TeacherDetail).qualifications.join(', ') : '—'} disabled InputProps={{ readOnly: true }} />
                      <TextField fullWidth size="small" label="Bio" value={(detailsData as TeacherDetail).bio || '—'} disabled InputProps={{ readOnly: true }} multiline />
                    </Box>
                  )}
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDetailsDialogOpen(false)
              setDetailsUser(null)
              setDetailsData(null)
              setDetailsType(null)
              setDetailsError(null)
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Role Management Popup */}
      <Dialog
        open={openRoleManagementPopup}
        onClose={() => setOpenRoleManagementPopup(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 0 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.25rem', color: THEME.textDark, borderBottom: `1px solid ${THEME.primaryBorder}`, pb: 2 }}>
          User Role Management
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ px: 2.5, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${THEME.primaryBorder}` }}>
            <Typography variant="body2" sx={{ color: THEME.muted }}>
              Add, edit, or remove user roles. System roles (Student, Teacher, Admin) cannot be deleted.
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<Add />}
              onClick={() => setOpenRoleDialog(true)}
              sx={{ borderRadius: 0, textTransform: 'none', fontWeight: 600, backgroundColor: THEME.primary, '&:hover': { backgroundColor: '#1e40af' } }}
            >
              Add role
            </Button>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: THEME.primaryLight }}>
                  <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Display name</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Description</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: THEME.textDark }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {roles.map((r) => (
                  <TableRow key={r.roleKey} sx={{ '&:hover': { backgroundColor: THEME.primaryLight } }}>
                    <TableCell>
                      <Chip
                        label={r.roleKey}
                        size="small"
                        sx={{ borderRadius: 0, bgcolor: getRoleColor(r.roleKey).bg, color: getRoleColor(r.roleKey).color }}
                      />
                    </TableCell>
                    <TableCell>{r.displayName}</TableCell>
                    <TableCell sx={{ color: THEME.muted }}>{r.description || '—'}</TableCell>
                    <TableCell align="right">
                      <Box display="flex" gap={0.5} justifyContent="flex-end">
                        <IconButton
                          size="small"
                          sx={{ color: THEME.primary }}
                          title="Edit role"
                          onClick={() => { setEditRole({ ...r }); setOpenEditRoleDialog(true) }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          title={SYSTEM_ROLE_KEYS.includes(r.roleKey) ? 'System role cannot be deleted' : 'Delete role'}
                          disabled={SYSTEM_ROLE_KEYS.includes(r.roleKey)}
                          onClick={() => handleDeleteRole(r.roleKey)}
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
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${THEME.primaryBorder}`, px: 2.5, py: 2 }}>
          <Button onClick={() => setOpenRoleManagementPopup(false)} sx={{ borderRadius: 0, textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Role Dialog */}
      <Dialog
        open={openRoleDialog}
        onClose={() => { setOpenRoleDialog(false); setNewRole({ roleKey: '', displayName: '', description: '' }) }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add user role</DialogTitle>
        <DialogContent>
          <Box display="grid" gap={2} mt={2}>
            <TextField
              fullWidth
              label="Role key"
              value={newRole.roleKey}
              onChange={(e) => setNewRole({ ...newRole, roleKey: e.target.value })}
              placeholder="e.g. Moderator"
              helperText="Letters, numbers, underscore only. Used in code."
            />
            <TextField
              fullWidth
              label="Display name"
              value={newRole.displayName}
              onChange={(e) => setNewRole({ ...newRole, displayName: e.target.value })}
              placeholder="e.g. Moderator"
            />
            <TextField
              fullWidth
              label="Description"
              value={newRole.description}
              onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
              placeholder="Optional"
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenRoleDialog(false); setNewRole({ roleKey: '', displayName: '', description: '' }) }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddRole}
            disabled={roleSubmitLoading || !newRole.roleKey?.trim() || !newRole.displayName?.trim()}
          >
            {roleSubmitLoading ? 'Adding...' : 'Add role'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog
        open={openEditRoleDialog}
        onClose={() => { setOpenEditRoleDialog(false); setEditRole(null) }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit user role</DialogTitle>
        <DialogContent>
          {editRole && (
            <Box display="grid" gap={2} mt={2}>
              <TextField
                fullWidth
                label="Role key"
                value={editRole.roleKey}
                disabled
                helperText="Role key cannot be changed"
              />
              <TextField
                fullWidth
                label="Display name"
                value={editRole.displayName}
                onChange={(e) => setEditRole({ ...editRole, displayName: e.target.value })}
              />
              <TextField
                fullWidth
                label="Description"
                value={editRole.description ?? ''}
                onChange={(e) => setEditRole({ ...editRole, description: e.target.value })}
                placeholder="Optional"
                multiline
                rows={2}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenEditRoleDialog(false); setEditRole(null) }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleEditRole}
            disabled={roleSubmitLoading || !editRole?.displayName?.trim()}
          >
            {roleSubmitLoading ? 'Saving...' : 'Save changes'}
          </Button>
        </DialogActions>
      </Dialog>

      <CenteredMessage
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        autoHideDuration={6000}
      />
    </Box>
  )
}

export default UserManagement

