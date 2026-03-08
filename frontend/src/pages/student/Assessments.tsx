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
  Chip,
  CircularProgress,
} from '@mui/material'
import { Assignment as AssignmentIcon } from '@mui/icons-material'
import { getSchemaAssignments, type SchemaSubjectAssignment } from '../../lib/api'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

/**
 * Student Assessments: shows assignments/quizzes/exams assigned by teachers
 * for subjects the student is enrolled in (student_subjects). Backend filters by enrollment.
 */
const StudentAssessments: React.FC = () => {
  const [assignments, setAssignments] = useState<SchemaSubjectAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getSchemaAssignments()
        if (!cancelled) setAssignments(Array.isArray(data) ? data : [])
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Failed to load assessments')
          setAssignments([])
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
      <Box sx={{ mb: 3, pb: 3, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}>
          My Assessments
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          Assignments, quizzes, and exams assigned by your teachers for subjects you are enrolled in.
        </Typography>
      </Box>

      {error && (
        <Typography variant="body2" sx={{ color: '#991b1b', mb: 2 }}>
          {error}
        </Typography>
      )}

      <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0, backgroundColor: '#fff' }}>
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

export default StudentAssessments
