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
  TextField,
  InputAdornment,
  MenuItem,
} from '@mui/material'
import CenteredMessage from '../../components/CenteredMessage'
import { ThumbUp } from '@mui/icons-material'
import {
  getAttendanceStudentList,
  setParticipationRating,
  type StudentListItem,
  getTeacherMySubjects,
  type TeacherSubjectWithName,
  getSchemaStudentSubjects,
  type SchemaStudentSubject,
} from '../../lib/api'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

const ParticipationRating: React.FC = () => {
  const [students, setStudents] = useState<StudentListItem[]>([])
  const [ratings, setRatings] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' })
  const [searchTerm, setSearchTerm] = useState('')
  const [subjects, setSubjects] = useState<TeacherSubjectWithName[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all')
  const [subjectStudentMap, setSubjectStudentMap] = useState<Record<string, Set<number>>>({})

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const loadData = async () => {
      try {
        const [list, mySubjects, studentSubjects] = await Promise.all([
          getAttendanceStudentList(),
          getTeacherMySubjects().catch(() => [] as TeacherSubjectWithName[]),
          getSchemaStudentSubjects().catch(() => [] as SchemaStudentSubject[]),
        ])
        if (cancelled) return

        setStudents(list)
        const initial: Record<number, number> = {}
        list.forEach((s) => {
          initial[s.student_id] = 3
        })
        setRatings(initial)
        setSubjects(mySubjects)

        const map: Record<string, Set<number>> = {}
        studentSubjects.forEach((record) => {
          const subjectId = record.subject_id
          const studentIdNum = Number(record.student_id)
          if (!subjectId || Number.isNaN(studentIdNum)) return
          if (!map[subjectId]) {
            map[subjectId] = new Set<number>()
          }
          map[subjectId].add(studentIdNum)
        })
        setSubjectStudentMap(map)
      } catch {
        if (!cancelled) {
          setSnackbar({ open: true, message: 'Failed to load students', severity: 'error' })
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => { cancelled = true }
  }, [])

  const filteredStudents = students.filter((s) => {
    const query = searchTerm.trim().toLowerCase()
    const matchesSearch =
      !query ||
      s.name.toLowerCase().includes(query) ||
      s.email.toLowerCase().includes(query)

    const matchesSubject =
      selectedSubjectId === 'all' ||
      (subjectStudentMap[selectedSubjectId]?.has(s.student_id) ?? false)

    return matchesSearch && matchesSubject
  })

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
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      <Box sx={{ mb: 3, pb: 3, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}>
          Rate participation
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          Set teacher rating (1–5) per student. Used for ML pipeline and predicted grade.
        </Typography>
      </Box>

      <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0, backgroundColor: '#fff' }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <ThumbUp sx={{ color: THEME.primary, fontSize: 22 }} />
            <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>Participation ratings</Typography>
          </Box>
          <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2} mb={3}>
            <TextField
              size="small"
              variant="outlined"
              placeholder="Search by name or email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <span style={{ fontSize: 14, color: THEME.muted }}>🔍</span>
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 1, minWidth: 220 }}
            />
            <TextField
              select
              size="small"
              label="Filter by subject"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              sx={{ minWidth: 220 }}
            >
              <MenuItem value="all">All subjects</MenuItem>
              {subjects.map((subj) => (
                <MenuItem key={subj.subject_id} value={subj.subject_id}>
                  {subj.subject_name}
                </MenuItem>
              ))}
            </TextField>
          </Box>
          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress sx={{ color: THEME.primary }} />
            </Box>
          ) : filteredStudents.length === 0 ? (
            <Alert severity="info">No students in the system.</Alert>
          ) : (
            <List>
              {filteredStudents.map((s) => (
                <ListItem key={s.student_id} sx={{ flexWrap: 'wrap', gap: 2, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
                  <Box sx={{ minWidth: 200 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ color: THEME.textDark }}>{s.name}</Typography>
                    <Typography variant="caption" sx={{ color: THEME.muted }}>{s.email}</Typography>
                  </Box>
                  <Box sx={{ width: 200, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Slider
                      value={ratings[s.student_id] ?? 3}
                      min={1}
                      max={5}
                      step={1}
                      marks
                      valueLabelDisplay="on"
                      sx={{ color: THEME.primary }}
                      onChange={(_, v) => setRatings((p) => ({ ...p, [s.student_id]: v as number }))}
                    />
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleSave(s.student_id)}
                    disabled={savingId === s.student_id}
                    sx={{ borderRadius: 0, borderColor: THEME.primaryBorder, color: THEME.primary }}
                  >
                    {savingId === s.student_id ? 'Saving...' : 'Save'}
                  </Button>
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
        autoHideDuration={5000}
      />
    </Box>
  )
}

export default ParticipationRating
