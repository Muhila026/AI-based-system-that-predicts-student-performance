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
  CircularProgress,
  Alert,
  IconButton,
  InputAdornment,
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
import { getTeacherProfile, saveTeacherProfile, changePassword, type TeacherProfile } from '../../lib/api'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

const TeacherProfile: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [profileData, setProfileData] = useState<
    TeacherProfile & { subjects: string[] }
  >({
    fullName: '',
    email: '',
    phone: '',
    teacherId: '',
    department: '',
    experience: '',
    subjects: [],
  })

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true)
        const data = await getTeacherProfile()
        setProfileData({
          fullName: data.fullName || '',
          email: data.email,
          phone: data.phone || '',
          teacherId: data.teacherId || '',
          department: data.department || '',
          experience: data.experience || '',
          subjects: data.subjects || [],
        })
        setError(null)
      } catch (err: any) {
        console.error('Failed to load teacher profile:', err)
        setError(err?.message || 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  const handleInputChange = (field: string, value: string) => {
    setProfileData({ ...profileData, [field]: value })
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccessMessage(null)
      const updated = await saveTeacherProfile(profileData)
      setProfileData({
        fullName: updated.fullName || profileData.fullName,
        email: updated.email,
        phone: updated.phone || '',
        teacherId: updated.teacherId || '',
        department: updated.department || '',
        experience: updated.experience || '',
        subjects: updated.subjects || profileData.subjects,
      })
      setIsEditing(false)
      setSuccessMessage('Profile saved successfully.')
    } catch (err: any) {
      console.error('Failed to save teacher profile:', err)
      setError(err?.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Current password and new password (min 6 characters) required.' })
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
      setPasswordMessage({ type: 'error', text: e?.message || 'Failed to change password.' })
    } finally {
      setPasswordSaving(false)
    }
  }

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      <Box sx={{ mb: 3, pb: 3, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}>
          Profile & Settings
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          Manage your account information
        </Typography>
      </Box>

      {successMessage && (
        <Alert severity="success" onClose={() => setSuccessMessage(null)} sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress sx={{ color: THEME.primary }} />
        </Box>
      ) : (
      <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 2fr' }} gap={3}>
        {/* Profile Card */}
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
                    fontSize: '3rem',
                    margin: '0 auto',
                    mb: 2,
                  }}
                >
                  👨‍🏫
                </Avatar>
              </motion.div>

              <Typography variant="h6" fontWeight="bold" mb={0.5} sx={{ color: THEME.textDark }}>
                {profileData.fullName}
              </Typography>
              {profileData.teacherId && (
                <Typography variant="caption" sx={{ color: THEME.muted, display: 'block', mb: 1 }}>
                  {profileData.teacherId}
                </Typography>
              )}

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

        {/* Edit Form */}
        <Box>
          <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} sx={{ pb: 2, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
                <Typography variant="h6" fontWeight="bold" sx={{ color: THEME.textDark }}>
                  Personal Information
                </Typography>
                {!isEditing ? (
                  <Button variant="contained" startIcon={<Edit />} onClick={() => setIsEditing(true)} disabled={saving} sx={{ borderRadius: 0, bgcolor: THEME.primary, '&:hover': { bgcolor: '#1e40af' } }}>
                    Edit Profile
                  </Button>
                ) : (
                  <Box display="flex" gap={1}>
                    <Button variant="outlined" onClick={() => setIsEditing(false)} disabled={saving} sx={{ borderRadius: 0, borderColor: THEME.primaryBorder, color: THEME.primary }}>
                      Cancel
                    </Button>
                    <Button variant="contained" startIcon={<Save />} onClick={handleSave} disabled={saving} sx={{ borderRadius: 0, bgcolor: THEME.primary, '&:hover': { bgcolor: '#1e40af' } }}>
                      Save Changes
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
                  disabled
                  InputProps={{
                    startAdornment: <Email sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
              </Box>

              <Box mt={3}>
                <Typography variant="body2" fontWeight="bold" mb={1}>
                  Subjects Teaching
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {profileData.subjects.length === 0 ? (
                    <Typography variant="body2" sx={{ color: THEME.muted }}>None assigned</Typography>
                  ) : (
                    profileData.subjects.map((subject, index) => (
                      <Chip key={index} label={subject} sx={{ bgcolor: THEME.primaryLight, color: THEME.primary, borderRadius: 0 }} />
                    ))
                  )}
                </Box>
              </Box>

              <Divider sx={{ my: 3, borderColor: THEME.primaryBorder }} />

              <Typography variant="subtitle1" fontWeight="600" sx={{ color: THEME.textDark, mb: 2 }}>
                Change password
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Current password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  InputProps={{
                    startAdornment: <Lock sx={{ mr: 1, color: 'action.active' }} />,
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
                  size="small"
                  label="New password (min 6 characters)"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
                  variant="outlined"
                  onClick={handleChangePassword}
                  disabled={passwordSaving}
                  sx={{ alignSelf: 'flex-start', borderRadius: 0, borderColor: THEME.primary, color: THEME.primary, '&:hover': { borderColor: '#1e40af', bgcolor: THEME.primaryLight } }}
                >
                  {passwordSaving ? 'Saving...' : 'Change password'}
                </Button>
                {passwordMessage && (
                  <Typography variant="body2" sx={{ color: passwordMessage.type === 'success' ? 'success.main' : 'error.main' }}>
                    {passwordMessage.text}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>

        </Box>
      </Box>
      )}
    </Box>
  )
}

export default TeacherProfile

