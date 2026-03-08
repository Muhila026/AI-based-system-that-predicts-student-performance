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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Chip,
} from '@mui/material'
import { Add as AddIcon, Assignment as AssignmentIcon } from '@mui/icons-material'
import { motion } from 'framer-motion'
import {
  getTeacherMySubjects,
  getSchemaAssignments,
  createSchemaAssignment,
  deleteSchemaAssignment,
  type TeacherSubjectWithName,
  type SchemaSubjectAssignment,
} from '../../lib/api'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

/**
 * Teacher Assessments: assign assessments (assignments/quizzes/exams) to students by subject.
 * Uses subject_assignments: teacher picks a subject they teach, creates an assignment;
 * students enrolled in that subject (student_subjects) see it in their Assessments.
 */
const TeacherAssessments: React.FC = () => {
  const [assignments, setAssignments] = useState<SchemaSubjectAssignment[]>([])
  const [mySubjects, setMySubjects] = useState<TeacherSubjectWithName[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    subject_id: '',
    title: '',
    description: '',
    max_marks: '100',
    assignment_type: 'ASSIGNMENT' as string,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [subjectsData, assignmentsData] = await Promise.all([
        getTeacherMySubjects(),
        getSchemaAssignments(),
      ])
      setMySubjects(Array.isArray(subjectsData) ? subjectsData : [])
      setAssignments(Array.isArray(assignmentsData) ? assignmentsData : [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
      setAssignments([])
      setMySubjects([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    const subject_id = (formData.subject_id || '').trim()
    const title = (formData.title || '').trim()
    if (!subject_id) {
      setError('Please select a subject')
      return
    }
    if (!title) {
      setError('Title is required')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await createSchemaAssignment({
        subject_id,
        title: title || 'Untitled',
        description: formData.description || undefined,
        max_marks: parseInt(formData.max_marks, 10) || 100,
        assignment_type: formData.assignment_type || 'ASSIGNMENT',
      })
      setOpenDialog(false)
      setFormData({ subject_id: '', title: '', description: '', max_marks: '100', assignment_type: 'ASSIGNMENT' })
      await loadData()
    } catch (e: any) {
      setError(e?.message || 'Failed to create assessment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this assessment? Students will no longer see it.')) return
    try {
      await deleteSchemaAssignment(id)
      await loadData()
    } catch (e: any) {
      setError(e?.message || 'Failed to delete')
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="280px">
        <CircularProgress sx={{ color: THEME.primary }} />
      </Box>
    )
  }

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      <Box sx={{ mb: 3, pb: 3, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}>
          Assessments
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          Create assignments, quizzes, or exams for a subject. Students enrolled in that subject will see them.
        </Typography>
      </Box>

      {error && (
        <Typography variant="body2" sx={{ color: '#991b1b', mb: 2 }} onFocus={() => setError(null)}>
          {error}
        </Typography>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          disabled={mySubjects.length === 0}
          sx={{
            backgroundColor: THEME.primary,
            borderRadius: 0,
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': { backgroundColor: '#1e40af' },
          }}
        >
          Create Assessment
        </Button>
      </Box>

      {mySubjects.length === 0 && (
        <Typography variant="body2" sx={{ color: THEME.muted, mb: 2 }}>
          You need at least one subject assigned (My Subjects) to create assessments.
        </Typography>
      )}

      <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0, backgroundColor: '#fff' }}>
        <CardContent sx={{ py: 2.5, px: 2.5 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <AssignmentIcon sx={{ color: THEME.primary, fontSize: 22 }} />
            <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>
              Assignments by subject (visible to enrolled students)
            </Typography>
          </Box>
          {assignments.length === 0 ? (
            <Typography variant="body2" sx={{ color: THEME.muted }}>
              No assessments yet. Create one to assign to students in a subject.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ borderBottom: `2px solid ${THEME.primaryBorder}` }}>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark, py: 1.5 }}>Title</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark, py: 1.5 }}>Subject</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark, py: 1.5 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark, py: 1.5 }}>Max Marks</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark, py: 1.5 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assignments.map((row) => (
                    <TableRow
                      key={row.id}
                      sx={{
                        borderBottom: `1px solid ${THEME.primaryBorder}`,
                        '&:hover': { backgroundColor: THEME.primaryLight },
                      }}
                    >
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2" fontWeight="600" sx={{ color: THEME.textDark }}>
                          {row.title || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ color: THEME.textDark, py: 1.5 }}>
                        {row.subject_name || row.subject_id}
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Chip
                          label={row.assignment_type || 'ASSIGNMENT'}
                          size="small"
                          sx={{ borderRadius: 0, fontWeight: 500 }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: THEME.textDark, py: 1.5 }}>{row.max_marks}</TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => handleDelete(row.id)}
                          sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create assessment (assign to students in a subject)</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              select
              label="Subject"
              value={formData.subject_id}
              onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
              fullWidth
              required
            >
              <MenuItem value="">Select subject</MenuItem>
              {mySubjects.map((s) => (
                <MenuItem key={s.id} value={s.subject_id}>
                  {s.subject_name || s.subject_id}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Type"
              value={formData.assignment_type}
              onChange={(e) => setFormData({ ...formData, assignment_type: e.target.value })}
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
              required
            />
            <TextField
              label="Max Marks"
              type="number"
              value={formData.max_marks}
              onChange={(e) => setFormData({ ...formData, max_marks: e.target.value })}
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
          <Button variant="contained" onClick={handleCreate} disabled={submitting} sx={{ backgroundColor: THEME.primary }}>
            {submitting ? <CircularProgress size={24} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default TeacherAssessments
