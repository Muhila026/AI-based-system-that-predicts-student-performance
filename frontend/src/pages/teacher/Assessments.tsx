import React, { useState, useEffect, useRef } from 'react'
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
import CenteredMessage from '../../components/CenteredMessage'
import {
  Add as AddIcon,
  Assignment as AssignmentIcon,
  List as ListIcon,
  GetApp as GetAppIcon,
  UploadFile as UploadFileIcon,
  PictureAsPdf as PictureAsPdfIcon,
} from '@mui/icons-material'
import {
  getTeacherMySubjects,
  getSchemaAssignments,
  createSchemaAssignment,
  deleteSchemaAssignment,
  getAssignmentSubmissions,
  gradeSubmission,
  getSubmissionPdfBlob,
  uploadSchemaAssignmentPdf,
  getAssignmentPdfBlob,
  type TeacherSubjectWithName,
  type SchemaSubjectAssignment,
  type AssignmentSubmissionItem,
} from '../../lib/api'

/** Max characters for description (questions/instructions). Backend has no hard limit; this keeps UI/API payloads reasonable. */
const DESCRIPTION_MAX_CHARS = 20000

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
  const [submissionsDialog, setSubmissionsDialog] = useState<{ open: boolean; assignmentId: string; title: string }>({ open: false, assignmentId: '', title: '' })
  const [submissions, setSubmissions] = useState<AssignmentSubmissionItem[]>([])
  const [submissionsLoading, setSubmissionsLoading] = useState(false)
  const [marksEdit, setMarksEdit] = useState<Record<string, string>>({})
  const [savingSubmissionId, setSavingSubmissionId] = useState<string | null>(null)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' })
  /** PDF to attach when creating a new assignment (optional). */
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  /** Which assignment id is targeted by the hidden file input (upload/replace PDF). */
  const [uploadAssignmentId, setUploadAssignmentId] = useState<string | null>(null)
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const pdfInputRef = useRef<HTMLInputElement>(null)

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
      const created = await createSchemaAssignment({
        subject_id,
        title: title || 'Untitled',
        description: formData.description || undefined,
        max_marks: parseInt(formData.max_marks, 10) || 100,
        assignment_type: formData.assignment_type || 'ASSIGNMENT',
      })
      if (pdfFile && created?.id) {
        try {
          await uploadSchemaAssignmentPdf(created.id, pdfFile)
          setSnackbar({ open: true, message: 'Assessment created and question PDF uploaded.', severity: 'success' })
        } catch (upErr: any) {
          setSnackbar({
            open: true,
            message: upErr?.message || 'Created but PDF upload failed. You can upload PDF from the list.',
            severity: 'error',
          })
        }
      } else {
        setSnackbar({ open: true, message: 'Assessment created.', severity: 'success' })
      }
      setOpenDialog(false)
      setPdfFile(null)
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
      setSnackbar({ open: true, message: 'Enter a valid marks (number ≥ 0)', severity: 'error' })
      return
    }
    setSavingSubmissionId(submissionId)
    try {
      await gradeSubmission(submissionId, num)
      setSnackbar({ open: true, message: 'Marks saved', severity: 'success' })
      const list = await getAssignmentSubmissions(submissionsDialog.assignmentId)
      setSubmissions(list)
    } catch (e: any) {
      setSnackbar({ open: true, message: e?.message || 'Failed to save', severity: 'error' })
    } finally {
      setSavingSubmissionId(null)
    }
  }

  const handleUploadPdfClick = (assignmentId: string) => {
    setUploadAssignmentId(assignmentId)
    pdfInputRef.current?.click()
  }

  const handlePdfInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !uploadAssignmentId) return
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setSnackbar({ open: true, message: 'Only PDF files are allowed.', severity: 'error' })
      setUploadAssignmentId(null)
      return
    }
    setUploadingPdf(true)
    try {
      await uploadSchemaAssignmentPdf(uploadAssignmentId, file)
      setSnackbar({ open: true, message: 'Question PDF uploaded. Students can download it from their Assessments.', severity: 'success' })
      await loadData()
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.message || 'PDF upload failed', severity: 'error' })
    } finally {
      setUploadingPdf(false)
      setUploadAssignmentId(null)
    }
  }

  const handleDownloadAssignmentPdf = async (assignmentId: string, title: string) => {
    try {
      const blob = await getAssignmentPdfBlob(assignmentId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(title || 'assignment').replace(/[^a-z0-9-_]/gi, '_')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setSnackbar({ open: true, message: 'No PDF uploaded for this assessment yet.', severity: 'error' })
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
      setSnackbar({ open: true, message: 'Failed to download PDF', severity: 'error' })
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
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark, py: 1.5 }}>Actions</TableCell>
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
                          variant="outlined"
                          startIcon={<ListIcon />}
                          onClick={() => openSubmissions(row.id, row.title || '—')}
                          sx={{ textTransform: 'none', mr: 1 }}
                        >
                          Submissions
                        </Button>
                        {row.pdf_url ? (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<PictureAsPdfIcon />}
                            onClick={() => handleDownloadAssignmentPdf(row.id, row.title || 'assignment')}
                            sx={{ textTransform: 'none', mr: 1 }}
                          >
                            Question PDF
                          </Button>
                        ) : null}
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<UploadFileIcon />}
                          disabled={uploadingPdf}
                          onClick={() => handleUploadPdfClick(row.id)}
                          sx={{ textTransform: 'none', mr: 1 }}
                        >
                          {row.pdf_url ? 'Replace PDF' : 'Upload PDF'}
                        </Button>
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

      <Dialog open={submissionsDialog.open} onClose={() => setSubmissionsDialog((p) => ({ ...p, open: false }))} maxWidth="md" fullWidth>
        <DialogTitle>Submissions: {submissionsDialog.title}</DialogTitle>
        <DialogContent>
          {submissionsLoading ? (
            <Box display="flex" justifyContent="center" py={3}><CircularProgress sx={{ color: THEME.primary }} /></Box>
          ) : submissions.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No submissions yet. Students upload PDF from their Assessments page.</Typography>
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
                      <TableCell sx={{ color: THEME.muted }}>
                        {s.submitted_at ? new Date(s.submitted_at).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={marksEdit[s.id] ?? ''}
                          onChange={(e) => setMarksEdit((p) => ({ ...p, [s.id]: e.target.value }))}
                          placeholder="Marks"
                          sx={{ width: 80 }}
                          inputProps={{ min: 0, max: s.max_marks }}
                        />
                        <span style={{ marginLeft: 8 }}>/ {s.max_marks}</span>
                        <Button
                          size="small"
                          sx={{ ml: 1 }}
                          disabled={savingSubmissionId === s.id}
                          onClick={() => handleSaveMarks(s.id)}
                        >
                          {savingSubmissionId === s.id ? <CircularProgress size={18} /> : 'Save'}
                        </Button>
                      </TableCell>
                      <TableCell>
                        {s.has_pdf && (
                          <Button size="small" startIcon={<GetAppIcon />} onClick={() => handleDownloadSubmission(s.id)}>
                            Download PDF
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmissionsDialog((p) => ({ ...p, open: false }))}>Close</Button>
        </DialogActions>
      </Dialog>

      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf,application/pdf"
        style={{ display: 'none' }}
        onChange={handlePdfInputChange}
      />

      <Dialog
        open={openDialog}
        onClose={() => {
          setOpenDialog(false)
          setPdfFile(null)
        }}
        maxWidth="sm"
        fullWidth
      >
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
              label="Description (questions / instructions)"
              value={formData.description}
              onChange={(e) => {
                const v = e.target.value
                if (v.length <= DESCRIPTION_MAX_CHARS) setFormData({ ...formData, description: v })
              }}
              fullWidth
              multiline
              rows={6}
              placeholder="Students read this then submit answers as PDF..."
              helperText={`${formData.description.length} / ${DESCRIPTION_MAX_CHARS} characters`}
              inputProps={{ maxLength: DESCRIPTION_MAX_CHARS }}
            />
            <Box>
              <Typography variant="body2" sx={{ color: THEME.textDark, fontWeight: 600, mb: 0.5 }}>
                Question paper PDF (optional)
              </Typography>
              <Typography variant="caption" sx={{ color: THEME.muted, display: 'block', mb: 1 }}>
                Upload a PDF so students can download it from their Assessments page. Only PDF is allowed.
              </Typography>
              <Button variant="outlined" component="label" size="small" startIcon={<UploadFileIcon />} sx={{ textTransform: 'none' }}>
                {pdfFile ? pdfFile.name : 'Choose PDF'}
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f && !f.name.toLowerCase().endsWith('.pdf') && f.type !== 'application/pdf') {
                      setSnackbar({ open: true, message: 'Only PDF files are allowed.', severity: 'error' })
                      return
                    }
                    setPdfFile(f || null)
                  }}
                />
              </Button>
              {pdfFile && (
                <Button size="small" onClick={() => setPdfFile(null)} sx={{ ml: 1, textTransform: 'none' }}>
                  Clear
                </Button>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={submitting} sx={{ backgroundColor: THEME.primary }}>
            {submitting ? <CircularProgress size={24} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <CenteredMessage
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
        autoHideDuration={5000}
      />
    </Box>
  )
}

export default TeacherAssessments
