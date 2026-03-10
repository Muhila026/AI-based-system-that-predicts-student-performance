import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Avatar,
  Divider,
  IconButton,
  InputAdornment,
  CircularProgress,
} from '@mui/material'
import {
  Person,
  Email,
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

  const THEME = {
    primary: '#1e3a8a',
    primaryLight: '#EFF6FF',
    primaryBorder: '#DBEAFE',
    muted: '#6b7280',
    textDark: '#1f2937',
  }

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      <Box sx={{ mb: 3, pb: 3, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}>
          Profile & Settings
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          Your account information
        </Typography>
      </Box>

      {profileError && (
        <Typography variant="body2" sx={{ color: '#991b1b', mb: 2 }}>
          {profileError}
        </Typography>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress sx={{ color: THEME.primary }} />
        </Box>
      ) : (
      <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 2fr' }} gap={3}>
        <Box>
          <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
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
                    bgcolor: THEME.primary,
                    margin: '0 auto',
                    mb: 2,
                  }}
                >
                  {profileData.fullName ? profileData.fullName.charAt(0).toUpperCase() : 'S'}
                </Avatar>
              </motion.div>

              <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }} mb={0.5}>
                {profileData.fullName || 'Student'}
              </Typography>

              <Divider sx={{ my: 2, borderColor: THEME.primaryBorder }} />

              <Box textAlign="left">
                <Box display="flex" alignItems="center" gap={1}>
                  <Email fontSize="small" sx={{ color: THEME.muted }} />
                  <Typography variant="body2" sx={{ color: THEME.textDark }}>{profileData.email}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box>
          <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} sx={{ pb: 2, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
                <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>
                  Personal Information
                </Typography>
                {!isEditing ? (
                  <Button
                    variant="contained"
                    startIcon={<Edit />}
                    onClick={() => setIsEditing(true)}
                    disabled={saving}
                    sx={{ borderRadius: 0, bgcolor: THEME.primary, '&:hover': { bgcolor: '#1e40af' } }}
                  >
                    Edit Profile
                  </Button>
                ) : (
                  <Box display="flex" gap={1}>
                    <Button variant="outlined" onClick={() => setIsEditing(false)} disabled={saving} sx={{ borderRadius: 0, borderColor: THEME.primaryBorder, color: THEME.primary }}>
                      Cancel
                    </Button>
                    <Button variant="contained" startIcon={<Save />} onClick={handleSave} disabled={saving} sx={{ borderRadius: 0, bgcolor: THEME.primary, '&:hover': { bgcolor: '#1e40af' } }}>
                      {saving ? 'Saving...' : 'Save'}
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
                  disabled={!isEditing || saving}
                  InputProps={{
                    startAdornment: <Person sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
                <TextField
                  fullWidth
                  label="Email"
                  value={profileData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={!isEditing || saving}
                  InputProps={{
                    startAdornment: <Email sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
              </Box>
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ mt: 3, border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Lock sx={{ color: THEME.primary }} />
                <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>
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
                <Button
                  variant="contained"
                  onClick={handleChangePassword}
                  disabled={passwordSaving}
                  sx={{ borderRadius: 0, bgcolor: THEME.primary, '&:hover': { bgcolor: '#1e40af' } }}
                >
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

