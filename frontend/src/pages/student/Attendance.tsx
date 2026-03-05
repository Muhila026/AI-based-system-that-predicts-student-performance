import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  CircularProgress,
  LinearProgress,
} from '@mui/material'
import { getMyAttendance, type AttendanceWithPercentage } from '../../lib/api'

const StudentAttendance: React.FC = () => {
  const [attendance, setAttendance] = useState<AttendanceWithPercentage | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getMyAttendance()
      .then((data) => { if (!cancelled) setAttendance(data) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" mb={1}>
        My Attendance
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        attendance_percentage = (present_days / total_days) × 100 (from teacher uploads)
      </Typography>

      {!attendance ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary">No attendance record yet. Teacher will upload daily attendance.</Typography>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Typography variant="h5" fontWeight="bold" color="primary">
                {attendance.attendance_percentage.toFixed(1)}%
              </Typography>
              <Chip label="attendance_percentage" size="small" variant="outlined" />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Present: <strong>{attendance.present_days}</strong> / Total days: <strong>{attendance.total_days}</strong>
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, attendance.attendance_percentage)}
              sx={{ mt: 2, height: 8, borderRadius: 1 }}
            />
          </CardContent>
        </Card>
      )}

    </Box>
  )
}

export default StudentAttendance

