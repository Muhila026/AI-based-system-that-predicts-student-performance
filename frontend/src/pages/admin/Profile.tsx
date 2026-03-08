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
} from '@mui/material'
import {
  Person,
  Email,
  AdminPanelSettings,
  Edit,
  Save,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { saveAdminProfile, getCurrentUser } from '../../lib/api'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

const AdminProfile: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    role: '',
  })

  useEffect(() => {
    const user = getCurrentUser()
    const displayRole = (user.role || 'admin').charAt(0).toUpperCase() + (user.role || 'admin').slice(1)
    setProfileData({
      fullName: user.name || 'Admin',
      email: user.email || '',
      role: displayRole,
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    await saveAdminProfile({ fullName: profileData.fullName, email: profileData.email })
    // Keep UI in sync: update stored user name if present
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        user.name = profileData.fullName
        const storage = localStorage.getItem('user') ? localStorage : sessionStorage
        storage.setItem('user', JSON.stringify(user))
      } catch {
        // ignore
      }
    }
    setSaving(false)
    setIsEditing(false)
  }

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      <Box sx={{ mb: 3, pb: 3, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}>
          Admin Profile
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          Your administrator account information
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' }, gap: 3 }}>
        {/* Profile summary card */}
        <Box>
          <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}` }}>
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
                  {profileData.fullName ? profileData.fullName.charAt(0).toUpperCase() : 'A'}
                </Avatar>
              </motion.div>

              <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }} mb={0.5}>
                {profileData.fullName || 'Admin'}
              </Typography>
              <Chip
                icon={<AdminPanelSettings />}
                label={profileData.role}
                sx={{ bgcolor: THEME.primaryLight, color: THEME.primary, mb: 2, borderRadius: 0 }}
              />

              <Divider sx={{ my: 2 }} />

              <Box textAlign="left">
                <Box display="flex" alignItems="center" gap={1}>
                  <Email fontSize="small" color="action" />
                  <Typography variant="body2">{profileData.email || '—'}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Edit form: only name editable; email and role read-only */}
        <Box>
          <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}` }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>
                  Account details
                </Typography>
                {!isEditing ? (
                  <Button
                    variant="contained"
                    startIcon={<Edit />}
                    onClick={() => setIsEditing(true)}
                    sx={{
                      backgroundColor: THEME.primary,
                      borderRadius: 0,
                      textTransform: 'none',
                      fontWeight: 600,
                      '&:hover': { backgroundColor: '#1e40af' },
                    }}
                  >
                    Edit name
                  </Button>
                ) : (
                  <Box display="flex" gap={1}>
                    <Button variant="outlined" onClick={() => setIsEditing(false)} sx={{ borderRadius: 0, textTransform: 'none' }}>
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<Save />}
                      onClick={handleSave}
                      disabled={saving}
                      sx={{
                        backgroundColor: THEME.primary,
                        borderRadius: 0,
                        textTransform: 'none',
                        fontWeight: 600,
                        '&:hover': { backgroundColor: '#1e40af' },
                      }}
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                  </Box>
                )}
              </Box>

              <Box display="flex" flexDirection="column" gap={3}>
                <TextField
                  fullWidth
                  label="Full name"
                  value={profileData.fullName}
                  onChange={(e) => setProfileData((prev) => ({ ...prev, fullName: e.target.value }))}
                  disabled={!isEditing}
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
                <TextField
                  fullWidth
                  label="Role"
                  value={profileData.role}
                  disabled
                  InputProps={{
                    startAdornment: <AdminPanelSettings sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  )
}

export default AdminProfile

