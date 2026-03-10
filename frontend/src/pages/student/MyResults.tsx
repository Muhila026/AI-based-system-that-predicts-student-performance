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
  Chip,
  CircularProgress,
} from '@mui/material'
import { Grade as GradeIcon } from '@mui/icons-material'
import { getMyResults, type StudentResult } from '../../lib/api'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

const MyResults: React.FC = () => {
  const [results, setResults] = useState<StudentResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadResults()
  }, [])

  const loadResults = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getMyResults()
      setResults(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error loading results:', err)
      setError('Failed to load results')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      <Box sx={{ mb: 3, pb: 3, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}>
          My Results
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          Your grades and marks by assessment
        </Typography>
      </Box>

      {error && (
        <Typography variant="body2" sx={{ color: '#991b1b', mb: 2 }}>
          {error}
        </Typography>
      )}

      <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0, backgroundColor: '#fff' }}>
        <CardContent sx={{ py: 2.5, px: 2.5 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <GradeIcon sx={{ color: THEME.primary, fontSize: 22 }} />
            <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>
              Results
            </Typography>
          </Box>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress sx={{ color: THEME.primary }} />
            </Box>
          ) : results.length === 0 ? (
            <Typography variant="body2" sx={{ color: THEME.muted }} textAlign="center" py={4}>
              No results yet.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ borderBottom: `2px solid ${THEME.primaryBorder}` }}>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark, py: 1.5 }}>Assessment</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark, py: 1.5 }}>Module</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark, py: 1.5 }}>Marks</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark, py: 1.5 }}>Max</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark, py: 1.5 }}>Grade</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark, py: 1.5 }}>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.map((result) => (
                    <TableRow
                      key={String(result.result_id)}
                      sx={{
                        borderBottom: `1px solid ${THEME.primaryBorder}`,
                        '&:hover': { backgroundColor: THEME.primaryLight },
                      }}
                    >
                      <TableCell sx={{ py: 1.5, color: THEME.textDark }}>
                        {result.assessment_title || '—'}
                      </TableCell>
                      <TableCell sx={{ py: 1.5, color: THEME.textDark }}>
                        {result.module_name || '—'}
                      </TableCell>
                      <TableCell sx={{ py: 1.5, fontWeight: 600, color: THEME.textDark }}>
                        {result.marks_obtained}
                      </TableCell>
                      <TableCell sx={{ py: 1.5, color: THEME.muted }}>
                        {result.max_marks ?? '—'}
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Chip
                          label={result.grade || '—'}
                          size="small"
                          sx={{ borderRadius: 0, bgcolor: THEME.primaryLight, color: THEME.primary }}
                        />
                      </TableCell>
                      <TableCell sx={{ py: 1.5, color: THEME.muted }}>
                        {result.created_at ? new Date(result.created_at).toLocaleDateString() : '—'}
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

export default MyResults

