import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Snackbar,
  Alert,
} from '@mui/material'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { getAssessments, createAssessment, updateAssessment, deleteAssessment, getCourses, type Assessment, type AssessmentCreate, type AdminCourse } from '../../lib/api'

const AssessmentManagement: React.FC = () => {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [courses, setCourses] = useState<AdminCourse[]>([])
  const [openDialog, setOpenDialog] = useState(false)
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })
  const [formData, setFormData] = useState({
    course_id: '',
    assessment_type: 'EXAM' as 'EXAM' | 'QUIZ' | 'ASSIGNMENT',
    max_marks: '',
    weightage: '',
    title: '',
    description: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [assessmentsData, coursesData] = await Promise.all([
        getAssessments(),
        getCourses(),
      ])
      setAssessments(assessmentsData)
      setCourses(coursesData)
    } catch (error) {
      console.error('Error loading data:', error)
      showSnackbar('Failed to load data', 'error')
    }
  }
  
  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity })
  }

  const handleOpenDialog = (assessment?: any) => {
    if (assessment) {
      setEditingAssessment(assessment)
      setFormData({
        course_id: assessment.course_id?.toString() || '',
        assessment_type: assessment.assessment_type || 'EXAM',
        max_marks: assessment.max_marks?.toString() || '',
        weightage: assessment.weightage?.toString() || '',
        title: assessment.title || '',
        description: assessment.description || '',
      })
    } else {
      setEditingAssessment(null)
      setFormData({
        course_id: '',
        assessment_type: 'EXAM',
        max_marks: '',
        weightage: '',
        title: '',
        description: '',
      })
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingAssessment(null)
  }

  const handleSubmit = async () => {
    try {
      if (editingAssessment) {
        const updateData: any = {
          assessment_type: formData.assessment_type,
          max_marks: parseInt(formData.max_marks),
          weightage: parseFloat(formData.weightage),
        }
        if (formData.title) updateData.title = formData.title
        if (formData.description) updateData.description = formData.description
        
        await updateAssessment(editingAssessment.assessment_id, updateData)
        showSnackbar('Assessment updated successfully', 'success')
      } else {
        const newAssessment: AssessmentCreate = {
          course_id: formData.course_id,
          assessment_type: formData.assessment_type,
          max_marks: parseInt(formData.max_marks),
          weightage: parseFloat(formData.weightage),
          title: formData.title || undefined,
          description: formData.description || undefined,
        }
        await createAssessment(newAssessment)
        showSnackbar('Assessment created successfully', 'success')
      }
      handleCloseDialog()
      loadData()
    } catch (error: any) {
      showSnackbar(error.message || 'Failed to save assessment', 'error')
    }
  }

  const handleDelete = async (assessmentId: number) => {
    if (window.confirm('Are you sure you want to delete this assessment?')) {
      try {
        await deleteAssessment(assessmentId)
        showSnackbar('Assessment deleted successfully', 'success')
        loadData()
      } catch (error: any) {
        showSnackbar(error.message || 'Failed to delete assessment', 'error')
      }
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Assessment Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}
        >
          Add Assessment
        </Button>
      </Box>

      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Title</strong></TableCell>
                  <TableCell><strong>Course</strong></TableCell>
                  <TableCell><strong>Type</strong></TableCell>
                  <TableCell><strong>Max Marks</strong></TableCell>
                  <TableCell><strong>Weightage (%)</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assessments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="textSecondary">No assessments found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  assessments.map((assessment) => (
                    <TableRow key={assessment.assessment_id}>
                      <TableCell>{assessment.title || 'N/A'}</TableCell>
                      <TableCell>{assessment.course_name || assessment.module_name || 'N/A'}</TableCell>
                      <TableCell>{assessment.assessment_type}</TableCell>
                      <TableCell>{assessment.max_marks}</TableCell>
                      <TableCell>{assessment.weightage}%</TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => handleOpenDialog(assessment)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDelete(assessment.assessment_id)}>
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingAssessment ? 'Edit Assessment' : 'Add New Assessment'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              select
              label="Course"
              value={formData.course_id}
              onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
              fullWidth
            >
              {courses.map((course) => (
                <MenuItem key={course.id} value={course.id}>
                  {course.name} ({course.code})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Assessment Type"
              value={formData.assessment_type}
              onChange={(e) => setFormData({ ...formData, assessment_type: e.target.value })}
              fullWidth
            >
              <MenuItem value="EXAM">Exam</MenuItem>
              <MenuItem value="QUIZ">Quiz</MenuItem>
              <MenuItem value="ASSIGNMENT">Assignment</MenuItem>
            </TextField>
            <TextField
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              fullWidth
            />
            <TextField
              label="Max Marks"
              type="number"
              value={formData.max_marks}
              onChange={(e) => setFormData({ ...formData, max_marks: e.target.value })}
              fullWidth
            />
            <TextField
              label="Weightage (%)"
              type="number"
              value={formData.weightage}
              onChange={(e) => setFormData({ ...formData, weightage: e.target.value })}
              fullWidth
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingAssessment ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
          </Dialog>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  )
}

export default AssessmentManagement

