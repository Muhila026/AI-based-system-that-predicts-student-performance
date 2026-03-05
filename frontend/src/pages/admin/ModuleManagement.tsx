import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Snackbar,
  Alert,
} from '@mui/material'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { getModules, createModule, updateModule, deleteModule, getCourses, type Module, type ModuleCreate } from '../../lib/api'

const ModuleManagement: React.FC = () => {
  const [modules, setModules] = useState<Module[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [openDialog, setOpenDialog] = useState(false)
  const [editingModule, setEditingModule] = useState<Module | null>(null)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })
  const [formData, setFormData] = useState({
    course_id: '',
    module_code: '',
    module_name: '',
    credit_value: '',
    semester: '',
    description: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [modulesData, coursesData] = await Promise.all([
        getModules(),
        getCourses(),
      ])
      setModules(modulesData)
      setCourses(coursesData)
    } catch (error) {
      console.error('Error loading data:', error)
      showSnackbar('Failed to load data', 'error')
    }
  }
  
  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity })
  }

  const handleOpenDialog = (module?: any) => {
    if (module) {
      setEditingModule(module)
      setFormData({
        course_id: module.course_id?.toString() || '',
        module_code: module.module_code || '',
        module_name: module.module_name || '',
        credit_value: module.credit_value?.toString() || '',
        semester: module.semester?.toString() || '',
        description: module.description || '',
      })
    } else {
      setEditingModule(null)
      setFormData({
        course_id: '',
        module_code: '',
        module_name: '',
        credit_value: '',
        semester: '',
        description: '',
      })
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingModule(null)
  }

  const handleSubmit = async () => {
    try {
      if (editingModule) {
        const updateData: any = {
          module_code: formData.module_code,
          module_name: formData.module_name,
          credit_value: parseInt(formData.credit_value),
          semester: parseInt(formData.semester),
        }
        if (formData.description) updateData.description = formData.description
        
        await updateModule(editingModule.module_id, updateData)
        showSnackbar('Module updated successfully', 'success')
      } else {
        const newModule: ModuleCreate = {
          course_id: parseInt(formData.course_id),
          module_code: formData.module_code,
          module_name: formData.module_name,
          credit_value: parseInt(formData.credit_value),
          semester: parseInt(formData.semester),
          description: formData.description || undefined,
        }
        await createModule(newModule)
        showSnackbar('Module created successfully', 'success')
      }
      handleCloseDialog()
      loadData()
    } catch (error: any) {
      showSnackbar(error.message || 'Failed to save module', 'error')
    }
  }

  const handleDelete = async (moduleId: number) => {
    if (window.confirm('Are you sure you want to delete this module?')) {
      try {
        await deleteModule(moduleId)
        showSnackbar('Module deleted successfully', 'success')
        loadData()
      } catch (error: any) {
        showSnackbar(error.message || 'Failed to delete module', 'error')
      }
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Module Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}
        >
          Add Module
        </Button>
      </Box>

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
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {modules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="textSecondary">No modules found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  modules.map((module) => (
                    <TableRow key={module.module_id}>
                      <TableCell>{module.module_code}</TableCell>
                      <TableCell>{module.module_name}</TableCell>
                      <TableCell>{module.course_name || 'N/A'}</TableCell>
                      <TableCell>{module.semester}</TableCell>
                      <TableCell>{module.credit_value}</TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => handleOpenDialog(module)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDelete(module.module_id)}>
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingModule ? 'Edit Module' : 'Add New Module'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              select
              label="Course"
              value={formData.course_id}
              onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
              fullWidth
            >
              {courses.map((course) => (
                <MenuItem key={course.course_id} value={course.course_id}>
                  {course.course_name} ({course.course_code})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Module Code"
              value={formData.module_code}
              onChange={(e) => setFormData({ ...formData, module_code: e.target.value })}
              fullWidth
            />
            <TextField
              label="Module Name"
              value={formData.module_name}
              onChange={(e) => setFormData({ ...formData, module_name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Credit Value"
              type="number"
              value={formData.credit_value}
              onChange={(e) => setFormData({ ...formData, credit_value: e.target.value })}
              fullWidth
            />
            <TextField
              label="Semester"
              type="number"
              value={formData.semester}
              onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
              fullWidth
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingModule ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
          </Dialog>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  )
}

export default ModuleManagement

