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
import RunningTime from '../../components/RunningTime'
import { EmojiEvents } from '@mui/icons-material'
import {
  getMyPredictedGrade,
  getWeeklyStudySum,
  type PredictedGradeResponse,
  type WeeklyStudySum,
} from '../../lib/api'

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
 */
const PredictedGrade: React.FC = () => {
  const [data, setData] = useState<PredictedGradeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [weeklySum, setWeeklySum] = useState<WeeklyStudySum | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    Promise.all([getMyPredictedGrade(), getWeeklyStudySum()])
      .then(([gradeData, sum]) => {
        setData(gradeData)
        setWeeklySum(sum || null)
      })
      .catch((e) => setError(e?.message || 'Failed to load predicted grade'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

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

  const gradeColor =
    data.predicted_grade.startsWith('A') ? '#10b981'
      : data.predicted_grade.startsWith('B') ? '#3b82f6'
        : data.predicted_grade.startsWith('C') ? '#f59e0b'
          : '#ef4444'

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Header */}
      <Box
        sx={{
          mb: 3,
          pb: 3,
          borderBottom: `1px solid ${THEME.primaryBorder}`,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Typography
          variant="h5"
          fontWeight="700"
          sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}
        >
          Predicted Grade
        </Typography>
        <RunningTime sx={{ color: THEME.muted, flexShrink: 0 }} />
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
              <Typography variant="h4" fontWeight="700" sx={{ color: gradeColor, letterSpacing: '-0.02em' }}>
                {data.predicted_grade}
              </Typography>
              <Typography variant="body1" sx={{ color: THEME.muted, mt: 0.5 }}>
                Predicted score: <strong sx={{ color: THEME.textDark }}>{data.predicted_score}</strong> / 100
                {data.confidence != null && data.confidence !== undefined && (
                  <> · Confidence: <strong sx={{ color: THEME.textDark }}>{(data.confidence * 100).toFixed(0)}%</strong></>
                )}
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
          <Box display="flex" flexWrap="wrap" gap={1}>
            {data.features && typeof data.features === 'object' && Object.entries(data.features).map(([key, value]) => (
              <Chip
                key={key}
                label={`${key}: ${typeof value === 'number' ? value.toFixed(1) : value}`}
                size="small"
                variant="outlined"
                sx={{ borderColor: THEME.primaryBorder, color: THEME.textDark }}
              />
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
          <Typography variant="subtitle1" fontWeight="600" sx={{ color: THEME.textDark, mb: 1 }}>
            Study hours
          </Typography>
          <Typography variant="body2" sx={{ color: THEME.muted, mb: 2 }}>
            Study hours are calculated from your login and logout time. When you log out, your session duration is recorded automatically. Weekly minimum 3 hours.
          </Typography>
          {weeklySum != null && (
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                <Typography variant="body2" sx={{ color: THEME.textDark }}>
                  This week: <strong>{weeklySum.weeklyHours} h</strong> / {weeklySum.weeklyMinimum} h minimum
                </Typography>
                {weeklySum.weeklyHours >= weeklySum.weeklyMinimum && (
                  <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 600 }}>Met</Typography>
                )}
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, (weeklySum.weeklyHours / weeklySum.weeklyMinimum) * 100)}
                sx={{
                  height: 6,
                  borderRadius: 0,
                  backgroundColor: THEME.primaryBorder,
                  '& .MuiLinearProgress-bar': { backgroundColor: weeklySum.weeklyHours >= weeklySum.weeklyMinimum ? '#10b981' : THEME.primary, borderRadius: 0 },
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}

export default PredictedGrade
