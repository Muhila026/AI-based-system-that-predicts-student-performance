import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import { EventNote as EventNoteIcon } from '@mui/icons-material'
import {
  getMyAttendance,
  getMyModuleAttendance,
  type AttendanceWithPercentage,
  type MyModuleAttendanceSubject,
} from '../../lib/api'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

const StudentAttendance: React.FC = () => {
  const [daily, setDaily] = useState<AttendanceWithPercentage | null>(null)
  const [moduleSubjects, setModuleSubjects] = useState<MyModuleAttendanceSubject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([getMyAttendance(), getMyModuleAttendance()])
      .then(([dailyRes, moduleRes]) => {
        if (cancelled) return
        setDaily(dailyRes ?? null)
        setModuleSubjects(Array.isArray(moduleRes) ? moduleRes : [])
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load attendance')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const hasDaily =
    daily &&
    typeof daily.total_days === 'number' &&
    daily.total_days > 0
  const hasModule = moduleSubjects.length > 0
  const showEmpty = !loading && !hasDaily && !hasModule && !error

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      <Box sx={{ mb: 3, pb: 3, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}>
          My Attendance
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          Daily attendance (teacher daily upload) and per-subject attendance (teacher upload by subject) when available.
        </Typography>
      </Box>

      {error && (
        <Typography variant="body2" sx={{ color: '#991b1b', mb: 2 }}>
          {error}
        </Typography>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress sx={{ color: THEME.primary }} />
        </Box>
      ) : showEmpty ? (
        <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
          <CardContent>
            <Typography variant="body2" sx={{ color: THEME.muted }} textAlign="center" py={4}>
              No attendance recorded yet. Your teacher will mark attendance by subject (Upload Attendance) or daily list.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Per-subject module attendance (primary flow for this app) */}
          {hasModule && (
            <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0, backgroundColor: '#fff' }}>
              <CardContent sx={{ py: 2.5, px: 2.5 }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <EventNoteIcon sx={{ color: THEME.primary, fontSize: 22 }} />
                  <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>
                    Attendance by subject
                  </Typography>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ borderBottom: `2px solid ${THEME.primaryBorder}` }}>
                        <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Subject</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: THEME.textDark }} align="right">
                          Present days
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, color: THEME.textDark }} align="right">
                          Planned / sessions
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, color: THEME.textDark }} align="right">
                          %
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {moduleSubjects.map((row) => (
                        <TableRow
                          key={row.subject_id}
                          sx={{ borderBottom: `1px solid ${THEME.primaryBorder}`, '&:hover': { backgroundColor: THEME.primaryLight } }}
                        >
                          <TableCell sx={{ color: THEME.textDark }}>{row.subject_name || row.subject_id}</TableCell>
                          <TableCell align="right">{row.present_days}</TableCell>
                          <TableCell align="right" sx={{ color: THEME.muted }}>
                            {row.planned_sessions} planned · {row.total_sessions} recorded
                          </TableCell>
                          <TableCell align="right">
                            <Typography fontWeight="700" sx={{ color: THEME.primary }}>
                              {Number(row.attendance_percentage).toFixed(1)}%
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}

          {/* Global daily attendance (attendance_daily) */}
          {hasDaily && daily && (
            <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0, backgroundColor: '#fff' }}>
              <CardContent sx={{ py: 3, px: 2.5 }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <EventNoteIcon sx={{ color: THEME.primary, fontSize: 22 }} />
                  <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>
                    Overall daily attendance
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h3" fontWeight="700" sx={{ color: THEME.primary, letterSpacing: '-0.02em' }}>
                    {Number(daily.attendance_percentage).toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" sx={{ color: THEME.muted }}>
                    {daily.present_days} of {daily.total_days} days present
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, Math.max(0, Number(daily.attendance_percentage)))}
                  sx={{
                    height: 10,
                    borderRadius: 0,
                    backgroundColor: THEME.primaryBorder,
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: THEME.primary,
                      borderRadius: 0,
                    },
                  }}
                />
              </CardContent>
            </Card>
          )}
        </Box>
      )}
    </Box>
  )
}

export default StudentAttendance
