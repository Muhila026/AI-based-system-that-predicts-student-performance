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
  Snackbar,
} from '@mui/material'
import { EventAvailable, Save } from '@mui/icons-material'
import { getAttendanceStudentList, uploadDailyAttendance, type StudentListItem } from '../../lib/api'

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
    <Box>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
        Upload attendance
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Mark students present for the day. attendance_percentage is auto-generated from present_days / total_days.
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ mr: 2, minWidth: 180 }}
          />
          <Button
            variant="contained"
            startIcon={submitting ? <CircularProgress size={20} /> : <Save />}
            onClick={handleSubmit}
            disabled={submitting || students.length === 0}
            sx={{ mt: 1 }}
          >
            Save attendance
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            Students — tick present
          </Typography>
          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
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

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
        message={snackbar.message}
      />
    </Box>
  )
}

export default UploadAttendance
