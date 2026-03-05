import React, { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  LinearProgress,
  Avatar,
  CircularProgress,
} from '@mui/material'
import {
  Assignment,
  CheckCircle,
  Schedule,
  Warning,
  Grade,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { AssignmentItem, getAssignments, updateAssignmentStatus, getMyTotalScore, type StudentTotalScore } from '../../lib/api'

const Assignments: React.FC = () => {
  const [assignments, setAssignments] = useState<AssignmentItem[]>([])
  const [totalScore, setTotalScore] = useState<StudentTotalScore | null>(null)

  useEffect(() => {
    getAssignments().then(setAssignments)
  }, [])

  useEffect(() => {
    getMyTotalScore().then(setTotalScore)
  }, [])

  const stats = useMemo(() => ({
    total: assignments.length,
    submitted: assignments.filter(a=>a.status==='submitted').length,
    pending: assignments.filter(a=>a.status==='pending').length,
    overdue: assignments.filter(a=>a.status==='overdue').length,
  }), [assignments])

  // (sample removed; using mock API state)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return { bg: '#dcfce7', color: '#15803d' }
      case 'pending':
        return { bg: '#fef3c7', color: '#92400e' }
      case 'in-progress':
        return { bg: '#dbeafe', color: '#1e40af' }
      case 'overdue':
        return { bg: '#fee2e2', color: '#991b1b' }
      default:
        return { bg: '#f3f4f6', color: '#374151' }
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <CheckCircle sx={{ color: '#15803d' }} />
      case 'pending':
        return <Schedule sx={{ color: '#92400e' }} />
      case 'overdue':
        return <Warning sx={{ color: '#991b1b' }} />
      default:
        return <Assignment sx={{ color: '#1e40af' }} />
    }
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" mb={1}>
        Assignments & Grades
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Track your assignments, submissions, and grades
      </Typography>

      {/* Assignment total score (auto: sum(marks)/sum(max_marks)*100) */}
      {totalScore && (
        <Card sx={{ mb: 3, bgcolor: '#f0f9ff', border: '1px solid #bae6fd' }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <Grade sx={{ fontSize: 40, color: '#0369a1' }} />
              <Box>
                <Typography variant="h4" fontWeight="bold" color="#0369a1">
                  {totalScore.total_score.toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total score = (sum of marks / sum of max_marks) × 100 • {totalScore.submission_count} submission(s)
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={2} mb={4}>
        <Card sx={{ bgcolor: '#f0f9ff', border: '1px solid #bae6fd' }}>
          <CardContent>
            <Typography variant="h4" fontWeight="bold" color="#0369a1">
              {stats.total}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Assignments
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <CardContent>
            <Typography variant="h4" fontWeight="bold" color="#15803d">
              {stats.submitted}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Submitted
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ bgcolor: '#fffbeb', border: '1px solid #fde68a' }}>
          <CardContent>
            <Typography variant="h4" fontWeight="bold" color="#92400e">
              {stats.pending}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pending
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ bgcolor: '#fef2f2', border: '1px solid #fecaca' }}>
          <CardContent>
            <Typography variant="h4" fontWeight="bold" color="#991b1b">
              {stats.overdue}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Overdue
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Assignments List */}
      <Box>
        <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={3}>
                All Assignments
              </Typography>

              {assignments.map((assignment, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    sx={{
                      mb: 2,
                      border: '1px solid #e5e7eb',
                      '&:hover': {
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        transform: 'translateY(-2px)',
                        transition: 'all 0.3s ease',
                      },
                    }}
                  >
                    <CardContent>
                      <Box display="flex" alignItems="flex-start" gap={2}>
                        <Avatar
                          sx={{
                            bgcolor: getStatusColor(assignment.status).bg,
                            width: 56,
                            height: 56,
                          }}
                        >
                          {getStatusIcon(assignment.status)}
                        </Avatar>

                        <Box flexGrow={1}>
                          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                            <Box>
                              <Typography variant="h6" fontWeight="bold">
                                {assignment.title}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {assignment.subject}
                              </Typography>
                            </Box>
                            <Chip
                              label={assignment.status.toUpperCase()}
                              size="small"
                              sx={{
                                bgcolor: getStatusColor(assignment.status).bg,
                                color: getStatusColor(assignment.status).color,
                                fontWeight: 600,
                              }}
                            />
                          </Box>

                          <Box display="flex" gap={3} mb={2}>
                            <Typography variant="body2" color="text.secondary">
                              Due: {assignment.dueDate}
                            </Typography>
                            {assignment.submittedDate && (
                              <Typography variant="body2" color="text.secondary">
                                Submitted: {assignment.submittedDate}
                              </Typography>
                            )}
                          </Box>

                          {assignment.grade && (
                            <Box display="flex" alignItems="center" gap={2}>
                              <Chip
                                label={`Grade: ${assignment.grade}`}
                                sx={{
                                  bgcolor: '#dcfce7',
                                  color: '#15803d',
                                  fontWeight: 'bold',
                                }}
                              />
                              <Box flexGrow={1} maxWidth={200}>
                                <LinearProgress
                                  variant="determinate"
                                  value={assignment.score || 0}
                                  sx={{
                                    height: 8,
                                    borderRadius: 4,
                                    bgcolor: '#e5e7eb',
                                    '& .MuiLinearProgress-bar': {
                                      bgcolor: '#10b981',
                                      borderRadius: 4,
                                    },
                                  }}
                                />
                              </Box>
                              <Typography variant="body2" fontWeight="bold">
                                {assignment.score}%
                              </Typography>
                            </Box>
                          )}

                          {assignment.status !== 'submitted' && (
                            <Box display="flex" gap={2} mt={2}>
                              {assignment.status === 'pending' && (
                                <Button variant="contained" size="small" onClick={() => updateAssignmentStatus(assignment.id, 'in-progress').then(setAssignments)}>
                                  Start Assignment
                                </Button>
                              )}
                              {assignment.status === 'in-progress' && (
                                <>
                                  <Button variant="contained" size="small" onClick={() => updateAssignmentStatus(assignment.id, 'in-progress').then(setAssignments)}>
                                    Continue
                                  </Button>
                                  <Button variant="outlined" size="small" onClick={() => updateAssignmentStatus(assignment.id, 'submitted').then(setAssignments)}>
                                    Submit
                                  </Button>
                                </>
                              )}
                              {assignment.status === 'overdue' && (
                                <Button variant="contained" color="error" size="small" onClick={() => updateAssignmentStatus(assignment.id, 'submitted').then(setAssignments)}>
                                  Submit Late
                                </Button>
                              )}
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </CardContent>
          </Card>
      </Box>
    </Box>
  )
}

export default Assignments

