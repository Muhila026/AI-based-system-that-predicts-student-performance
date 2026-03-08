import React, { useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Button,
  TextField,
} from '@mui/material'
import CenteredMessage from '../../components/CenteredMessage'
import { EmojiEvents, Info, Add as AddIcon } from '@mui/icons-material'
import { getMyPredictedGrade, createMyStudyLog, type PredictedGradeResponse } from '../../lib/api'

/**
 * View predicted grade from system data. weekly_self_study_hours = sum of study hours
 * in the last 7 days (log below). Other inputs: attendance, assignment marks, participation.
 */
const PredictedGrade: React.FC = () => {
  const [data, setData] = useState<PredictedGradeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' })
  const [studyDate, setStudyDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [studyHours, setStudyHours] = useState('')
  const [logging, setLogging] = useState(false)

  const load = () => {
    setLoading(true)
    setError(null)
    getMyPredictedGrade()
      .then(setData)
      .catch((e) => setError(e.message || 'Failed to load predicted grade'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const handleLogStudy = async () => {
    const hours = parseFloat(studyHours)
    if (isNaN(hours) || hours < 0) {
      setSnackbar({ open: true, message: 'Enter a valid number of hours (≥ 0)', severity: 'error' })
      return
    }
    setLogging(true)
    try {
      await createMyStudyLog({ studyHours: hours, studyDate: studyDate || undefined })
      setSnackbar({ open: true, message: 'Study log added. Prediction uses last 7 days.', severity: 'success' })
      setStudyHours('')
      load()
    } catch (e: any) {
      setSnackbar({ open: true, message: e?.message || 'Failed to log', severity: 'error' })
    } finally {
      setLogging(false)
    }
  }

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
        <strong>How prediction works:</strong> weekly_self_study_hours = sum of study hours you log in the last 7 days.
        Other inputs: attendance %, assignment total score, teacher participation rating. Log your study hours below to improve the prediction.
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
                {data.confidence != null && data.confidence !== undefined && (
                  <> · Confidence: <strong>{(data.confidence * 100).toFixed(0)}%</strong></>
                )}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>
            Features used (from system)
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
            {data.features && typeof data.features === 'object' && Object.entries(data.features).map(([key, value]) => (
              <Chip
                key={key}
                label={`${key}: ${typeof value === 'number' ? value.toFixed(1) : value}`}
                size="small"
                variant="outlined"
              />
            ))}
          </Box>
          {data.features && typeof (data.features as Record<string, unknown>).weekly_self_study_hours === 'number' && (
            <Typography variant="body2" color="text.secondary">
              <strong>weekly_self_study_hours</strong> is the sum of study hours you logged in the last 7 days. Add entries below to increase it.
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>
            Log study hours (for prediction)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Each entry adds to weekly_self_study_hours. Only the last 7 days are used for the predicted grade.
          </Typography>
          <Box display="flex" flexWrap="wrap" alignItems="center" gap={2}>
            <TextField
              size="small"
              type="date"
              label="Date"
              value={studyDate}
              onChange={(e) => setStudyDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 160 }}
            />
            <TextField
              size="small"
              type="number"
              label="Hours"
              value={studyHours}
              onChange={(e) => setStudyHours(e.target.value)}
              inputProps={{ min: 0, step: 0.5 }}
              placeholder="e.g. 2.5"
              sx={{ width: 100 }}
            />
            <Button
              variant="contained"
              startIcon={logging ? <CircularProgress size={18} /> : <AddIcon />}
              disabled={logging}
              onClick={handleLogStudy}
            >
              {logging ? 'Adding…' : 'Add log'}
            </Button>
          </Box>
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

export default PredictedGrade
