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
  CircularProgress,
} from '@mui/material'
import CenteredMessage from '../../components/CenteredMessage'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, List as ListIcon, GetApp as GetAppIcon } from '@mui/icons-material'
import {
  getAssessments,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  getCourses,
  getSchemaAssignments,
  getAssignmentSubmissions,
  gradeSubmission,
  getSubmissionPdfBlob,
  type Assessment,
  type AssessmentCreate,
  type AdminCourse,
  type SchemaSubjectAssignment,
  type AssignmentSubmissionItem,
} from '../../lib/api'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

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
  const [subjectAssignments, setSubjectAssignments] = useState<SchemaSubjectAssignment[]>([])
  const [submissionsDialog, setSubmissionsDialog] = useState<{ open: boolean; assignmentId: string; title: string }>({ open: false, assignmentId: '', title: '' })
  const [submissions, setSubmissions] = useState<AssignmentSubmissionItem[]>([])
  const [submissionsLoading, setSubmissionsLoading] = useState(false)
  const [marksEdit, setMarksEdit] = useState<Record<string, string>>({})
  const [savingSubmissionId, setSavingSubmissionId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [assessmentsData, coursesData, schemaAssignments] = await Promise.all([
        getAssessments(),
        getCourses(),
        getSchemaAssignments(),
      ])
      setAssessments(assessmentsData)
      setCourses(coursesData)
      setSubjectAssignments(Array.isArray(schemaAssignments) ? schemaAssignments : [])
    } catch (error) {
      console.error('Error loading data:', error)
      showSnackbar('Failed to load data', 'error')
    }
  }

  const openSubmissions = async (assignmentId: string, title: string) => {
    setSubmissionsDialog({ open: true, assignmentId, title })
    setSubmissionsLoading(true)
    setMarksEdit({})
    try {
      const list = await getAssignmentSubmissions(assignmentId)
      setSubmissions(list)
      const initial: Record<string, string> = {}
      list.forEach((s) => { initial[s.id] = s.marks != null ? String(s.marks) : '' })
      setMarksEdit(initial)
    } catch {
      setSubmissions([])
    } finally {
      setSubmissionsLoading(false)
    }
  }

  const handleSaveMarks = async (submissionId: string) => {
    const val = marksEdit[submissionId]
    const num = val === '' ? NaN : parseFloat(val)
    if (isNaN(num) || num < 0) {
      showSnackbar('Enter a valid marks (number ≥ 0)', 'error')
      return
    }
    setSavingSubmissionId(submissionId)
    try {
      await gradeSubmission(submissionId, num)
      showSnackbar('Marks saved', 'success')
      const list = await getAssignmentSubmissions(submissionsDialog.assignmentId)
      setSubmissions(list)
    } catch (e: any) {
      showSnackbar(e?.message || 'Failed to save', 'error')
    } finally {
      setSavingSubmissionId(null)
    }
  }

  const handleDownloadSubmission = async (submissionId: string) => {
    try {
      const blob = await getSubmissionPdfBlob(submissionId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `submission_${submissionId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      showSnackbar('Failed to download PDF', 'error')
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
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ color: THEME.textDark }}>
            Assessment Management
          </Typography>
          <Typography variant="body2" sx={{ color: THEME.muted }}>
            Create and manage exams, quizzes, and assignments
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ bgcolor: THEME.primary, '&:hover': { bgcolor: '#16324d' } }}
        >
          Add Assessment
        </Button>
      </Box>

      <Card variant="outlined" sx={{ borderRadius: 0, borderColor: THEME.primaryBorder, borderWidth: 1 }}>
        <CardContent sx={{ p: 0 }}>
          <TableContainer component={Paper} variant="outlined" sx={{ boxShadow: 'none', border: 'none' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: THEME.primaryLight }}>
                  <TableCell sx={{ fontWeight: 600, color: THEME.primary }}>Title</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: THEME.primary }}>Course</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: THEME.primary }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: THEME.primary }}>Max Marks</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: THEME.primary }}>Weightage (%)</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: THEME.primary }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assessments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: THEME.muted }}>
                      No assessments found
                    </TableCell>
                  </TableRow>
                ) : (
                  assessments.map((assessment) => (
                    <TableRow key={assessment.assessment_id} sx={{ '&:hover': { bgcolor: THEME.primaryLight } }}>
                      <TableCell sx={{ color: THEME.textDark }}>{assessment.title || 'N/A'}</TableCell>
                      <TableCell sx={{ color: THEME.muted }}>{assessment.course_name || assessment.module_name || 'N/A'}</TableCell>
                      <TableCell sx={{ color: THEME.textDark }}>{assessment.assessment_type}</TableCell>
                      <TableCell sx={{ color: THEME.textDark }}>{assessment.max_marks}</TableCell>
                      <TableCell sx={{ color: THEME.textDark }}>{assessment.weightage}%</TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => handleOpenDialog(assessment)} sx={{ color: THEME.primary }}>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDelete(assessment.assessment_id)} color="error">
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

      <Typography variant="h6" sx={{ mt: 4, mb: 2, color: THEME.textDark }}>Subject assignment submissions (view all)</Typography>
      <Card variant="outlined" sx={{ borderRadius: 0, borderColor: THEME.primaryBorder, borderWidth: 1 }}>
        <CardContent sx={{ p: 0 }}>
          <TableContainer component={Paper} variant="outlined" sx={{ boxShadow: 'none', border: 'none' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: THEME.primaryLight }}>
                  <TableCell sx={{ fontWeight: 600, color: THEME.primary }}>Title</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: THEME.primary }}>Subject</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: THEME.primary }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: THEME.primary }}>Max Marks</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: THEME.primary }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {subjectAssignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3, color: THEME.muted }}>No subject assignments. Create from Subjects & Marks (Schema) or teacher Assessments.</TableCell>
                  </TableRow>
                ) : (
                  subjectAssignments.map((row) => (
                    <TableRow key={row.id} sx={{ '&:hover': { bgcolor: THEME.primaryLight } }}>
                      <TableCell sx={{ color: THEME.textDark }}>{row.title || '—'}</TableCell>
                      <TableCell sx={{ color: THEME.muted }}>{row.subject_name || row.subject_id}</TableCell>
                      <TableCell sx={{ color: THEME.textDark }}>{row.assignment_type || 'ASSIGNMENT'}</TableCell>
                      <TableCell sx={{ color: THEME.textDark }}>{row.max_marks}</TableCell>
                      <TableCell>
                        <Button size="small" variant="outlined" startIcon={<ListIcon />} onClick={() => openSubmissions(row.id, row.title || '—')} sx={{ textTransform: 'none' }}>
                          View submissions
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={submissionsDialog.open} onClose={() => setSubmissionsDialog((p) => ({ ...p, open: false }))} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 0 } }}>
        <DialogTitle sx={{ color: THEME.textDark, borderBottom: `1px solid ${THEME.primaryBorder}`, pb: 2 }}>Submissions: {submissionsDialog.title}</DialogTitle>
        <DialogContent>
          {submissionsLoading ? (
            <Box display="flex" justifyContent="center" py={3}><CircularProgress sx={{ color: THEME.primary }} /></Box>
          ) : submissions.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No submissions yet.</Typography>
          ) : (
            <TableContainer sx={{ mt: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Submitted</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Marks</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {submissions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.student_name || s.userEmail}</TableCell>
                      <TableCell sx={{ color: THEME.muted }}>{s.submitted_at ? new Date(s.submitted_at).toLocaleString() : '—'}</TableCell>
                      <TableCell>
                        <TextField size="small" type="number" value={marksEdit[s.id] ?? ''} onChange={(e) => setMarksEdit((p) => ({ ...p, [s.id]: e.target.value }))} placeholder="Marks" sx={{ width: 80 }} inputProps={{ min: 0, max: s.max_marks }} />
                        <span style={{ marginLeft: 8 }}>/ {s.max_marks}</span>
                        <Button size="small" sx={{ ml: 1 }} disabled={savingSubmissionId === s.id} onClick={() => handleSaveMarks(s.id)}>{savingSubmissionId === s.id ? <CircularProgress size={18} /> : 'Save'}</Button>
                      </TableCell>
                      <TableCell>
                        {s.has_pdf && <Button size="small" startIcon={<GetAppIcon />} onClick={() => handleDownloadSubmission(s.id)}>Download PDF</Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${THEME.primaryBorder}`, pt: 2 }}>
          <Button onClick={() => setSubmissionsDialog((p) => ({ ...p, open: false }))}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 0 } }}>
        <DialogTitle sx={{ color: THEME.textDark, borderBottom: `1px solid ${THEME.primaryBorder}`, pb: 2 }}>{editingAssessment ? 'Edit Assessment' : 'Add New Assessment'}</DialogTitle>
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
        <DialogActions sx={{ borderTop: `1px solid ${THEME.primaryBorder}`, pt: 2 }}>
          <Button onClick={handleCloseDialog} sx={{ color: THEME.muted }}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ bgcolor: THEME.primary, '&:hover': { bgcolor: '#16324d' } }}>
            {editingAssessment ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <CenteredMessage
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        autoHideDuration={6000}
      />
    </Box>
  )
}

export default AssessmentManagement

