import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
} from '@mui/material'
import { getAssessments, type Assessment } from '../../lib/api'

const StudentAssessments: React.FC = () => {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAssessments()
  }, [])

  const loadAssessments = async () => {
    try {
      setLoading(true)
      const data = await getAssessments()
      setAssessments(data)
    } catch (error) {
      console.error('Error loading assessments:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        My Assessments
      </Typography>

      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Title</strong></TableCell>
                  <TableCell><strong>Course</strong></TableCell>
                  <TableCell><strong>Type</strong></TableCell>
                  <TableCell><strong>Max Marks</strong></TableCell>
                  <TableCell><strong>Weightage</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : assessments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="textSecondary">No assessments found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  assessments.map((assessment) => (
                    <TableRow key={assessment.assessment_id}>
                      <TableCell>{assessment.title || 'N/A'}</TableCell>
                      <TableCell>{assessment.course_name || assessment.module_name || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip label={assessment.assessment_type} size="small" />
                      </TableCell>
                      <TableCell>{assessment.max_marks}</TableCell>
                      <TableCell>{assessment.weightage}%</TableCell>
                      <TableCell>
                        <Chip label="Active" color="primary" size="small" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  )
}

export default StudentAssessments

