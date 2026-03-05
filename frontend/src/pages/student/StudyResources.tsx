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
  Snackbar,
} from '@mui/material'
import {
  Description,
  VideoLibrary,
  Image,
  PictureAsPdf,
  Download,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { getStudentStudyResources, downloadStudyResource, type StudyResource } from '../../lib/api'

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
    <Box>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Box mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Study Resources
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Download learning materials shared by your teachers
        </Typography>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      ) : resources.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
              No study resources available yet.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(4, 1fr)' }} gap={2} mb={3}>
            <Card sx={{ bgcolor: '#f0f9ff', border: '1px solid #bae6fd' }}>
              <CardContent>
                <Typography variant="h5" fontWeight="bold" color="#0369a1">
                  {resources.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">Total Resources</Typography>
              </CardContent>
            </Card>
            <Card sx={{ bgcolor: '#fef2f2', border: '1px solid #fecaca' }}>
              <CardContent>
                <Typography variant="h5" fontWeight="bold" color="#991b1b">
                  {resources.filter((r) => r.type === 'PDF').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">PDFs</Typography>
              </CardContent>
            </Card>
            <Card sx={{ bgcolor: '#f5f3ff', border: '1px solid #ddd6fe' }}>
              <CardContent>
                <Typography variant="h5" fontWeight="bold" color="#6d28d9">
                  {resources.filter((r) => r.type === 'Video').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">Videos</Typography>
              </CardContent>
            </Card>
            <Card sx={{ bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <CardContent>
                <Typography variant="h5" fontWeight="bold" color="#15803d">
                  {resources.reduce((sum, r) => sum + (r.downloads || 0), 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">Total Downloads</Typography>
              </CardContent>
            </Card>
          </Box>

          <Box display="grid" gap={2}>
            {resources.map((resource, index) => (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card>
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
                          <Typography variant="h6" fontWeight="bold">
                            {resource.title}
                          </Typography>
                          <Box display="flex" gap={2} mt={0.5} flexWrap="wrap">
                            <Typography variant="caption" color="text.secondary">
                              📚 {resource.class_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              📦 {resource.size}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              📅 {resource.uploadDate}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              👤 {resource.teacherName || '—'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ⬇️ {resource.downloads ?? 0} downloads
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
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          '&:hover': { background: 'linear-gradient(135deg, #5568d3 0%, #6941a0 100%)' },
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
        </>
      )}
    </Box>
  )
}

export default StudentStudyResources
