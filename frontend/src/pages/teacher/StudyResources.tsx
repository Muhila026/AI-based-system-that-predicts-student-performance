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
    <Box>
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

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Study Resources
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload and manage learning materials for your students
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<CloudUpload />}
          onClick={() => setOpenDialog(true)}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5568d3 0%, #6941a0 100%)',
            },
          }}
        >
          Upload Resource
        </Button>
      </Box>

      {/* Stats */}
      <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(4, 1fr)' }} gap={2} mb={3}>
        <Card sx={{ bgcolor: '#f0f9ff', border: '1px solid #bae6fd' }}>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" color="#0369a1">
              {resources.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Resources
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ bgcolor: '#fef2f2', border: '1px solid #fecaca' }}>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" color="#991b1b">
              {resources.filter(r => r.type === 'PDF').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              PDF Documents
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ bgcolor: '#f5f3ff', border: '1px solid #ddd6fe' }}>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" color="#6d28d9">
              {resources.filter(r => r.type === 'Video').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Video Lectures
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" color="#15803d">
              {resources.reduce((sum, r) => sum + r.downloads, 0)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Downloads
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Resources List */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      ) : resources.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
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
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
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
                            ⬇️ {resource.downloads} downloads
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
                        variant="outlined"
                        size="small"
                        startIcon={<Download />}
                        onClick={() => handleDownload(resource)}
                      >
                        Download
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        startIcon={<Delete />}
                        onClick={() => handleDelete(resource.id)}
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
          <Typography variant="h6" fontWeight="bold">
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
          >
            {uploading ? <CircularProgress size={20} /> : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default StudyResources

