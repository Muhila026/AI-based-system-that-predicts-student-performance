import React, { useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  List,
  ListItem,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material'
import CenteredMessage from '../../components/CenteredMessage'
import { EventAvailable, Save } from '@mui/icons-material'
import {
  getTeacherMySubjects,
  type TeacherSubjectWithName,
  getModuleAttendanceStudents,
  uploadModuleAttendance,
  type ModuleAttendanceStudent,
  getModuleAttendanceSummary,
  type ModuleAttendanceSummary,
} from '../../lib/api'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

const UploadAttendance: React.FC = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [subjects, setSubjects] = useState<TeacherSubjectWithName[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')
  const [students, setStudents] = useState<ModuleAttendanceStudent[]>([])
  const [presentEmails, setPresentEmails] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' })
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [summary, setSummary] = useState<ModuleAttendanceSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  // Load teacher subjects first
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getTeacherMySubjects()
      .then((subs) => {
        if (!cancelled) setSubjects(subs)
      })
      .catch(() => {
        if (!cancelled) setSnackbar({ open: true, message: 'Failed to load subjects', severity: 'error' })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // When subject changes, load students for that subject
  useEffect(() => {
    if (!selectedSubjectId) {
      setStudents([])
      setPresentEmails(new Set())
      return
    }
    let cancelled = false
    setLoading(true)
    getModuleAttendanceStudents(selectedSubjectId)
      .then((list) => {
        if (!cancelled) {
          setStudents(list)
          setPresentEmails(new Set())
        }
      })
      .catch(() => {
        if (!cancelled) setSnackbar({ open: true, message: 'Failed to load students', severity: 'error' })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedSubjectId])

  const togglePresent = (email: string) => {
    setPresentEmails((prev) => {
      const next = new Set(prev)
      if (next.has(email)) next.delete(email)
      else next.add(email)
      return next
    })
  }

  const handleSubmit = async () => {
    if (!selectedSubjectId) {
      setSnackbar({ open: true, message: 'Please select a subject', severity: 'error' })
      return
    }
    if (students.length === 0) {
      setSnackbar({ open: true, message: 'No students in this subject', severity: 'error' })
      return
    }
    setSubmitting(true)
    try {
      await uploadModuleAttendance(selectedSubjectId, Array.from(presentEmails), date)
      setSnackbar({ open: true, message: 'Module attendance uploaded (max 10 days per subject).', severity: 'success' })
    } catch (e: any) {
      setSnackbar({ open: true, message: e.message || 'Upload failed', severity: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleViewSummary = async () => {
    if (!selectedSubjectId) {
      setSnackbar({ open: true, message: 'Please select a subject', severity: 'error' })
      return
    }
    setSummaryLoading(true)
    try {
      const res = await getModuleAttendanceSummary(selectedSubjectId)
      setSummary(res)
      setSummaryOpen(true)
    } catch (e: any) {
      setSnackbar({ open: true, message: e?.message || 'Failed to load attendance summary', severity: 'error' })
    } finally {
      setSummaryLoading(false)
    }
  }

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      <Box sx={{ mb: 3, pb: 3, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}>
          Upload attendance
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          Mark students present for the day. attendance_percentage is auto-generated from present_days / total_days.
        </Typography>
      </Box>

      <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0, mb: 3, backgroundColor: '#fff' }}>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <TextField
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              sx={{ minWidth: 180 }}
            />
            {/* Subject selector */}
            <TextField
              select
              SelectProps={{ native: true }}
              label="Subject"
              size="small"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 220 }}
            >
              <option value="">Select subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.subject_id}>
                  {s.subject_name} ({s.subject_id})
                </option>
              ))}
            </TextField>
            <Button
              variant="contained"
              sx={{ borderRadius: 0, backgroundColor: THEME.primary, '&:hover': { backgroundColor: '#1e40af' } }}
              startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <Save />}
              onClick={handleSubmit}
              disabled={submitting || !selectedSubjectId || students.length === 0}
            >
              Save attendance
            </Button>
            <Button
              variant="outlined"
              sx={{ borderRadius: 0 }}
              onClick={handleViewSummary}
              disabled={!selectedSubjectId}
            >
              View all attendance
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0, backgroundColor: '#fff' }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <EventAvailable sx={{ color: THEME.primary, fontSize: 22 }} />
            <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>Students — tick present</Typography>
          </Box>
          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress sx={{ color: THEME.primary }} />
            </Box>
          ) : !selectedSubjectId ? (
            <Alert severity="info">Select a subject to load its students.</Alert>
          ) : students.length === 0 ? (
            <Alert severity="info">No students enrolled in this subject.</Alert>
          ) : (
            <List dense>
              {students.map((s) => (
                <ListItem key={s.email}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={presentEmails.has(s.email)}
                        onChange={() => togglePresent(s.email)}
                      />
                    }
                    label={`${s.name} (${s.email})`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      <CenteredMessage
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
        autoHideDuration={6000}
      />

      <Dialog open={summaryOpen} onClose={() => setSummaryOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Attendance Sheet</DialogTitle>
        <DialogContent>
          {summaryLoading ? (
            <Box display="flex" justifyContent="center" py={3}>
              <CircularProgress sx={{ color: THEME.primary }} />
            </Box>
          ) : !summary ? (
            <Typography variant="body2" sx={{ color: THEME.muted }}>
              No attendance data available yet for this subject.
            </Typography>
          ) : (
            <>
              <Typography variant="body2" sx={{ mb: 1, color: THEME.muted }}>
                Total sessions taken so far: {summary.total_sessions}. Planned days (set by admin): {summary.planned_sessions || summary.total_sessions}.
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Student</TableCell>
                    {summary.dates.map((d) => (
                      <TableCell
                        key={d}
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.7rem',
                          whiteSpace: 'nowrap',
                          textAlign: 'center',
                        }}
                      >
                        {d}
                      </TableCell>
                    ))}
                    <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Present</TableCell>
                    <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>%</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summary.students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={summary.dates.length + 3}>
                        <Typography variant="body2" sx={{ color: THEME.muted }}>
                          No students or attendance records for this subject.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    summary.students.map((s) => (
                      <TableRow key={s.email}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="600">
                            {s.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: THEME.muted }}>
                            {s.email}
                          </Typography>
                        </TableCell>
                        {summary.dates.map((d) => (
                          <TableCell
                            key={d}
                            sx={{
                              textAlign: 'center',
                              padding: '4px',
                            }}
                          >
                            {s.dates?.[d] ? '✓' : ''}
                          </TableCell>
                        ))}
                        <TableCell sx={{ textAlign: 'center' }}>{s.present_days}</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>{s.attendance_percentage.toFixed(1)}%</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  )
}

export default UploadAttendance
