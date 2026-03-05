import React, { useState } from 'react'
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
  Phone,
  AdminPanelSettings,
  Edit,
  Save,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { saveAdminProfile } from '../../lib/api'

const AdminProfile: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false)
  const [profileData, setProfileData] = useState({
    fullName: 'Admin Smith',
    email: 'admin.smith@edu.com',
    phone: '+1 (555) 123-4567',
    adminId: 'ADM-2025-001',
    role: 'Super Admin',
    department: 'System Administration',
  })

  const handleInputChange = (field: string, value: string) => {
    setProfileData({ ...profileData, [field]: value })
  }

  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await saveAdminProfile({ profileData })
    setSaving(false)
    setIsEditing(false)
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" mb={1}>
        Admin Profile
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Manage your administrator account settings
      </Typography>

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
                    bgcolor: '#ef4444',
                    fontSize: '3rem',
                    margin: '0 auto',
                    mb: 2,
                  }}
                >
                  👨‍💼
                </Avatar>
              </motion.div>

              <Typography variant="h6" fontWeight="bold" mb={0.5}>
                {profileData.fullName}
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={1}>
                {profileData.adminId}
              </Typography>
              <Chip
                icon={<AdminPanelSettings />}
                label={profileData.role}
                sx={{ bgcolor: '#fee2e2', color: '#991b1b', mb: 2 }}
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
                  <AdminPanelSettings fontSize="small" color="action" />
                  <Typography variant="body2">{profileData.department}</Typography>
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
                  label="Admin ID"
                  value={profileData.adminId}
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
                  label="Role"
                  value={profileData.role}
                  disabled
                />
                <TextField
                  fullWidth
                  label="Department"
                  value={profileData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  disabled={!isEditing}
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

