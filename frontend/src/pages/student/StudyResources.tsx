import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material'
import CenteredMessage from '../../components/CenteredMessage'
import {
  Description,
  VideoLibrary,
  Image,
  PictureAsPdf,
  Download,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { getStudentStudyResources, downloadStudyResource, type StudyResource } from '../../lib/api'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

const StudentStudyResources: React.FC = () => {
  const [resources, setResources] = useState<StudyResource[]>([])
  const [loading, setLoading] = useState(true)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })

  useEffect(() => {
    loadResources()
  }, [])

  const loadResources = async () => {
    try {
      setLoading(true)
      const data = await getStudentStudyResources()
      setResources(data)
    } catch (error) {
      console.error('Failed to load resources:', error)
      setSnackbar({ open: true, message: 'Failed to load study resources', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const getFileIcon = (type: string) => {
    switch ((type || '').toLowerCase()) {
      case 'pdf':
        return <PictureAsPdf sx={{ color: '#ef4444' }} />
      case 'video':
        return <VideoLibrary sx={{ color: '#8b5cf6' }} />
      case 'image':
        return <Image sx={{ color: '#10b981' }} />
      default:
        return <Description sx={{ color: '#3b82f6' }} />
    }
  }

  const handleDownload = async (resource: StudyResource) => {
    try {
      await downloadStudyResource(resource.id, resource.fileUrl)
      setSnackbar({ open: true, message: 'Download started', severity: 'success' })
      await loadResources()
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Failed to download', severity: 'error' })
    }
  }

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      <CenteredMessage
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        autoHideDuration={6000}
      />

      <Box sx={{ mb: 3, pb: 3, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}>
          Study Resources
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          Learning materials from your teachers
        </Typography>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="280px">
          <CircularProgress sx={{ color: THEME.primary }} />
        </Box>
      ) : resources.length === 0 ? (
        <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
          <CardContent>
            <Typography variant="body2" sx={{ color: THEME.muted }} textAlign="center" py={4}>
              No resources yet.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box display="grid" gap={2}>
            {resources.map((resource, index) => (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}` }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
                      <Box display="flex" alignItems="center" gap={2} flexGrow={1}>
                        <Box
                          sx={{
                            width: 56,
                            height: 56,
                            bgcolor: '#f9fafb',
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {getFileIcon(resource.type)}
                        </Box>
                        <Box flexGrow={1}>
                          <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>
                            {resource.title}
                          </Typography>
                          <Box display="flex" gap={2} mt={0.5} flexWrap="wrap">
                            <Typography variant="caption" sx={{ color: THEME.muted }}>
                              {resource.class_name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: THEME.muted }}>
                              {resource.size}
                            </Typography>
                            <Typography variant="caption" sx={{ color: THEME.muted }}>
                              {resource.uploadDate}
                            </Typography>
                            <Typography variant="caption" sx={{ color: THEME.muted }}>
                              {resource.teacherName || '—'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: THEME.muted }}>
                              {resource.downloads ?? 0} downloads
                            </Typography>
                          </Box>
                        </Box>
                        <Chip
                          label={resource.type}
                          size="small"
                          sx={{
                            bgcolor:
                              resource.type === 'PDF'
                                ? '#fee2e2'
                                : resource.type === 'Video'
                                  ? '#f5f3ff'
                                  : '#dcfce7',
                            color:
                              resource.type === 'PDF'
                                ? '#991b1b'
                                : resource.type === 'Video'
                                  ? '#6d28d9'
                                  : '#15803d',
                          }}
                        />
                      </Box>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<Download />}
                        onClick={() => handleDownload(resource)}
                        sx={{
                          backgroundColor: THEME.primary,
                          borderRadius: 0,
                          textTransform: 'none',
                          fontWeight: 600,
                          '&:hover': { backgroundColor: '#1e40af' },
                        }}
                      >
                        Download
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
        </Box>
      )}
    </Box>
  )
}

export default StudentStudyResources
