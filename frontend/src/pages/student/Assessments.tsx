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
  Chip,
  CircularProgress,
  Button,
} from '@mui/material'
import CenteredMessage from '../../components/CenteredMessage'
import { Assignment as AssignmentIcon, Upload as UploadIcon, GetApp as GetAppIcon } from '@mui/icons-material'
import {
  getSchemaAssignments,
  getMyAssignmentSubmissions,
  submitAssignmentPdf,
  getSubmissionPdfBlob,
  type SchemaSubjectAssignment,
  type MySubmissionItem,
} from '../../lib/api'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

/**
 * Student Assessments: assignments for enrolled subjects; upload PDF per assignment;
 * view my submissions and marks (results) in student portal.
 */
const StudentAssessments: React.FC = () => {
  const [assignments, setAssignments] = useState<SchemaSubjectAssignment[]>([])
  const [submissions, setSubmissions] = useState<MySubmissionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' })
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [data, mySubs] = await Promise.all([
        getSchemaAssignments(),
        getMyAssignmentSubmissions(),
      ])
      setAssignments(Array.isArray(data) ? data : [])
      setSubmissions(Array.isArray(mySubs) ? mySubs : [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
      setAssignments([])
      setSubmissions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleUploadClick = (assignmentId: string) => {
    const el = fileInputRefs.current[assignmentId]
    if (el) {
      el.accept = 'application/pdf,.pdf'
      el.click()
    }
  }

  const handleFileChange = async (assignmentId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      setSnackbar({ open: true, message: 'Please select a PDF file', severity: 'error' })
      return
    }
    setUploadingId(assignmentId)
    try {
      await submitAssignmentPdf(assignmentId, file)
      setSnackbar({ open: true, message: 'Submission uploaded successfully', severity: 'success' })
      await load()
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.message || 'Upload failed', severity: 'error' })
    } finally {
      setUploadingId(null)
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

  if (loading && assignments.length === 0) {
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
          My Assessments
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          Upload your assignment as PDF. Teachers will grade and you can see results below.
        </Typography>
      </Box>

      {error && (
        <Typography variant="body2" sx={{ color: '#991b1b', mb: 2 }}>
          {error}
        </Typography>
      )}

      <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0, backgroundColor: '#fff', mb: 3 }}>
        <CardContent sx={{ py: 2.5, px: 2.5 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <AssignmentIcon sx={{ color: THEME.primary, fontSize: 22 }} />
            <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>
              Assigned to you
            </Typography>
          </Box>
          {assignments.length === 0 ? (
            <Typography variant="body2" sx={{ color: THEME.muted }}>
              No assessments assigned yet. Your teacher will add assignments for your subjects.
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
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark, py: 1.5 }}>Submit</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assignments.map((row) => {
                    const isUploading = uploadingId === row.id
                    return (
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
                          <input
                            type="file"
                            ref={(el) => { fileInputRefs.current[row.id] = el }}
                            style={{ display: 'none' }}
                            onChange={(e) => handleFileChange(row.id, e)}
                          />
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={isUploading ? <CircularProgress size={16} /> : <UploadIcon />}
                            disabled={isUploading}
                            onClick={() => handleUploadClick(row.id)}
                            sx={{ borderRadius: 0 }}
                          >
                            {isUploading ? 'Uploading…' : 'Upload PDF'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0, backgroundColor: '#fff' }}>
        <CardContent sx={{ py: 2.5, px: 2.5 }}>
          <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark, mb: 2 }}>
            My submissions & results
          </Typography>
          {submissions.length === 0 ? (
            <Typography variant="body2" sx={{ color: THEME.muted }}>
              You have not submitted any assignment yet. Use "Upload PDF" above.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ borderBottom: `2px solid ${THEME.primaryBorder}` }}>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark, py: 1.5 }}>Assignment</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark, py: 1.5 }}>Subject</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark, py: 1.5 }}>Submitted</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark, py: 1.5 }}>Marks</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark, py: 1.5 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {submissions.map((s) => (
                    <TableRow
                      key={s.id}
                      sx={{ borderBottom: `1px solid ${THEME.primaryBorder}`, '&:hover': { backgroundColor: THEME.primaryLight } }}
                    >
                      <TableCell sx={{ py: 1.5, color: THEME.textDark }}>{s.assignment_title}</TableCell>
                      <TableCell sx={{ py: 1.5, color: THEME.textDark }}>{s.subject_name}</TableCell>
                      <TableCell sx={{ py: 1.5, color: THEME.muted }}>
                        {s.submitted_at ? new Date(s.submitted_at).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        {s.marks != null ? (
                          <Typography fontWeight="600" sx={{ color: THEME.textDark }}>
                            {s.marks} / {s.max_marks}
                          </Typography>
                        ) : (
                          <Chip label="Pending" size="small" sx={{ borderRadius: 0 }} color="warning" />
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        {s.has_pdf && (
                          <Button
                            size="small"
                            startIcon={<GetAppIcon />}
                            onClick={() => handleDownloadSubmission(s.id)}
                            sx={{ borderRadius: 0 }}
                          >
                            Download my PDF
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

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

export default StudentAssessments
