import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  CircularProgress,
} from '@mui/material'
import CenteredMessage from '../../components/CenteredMessage'
import {
  CheckCircle,
  Cancel,
  Description,
  VideoLibrary,
  Image,
  PictureAsPdf,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import {
  getStudyResourcesPending,
  approveStudyResource,
  rejectStudyResource,
  type StudyResource,
} from '../../lib/api'
import { useAppWebSocket } from '../../hooks/useChatWebSocket'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

const StudyResourceApproval: React.FC = () => {
  const [resources, setResources] = useState<StudyResource[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })

  const loadPending = async () => {
    try {
      setLoading(true)
      const data = await getStudyResourcesPending()
      setResources(data)
    } catch (error) {
      console.error('Failed to load pending resources:', error)
      setSnackbar({ open: true, message: 'Failed to load pending resources', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPending()
  }, [])

  useAppWebSocket((data) => {
    if (data?.type === 'study_resource_pending' && data.resource) {
      setResources((prev) => {
        const r = data.resource as StudyResource
        if (prev.some((x) => x.id === r.id)) return prev
        return [r, ...prev]
      })
    }
    if (data?.type === 'study_resource_status' && data.resourceId) {
      setResources((prev) => prev.filter((r) => r.id !== data.resourceId))
    }
  })

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

  const handleApprove = async (resource: StudyResource) => {
    try {
      setActingId(resource.id)
      await approveStudyResource(resource.id)
      setSnackbar({ open: true, message: 'Resource approved. Students in that subject can now view it.', severity: 'success' })
      await loadPending()
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Failed to approve', severity: 'error' })
    } finally {
      setActingId(null)
    }
  }

  const handleReject = async (resource: StudyResource) => {
    try {
      setActingId(resource.id)
      await rejectStudyResource(resource.id)
      setSnackbar({ open: true, message: 'Resource rejected', severity: 'success' })
      await loadPending()
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Failed to reject', severity: 'error' })
    } finally {
      setActingId(null)
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
          Approve Study Resources
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          Accept or reject resources uploaded by teachers. Approved resources become visible to students in that subject.
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
              No pending study resources. Teachers upload resources for their subjects; they appear here for your approval.
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
                          bgcolor: THEME.primaryLight,
                          borderRadius: 1,
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
                        <Box display="flex" gap={2} mt={0.5} flexWrap="wrap" alignItems="center">
                          <Chip
                            size="small"
                            label={resource.subject_name || resource.class_name || 'No subject'}
                            sx={{ bgcolor: '#e0e7ff', color: '#4338ca' }}
                          />
                          <Typography variant="caption" sx={{ color: THEME.muted }}>
                            by {resource.teacherName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: THEME.muted }}>
                            {resource.size}
                          </Typography>
                          <Typography variant="caption" sx={{ color: THEME.muted }}>
                            {resource.type}
                          </Typography>
                        </Box>
                        {resource.description && (
                          <Typography variant="body2" sx={{ color: THEME.muted }} mt={1}>
                            {resource.description}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <Box display="flex" gap={1}>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<CheckCircle />}
                        onClick={() => handleApprove(resource)}
                        disabled={actingId === resource.id}
                        sx={{
                          backgroundColor: '#15803d',
                          color: 'white',
                          borderRadius: 0,
                          textTransform: 'none',
                          fontWeight: 600,
                          '&:hover': { backgroundColor: '#166534' },
                        }}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        startIcon={<Cancel />}
                        onClick={() => handleReject(resource)}
                        disabled={actingId === resource.id}
                        sx={{ borderRadius: 0, textTransform: 'none' }}
                      >
                        Reject
                      </Button>
                    </Box>
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

export default StudyResourceApproval
