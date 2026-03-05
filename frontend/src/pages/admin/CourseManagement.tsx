import React, { useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  CircularProgress,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
} from '@mui/material'
import { Add, Edit, Delete, People } from '@mui/icons-material'
import { motion } from 'framer-motion'
import { AdminCourse, addCourse, updateCourse, deleteCourse, getCourses, getTeachers } from '../../lib/api'
import type { AdminUser } from '../../lib/api'

const CourseManagement: React.FC = () => {
  const [openDialog, setOpenDialog] = useState(false)
  const [editingCourse, setEditingCourse] = useState<AdminCourse | null>(null)
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<AdminCourse[]>([])
  const [teachers, setTeachers] = useState<AdminUser[]>([])
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })

  const [form, setForm] = useState({
    name: '',
    code: '',
    teachers: [] as string[],
    students: 0,
    status: 'Active' as 'Active' | 'Inactive',
  })

  useEffect(() => {
    loadCourses()
  }, [])
  useEffect(() => {
    getTeachers().then(setTeachers)
  }, [])

  /** Normalize course.teachers (backend may have legacy teacher string in some responses) */
  const courseTeachers = (c: AdminCourse): string[] => {
    if (Array.isArray(c.teachers) && c.teachers.length > 0) return c.teachers
    const t = (c as { teacher?: string }).teacher
    return t ? [t] : []
  }

  const loadCourses = async () => {
    try {
      setLoading(true)
      const allCourses = await getCourses()
      setCourses(allCourses)
    } catch (error) {
      console.error('Failed to load courses:', error)
      setSnackbar({
        open: true,
        message: 'Failed to load courses',
        severity: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Course Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage courses and subjects across the platform
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setEditingCourse(null)
            setForm({ name: '', code: '', teachers: [], students: 0, status: 'Active' })
            setOpenDialog(true)
          }}
          sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          Add Course
        </Button>
      </Box>

      {/* Stats */}
      <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(3, 1fr)' }} gap={2} mb={3}>
        <Card>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" color="#0369a1">
              {courses.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">Total Courses</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" color="#15803d">
              {courses.filter(c => c.status === 'Active').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">Active Courses</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" color="#6366f1">
              {courses.reduce((sum, c) => sum + c.students, 0)}
            </Typography>
            <Typography variant="body2" color="text.secondary">Total Enrollments</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Courses List */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : courses.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
              No courses found
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box display="grid" gap={2}>
          {courses.map((course, index) => (
            <motion.div key={course.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="h6" fontWeight="bold">{course.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Code: {course.code} • Teachers: {courseTeachers(course).length ? courseTeachers(course).join(', ') : '—'}
                      </Typography>
                      <Box display="flex" gap={2} mt={1}>
                        <Chip icon={<People />} label={`${course.students} students`} size="small" />
                        <Chip 
                          label={course.status} 
                          size="small"
                          sx={{
                            bgcolor: course.status === 'Active' ? '#dcfce7' : '#f3f4f6',
                            color: course.status === 'Active' ? '#15803d' : '#6b7280',
                          }}
                        />
                      </Box>
                    </Box>
                    <Box display="flex" gap={1}>
                      <Button 
                        variant="outlined" 
                        size="small" 
                        startIcon={<Edit />}
                        onClick={() => {
                          setEditingCourse(course)
                          setForm({
                            name: course.name,
                            code: course.code,
                            teachers: courseTeachers(course),
                            students: course.students,
                            status: course.status as 'Active' | 'Inactive',
                          })
                          setOpenDialog(true)
                        }}
                      >
                        Edit
                      </Button>
                      <IconButton 
                        color="error" 
                        onClick={async () => {
                          if (!window.confirm('Are you sure you want to delete this course?')) {
                            return
                          }
                          try {
                            await deleteCourse(course.id)
                            setSnackbar({ open: true, message: 'Course deleted successfully', severity: 'success' })
                            await loadCourses()
                          } catch (error: any) {
                            setSnackbar({
                              open: true,
                              message: error.message || 'Failed to delete course',
                              severity: 'error',
                            })
                          }
                        }}
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </Box>
      )}

      {/* Dialog */}
      <Dialog open={openDialog} onClose={() => {
        setOpenDialog(false)
        setEditingCourse(null)
        setForm({ name: '', code: '', teachers: [], students: 0, status: 'Active' })
      }} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCourse ? 'Edit Course' : 'Add New Course'}</DialogTitle>
        <DialogContent>
          <Box display="grid" gap={3} mt={2}>
            <TextField
              fullWidth
              label="Course Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Course Code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              required
            />
            <FormControl fullWidth required>
              <InputLabel>Teachers</InputLabel>
              <Select
                multiple
                value={form.teachers}
                onChange={(e) => setForm({ ...form, teachers: e.target.value as string[] })}
                input={<OutlinedInput label="Teachers" />}
                renderValue={(selected) => (selected as string[]).join(', ')}
              >
                {teachers.length === 0 ? (
                  <MenuItem disabled>No teachers found. Add teachers in User Management first.</MenuItem>
                ) : (
                  teachers.map((t) => (
                    <MenuItem key={t.id ?? t.email} value={t.name || t.email}>
                      {t.name} ({t.email})
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Students (enrollment count)"
              type="number"
              value={form.students}
              onChange={(e) => setForm({ ...form, students: Math.max(0, Number(e.target.value) || 0) })}
              inputProps={{ min: 0 }}
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={form.status}
                label="Status"
                onChange={(e) => setForm({ ...form, status: e.target.value as 'Active' | 'Inactive' })}
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenDialog(false)
            setEditingCourse(null)
            setForm({ name: '', code: '', teachers: [], students: 0, status: 'Active' })
          }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (!form.name || !form.name.trim()) {
                setSnackbar({ open: true, message: 'Course name is required', severity: 'error' })
                return
              }
              if (!form.code || !form.code.trim()) {
                setSnackbar({ open: true, message: 'Course code is required', severity: 'error' })
                return
              }
              if (!form.teachers.length || !form.teachers.some((t) => t && t.trim())) {
                setSnackbar({ open: true, message: 'At least one teacher is required', severity: 'error' })
                return
              }
              try {
                if (editingCourse) {
                  await updateCourse(editingCourse.id, {
                    name: form.name.trim(),
                    code: form.code.trim(),
                    teachers: form.teachers.filter((t) => t && t.trim()),
                    students: form.students,
                    status: form.status,
                  })
                  setSnackbar({ open: true, message: 'Course updated successfully', severity: 'success' })
                } else {
                  await addCourse({
                    name: form.name.trim(),
                    code: form.code.trim(),
                    teachers: form.teachers.filter((t) => t && t.trim()),
                    students: form.students,
                    status: form.status,
                  })
                  setSnackbar({ open: true, message: 'Course added successfully', severity: 'success' })
                }
                setOpenDialog(false)
                setEditingCourse(null)
                setForm({ name: '', code: '', teachers: [], students: 0, status: 'Active' })
                await loadCourses()
              } catch (error: any) {
                setSnackbar({
                  open: true,
                  message: error.message || `Failed to ${editingCourse ? 'update' : 'create'} course`,
                  severity: 'error',
                })
              }
            }}
          >
            {editingCourse ? 'Update Course' : 'Add Course'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default CourseManagement

