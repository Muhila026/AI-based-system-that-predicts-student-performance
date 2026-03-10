import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  LinearProgress,
} from '@mui/material'
import { EventNote as EventNoteIcon } from '@mui/icons-material'
import { getMyAttendance, type AttendanceWithPercentage } from '../../lib/api'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

const StudentAttendance: React.FC = () => {
  const [attendance, setAttendance] = useState<AttendanceWithPercentage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getMyAttendance()
      .then((data) => {
        if (!cancelled) setAttendance(data ?? null)
      })
      .catch(() => {
        if (!cancelled) {
          setError('Failed to load attendance')
          setAttendance(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      <Box sx={{ mb: 3, pb: 3, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}>
          My Attendance
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          Your attendance record based on teacher uploads
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
      ) : !attendance ? (
        <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
          <CardContent>
            <Typography variant="body2" sx={{ color: THEME.muted }} textAlign="center" py={4}>
              No attendance record yet.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0, backgroundColor: '#fff' }}>
          <CardContent sx={{ py: 3, px: 2.5 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <EventNoteIcon sx={{ color: THEME.primary, fontSize: 22 }} />
              <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>
                Attendance
              </Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h3" fontWeight="700" sx={{ color: THEME.primary, letterSpacing: '-0.02em' }}>
                {attendance.attendance_percentage.toFixed(1)}%
              </Typography>
              <Typography variant="body2" sx={{ color: THEME.muted }}>
                {attendance.present_days} of {attendance.total_days} days present
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, Math.max(0, attendance.attendance_percentage))}
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
  )
}

export default StudentAttendance

