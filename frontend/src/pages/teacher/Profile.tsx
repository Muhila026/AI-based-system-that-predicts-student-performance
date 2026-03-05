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
} from '@mui/material'
import {
  Person,
  Email,
  Phone,
  School,
  Edit,
  Save,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { getTeacherProfile, saveTeacherProfile, type TeacherProfile } from '../../lib/api'

const TeacherProfile: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
    } catch (err: any) {
      console.error('Failed to save teacher profile:', err)
      setError(err?.message || 'Failed to save profile')
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
        Manage your account information
      </Typography>

      {error && (
        <Typography variant="body2" color="error" mb={2}>
          {error}
        </Typography>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : (
      <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 2fr' }} gap={3}>
        {/* Profile Card */}
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
                    fontSize: '3rem',
                    margin: '0 auto',
                    mb: 2,
                  }}
                >
                  👨‍🏫
                </Avatar>
              </motion.div>

              <Typography variant="h6" fontWeight="bold" mb={0.5}>
                {profileData.fullName}
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={1}>
                {profileData.teacherId}
              </Typography>
              <Chip
                label={profileData.department}
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
                  <Typography variant="body2">{profileData.experience} experience</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

        </Box>

        {/* Edit Form */}
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
                    disabled={saving}
                  >
                    Edit Profile
                  </Button>
                ) : (
                  <Box display="flex" gap={1}>
                    <Button
                      variant="outlined"
                      onClick={() => setIsEditing(false)}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<Save />}
                      onClick={handleSave}
                      disabled={saving}
                    >
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
                  label="Teacher ID"
                  value={profileData.teacherId}
                  disabled
                />
                <TextField
                  fullWidth
                  label="Email Address"
                  value={profileData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled
                  InputProps={{
                    startAdornment: <Email sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={profileData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  disabled={!isEditing || saving}
                  InputProps={{
                    startAdornment: <Phone sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
                <TextField
                  fullWidth
                  label="Department"
                  value={profileData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  disabled={!isEditing || saving}
                />
                <TextField
                  fullWidth
                  label="Experience"
                  value={profileData.experience}
                  onChange={(e) => handleInputChange('experience', e.target.value)}
                  disabled={!isEditing || saving}
                />
              </Box>

              <Box mt={3}>
                <Typography variant="body2" fontWeight="bold" mb={1}>
                  Subjects Teaching:
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {profileData.subjects.map((subject, index) => (
                    <Chip key={index} label={subject} sx={{ bgcolor: '#f3f4f6' }} />
                  ))}
                </Box>
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

