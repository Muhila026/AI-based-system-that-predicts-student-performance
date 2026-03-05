import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
} from '@mui/material'
import { motion } from 'framer-motion'
import {
  getStudentDashboardMetrics,
  getMyPredictedGrade,
  getPerformanceOverview,
  getExamHistory,
  getStrengthsImprovements,
} from '../../lib/api'
import type { SubjectPerf } from '../../lib/api'

const PerformanceAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<{
    study_hours: number
    attendance_percentage: number
    class_participation: number
    total_score: number
    grade: string
  } | null>(null)
  const [predicted, setPredicted] = useState<{
    predicted_grade: string
    predicted_score: number
    confidence?: number
  } | null>(null)
  const [performanceData, setPerformanceData] = useState<SubjectPerf[]>([])
  const [examHistory, setExamHistory] = useState<
    Array<{ exam: string; date: string; score: number; grade: string }>
  >([])
  const [strengths, setStrengths] = useState<string[]>([])
  const [improvements, setImprovements] = useState<string[]>([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [metricsRes, overviewRes, examRes, strengthsRes] = await Promise.all([
          getStudentDashboardMetrics(),
          getPerformanceOverview(),
          getExamHistory(),
          getStrengthsImprovements(),
        ])
        setMetrics(metricsRes)
        setPerformanceData(Array.isArray(overviewRes) ? overviewRes : [])
        setExamHistory(Array.isArray(examRes) ? examRes : [])
        setStrengths(strengthsRes.strengths || [])
        setImprovements(strengthsRes.improvements || [])
        try {
          const predRes = await getMyPredictedGrade()
          setPredicted({
            predicted_grade: predRes.predicted_grade,
            predicted_score: predRes.predicted_score,
            confidence: (predRes as { confidence?: number }).confidence,
          })
        } catch {
          setPredicted(null)
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load performance data')
        setPerformanceData([])
        setExamHistory([])
        setStrengths(['Problem Solving', 'Analytical Thinking'])
        setImprovements(['Time Management', 'Note Taking'])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="320px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        Performance Analytics
      </Typography>

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* AI Predictions / Metrics summary */}
      <Box mb={4}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
            }}
          >
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2}>
                AI-Powered Predictions & Metrics
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }} mb={1}>
                Based on your assignment scores, attendance, participation, and study logs from the
                system.
              </Typography>
              {metrics && (
                <Box display="flex" flexWrap="wrap" gap={2} mt={2}>
                  <Chip
                    label={`Current score: ${metrics.total_score?.toFixed(1) ?? '—'}%`}
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  />
                  <Chip
                    label={`Attendance: ${metrics.attendance_percentage?.toFixed(1) ?? '—'}%`}
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  />
                  <Chip
                    label={`Predicted grade: ${predicted?.predicted_grade ?? metrics.grade ?? 'N/A'}`}
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </Box>

      {/* Performance Overview */}
      <Box
        display="grid"
        gridTemplateColumns={{ xs: '1fr', md: '2fr 1fr' }}
        gap={3}
        mb={4}
      >
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={3}>
                Subject Performance Overview
              </Typography>
              {performanceData.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No performance data yet. Complete assignments and attendance to see predictions.
                </Typography>
              ) : (
                <Box sx={{ position: 'relative' }}>
                  {performanceData.map((subject, index) => (
                    <Box key={index} mb={2}>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2" fontWeight={500}>
                          {subject.subject}
                        </Typography>
                        <Box>
                          <Chip
                            label={`Current: ${subject.current}%`}
                            size="small"
                            sx={{ mr: 1, bgcolor: '#e0e7ff', color: '#4338ca' }}
                          />
                          <Chip
                            label={`Predicted: ${subject.predicted}%`}
                            size="small"
                            sx={{ bgcolor: '#dcfce7', color: '#15803d' }}
                          />
                        </Box>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box
                          sx={{
                            width: `${Math.min(100, subject.current)}%`,
                            height: 20,
                            bgcolor: '#6366f1',
                            borderRadius: 1,
                          }}
                        />
                        {subject.trend === 'up' ? (
                          <Typography variant="caption" color="success.main">
                            ↑ +{(subject.predicted - subject.current).toFixed(1)}%
                          </Typography>
                        ) : (
                          <Typography variant="caption" color="error.main">
                            ↓ {(subject.predicted - subject.current).toFixed(1)}%
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>

        <Box>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2} color="success.main">
                Strengths
              </Typography>
              {strengths.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Complete more activities to see strengths.
                </Typography>
              ) : (
                strengths.map((s, i) => (
                  <Chip
                    key={i}
                    label={s}
                    sx={{ m: 0.5, bgcolor: '#dcfce7', color: '#15803d' }}
                  />
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2} color="warning.main">
                Areas to Improve
              </Typography>
              {improvements.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Keep up the good work.
                </Typography>
              ) : (
                improvements.map((imp, i) => (
                  <Chip
                    key={i}
                    label={imp}
                    sx={{ m: 0.5, bgcolor: '#fef3c7', color: '#92400e' }}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Exam History Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" mb={2}>
            Recent Exam / Assignment History
          </Typography>
          {examHistory.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No assignment history yet. Scores appear here after teachers upload grades.
            </Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <strong>Exam / Assignment</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Date</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Score</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Grade</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {examHistory.map((exam, index) => (
                    <TableRow key={index}>
                      <TableCell>{exam.exam}</TableCell>
                      <TableCell>{exam.date}</TableCell>
                      <TableCell>
                        <Chip
                          label={`${exam.score}%`}
                          size="small"
                          sx={{
                            bgcolor:
                              exam.score >= 80 ? '#dcfce7' : exam.score >= 70 ? '#fef3c7' : '#fee2e2',
                            color:
                              exam.score >= 80 ? '#15803d' : exam.score >= 70 ? '#92400e' : '#991b1b',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <strong>{exam.grade}</strong>
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

export default PerformanceAnalytics
