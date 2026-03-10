import React, { useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
} from '@mui/material'
import { EmojiEvents } from '@mui/icons-material'
import {
  getMyPredictedGrade,
  getWeeklyStudySum,
  getMyStudyLogs,
  type PredictedGradeResponse,
  type WeeklyStudySum,
  type StudyLogItem,
} from '../../lib/api'

interface PredictedGradeProps {
  /** Seconds since the current login started (from 0). */
  sessionElapsedSeconds?: number
  /** Optional session limit in seconds (for auto-logout on backend). */
  sessionLimitSeconds?: number
}

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

/**
 * Predicted grade from system data: attendance, assignment marks, participation,
 * and weekly study hours (last 7 days, calculated from login and logout time).
 * The header timer shows the current session's study time (count-up from login).
 */
const PredictedGrade: React.FC<PredictedGradeProps> = ({ sessionElapsedSeconds }) => {
  const [data, setData] = useState<PredictedGradeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [weeklySum, setWeeklySum] = useState<WeeklyStudySum | null>(null)
  const [studyLogs, setStudyLogs] = useState<StudyLogItem[]>([])

  const load = () => {
    setLoading(true)
    setError(null)
    Promise.all([getMyPredictedGrade(), getWeeklyStudySum(), getMyStudyLogs(14)])
      .then(([gradeData, sum, logs]) => {
        setData(gradeData)
        setWeeklySum(sum || null)
        setStudyLogs(Array.isArray(logs) ? logs : [])
      })
      .catch((e) => setError(e?.message || 'Failed to load predicted grade'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const formatElapsed = (elapsed?: number): string => {
    if (elapsed == null || elapsed <= 0) return '00:00:00'
    const hours = Math.floor(elapsed / 3600)
    const minutes = Math.floor((elapsed % 3600) / 60)
    const seconds = elapsed % 60
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  }

  const formatHours = (hours: number | undefined | null): string => {
    if (hours == null || Number.isNaN(hours)) return '0 h'
    const fixed = Number(hours).toFixed(2)
    const trimmed = fixed.replace(/\.00$/, '')
    return `${trimmed} h`
  }

  const formatFeatureKey = (key: string): string => {
    if (!key) return ''
    if (key === 'weekly_self_study_hours') return 'Weekly study hours'
    if (key === 'attendance_percentage') return 'Attendance'
    if (key === 'class_participation') return 'Class participation'
    if (key === 'total_score') return 'Total score'
    return key.replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }

  const formatFeatureValue = (key: string, value: unknown): string => {
    if (typeof value !== 'number') return String(value ?? '')
    if (key === 'weekly_self_study_hours') {
      return formatHours(value)
    }
    if (key === 'attendance_percentage' || key === 'class_participation' || key === 'total_score') {
      return `${value.toFixed(1)}%`
    }
    return value.toFixed(2)
  }

  if (loading && !data) {
    return (
      <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
        <Box sx={{ mb: 3, pb: 3, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
          <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em' }}>
            Predicted Grade
          </Typography>
        </Box>
        <Box display="flex" flexDirection="column" alignItems="center" py={6}>
          <CircularProgress sx={{ color: THEME.primary }} />
        </Box>
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
        <Box sx={{ mb: 3, pb: 3, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
          <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em' }}>
            Predicted Grade
          </Typography>
        </Box>
        <Alert severity="error" sx={{ mb: 2, borderRadius: 0 }}>{error}</Alert>
      </Box>
    )
  }

  if (!data) return null

  const grade = (data.predicted_grade || '').toUpperCase()
  let gradeColor = '#10b981'
  let gradeLabel = 'Excellent'
  let gradeDescription = 'You are performing exceptionally well. Keep up the great work!'

  if (grade.startsWith('A')) {
    gradeColor = '#10b981'
    gradeLabel = 'Excellent'
    gradeDescription = 'You are performing exceptionally well. Keep up the great work!'
  } else if (grade.startsWith('B')) {
    gradeColor = '#3b82f6'
    gradeLabel = 'Good'
    gradeDescription = 'You are on track. A bit more focus can move you to the top tier.'
  } else if (grade.startsWith('C')) {
    gradeColor = '#f59e0b'
    gradeLabel = 'Average'
    gradeDescription = 'You are doing okay, but there is clear room for improvement.'
  } else if (grade.startsWith('D')) {
    gradeColor = '#ef4444'
    gradeLabel = 'Below Average'
    gradeDescription = 'Your performance is below expectations. Consider increasing study time and seeking help.'
  } else if (grade.startsWith('F')) {
    gradeColor = '#dc2626'
    gradeLabel = 'At risk'
    gradeDescription = 'You are at risk of failing. Please talk to your teacher and create a recovery plan.'
  }

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Header */}
      <Box
        sx={{
          mb: 3,
          pb: 3,
          borderBottom: `1px solid ${THEME.primaryBorder}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Typography
          variant="h5"
          fontWeight="700"
          sx={{ color: THEME.textDark, letterSpacing: '-0.02em' }}
        >
          Predicted Grade
        </Typography>
        {typeof sessionElapsedSeconds === 'number' && (
          <Box textAlign="right">
            <Typography
              variant="body2"
              sx={{ color: THEME.muted, fontWeight: 500, lineHeight: 1.2 }}
            >
              Study time this login
            </Typography>
            <Typography
              variant="h6"
              sx={{ color: THEME.textDark, fontWeight: 700, letterSpacing: '0.04em' }}
            >
              {formatElapsed(sessionElapsedSeconds)}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Grade card */}
      <Card
        elevation={0}
        sx={{
          mb: 3,
          border: `1px solid ${THEME.primaryBorder}`,
          borderLeft: 4,
          borderLeftColor: gradeColor,
          borderRadius: 0,
          backgroundColor: '#fff',
        }}
      >
        <CardContent sx={{ py: 2.5, px: 2.5 }}>
          <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 0,
                backgroundColor: THEME.primaryLight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: gradeColor,
              }}
            >
              <EmojiEvents sx={{ fontSize: 36 }} />
            </Box>
            <Box>
              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                <Typography variant="h3" fontWeight="800" sx={{ color: gradeColor, letterSpacing: '-0.04em' }}>
                  {grade}
                </Typography>
                <Chip
                  label={gradeLabel}
                  size="small"
                  sx={{
                    backgroundColor: `${gradeColor}15`,
                    color: gradeColor,
                    fontWeight: 600,
                  }}
                />
              </Box>
              <Typography variant="body1" sx={{ color: THEME.muted, mt: 0.5 }}>
                Predicted score:{' '}
                <Box component="span" sx={{ fontWeight: 700, color: THEME.textDark }}>
                  {data.predicted_score.toFixed(1)}%
                </Box>
              </Typography>
              <Typography variant="body2" sx={{ color: THEME.muted, mt: 1 }}>
                {gradeDescription}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Features used */}
      <Card
        elevation={0}
        sx={{
          mb: 3,
          border: `1px solid ${THEME.primaryBorder}`,
          borderRadius: 0,
          backgroundColor: '#fff',
        }}
      >
        <CardContent sx={{ py: 2.5, px: 2.5 }}>
          <Typography variant="subtitle1" fontWeight="600" sx={{ color: THEME.textDark, mb: 2 }}>
            Features used
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 1.5,
            }}
          >
            {data.features &&
              typeof data.features === 'object' &&
              Object.entries(data.features).map(([key, value]) => (
                <Box
                  key={key}
                  sx={{
                    border: `1px solid ${THEME.primaryBorder}`,
                    borderRadius: 0,
                    px: 1.5,
                    py: 1,
                    backgroundColor: '#fff',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: THEME.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}
                  >
                    {formatFeatureKey(key)}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: THEME.textDark, fontWeight: 600, mt: 0.25 }}
                  >
                    {formatFeatureValue(key, value)}
                  </Typography>
                </Box>
              ))}
          </Box>
        </CardContent>
      </Card>

      {/* Study hours (from login / logout time) */}
      <Card
        elevation={0}
        sx={{
          border: `1px solid ${THEME.primaryBorder}`,
          borderRadius: 0,
          backgroundColor: '#fff',
        }}
      >
        <CardContent sx={{ py: 2.5, px: 2.5 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 3,
            }}
          >
            {/* Weekly summary + progress */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight="600" sx={{ color: THEME.textDark, mb: 1 }}>
                Study hours (last 7 days)
              </Typography>
              <Typography variant="body2" sx={{ color: THEME.muted, mb: 1 }}>
                Weekly minimum <strong>3 hours</strong> from your login–logout sessions.
              </Typography>
              {weeklySum != null && (
                <Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Typography variant="body2" sx={{ color: THEME.textDark }}>
                      This week:{' '}
                      <Box component="span" sx={{ fontWeight: 700 }}>
                        {formatHours(weeklySum.weeklyHours)}
                      </Box>{' '}
                      / {formatHours(weeklySum.weeklyMinimum)}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        px: 1,
                        py: 0.25,
                        borderRadius: 999,
                        border: '1px solid',
                        borderColor:
                          weeklySum.weeklyHours >= weeklySum.weeklyMinimum ? '#10b981' : THEME.primaryBorder,
                        color: weeklySum.weeklyHours >= weeklySum.weeklyMinimum ? '#10b981' : THEME.muted,
                        fontWeight: 600,
                      }}
                    >
                      {weeklySum.weeklyHours >= weeklySum.weeklyMinimum ? 'Goal met' : 'Keep going'}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (weeklySum.weeklyHours / weeklySum.weeklyMinimum) * 100)}
                    sx={{
                      height: 8,
                      borderRadius: 999,
                      backgroundColor: THEME.primaryBorder,
                      '& .MuiLinearProgress-bar': {
                        backgroundColor:
                          weeklySum.weeklyHours >= weeklySum.weeklyMinimum ? '#10b981' : THEME.primary,
                        borderRadius: 999,
                      },
                    }}
                  />
                </Box>
              )}
            </Box>

            {/* Study login history list */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight="600" sx={{ color: THEME.textDark, mb: 1 }}>
                Recent study sessions
              </Typography>
              <Typography variant="caption" sx={{ color: THEME.muted, mb: 1, display: 'block' }}>
                Last 14 days · based on login–logout time
              </Typography>
              {studyLogs.length === 0 ? (
                <Typography variant="body2" sx={{ color: THEME.muted }}>
                  No study sessions recorded yet. After you log out, your session time will appear here.
                </Typography>
              ) : (
                <Box
                  component="ul"
                  sx={{
                    m: 0,
                    p: 0,
                    listStyle: 'none',
                    maxHeight: 180,
                    overflowY: 'auto',
                  }}
                >
                  {studyLogs.slice(0, 7).map((log) => (
                    <Box
                      key={log.id}
                      component="li"
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 0.6,
                        borderBottom: `1px dashed ${THEME.primaryBorder}`,
                        '&:last-of-type': { borderBottom: 'none' },
                      }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{ color: THEME.textDark }}>
                          {log.studyDate}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: THEME.textDark }}>
                        {formatHours(log.studyHours)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

export default PredictedGrade
