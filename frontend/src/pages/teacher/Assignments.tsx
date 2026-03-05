import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
  CircularProgress,
} from '@mui/material'
import { Add, Edit, Delete, Upload } from '@mui/icons-material'
import { motion } from 'framer-motion'
import { getTeacherAssignments, createAssignment, updateAssignment, deleteAssignment, getAttendanceStudentList, bulkUploadAssignmentMarks, type StudentListItem } from '../../lib/api'

const TeacherAssignments: React.FC = () => {
  const [openDialog, setOpenDialog] = useState(false)
  const [openEditDialog, setOpenEditDialog] = useState(false)
  const [openUploadMarksDialog, setOpenUploadMarksDialog] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<any>(null)
  const [assignments, setAssignments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [uploadAssignmentId, setUploadAssignmentId] = useState<string | number>('')
  const [studentList, setStudentList] = useState<StudentListItem[]>([])
  const [marksRows, setMarksRows] = useState<Record<number, { marks: number; max_marks: number }>>({})
  const [uploadMarksLoading, setUploadMarksLoading] = useState(false)
  const [uploadMarksSaving, setUploadMarksSaving] = useState(false)

  useEffect(() => {
    fetchAssignments()
  }, [])

  const openUploadMarks = (presetAssignmentId?: string | number) => {
    setUploadAssignmentId(presetAssignmentId ?? '')
    setMarksRows({})
    setOpenUploadMarksDialog(true)
    setUploadMarksLoading(true)
    getAttendanceStudentList()
      .then((list) => {
        setStudentList(list)
        const initial: Record<number, { marks: number; max_marks: number }> = {}
        list.forEach((s) => { initial[s.student_id] = { marks: 0, max_marks: 100 } })
        setMarksRows(initial)
      })
      .finally(() => setUploadMarksLoading(false))
  }

  const handleUploadMarks = async () => {
    const aid = typeof uploadAssignmentId === 'string' ? parseInt(uploadAssignmentId, 10) : uploadAssignmentId
    if (!aid || isNaN(aid)) {
      alert('Select an assignment')
      return
    }
    const submissions = studentList.map((s) => ({
      student_id: s.student_id,
      marks: marksRows[s.student_id]?.marks ?? 0,
      max_marks: marksRows[s.student_id]?.max_marks ?? 100,
      userEmail: s.email,
    })).filter((r) => r.max_marks > 0)
    if (submissions.length === 0) {
      alert('Add at least one submission (max_marks > 0)')
      return
    }
    setUploadMarksSaving(true)
    try {
      await bulkUploadAssignmentMarks(aid, submissions)
      setOpenUploadMarksDialog(false)
      fetchAssignments()
    } catch (e: any) {
      alert(e.message || 'Upload failed')
    } finally {
      setUploadMarksSaving(false)
    }
  }

  const fetchAssignments = async () => {
    setIsLoading(true)
    try {
      const data = await getTeacherAssignments()
      setAssignments(data)
    } catch (error) {
      console.error('Failed to fetch assignments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const [newAssignment, setNewAssignment] = useState({
    title: '',
    class: '',
    dueDate: '',
    description: '',
  })

  const handleCreateAssignment = async () => {
    try {
      await createAssignment({
        title: newAssignment.title,
        subject: newAssignment.class,
        dueDate: newAssignment.dueDate,
        description: newAssignment.description
      })
      setOpenDialog(false)
      setNewAssignment({ title: '', class: '', dueDate: '', description: '' })
      fetchAssignments()
    } catch (error) {
      console.error('Failed to create assignment:', error)
      alert('Error creating assignment')
    }
  }

  const handleEditClick = (assignment: any) => {
    setEditingAssignment(assignment)
    setNewAssignment({
      title: assignment.title || '',
      class: assignment.subject || assignment.class || '',
      dueDate: assignment.dueDate || '',
      description: assignment.description || ''
    })
    setOpenEditDialog(true)
  }

  const handleUpdateAssignment = async () => {
    if (!editingAssignment) return
    
    try {
      await updateAssignment(editingAssignment.id, {
        title: newAssignment.title,
        subject: newAssignment.class,
        dueDate: newAssignment.dueDate,
        description: newAssignment.description
      })
      setOpenEditDialog(false)
      setEditingAssignment(null)
      setNewAssignment({ title: '', class: '', dueDate: '', description: '' })
      fetchAssignments()
    } catch (error) {
      console.error('Failed to update assignment:', error)
      alert('Error updating assignment')
    }
  }

  const handleDeleteClick = async (assignmentId: string) => {
    if (!window.confirm('Are you sure you want to delete this assignment? This action cannot be undone.')) {
      return
    }
    
    try {
      await deleteAssignment(assignmentId)
      fetchAssignments()
    } catch (error) {
      console.error('Failed to delete assignment:', error)
      alert('Error deleting assignment')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return { bg: '#dcfce7', color: '#15803d' }
      case 'draft':
        return { bg: '#fef3c7', color: '#92400e' }
      case 'closed':
        return { bg: '#e5e7eb', color: '#374151' }
      default:
        return { bg: '#f3f4f6', color: '#374151' }
    }
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Assignments
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create, review, and manage assignments
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<Upload />}
            onClick={openUploadMarks}
            sx={{ borderColor: '#059669', color: '#059669' }}
          >
            Upload marks
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenDialog(true)}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #6941a0 100%)',
              },
            }}
          >
            Create Assignment
          </Button>
        </Box>
      </Box>

      {/* Stats */}
      <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(3, 1fr)' }} gap={2} mb={3}>
        <Card sx={{ bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" color="#15803d">
              {assignments.filter(a => a.status === 'active').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Active Assignments
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ bgcolor: '#fffbeb', border: '1px solid #fde68a' }}>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" color="#92400e">
              {assignments.filter(a => a.status === 'draft').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Drafts
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ bgcolor: '#f0f9ff', border: '1px solid #bae6fd' }}>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" color="#0369a1">
              {assignments.reduce((sum, a) => sum + (a.submissions || 0), 0)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Submissions
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Loading State */}
      {isLoading && (
        <Box mb={3}>
          <LinearProgress />
        </Box>
      )}

      {/* Assignments List */}
      <Box display="grid" gap={2}>
        {assignments.map((assignment, index) => (
          <motion.div
            key={assignment.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box flexGrow={1}>
                    <Box display="flex" alignItems="center" gap={2} mb={1}>
                      <Typography variant="h6" fontWeight="bold">
                        {assignment.title}
                      </Typography>
                      <Chip
                        label={assignment.status}
                        size="small"
                        sx={{
                          bgcolor: getStatusColor(assignment.status).bg,
                          color: getStatusColor(assignment.status).color,
                          textTransform: 'capitalize',
                        }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      Subject: {assignment.subject || assignment.class} • Due: {assignment.dueDate}
                    </Typography>
                    <Box display="flex" gap={3}>
                      <Typography variant="body2">
                        📝 Submissions: <strong>{assignment.submissions || 0}/{assignment.total || 0}</strong>
                      </Typography>
                      <Typography variant="body2">
                        ⏰ Pending: <strong>{(assignment.total || 0) - (assignment.submissions || 0)}</strong>
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" gap={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Edit />}
                      onClick={() => handleEditClick(assignment)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      color="primary"
                      startIcon={<Upload />}
                      onClick={() => openUploadMarks(assignment.id)}
                    >
                      Upload marks
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      startIcon={<Delete />}
                      onClick={() => handleDeleteClick(assignment.id)}
                    >
                      Delete
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </Box>

      {/* Create Assignment Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box component="span" fontWeight="bold">Create New Assignment</Box>
        </DialogTitle>
        <DialogContent>
          <Box display="grid" gap={3} mt={2}>
            <TextField
              fullWidth
              label="Assignment Title"
              value={newAssignment.title}
              onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Class</InputLabel>
              <Select
                value={newAssignment.class}
                label="Class"
                onChange={(e) => setNewAssignment({ ...newAssignment, class: e.target.value })}
              >
                <MenuItem value="Math A">Math A</MenuItem>
                <MenuItem value="Physics B">Physics B</MenuItem>
                <MenuItem value="Chemistry C">Chemistry C</MenuItem>
                <MenuItem value="Biology D">Biology D</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Due Date"
              type="date"
              value={newAssignment.dueDate}
              onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={4}
              value={newAssignment.description}
              onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateAssignment}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upload marks Dialog */}
      <Dialog open={openUploadMarksDialog} onClose={() => setOpenUploadMarksDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Upload assignment marks</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            total_score = (sum(marks)/sum(max_marks))*100 is auto-calculated per student.
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Assignment</InputLabel>
            <Select
              value={uploadAssignmentId}
              label="Assignment"
              onChange={(e) => setUploadAssignmentId(e.target.value as string | number)}
            >
              {assignments.map((a) => (
                <MenuItem key={a.id} value={a.id}>{a.title} ({a.subject || a.class})</MenuItem>
              ))}
            </Select>
          </FormControl>
          {uploadMarksLoading ? (
            <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
          ) : (
            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Student</strong></TableCell>
                    <TableCell><strong>Marks</strong></TableCell>
                    <TableCell><strong>Max marks</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {studentList.map((s) => (
                    <TableRow key={s.student_id}>
                      <TableCell>{s.name} ({s.email})</TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          inputProps={{ min: 0, step: 0.5 }}
                          value={marksRows[s.student_id]?.marks ?? 0}
                          onChange={(e) => setMarksRows((p) => ({
                            ...p,
                            [s.student_id]: { ...(p[s.student_id] ?? { marks: 0, max_marks: 100 }), marks: parseFloat(e.target.value) || 0 },
                          }))}
                          sx={{ width: 80 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          inputProps={{ min: 1, step: 1 }}
                          value={marksRows[s.student_id]?.max_marks ?? 100}
                          onChange={(e) => setMarksRows((p) => ({
                            ...p,
                            [s.student_id]: { ...(p[s.student_id] ?? { marks: 0, max_marks: 100 }), max_marks: parseFloat(e.target.value) || 100 },
                          }))}
                          sx={{ width: 90 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUploadMarksDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUploadMarks} disabled={uploadMarksSaving || uploadMarksLoading || studentList.length === 0}>
            {uploadMarksSaving ? 'Uploading...' : 'Upload marks'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Assignment Dialog */}
      <Dialog open={openEditDialog} onClose={() => {
        setOpenEditDialog(false)
        setEditingAssignment(null)
        setNewAssignment({ title: '', class: '', dueDate: '', description: '' })
      }} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box component="span" fontWeight="bold">Edit Assignment</Box>
        </DialogTitle>
        <DialogContent>
          <Box display="grid" gap={3} mt={2}>
            <TextField
              fullWidth
              label="Assignment Title"
              value={newAssignment.title}
              onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Class</InputLabel>
              <Select
                value={newAssignment.class}
                label="Class"
                onChange={(e) => setNewAssignment({ ...newAssignment, class: e.target.value })}
              >
                <MenuItem value="Math A">Math A</MenuItem>
                <MenuItem value="Physics B">Physics B</MenuItem>
                <MenuItem value="Chemistry C">Chemistry C</MenuItem>
                <MenuItem value="Biology D">Biology D</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Due Date"
              type="date"
              value={newAssignment.dueDate}
              onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={4}
              value={newAssignment.description}
              onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenEditDialog(false)
            setEditingAssignment(null)
            setNewAssignment({ title: '', class: '', dueDate: '', description: '' })
          }}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateAssignment}>
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default TeacherAssignments

