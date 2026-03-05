import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Avatar,
  Chip,
  Divider,
  IconButton,
  InputAdornment,
  CircularProgress,
} from '@mui/material'
import {
  Person,
  Email,
  Phone,
  School,
  LocationOn,
  Edit,
  Save,
  Lock,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { getStudentProfile, saveStudentProfile, changePassword, type StudentProfile } from '../../lib/api'

const Profile: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileData, setProfileData] = useState<
    StudentProfile & {
      studentId: string
      major: string
      year: string
      gpa: string
      address: string
      phone: string
    }
  >({
    fullName: '',
    email: '',
    phone: '',
    studentId: '',
    major: '',
    year: '',
    gpa: '',
    address: '',
  })

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true)
        const data = await getStudentProfile()
        setProfileData({
          fullName: data.fullName || '',
          email: data.email,
          phone: data.phone || '',
          studentId: data.studentId || '',
          major: data.major || '',
          year: data.year || '',
          gpa: data.gpa || '',
          address: data.address || '',
        })
        setProfileError(null)
      } catch (err: any) {
        console.error('Failed to load student profile:', err)
        setProfileError(err?.message || 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  const handleInputChange = (field: string, value: string) => {
    setProfileData({ ...profileData, [field]: value })
  }

  const [saving, setSaving] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Current password and new password (min 6 chars) required.' })
      return
    }
    setPasswordSaving(true)
    setPasswordMessage(null)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setPasswordMessage({ type: 'success', text: 'Password changed successfully.' })
    } catch (e: any) {
      setPasswordMessage({ type: 'error', text: e.message || 'Failed to change password.' })
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const payload: StudentProfile = {
        fullName: profileData.fullName,
        email: profileData.email,
        phone: profileData.phone,
        studentId: profileData.studentId,
        major: profileData.major,
        year: profileData.year,
        gpa: profileData.gpa,
        address: profileData.address,
      }
      const updated = await saveStudentProfile(payload)
      setProfileData({
        fullName: updated.fullName || payload.fullName,
        email: updated.email,
        phone: updated.phone || '',
        studentId: updated.studentId || payload.studentId || '',
        major: updated.major || payload.major || '',
        year: updated.year || payload.year || '',
        gpa: updated.gpa || payload.gpa || '',
        address: updated.address || payload.address || '',
      })
      setIsEditing(false)
      setProfileError(null)
    } catch (err: any) {
      console.error('Failed to save student profile:', err)
      setProfileError(err?.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" mb={1}>
        Profile & Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Manage your personal information
      </Typography>

      {profileError && (
        <Typography variant="body2" color="error" mb={2}>
          {profileError}
        </Typography>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : (
      <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 2fr' }} gap={3}>
        {/* Profile Info Card */}
        <Box>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <Avatar
                  sx={{
                    width: 120,
                    height: 120,
                    bgcolor: '#6366f1',
                    margin: '0 auto',
                    mb: 2,
                  }}
                >
                  {profileData.fullName.charAt(0).toUpperCase()}
                </Avatar>
              </motion.div>

              <Typography variant="h6" fontWeight="bold" mb={0.5}>
                {profileData.fullName}
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={1}>
                {profileData.studentId}
              </Typography>
              <Chip
                label={`${profileData.year} - ${profileData.major}`}
                sx={{ bgcolor: '#e0e7ff', color: '#3730a3', mb: 2 }}
              />

              <Divider sx={{ my: 2 }} />

              <Box textAlign="left">
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Email fontSize="small" color="action" />
                  <Typography variant="body2">{profileData.email}</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Phone fontSize="small" color="action" />
                  <Typography variant="body2">{profileData.phone}</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <School fontSize="small" color="action" />
                  <Typography variant="body2">GPA: {profileData.gpa}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

        </Box>

        {/* Edit Profile Form */}
        <Box>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" fontWeight="bold">
                  Personal Information
                </Typography>
                {!isEditing ? (
                  <Button
                    variant="contained"
                    startIcon={<Edit />}
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Profile
                  </Button>
                ) : (
                  <Box display="flex" gap={1}>
                    <Button variant="outlined" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button variant="contained" startIcon={<Save />} onClick={handleSave} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </Box>
                )}
              </Box>

              <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, 1fr)' }} gap={3}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={profileData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  disabled={!isEditing}
                  InputProps={{
                    startAdornment: <Person sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
                <TextField
                  fullWidth
                  label="Student ID"
                  value={profileData.studentId}
                  disabled
                />
                <TextField
                  fullWidth
                  label="Email Address"
                  value={profileData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={!isEditing}
                  InputProps={{
                    startAdornment: <Email sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={profileData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  disabled={!isEditing}
                  InputProps={{
                    startAdornment: <Phone sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
                <TextField
                  fullWidth
                  label="Major"
                  value={profileData.major}
                  onChange={(e) => handleInputChange('major', e.target.value)}
                  disabled={!isEditing}
                  InputProps={{
                    startAdornment: <School sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
                <TextField
                  fullWidth
                  label="Academic Year"
                  value={profileData.year}
                  onChange={(e) => handleInputChange('year', e.target.value)}
                  disabled={!isEditing}
                />
                <Box gridColumn={{ xs: 'span 1', md: 'span 2' }}>
                  <TextField
                    fullWidth
                    label="Address"
                    value={profileData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    disabled={!isEditing}
                    multiline
                    rows={2}
                    InputProps={{
                      startAdornment: <LocationOn sx={{ mr: 1, color: 'action.active' }} />,
                    }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Change password */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Lock color="action" />
                <Typography variant="h6" fontWeight="bold">
                  Change password
                </Typography>
              </Box>
              <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr auto' }} gap={2} alignItems="flex-end">
                <TextField
                  fullWidth
                  label="Current password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  size="small"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                          onClick={() => setShowCurrentPassword((v) => !v)}
                          edge="end"
                          size="small"
                        >
                          {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  fullWidth
                  label="New password (min 6)"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  size="small"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                          onClick={() => setShowNewPassword((v) => !v)}
                          edge="end"
                          size="small"
                        >
                          {showNewPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Button variant="contained" onClick={handleChangePassword} disabled={passwordSaving}>
                  {passwordSaving ? 'Saving...' : 'Change password'}
                </Button>
              </Box>
              {passwordMessage && (
                <Typography variant="body2" color={passwordMessage.type === 'success' ? 'success.main' : 'error.main'} sx={{ mt: 1 }}>
                  {passwordMessage.text}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
      )}
    </Box>
  )
}

export default Profile

