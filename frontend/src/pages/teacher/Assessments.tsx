import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
} from '@mui/material'
import { Add as AddIcon } from '@mui/icons-material'
import { getAssessments, createAssessment, getCourses, type Assessment, type AssessmentCreate, type AdminCourse } from '../../lib/api'

const TeacherAssessments: React.FC = () => {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [courses, setCourses] = useState<AdminCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [formData, setFormData] = useState({
    course_id: '',
    assessment_type: 'ASSIGNMENT' as 'EXAM' | 'QUIZ' | 'ASSIGNMENT',
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
      setLoading(true)
      const [assessmentsData, coursesData] = await Promise.all([
        getAssessments(),
        getCourses(),
      ])
      setAssessments(assessmentsData)
      setCourses(coursesData)
    } catch (error) {
      console.error('Error loading assessments or courses:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Assessments
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
        >
          Create Assessment
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
                  <TableCell><strong>Weightage</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : assessments.length === 0 ? (
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
                      <TableCell>
                        <Chip label={assessment.assessment_type} size="small" />
                      </TableCell>
                      <TableCell>{assessment.max_marks}</TableCell>
                      <TableCell>{assessment.weightage}%</TableCell>
                      <TableCell>
                        <Chip label="Active" color="success" size="small" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Assessment</DialogTitle>
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
              onChange={(e) => setFormData({ ...formData, assessment_type: e.target.value as 'EXAM' | 'QUIZ' | 'ASSIGNMENT' })}
              fullWidth
            >
              <MenuItem value="ASSIGNMENT">Assignment</MenuItem>
              <MenuItem value="QUIZ">Quiz</MenuItem>
              <MenuItem value="EXAM">Exam</MenuItem>
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
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (!formData.course_id) {
                alert('Course is required')
                return
              }
              if (!formData.max_marks || !formData.weightage) {
                alert('Max marks and weightage are required')
                return
              }
              const payload: AssessmentCreate = {
                course_id: formData.course_id,
                assessment_type: formData.assessment_type,
                max_marks: parseInt(formData.max_marks, 10),
                weightage: parseFloat(formData.weightage),
                title: formData.title || undefined,
                description: formData.description || undefined,
              }
              try {
                await createAssessment(payload)
                setOpenDialog(false)
                setFormData({
                  course_id: '',
                  assessment_type: 'ASSIGNMENT',
                  max_marks: '',
                  weightage: '',
                  title: '',
                  description: '',
                })
                await loadData()
              } catch (error: any) {
                alert(error.message || 'Failed to create assessment')
              }
            }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default TeacherAssessments

