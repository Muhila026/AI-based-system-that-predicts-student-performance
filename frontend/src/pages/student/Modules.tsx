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
import { getCurrentUser, getSchemaStudentSubjects, getSchemaSubjects } from '../../lib/api'

export type StudentSubjectRow = { _id: string; subject_id: string; subject_name: string }

const StudentModules: React.FC = () => {
  const [rows, setRows] = useState<StudentSubjectRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadModules()
  }, [])

  const loadModules = async () => {
    try {
      setLoading(true)
      const user = getCurrentUser()
      const email = (user?.email || '').trim()
      if (!email) {
        setRows([])
        return
      }
      const [enrollments, subjects] = await Promise.all([
        getSchemaStudentSubjects(email),
        getSchemaSubjects(),
      ])
      const subjectMap = new Map((subjects || []).map((s) => [String(s._id), s.subject_name || s._id]))
      const list: StudentSubjectRow[] = (enrollments || []).map((e) => ({
        _id: e._id,
        subject_id: e.subject_id,
        subject_name: subjectMap.get(e.subject_id) || e.subject_id,
      }))
      setRows(list)
    } catch (error) {
      console.error('Error loading my subjects:', error)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        My Modules
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Subjects you are enrolled in (from student_subjects).
      </Typography>

      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Subject ID</strong></TableCell>
                  <TableCell><strong>Subject Name</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      <Typography color="textSecondary">No subjects enrolled. Ask admin to assign you subjects.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row._id}>
                      <TableCell>{row.subject_id}</TableCell>
                      <TableCell>{row.subject_name}</TableCell>
                      <TableCell>
                        <Chip label="Enrolled" color="success" size="small" />
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

export default StudentModules

