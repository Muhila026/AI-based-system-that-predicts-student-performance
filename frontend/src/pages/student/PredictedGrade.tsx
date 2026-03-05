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
import { EmojiEvents, TrendingUp, Info } from '@mui/icons-material'
import { getMyPredictedGrade, type PredictedGradeResponse } from '../../lib/api'

/**
 * View predicted grade from system data only. No manual ML input form.
 * All inputs come from: attendance, assignment marks, participation, study logs.
 */
const PredictedGrade: React.FC = () => {
  const [data, setData] = useState<PredictedGradeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getMyPredictedGrade('rf')
      .then((res) => { if (!cancelled) setData(res) })
      .catch((e) => { if (!cancelled) setError(e.message || 'Failed to load predicted grade') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" py={6}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Computing from attendance, assignments, participation, and study logs…
        </Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" fontWeight="bold" mb={2}>
          Predicted grade
        </Typography>
        <Alert severity="error">{error}</Alert>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Prediction uses system data only (no manual form). Ensure your attendance, assignment marks, and participation are recorded.
        </Typography>
      </Box>
    )
  }

  if (!data) return null

  const gradeColor = data.predicted_grade.startsWith('A') ? '#10b981' : data.predicted_grade.startsWith('B') ? '#3b82f6' : data.predicted_grade.startsWith('C') ? '#f59e0b' : '#ef4444'

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" mb={1}>
        Predicted grade
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Based on your attendance, assignment scores, participation, and study logs. No manual input.
      </Typography>

      <Alert icon={<Info />} severity="info" sx={{ mb: 3 }}>
        All ML inputs come from system data: attendance %, assignment total score, teacher participation rating, and study logs.
      </Alert>

      <Card sx={{ mb: 3, borderLeft: 4, borderColor: gradeColor }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
            <EmojiEvents sx={{ fontSize: 48, color: gradeColor }} />
            <Box>
              <Typography variant="h3" fontWeight="bold" color={gradeColor}>
                {data.predicted_grade}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Predicted score: <strong>{data.predicted_score}</strong> / 100
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>
            Features used (from system)
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {data.features && typeof data.features === 'object' && Object.entries(data.features).map(([key, value]) => (
              <Chip
                key={key}
                label={`${key}: ${typeof value === 'number' ? value.toFixed(1) : value}`}
                size="small"
                variant="outlined"
              />
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

export default PredictedGrade
