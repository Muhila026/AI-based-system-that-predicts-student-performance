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
} from '@mui/material'
import CenteredMessage from '../../components/CenteredMessage'
import { EventAvailable, Save } from '@mui/icons-material'
import { getAttendanceStudentList, uploadDailyAttendance, type StudentListItem } from '../../lib/api'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

const UploadAttendance: React.FC = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [students, setStudents] = useState<StudentListItem[]>([])
  const [presentIds, setPresentIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getAttendanceStudentList()
      .then((list) => { if (!cancelled) setStudents(list) })
      .catch(() => { if (!cancelled) setSnackbar({ open: true, message: 'Failed to load students', severity: 'error' }) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const togglePresent = (studentId: number) => {
    setPresentIds((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) next.delete(studentId)
      else next.add(studentId)
      return next
    })
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await uploadDailyAttendance(Array.from(presentIds), date)
      setSnackbar({ open: true, message: 'Attendance uploaded. attendance_percentage will update automatically.', severity: 'success' })
    } catch (e: any) {
      setSnackbar({ open: true, message: e.message || 'Upload failed', severity: 'error' })
    } finally {
      setSubmitting(false)
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
          <TextField
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{ mr: 2, minWidth: 180 }}
          />
          <Button
            variant="contained"
            sx={{ borderRadius: 0, backgroundColor: THEME.primary, '&:hover': { backgroundColor: '#1e40af' }, mt: 1 }}
            startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <Save />}
            onClick={handleSubmit}
            disabled={submitting || students.length === 0}
          >
            Save attendance
          </Button>
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
          ) : students.length === 0 ? (
            <Alert severity="info">No students in the system. Add students first.</Alert>
          ) : (
            <List dense>
              {students.map((s) => (
                <ListItem key={s.student_id}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={presentIds.has(s.student_id)}
                        onChange={() => togglePresent(s.student_id)}
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
    </Box>
  )
}

export default UploadAttendance
