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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Avatar,
  CircularProgress,
} from '@mui/material'
import { Add, Edit, Delete, Search, Block, LockReset, Visibility, VisibilityOff } from '@mui/icons-material'
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

interface UserManagementProps {
  initialOpenAddDialog?: boolean
  onAddDialogHandled?: () => void
}

const UserManagement: React.FC<UserManagementProps> = ({ initialOpenAddDialog, onAddDialogHandled }) => {
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
  const SYSTEM_ROLE_KEYS = ['Student', 'Teacher', 'Admin']

  /** Role options for user forms: system roles only, from API (displayName + roleKey) */
  const systemRoles = roles.filter((r) => SYSTEM_ROLE_KEYS.includes(r.roleKey))
  const roleOptionsForForms = systemRoles.length > 0
    ? systemRoles
    : SYSTEM_ROLE_KEYS.map((key) => ({ roleKey: key, displayName: key === 'Admin' ? 'Administrator' : key, description: '' }))

  useEffect(() => { getUsers().then(setUsers) }, [])
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
      alert('Password must be at least 6 characters')
      return
    }
    setPasswordLoading(true)
    try {
      await changeUserPassword({ email: passwordUser.email, new_password: newPassword })
      setOpenPasswordDialog(false)
      setPasswordUser(null)
      setNewPassword('')
    } catch (error: any) {
      alert(error.message || 'Failed to reset password')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.name.trim()) {
      alert('Name is required')
      return
    }
    if (!newUser.email || !newUser.email.trim()) {
      alert('Email is required')
      return
    }
    if (!newUser.role || !['Student', 'Teacher', 'Admin'].includes(newUser.role)) {
      alert('Please select a valid role')
      return
    }
    if (!newUser.password || newUser.password.length < 6) {
      alert('Password must be at least 6 characters long')
      return
    }
    try {
      await addUser({ 
        name: newUser.name.trim(), 
        email: newUser.email.trim().toLowerCase(), 
        role: newUser.role as 'Student' | 'Teacher' | 'Admin', 
        status: 'Active',
        password: newUser.password
      })
      setOpenDialog(false)
      setNewUser({ name: '', email: '', role: '', password: '' })
      setUsers(await getUsers())
    } catch (error: any) {
      const errorMessage = error.message || error.detail || 'Failed to create user'
      alert(errorMessage)
    }
  }

  const handleEditUser = async () => {
    if (!editUser) return
    if (!editUser.name || !editUser.name.trim()) {
      alert('Name is required')
      return
    }
    if (!['Student', 'Teacher', 'Admin'].includes(editUser.role)) {
      alert('Please select a valid role')
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
    } catch (error: any) {
      alert(error.message || 'Failed to update user')
    }
  }

  const handleToggleStatus = async (user: AdminUser) => {
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active'
    try {
      await updateUser(user.id, { status: newStatus })
      setUsers(await getUsers())
    } catch (error: any) {
      alert(error.message || 'Failed to update status')
    }
  }

  const handleAddRole = async () => {
    if (!newRole.roleKey?.trim() || !newRole.displayName?.trim()) {
      alert('Role key and display name are required')
      return
    }
    const key = newRole.roleKey.trim()
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(key)) {
      alert('Role key must start with a letter and contain only letters, numbers, and underscore')
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
    } catch (error: any) {
      alert(error.message || 'Failed to add role')
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
    } catch (error: any) {
      alert(error.message || 'Failed to update role')
    } finally {
      setRoleSubmitLoading(false)
    }
  }

  const handleDeleteRole = async (roleKey: string) => {
    if (SYSTEM_ROLE_KEYS.includes(roleKey)) {
      alert('System roles (Student, Teacher, Admin) cannot be deleted.')
      return
    }
    if (!window.confirm(`Delete role "${roleKey}"? Users with this role will need to be reassigned.`)) return
    try {
      await deleteRole(roleKey)
      setRoles(await getRoles())
    } catch (error: any) {
      alert(error.message || 'Failed to delete role')
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
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            User Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add, edit, and manage system users
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
          Add User
        </Button>
      </Box>

      {/* Stats */}
      <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(4, 1fr)' }} gap={2} mb={3}>
        <Card>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" color="#0369a1">
              {users.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Users
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" color="#15803d">
              {users.filter(u => u.role === 'Student').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Students
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" color="#1e40af">
              {users.filter(u => u.role === 'Teacher').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Teachers
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" color="#991b1b">
              {users.filter(u => u.role === 'Admin').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Admins
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Search and Role Filter */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2} alignItems="stretch">
            <TextField
              sx={{ flex: 1 }}
              placeholder="Search by name, email, or role..."
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
            <FormControl sx={{ minWidth: 160 }}>
              <InputLabel>Filter by role</InputLabel>
              <Select
                value={roleFilter}
                label="Filter by role"
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <MenuItem value="">All roles</MenuItem>
                {roles.map((r) => (
                  <MenuItem key={r.roleKey} value={r.roleKey}>{r.displayName}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* User Roles Table */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight="bold">
              User Roles
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Add />}
              onClick={() => setOpenRoleDialog(true)}
            >
              Add role
            </Button>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Role</strong></TableCell>
                  <TableCell><strong>Display name</strong></TableCell>
                  <TableCell><strong>Description</strong></TableCell>
                  <TableCell align="right"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {roles.map((r) => (
                  <TableRow key={r.roleKey}>
                    <TableCell>
                      <Chip
                        label={r.roleKey}
                        size="small"
                        sx={{
                          bgcolor: getRoleColor(r.roleKey).bg,
                          color: getRoleColor(r.roleKey).color,
                        }}
                      />
                    </TableCell>
                    <TableCell>{r.displayName}</TableCell>
                    <TableCell>{r.description || '—'}</TableCell>
                    <TableCell align="right">
                      <Box display="flex" gap={0.5} justifyContent="flex-end">
                        <IconButton
                          size="small"
                          color="primary"
                          title="Edit role"
                          onClick={() => {
                            setEditRole({ ...r })
                            setOpenEditRoleDialog(true)
                          }}
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
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>User</strong></TableCell>
                  <TableCell><strong>Email</strong></TableCell>
                  <TableCell><strong>Role</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Joined Date</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} sx={{ '&:hover': { bgcolor: '#f9fafb' } }}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ bgcolor: '#6366f1', width: 32, height: 32 }}>
                          {user.name.charAt(0)}
                        </Avatar>
                        <Typography variant="body2" fontWeight={600}>
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
                              } catch (error: any) {
                                alert(error.message || 'Failed to delete user')
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
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Add New User</DialogTitle>
        <DialogContent>
          <Box display="grid" gap={3} mt={2}>
            <TextField
              fullWidth
              label="Full Name"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            />
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={newUser.role}
                label="Role"
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              >
                {roleOptionsForForms.map((r) => (
                  <MenuItem key={r.roleKey} value={r.roleKey}>{r.displayName}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Password"
              type={showAddUserPassword ? 'text' : 'password'}
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showAddUserPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowAddUserPassword((v) => !v)}
                      edge="end"
                    >
                      {showAddUserPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddUser}>
            Add User
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
                helperText="Email cannot be changed"
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
    </Box>
  )
}

export default UserManagement

