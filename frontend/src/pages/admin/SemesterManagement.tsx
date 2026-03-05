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
import { getSemesterManagement, type SemesterData } from '../../lib/api'

const SemesterManagement: React.FC = () => {
  const [semesterData, setSemesterData] = useState<SemesterData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await getSemesterManagement()
      setSemesterData(data)
    } catch (error) {
      console.error('Error loading semester data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        Semester Management
      </Typography>

      <Card>
        <CardContent>
          <Typography variant="h6" mb={2}>
            Course Semester Configuration
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Course Code</strong></TableCell>
                  <TableCell><strong>Course Name</strong></TableCell>
                  <TableCell><strong>Duration (Years)</strong></TableCell>
                  <TableCell><strong>Total Semesters</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : semesterData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography color="textSecondary">No courses found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  semesterData.map((course) => (
                    <TableRow key={course.course_id}>
                      <TableCell>{course.course_code}</TableCell>
                      <TableCell>{course.course_name}</TableCell>
                      <TableCell>{course.duration_years}</TableCell>
                      <TableCell>
                        <Chip
                          label={`${course.total_semesters} Semesters`}
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={course.status}
                          color={course.status === 'ACTIVE' ? 'success' : 'default'}
                          size="small"
                        />
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

export default SemesterManagement

