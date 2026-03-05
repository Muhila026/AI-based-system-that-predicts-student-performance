import React, { useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Slider,
  List,
  ListItem,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material'
import { ThumbUp } from '@mui/icons-material'
import { getAttendanceStudentList, setParticipationRating, type StudentListItem } from '../../lib/api'

const ParticipationRating: React.FC = () => {
  const [students, setStudents] = useState<StudentListItem[]>([])
  const [ratings, setRatings] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getAttendanceStudentList()
      .then((list) => {
        if (!cancelled) {
          setStudents(list)
          const initial: Record<number, number> = {}
          list.forEach((s) => { initial[s.student_id] = 3 })
          setRatings(initial)
        }
      })
      .catch(() => { if (!cancelled) setSnackbar({ open: true, message: 'Failed to load students', severity: 'error' }) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handleSave = async (studentId: number) => {
    const value = ratings[studentId] ?? 3
    setSavingId(studentId)
    try {
      await setParticipationRating(studentId, Math.round(value))
      setSnackbar({ open: true, message: 'Participation rating saved (1–5).', severity: 'success' })
    } catch (e: any) {
      setSnackbar({ open: true, message: e.message || 'Save failed', severity: 'error' })
    } finally {
      setSavingId(null)
    }
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
        Rate participation
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Set teacher rating (1–5) per student. Used for ML pipeline (no manual form).
      </Typography>

      <Card>
        <CardContent>
          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : students.length === 0 ? (
            <Alert severity="info">No students in the system.</Alert>
          ) : (
            <List>
              {students.map((s) => (
                <ListItem key={s.student_id} sx={{ flexWrap: 'wrap', gap: 2 }}>
                  <Box sx={{ minWidth: 200 }}>
                    <Typography variant="body2" fontWeight={600}>{s.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{s.email}</Typography>
                  </Box>
                  <Box sx={{ width: 200, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Slider
                      value={ratings[s.student_id] ?? 3}
                      min={1}
                      max={5}
                      step={1}
                      marks
                      valueLabelDisplay="on"
                      onChange={(_, v) => setRatings((p) => ({ ...p, [s.student_id]: v as number }))}
                    />
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleSave(s.student_id)}
                    disabled={savingId === s.student_id}
                  >
                    {savingId === s.student_id ? 'Saving...' : 'Save'}
                  </Button>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
        message={snackbar.message}
      />
    </Box>
  )
}

export default ParticipationRating
