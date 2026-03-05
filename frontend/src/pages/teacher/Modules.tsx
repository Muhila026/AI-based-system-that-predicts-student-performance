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
import { getModules, type Module } from '../../lib/api'

const TeacherModules: React.FC = () => {
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadModules()
  }, [])

  const loadModules = async () => {
    try {
      setLoading(true)
      // TODO: Filter by teacher's assigned modules when backend supports it
      const data = await getModules()
      setModules(data)
    } catch (error) {
      console.error('Error loading modules:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        My Modules
      </Typography>

      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Module Code</strong></TableCell>
                  <TableCell><strong>Module Name</strong></TableCell>
                  <TableCell><strong>Course</strong></TableCell>
                  <TableCell><strong>Semester</strong></TableCell>
                  <TableCell><strong>Credits</strong></TableCell>
                  <TableCell><strong>Students</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : modules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="textSecondary">No modules assigned</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  modules.map((module) => (
                    <TableRow key={module.module_id}>
                      <TableCell>{module.module_code}</TableCell>
                      <TableCell>{module.module_name}</TableCell>
                      <TableCell>{module.course_name || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip label={`Semester ${module.semester}`} size="small" />
                      </TableCell>
                      <TableCell>{module.credit_value}</TableCell>
                      <TableCell>N/A</TableCell>
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

export default TeacherModules

