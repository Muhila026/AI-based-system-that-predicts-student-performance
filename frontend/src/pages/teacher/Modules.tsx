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
  CircularProgress,
} from '@mui/material'
import { MenuBook, People } from '@mui/icons-material'
import { motion } from 'framer-motion'
import { getTeacherMySubjects, type TeacherSubjectWithName } from '../../lib/api'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

/**
 * Teacher "My Subjects" page.
 * Fetches subjects from teacher_subjects table (GET /schema/teacher-subjects/me).
 * Backend joins with subjects collection to return subject_id and subject_name.
 */
const TeacherModules: React.FC = () => {
  const [subjects, setSubjects] = useState<TeacherSubjectWithName[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getTeacherMySubjects()
        if (!cancelled) setSubjects(Array.isArray(data) ? data : [])
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Failed to load subjects')
          setSubjects([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="280px">
        <CircularProgress sx={{ color: THEME.primary }} />
      </Box>
    )
  }

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Header — same style as Admin / Teacher Dashboard */}
      <Box
        sx={{
          mb: 3,
          pb: 3,
          borderBottom: `1px solid ${THEME.primaryBorder}`,
        }}
      >
        <Typography
          variant="h5"
          fontWeight="700"
          sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}
        >
          My Subjects
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          Subjects assigned to you from teacher_subjects. Contact admin to get assigned to more.
        </Typography>
      </Box>

      {error && (
        <Typography variant="body2" sx={{ color: '#991b1b', mb: 2 }}>
          {error}
        </Typography>
      )}

      {/* Summary card */}
      <Box sx={{ mb: 2.5 }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card
            elevation={0}
            sx={{
              border: `1px solid ${THEME.primaryBorder}`,
              borderRadius: 0,
              backgroundColor: '#fff',
            }}
          >
            <CardContent sx={{ py: 2, px: 2.5 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 0,
                      backgroundColor: THEME.primaryLight,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: THEME.primary,
                    }}
                  >
                    <MenuBook />
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ color: THEME.muted, fontWeight: 500 }}>
                      Total subjects
                    </Typography>
                    <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark }}>
                      {subjects.length}
                    </Typography>
                  </Box>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <People sx={{ color: THEME.muted, fontSize: 20 }} />
                  <Typography variant="body2" sx={{ color: THEME.muted }}>
                    Assigned via teacher_subjects table
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </motion.div>
      </Box>

      {/* Subjects table — from teacher_subjects + subjects */}
      <Card
        elevation={0}
        sx={{
          border: `1px solid ${THEME.primaryBorder}`,
          borderRadius: 0,
          backgroundColor: '#fff',
        }}
      >
        <CardContent sx={{ py: 2.5, px: 2.5 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <MenuBook sx={{ color: THEME.primary, fontSize: 22 }} />
            <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>
              Subject Details
            </Typography>
          </Box>
          {subjects.length === 0 ? (
            <Box>
              <Typography variant="body2" sx={{ color: THEME.muted }}>
                No subjects assigned yet. Contact admin to add you in the teacher_subjects collection.
              </Typography>
              <Typography variant="caption" sx={{ color: THEME.muted, display: 'block', mt: 1 }}>
                Your login email must match the teacher_id field in each teacher_subjects document.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ borderBottom: `2px solid ${THEME.primaryBorder}` }}>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark, py: 1.5 }}>
                      Subject
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark, py: 1.5 }}>
                      Subject ID
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {subjects.map((row) => (
                    <TableRow
                      key={row.id}
                      sx={{
                        borderBottom: `1px solid ${THEME.primaryBorder}`,
                        '&:hover': { backgroundColor: THEME.primaryLight },
                      }}
                    >
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2" fontWeight="600" sx={{ color: THEME.textDark }}>
                          {row.subject_name || row.subject_id || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ color: THEME.textDark, py: 1.5 }}>
                        {row.subject_id}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}

export default TeacherModules
