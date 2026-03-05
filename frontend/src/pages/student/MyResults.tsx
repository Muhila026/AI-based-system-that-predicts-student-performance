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
import { getMyResults, type StudentResult } from '../../lib/api'

const MyResults: React.FC = () => {
  const [results, setResults] = useState<StudentResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadResults()
  }, [])

  const loadResults = async () => {
    try {
      setLoading(true)
      const data = await getMyResults()
      setResults(data)
    } catch (error) {
      console.error('Error loading results:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        My Results
      </Typography>

      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Assessment</strong></TableCell>
                  <TableCell><strong>Module</strong></TableCell>
                  <TableCell><strong>Marks Obtained</strong></TableCell>
                  <TableCell><strong>Max Marks</strong></TableCell>
                  <TableCell><strong>Grade</strong></TableCell>
                  <TableCell><strong>Date</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="textSecondary">No results found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  results.map((result) => (
                    <TableRow key={String(result.result_id)}>
                      <TableCell>{result.assessment_title || 'N/A'}</TableCell>
                      <TableCell>{result.module_name || 'N/A'}</TableCell>
                      <TableCell>{result.marks_obtained}</TableCell>
                      <TableCell>{result.max_marks || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip label={result.grade} color="primary" size="small" />
                      </TableCell>
                      <TableCell>{result.created_at ? new Date(result.created_at).toLocaleDateString() : 'N/A'}</TableCell>
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

export default MyResults

