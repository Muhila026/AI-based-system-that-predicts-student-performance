/**
 * DEPRECATED: Manual ML input form (study hours, attendance, participation sliders).
 * Do NOT use for prediction. The app now uses PredictedGrade.tsx which gets all inputs
 * from system data only: Assignments + Attendance + Participation + Study Logs
 * → Feature Aggregation → ML Model → Predicted Grade (no manual form).
 * This file is kept for reference only; sidebar "Performance Predictor" renders PredictedGrade.
 */
import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Slider,
  Button,
  Grid,
  LinearProgress,
  Chip,
  Paper,
} from '@mui/material'
import { motion } from 'framer-motion'
import { predictRFScore, type NotebookPredictInput } from '../../lib/api'
import { TrendingUp, Calculate, EmojiEvents } from '@mui/icons-material'

const PerformancePredictor: React.FC = () => {
  const [studyHours, setStudyHours] = useState<number>(18)
  const [attendance, setAttendance] = useState<number>(85)
  const [participation, setParticipation] = useState<number>(5)
  const [predictedScore, setPredictedScore] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [gradeProbabilities, setGradeProbabilities] = useState<{
    A: number
    B: number
    C: number
    D: number
    F: number
  } | null>(null)

  const calculateGrade = (score: number): { grade: string; label: string; color: string } => {
    if (score >= 90) return { grade: 'A', label: 'Excellent', color: '#10b981' }
    if (score >= 80) return { grade: 'B', label: 'Good', color: '#3b82f6' }
    if (score >= 70) return { grade: 'C', label: 'Average', color: '#f59e0b' }
    if (score >= 60) return { grade: 'D', label: 'Below Average', color: '#ef4444' }
    return { grade: 'F', label: 'Fail', color: '#dc2626' }
  }

  const calculateGradeProbabilities = (score: number) => {
    const mean = score
    const stdDev = 8
    
    const normalCDF = (x: number, mean: number, stdDev: number) => {
      return 0.5 * (1 + erf((x - mean) / (stdDev * Math.sqrt(2))))
    }
    
    const erf = (x: number) => {
      const a1 = 0.254829592
      const a2 = -0.284496736
      const a3 = 1.421413741
      const a4 = -1.453152027
      const a5 = 1.061405429
      const p = 0.3275911
      const sign = x < 0 ? -1 : 1
      x = Math.abs(x)
      const t = 1.0 / (1.0 + p * x)
      const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)
      return sign * y
    }
    
    const A = (100 - normalCDF(90, mean, stdDev)) * 100
    const B = (normalCDF(90, mean, stdDev) - normalCDF(80, mean, stdDev)) * 100
    const C = (normalCDF(80, mean, stdDev) - normalCDF(70, mean, stdDev)) * 100
    const D = (normalCDF(70, mean, stdDev) - normalCDF(60, mean, stdDev)) * 100
    const F = normalCDF(60, mean, stdDev) * 100
    const total = A + B + C + D + F
    return {
      A: Math.max(0, Math.min(100, (A / total) * 100)),
      B: Math.max(0, Math.min(100, (B / total) * 100)),
      C: Math.max(0, Math.min(100, (C / total) * 100)),
      D: Math.max(0, Math.min(100, (D / total) * 100)),
      F: Math.max(0, Math.min(100, (F / total) * 100)),
    }
  }

  const handlePredict = async () => {
    setIsLoading(true)
    try {
      const monthlyHours = studyHours * 4.33
      
      const input: NotebookPredictInput = {
        monthly_self_study_hours: monthlyHours,
        attendance_percentage: attendance,
        class_participation: participation,
      }
      
      const score = await predictRFScore(input)
      setPredictedScore(score)
      const probabilities = calculateGradeProbabilities(score)
      setGradeProbabilities(probabilities)
    } catch (error) {
      console.error('Prediction error:', error)
      const fallbackScore = Math.round(
        0.6 * Math.min(100, (studyHours * 4.33 / 100) * 100) +
        0.25 * attendance +
        0.15 * (participation / 10) * 100
      )
      setPredictedScore(fallbackScore)
      setGradeProbabilities(calculateGradeProbabilities(fallbackScore))
    } finally {
      setIsLoading(false)
    }
  }

  const gradeInfo = predictedScore ? calculateGrade(predictedScore) : null
  const confidence = predictedScore && gradeProbabilities 
    ? Math.max(...Object.values(gradeProbabilities)) 
    : null

  return (
    <Box>
      <Box mb={4} display="flex" alignItems="center" gap={2}>
        <EmojiEvents sx={{ fontSize: 40, color: '#6366f1' }} />
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Student Performance Predictor
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Powered by XGBoost ML Model
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Input Form */}
        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" mb={3} display="flex" alignItems="center" gap={1}>
                  <Calculate color="primary" />
                  Enter Student Information
                </Typography>

                {/* Weekly Self-Study Hours */}
                <Box mb={4}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body1" fontWeight="medium">
                      Weekly Self-Study Hours: {studyHours} hrs
                    </Typography>
                  </Box>
                  <Slider
                    value={studyHours}
                    onChange={(_, value) => setStudyHours(value as number)}
                    min={0}
                    max={40}
                    step={1}
                    marks={[
                      { value: 0, label: '0' },
                      { value: 20, label: '20' },
                      { value: 40, label: '40' },
                    ]}
                    sx={{
                      '& .MuiSlider-thumb': {
                        width: 20,
                        height: 20,
                      },
                    }}
                  />
                </Box>

                {/* Attendance Percentage */}
                <Box mb={4}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body1" fontWeight="medium">
                      Attendance Percentage: {attendance}%
                    </Typography>
                  </Box>
                  <Slider
                    value={attendance}
                    onChange={(_, value) => setAttendance(value as number)}
                    min={0}
                    max={100}
                    step={1}
                    marks={[
                      { value: 0, label: '0%' },
                      { value: 50, label: '50%' },
                      { value: 100, label: '100%' },
                    ]}
                    sx={{
                      '& .MuiSlider-thumb': {
                        width: 20,
                        height: 20,
                      },
                    }}
                  />
                </Box>

                {/* Class Participation */}
                <Box mb={4}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body1" fontWeight="medium">
                      Class Participation: {participation}/10
                    </Typography>
                  </Box>
                  <Slider
                    value={participation}
                    onChange={(_, value) => setParticipation(value as number)}
                    min={0}
                    max={10}
                    step={0.5}
                    marks={[
                      { value: 0, label: '0' },
                      { value: 5, label: '5' },
                      { value: 10, label: '10' },
                    ]}
                    sx={{
                      '& .MuiSlider-thumb': {
                        width: 20,
                        height: 20,
                      },
                    }}
                  />
                </Box>

                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={handlePredict}
                  disabled={isLoading}
                  sx={{
                    py: 1.5,
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                    },
                  }}
                >
                  {isLoading ? 'Predicting...' : 'Predict Performance'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* Results */}
        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent>
                {predictedScore !== null ? (
                  <>
                    {/* Total Score */}
                    <Box mb={4}>
                      <Typography variant="h6" fontWeight="bold" mb={2}>
                        Total Score: {predictedScore}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={predictedScore}
                        sx={{
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: '#e5e7eb',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 6,
                            background: `linear-gradient(90deg, ${gradeInfo?.color || '#6366f1'} 0%, ${gradeInfo?.color || '#6366f1'}80 100%)`,
                          },
                        }}
                      />
                    </Box>

                    {/* Prediction Result */}
                    <Box mb={4}>
                      <Typography variant="h6" fontWeight="bold" mb={2}>
                        Prediction Result
                      </Typography>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 3,
                          background: `linear-gradient(135deg, ${gradeInfo?.color}15 0%, ${gradeInfo?.color}05 100%)`,
                          border: `2px solid ${gradeInfo?.color}40`,
                          borderRadius: 2,
                        }}
                      >
                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                          <Chip
                            label={gradeInfo?.grade}
                            sx={{
                              bgcolor: gradeInfo?.color,
                              color: 'white',
                              fontSize: '1.2rem',
                              fontWeight: 'bold',
                              height: 40,
                              width: 60,
                            }}
                          />
                          <Typography variant="h6" fontWeight="bold" color={gradeInfo?.color}>
                            {gradeInfo?.label}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" mb={1}>
                          Confidence: {confidence?.toFixed(1)}%
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {gradeInfo?.grade === 'A' || gradeInfo?.grade === 'B'
                            ? "Good performance! You're on the right track."
                            : gradeInfo?.grade === 'C'
                            ? "Average performance. Consider improving study habits."
                            : "Below average performance. Focus on attendance and participation."}
                        </Typography>
                      </Paper>
                    </Box>

                    {/* Grade Probabilities */}
                    {gradeProbabilities && (
                      <Box>
                        <Typography variant="h6" fontWeight="bold" mb={2} display="flex" alignItems="center" gap={1}>
                          <TrendingUp color="primary" />
                          Grade Probabilities
                        </Typography>
                        {(['A', 'B', 'C', 'D', 'F'] as const).map((grade) => {
                          const prob = gradeProbabilities[grade]
                          const gradeColors: Record<string, string> = {
                            A: '#10b981',
                            B: '#3b82f6',
                            C: '#f59e0b',
                            D: '#ef4444',
                            F: '#dc2626',
                          }
                          return (
                            <Box key={grade} mb={2}>
                              <Box display="flex" justifyContent="space-between" mb={0.5}>
                                <Typography variant="body2" fontWeight="medium">
                                  Grade {grade}: {prob.toFixed(1)}%
                                </Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={prob}
                                sx={{
                                  height: 8,
                                  borderRadius: 4,
                                  backgroundColor: '#e5e7eb',
                                  '& .MuiLinearProgress-bar': {
                                    borderRadius: 4,
                                    backgroundColor: gradeColors[grade],
                                  },
                                }}
                              />
                            </Box>
                          )
                        })}
                      </Box>
                    )}
                  </>
                ) : (
                  <Box textAlign="center" py={8}>
                    <Typography variant="h6" color="text.secondary" mb={2}>
                      Enter your information and click "Predict Performance" to see your predicted score and grade probabilities.
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      The prediction is based on your study hours, attendance, and class participation.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>
    </Box>
  )
}

export default PerformancePredictor
