import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material'
import {
  CloudUpload,
  Description,
  VideoLibrary,
  Image,
  PictureAsPdf,
  Delete,
  Download,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { getStudyResources, uploadStudyResource, deleteStudyResource, downloadStudyResource, type StudyResource } from '../../lib/api'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

const StudyResources: React.FC = () => {
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [resources, setResources] = useState<StudyResource[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })
  const [newResource, setNewResource] = useState({
    title: '',
    class: '',
    type: '',
    description: '',
  })

  useEffect(() => {
    loadResources()
  }, [])

  const loadResources = async () => {
    try {
      setLoading(true)
      const data = await getStudyResources()
      setResources(data)
    } catch (error) {
      console.error('Failed to load resources:', error)
      setSnackbar({
        open: true,
        message: 'Failed to load study resources',
        severity: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !newResource.title || !newResource.class || !newResource.type) {
      setSnackbar({
        open: true,
        message: 'Please fill in all required fields and select a file',
        severity: 'error',
      })
      return
    }

    try {
      setUploading(true)
      await uploadStudyResource(
        selectedFile,
        newResource.title,
        newResource.class,
        newResource.type as 'PDF' | 'Video' | 'Image' | 'Other',
        newResource.description || undefined
      )
      setSnackbar({
        open: true,
        message: 'Resource uploaded successfully',
        severity: 'success',
      })
      setOpenDialog(false)
      setSelectedFile(null)
      setNewResource({ title: '', class: '', type: '', description: '' })
      await loadResources()
    } catch (error: any) {
      console.error('Upload failed:', error)
      setSnackbar({
        open: true,
        message: error.message || 'Failed to upload resource',
        severity: 'error',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (resourceId: string) => {
    if (!window.confirm('Are you sure you want to delete this resource?')) {
      return
    }

    try {
      await deleteStudyResource(resourceId)
      setSnackbar({
        open: true,
        message: 'Resource deleted successfully',
        severity: 'success',
      })
      await loadResources()
    } catch (error: any) {
      console.error('Delete failed:', error)
      setSnackbar({
        open: true,
        message: error.message || 'Failed to delete resource',
        severity: 'error',
      })
    }
  }

  const handleDownload = async (resource: StudyResource) => {
    try {
      await downloadStudyResource(resource.id, resource.fileUrl)
    } catch (error: any) {
      console.error('Download failed:', error)
      setSnackbar({
        open: true,
        message: error.message || 'Failed to download resource',
        severity: 'error',
      })
    }
  }

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
          mb: 3,
          pb: 3,
          borderBottom: `1px solid ${THEME.primaryBorder}`,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}>
            Study Resources
          </Typography>
          <Typography variant="body2" sx={{ color: THEME.muted }}>
            Upload and manage learning materials for your students
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<CloudUpload />}
          onClick={() => setOpenDialog(true)}
          sx={{
            backgroundColor: THEME.primary,
            borderRadius: 0,
            textTransform: 'none',
            fontWeight: 600,
            px: 2.5,
            py: 1.25,
            '&:hover': { backgroundColor: '#1e40af' },
          }}
        >
          Upload Resource
        </Button>
      </Box>

      {/* Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, bgcolor: THEME.primaryLight }}>
          <CardContent sx={{ py: 2, px: 2 }}>
            <Typography variant="h4" fontWeight="700" sx={{ color: THEME.primary }}>
              {resources.length}
            </Typography>
            <Typography variant="body2" sx={{ color: THEME.muted }}>Total Resources</Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}` }}>
          <CardContent sx={{ py: 2, px: 2 }}>
            <Typography variant="h4" fontWeight="700" sx={{ color: THEME.textDark }}>
              {resources.filter(r => r.type === 'PDF').length}
            </Typography>
            <Typography variant="body2" sx={{ color: THEME.muted }}>PDF Documents</Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}` }}>
          <CardContent sx={{ py: 2, px: 2 }}>
            <Typography variant="h4" fontWeight="700" sx={{ color: THEME.textDark }}>
              {resources.filter(r => r.type === 'Video').length}
            </Typography>
            <Typography variant="body2" sx={{ color: THEME.muted }}>Video Lectures</Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}` }}>
          <CardContent sx={{ py: 2, px: 2 }}>
            <Typography variant="h4" fontWeight="700" sx={{ color: THEME.textDark }}>
              {resources.reduce((sum, r) => sum + (r.downloads || 0), 0)}
            </Typography>
            <Typography variant="body2" sx={{ color: THEME.muted }}>Total Downloads</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Resources List */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress sx={{ color: THEME.primary }} />
        </Box>
      ) : resources.length === 0 ? (
        <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}` }}>
          <CardContent>
            <Typography variant="body1" sx={{ color: THEME.muted }} textAlign="center" py={4}>
              No study resources uploaded yet. Click "Upload Resource" to get started.
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
              transition={{ delay: index * 0.1 }}
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
                        <Box display="flex" gap={2} mt={0.5} flexWrap="wrap">
                          <Typography variant="caption" sx={{ color: THEME.muted }}>
                            📚 {resource.class_name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: THEME.muted }}>
                            📦 {resource.size}
                          </Typography>
                          <Typography variant="caption" sx={{ color: THEME.muted }}>
                            📅 {resource.uploadDate}
                          </Typography>
                          <Typography variant="caption" sx={{ color: THEME.muted }}>
                            ⬇️ {resource.downloads ?? 0} downloads
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        label={resource.type}
                        size="small"
                        sx={{
                          bgcolor: resource.type === 'PDF' ? '#fee2e2' : resource.type === 'Video' ? '#f5f3ff' : '#dcfce7',
                          color: resource.type === 'PDF' ? '#991b1b' : resource.type === 'Video' ? '#6d28d9' : '#15803d',
                        }}
                      />
                    </Box>
                    <Box display="flex" gap={1}>
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
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        startIcon={<Delete />}
                        onClick={() => handleDelete(resource.id)}
                        sx={{ borderRadius: 0, textTransform: 'none' }}
                      >
                        Delete
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </Box>
      )}

      {/* Upload Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight="700" sx={{ color: THEME.textDark }}>
            Upload Study Resource
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box display="grid" gap={3} mt={2}>
            <TextField
              fullWidth
              label="Resource Title"
              value={newResource.title}
              onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Class</InputLabel>
              <Select
                value={newResource.class}
                label="Class"
                onChange={(e) => setNewResource({ ...newResource, class: e.target.value })}
              >
                <MenuItem value="Math A">Math A</MenuItem>
                <MenuItem value="Physics B">Physics B</MenuItem>
                <MenuItem value="Chemistry C">Chemistry C</MenuItem>
                <MenuItem value="Biology D">Biology D</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Resource Type</InputLabel>
              <Select
                value={newResource.type}
                label="Resource Type"
                onChange={(e) => setNewResource({ ...newResource, type: e.target.value })}
              >
                <MenuItem value="PDF">PDF Document</MenuItem>
                <MenuItem value="Video">Video</MenuItem>
                <MenuItem value="Image">Image</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={newResource.description}
              onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
            />
            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUpload />}
              fullWidth
            >
              {selectedFile ? selectedFile.name : 'Choose File'}
              <input type="file" hidden onChange={handleFileSelect} />
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={!selectedFile || uploading || !newResource.title || !newResource.class || !newResource.type}
            sx={{
              backgroundColor: THEME.primary,
              borderRadius: 0,
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { backgroundColor: '#1e40af' },
            }}
          >
            {uploading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default StudyResources

