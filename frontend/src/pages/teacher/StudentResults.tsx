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
  TextField,
  MenuItem,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Snackbar,
  Alert,
} from '@mui/material'
import { Add, Edit, Delete } from '@mui/icons-material'
import { getResults, createResult, updateResult, deleteResult, getTeacherAssignments, getStudents, type StudentResult, type StudentResultCreate, type AdminUser } from '../../lib/api'

/** Assignment option for the assessment dropdown (from teacher assignments). */
type AssignmentOption = { id: string; title: string; max_marks?: number }

const StudentResults: React.FC = () => {
  const [results, setResults] = useState<StudentResult[]>([])
  const [assignments, setAssignments] = useState<AssignmentOption[]>([])
  const [students, setStudents] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedModule, setSelectedModule] = useState('')
  const [openDialog, setOpenDialog] = useState(false)
  const [editingResult, setEditingResult] = useState<StudentResult | null>(null)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })
  const [formData, setFormData] = useState({
    student_id: '',
    assessment_id: '',
    marks_obtained: '',
  })

  useEffect(() => {
    loadData()
  }, [selectedModule])

  const loadData = async () => {
    try {
      setLoading(true)
      const [resultsData, assignmentsData, studentsData] = await Promise.all([
        getResults(),
        getTeacherAssignments(),
        getStudents(),
      ])
      setResults(resultsData)
      setAssignments((() => {
        const list = (assignmentsData || []).map((a: { id: string; title?: string }) => ({
          id: String(a.id),
          title: a.title || `Assignment ${a.id}`,
          max_marks: 100,
        }))
        if (list.length === 0) {
          list.push({ id: '1', title: 'Assignment 1 (new)', max_marks: 100 })
        }
        return list
      })())
      setStudents(studentsData || [])
    } catch (error) {
      console.error('Error loading data:', error)
      showSnackbar('Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity })
  }

  const handleOpenDialog = (result?: StudentResult) => {
    if (result) {
      setEditingResult(result)
      setFormData({
        student_id: String(result.student_email ?? result.student_id),
        assessment_id: String(result.assessment_id),
        marks_obtained: result.marks_obtained.toString(),
      })
    } else {
      setEditingResult(null)
      setFormData({
        student_id: '',
        assessment_id: '',
        marks_obtained: '',
      })
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingResult(null)
    setFormData({
      student_id: '',
      assessment_id: '',
      marks_obtained: '',
    })
  }

  const calculateGrade = (marks: number, maxMarks: number): string => {
    const percentage = (marks / maxMarks) * 100
    if (percentage >= 90) return 'A+'
    if (percentage >= 80) return 'A'
    if (percentage >= 70) return 'B+'
    if (percentage >= 60) return 'B'
    if (percentage >= 50) return 'C+'
    if (percentage >= 40) return 'C'
    return 'F'
  }

  const handleSubmit = async () => {
    try {
      if (!formData.student_id || !formData.assessment_id || !formData.marks_obtained) {
        showSnackbar('Please fill all required fields', 'error')
        return
      }

      const assignment = assignments.find(a => a.id === formData.assessment_id)
      const maxMarks = assignment?.max_marks ?? 100
      const marks = parseFloat(formData.marks_obtained)
      if (marks < 0 || marks > maxMarks) {
        showSnackbar(`Marks must be between 0 and ${maxMarks}`, 'error')
        return
      }
      const grade = calculateGrade(marks, maxMarks)

      if (editingResult) {
        await updateResult(editingResult.result_id, {
          marks_obtained: marks,
          grade: grade,
        })
        showSnackbar('Result updated successfully', 'success')
      } else {
        const createPayload: StudentResultCreate = {
          assessment_id: formData.assessment_id,
          marks_obtained: marks,
          grade: grade,
          max_marks: maxMarks,
        }
        if (formData.student_id.includes('@')) {
          createPayload.userEmail = formData.student_id
        } else {
          const num = Number(formData.student_id)
          if (!Number.isNaN(num)) createPayload.student_id = num
          else createPayload.userEmail = formData.student_id
        }
        await createResult(createPayload)
        showSnackbar('Result created successfully', 'success')
      }

      handleCloseDialog()
      loadData()
    } catch (error: any) {
      showSnackbar(error.message || 'Failed to save result', 'error')
    }
  }

  const handleDelete = async (resultId: number | string) => {
    if (!window.confirm('Are you sure you want to delete this result?')) {
      return
    }

    try {
      await deleteResult(resultId)
      showSnackbar('Result deleted successfully', 'success')
      loadData()
    } catch (error: any) {
      showSnackbar(error.message || 'Failed to delete result', 'error')
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

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Student Results
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            select
            label="Filter by Module"
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">All Modules</MenuItem>
            {/* TODO: Populate with actual modules */}
          </TextField>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            Add Result
          </Button>
        </Box>
      </Box>

      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Student Name</strong></TableCell>
                  <TableCell><strong>Assessment</strong></TableCell>
                  <TableCell><strong>Module</strong></TableCell>
                  <TableCell><strong>Marks Obtained</strong></TableCell>
                  <TableCell><strong>Grade</strong></TableCell>
                  <TableCell><strong>Date</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="textSecondary">No results found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  results.map((result) => (
                    <TableRow key={String(result.result_id)}>
                      <TableCell>{result.student_name || 'N/A'}</TableCell>
                      <TableCell>{result.assessment_title || 'N/A'}</TableCell>
                      <TableCell>{result.module_name || 'N/A'}</TableCell>
                      <TableCell>{result.marks_obtained}</TableCell>
                      <TableCell>
                        <Chip label={result.grade} color="primary" size="small" />
                      </TableCell>
                      <TableCell>{result.created_at ? new Date(result.created_at).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(result)}
                          color="primary"
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(result.result_id)}
                          color="error"
                        >
                          <Delete fontSize="small" />
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

      {/* Create/Edit Result Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingResult ? 'Edit Result' : 'Add New Result'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              select
              label="Student"
              value={formData.student_id}
              onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
              required
              disabled={!!editingResult}
              SelectProps={{
                native: false,
              }}
            >
              <MenuItem value="">Select Student</MenuItem>
              {students.map((student) => (
                <MenuItem key={student.id} value={student.id}>
                  {student.name} ({student.email})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Assessment"
              value={formData.assessment_id}
              onChange={(e) => setFormData({ ...formData, assessment_id: e.target.value })}
              required
              disabled={!!editingResult}
            >
              <MenuItem value="">Select Assessment</MenuItem>
              {assignments.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.title} - Max: {a.max_marks ?? 100}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Marks Obtained"
              type="number"
              value={formData.marks_obtained}
              onChange={(e) => {
                const value = e.target.value
                const assignment = assignments.find(a => a.id === formData.assessment_id)
                const maxMarks = assignment?.max_marks ?? 100
                const numValue = parseFloat(value)
                if (value === '' || (numValue >= 0 && numValue <= maxMarks)) {
                  setFormData({ ...formData, marks_obtained: value })
                }
              }}
              required
              helperText={
                formData.assessment_id
                  ? `Max marks: ${assignments.find(a => a.id === formData.assessment_id)?.max_marks ?? 100}`
                  : 'Select an assessment first'
              }
              inputProps={{
                min: 0,
                max: assignments.find(a => a.id === formData.assessment_id)?.max_marks ?? 100,
                step: 0.01,
              }}
            />

            {formData.assessment_id && formData.marks_obtained && (
              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Calculated Grade: <strong>{calculateGrade(
                    parseFloat(formData.marks_obtained) || 0,
                    assignments.find(a => a.id === formData.assessment_id)?.max_marks ?? 100
                  )}</strong>
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            {editingResult ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default StudentResults

