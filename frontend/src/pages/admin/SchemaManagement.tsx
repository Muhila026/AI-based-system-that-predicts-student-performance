import React, { useEffect, useState } from 'react'
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
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material'
import { Add, Delete, Edit } from '@mui/icons-material'
import {
  getSchemaSubjects,
  createSchemaSubject,
  updateSchemaSubject,
  deleteSchemaSubject,
  getSchemaStudentSubjects,
  createSchemaStudentSubject,
  deleteSchemaStudentSubject,
  getSchemaTeacherSubjects,
  createSchemaTeacherSubject,
  deleteSchemaTeacherSubject,
  getSchemaStudentSubjectMarks,
  createOrUpdateSchemaStudentSubjectMarks,
  deleteSchemaStudentSubjectMarks,
  getSchemaPredictions,
  createOrUpdateSchemaPrediction,
  deleteSchemaPrediction,
  getSchemaAssignments,
  createSchemaAssignment,
  updateSchemaAssignment,
  deleteSchemaAssignment,
  uploadSchemaAssignmentPdf,
  getAssignmentPdfBlob,
  getUsers,
  getTeacherStudentPerformance,
  type TeacherStudentPerformanceItem,
  type SchemaSubject,
  type SchemaStudentSubject,
  type SchemaTeacherSubject,
  type SchemaStudentSubjectMarks,
  type SchemaPrediction,
  type SchemaSubjectAssignment,
} from '../../lib/api'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

type TabValue = 'subjects' | 'student_subjects' | 'teacher_subjects' | 'assignments' | 'predictions'

const SchemaManagement: React.FC = () => {
  const [tab, setTab] = useState<TabValue>('subjects')
  const [subjects, setSubjects] = useState<SchemaSubject[]>([])
  const [studentSubjects, setStudentSubjects] = useState<SchemaStudentSubject[]>([])
  const [teacherSubjects, setTeacherSubjects] = useState<SchemaTeacherSubject[]>([])
  const [marks, setMarks] = useState<SchemaStudentSubjectMarks[]>([])
  const [predictions, setPredictions] = useState<SchemaPrediction[]>([])
  const [assignments, setAssignments] = useState<SchemaSubjectAssignment[]>([])
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string; role: string }>>([])
  const [teacherStudentPerf, setTeacherStudentPerf] = useState<TeacherStudentPerformanceItem[]>([])
  type SearchKey = 'subjects' | 'student_subjects' | 'teacher_subjects' | 'assignments' | 'predictions'
  const [searchQueries, setSearchQueries] = useState<Record<SearchKey, string>>({
    subjects: '',
    student_subjects: '',
    teacher_subjects: '',
    assignments: '',
    predictions: '',
  })
  const [loading, setLoading] = useState(true)

  const [openSubjectDialog, setOpenSubjectDialog] = useState(false)
  const [editSubjectId, setEditSubjectId] = useState<string | null>(null)
  const [subjectForm, setSubjectForm] = useState({ id: '', subject_name: '' })

  const [openStudentSubDialog, setOpenStudentSubDialog] = useState(false)
  const [editStudentSubId, setEditStudentSubId] = useState<string | null>(null)
  const [studentSubForm, setStudentSubForm] = useState({ id: '', student_id: '', subject_id: '' })

  const [openTeacherSubDialog, setOpenTeacherSubDialog] = useState(false)
  const [editTeacherSubId, setEditTeacherSubId] = useState<string | null>(null)
  const [teacherSubForm, setTeacherSubForm] = useState({ id: '', teacher_id: '', subject_id: '' })

  const [openMarksDialog, setOpenMarksDialog] = useState(false)
  const [marksForm, setMarksForm] = useState({
    id: '',
    student_id: '',
    subject_id: '',
    assignment: 0,
    quiz: 0,
    mid_exam: 0,
    attendance: 0,
  })

  const [openPredDialog, setOpenPredDialog] = useState(false)
  const [predForm, setPredForm] = useState({ student_id: '', subject_id: '', predicted_result: 'Pass', risk_level: 'Low' })

  const [openAssignmentDialog, setOpenAssignmentDialog] = useState(false)
  const [editAssignmentId, setEditAssignmentId] = useState<string | null>(null)
  const [assignmentForm, setAssignmentForm] = useState({ subject_id: '', title: '', description: '', max_marks: 100, assignment_type: 'ASSIGNMENT' })
  const [assignmentPdfFile, setAssignmentPdfFile] = useState<File | null>(null)

  const loadAll = async () => {
    setLoading(true)
    try {
      const [s, ss, ts, m, p, a, u, perf] = await Promise.all([
        getSchemaSubjects(),
        getSchemaStudentSubjects(),
        getSchemaTeacherSubjects(),
        getSchemaStudentSubjectMarks(),
        getSchemaPredictions(),
        getSchemaAssignments(),
        getUsers(),
        getTeacherStudentPerformance(),
      ])
      setSubjects(s)
      setStudentSubjects(ss)
      setTeacherSubjects(ts)
      setMarks(m)
      setPredictions(p)
      setAssignments(a)
      setUsers(u.map((x: any) => ({ id: x.id ?? x.email, name: x.name || x.email, email: x.email, role: x.role || '' })))
      setTeacherStudentPerf(Array.isArray(perf) ? perf : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const handleAddSubject = async () => {
    try {
      if (editSubjectId) {
        await updateSchemaSubject(editSubjectId, {
          subject_name: subjectForm.subject_name,
        })
      } else {
        await createSchemaSubject(subjectForm)
      }
      setOpenSubjectDialog(false)
      setEditSubjectId(null)
      setSubjectForm({ id: '', subject_name: '' })
      loadAll()
    } catch (e: any) {
      alert(e?.message || 'Failed')
    }
  }

  const handleDeleteSubject = async (id: string) => {
    if (!window.confirm('Delete this subject?')) return
    try {
      await deleteSchemaSubject(id)
      loadAll()
    } catch (e: any) {
      alert(e?.message || 'Failed')
    }
  }

  const handleAddStudentSub = async () => {
    try {
      if (editStudentSubId) {
        await deleteSchemaStudentSubject(editStudentSubId)
        await createSchemaStudentSubject({
          id: 'SS-' + Date.now(),
          student_id: studentSubForm.student_id,
          subject_id: studentSubForm.subject_id,
        })
        setEditStudentSubId(null)
      } else {
        await createSchemaStudentSubject({
          id: (studentSubForm.id || 'SS-' + Date.now()).trim(),
          student_id: studentSubForm.student_id.trim(),
          subject_id: studentSubForm.subject_id.trim(),
        })
      }
      setOpenStudentSubDialog(false)
      setStudentSubForm({ id: '', student_id: '', subject_id: '' })
      loadAll()
    } catch (e: any) {
      alert(e?.message || 'Failed')
    }
  }

  const handleDeleteStudentSub = async (id: string) => {
    if (!window.confirm('Remove this assignment?')) return
    try {
      await deleteSchemaStudentSubject(id)
      loadAll()
    } catch (e: any) {
      alert(e?.message || 'Failed')
    }
  }

  const handleAddTeacherSub = async () => {
    try {
      if (editTeacherSubId) {
        await deleteSchemaTeacherSubject(editTeacherSubId)
        await createSchemaTeacherSubject({
          id: 'TS-' + Date.now(),
          teacher_id: teacherSubForm.teacher_id,
          subject_id: teacherSubForm.subject_id,
        })
        setEditTeacherSubId(null)
      } else {
        await createSchemaTeacherSubject({
          id: (teacherSubForm.id || 'TS-' + Date.now()).trim(),
          teacher_id: teacherSubForm.teacher_id.trim(),
          subject_id: teacherSubForm.subject_id.trim(),
        })
      }
      setOpenTeacherSubDialog(false)
      setTeacherSubForm({ id: '', teacher_id: '', subject_id: '' })
      loadAll()
    } catch (e: any) {
      alert(e?.message || 'Failed')
    }
  }

  const handleDeleteTeacherSub = async (id: string) => {
    if (!window.confirm('Remove this assignment?')) return
    try {
      await deleteSchemaTeacherSubject(id)
      loadAll()
    } catch (e: any) {
      alert(e?.message || 'Failed')
    }
  }

  const handleSaveMarks = async () => {
    try {
      await createOrUpdateSchemaStudentSubjectMarks(marksForm)
      setOpenMarksDialog(false)
      setMarksForm({ id: '', student_id: '', subject_id: '', assignment: 0, quiz: 0, mid_exam: 0, attendance: 0 })
      loadAll()
    } catch (e: any) {
      alert(e?.message || 'Failed')
    }
  }

  const handleDeleteMarks = async (id: string) => {
    if (!window.confirm('Delete this marks record?')) return
    try {
      await deleteSchemaStudentSubjectMarks(id)
      loadAll()
    } catch (e: any) {
      alert(e?.message || 'Failed')
    }
  }

  const handleSavePred = async () => {
    try {
      await createOrUpdateSchemaPrediction(predForm)
      setOpenPredDialog(false)
      setPredForm({ student_id: '', subject_id: '', predicted_result: 'Pass', risk_level: 'Low' })
      loadAll()
    } catch (e: any) {
      alert(e?.message || 'Failed')
    }
  }

  const handleDeletePred = async (studentId: string, subjectId: string) => {
    if (!window.confirm('Delete this prediction?')) return
    try {
      await deleteSchemaPrediction(studentId, subjectId)
      loadAll()
    } catch (e: any) {
      alert(e?.message || 'Failed')
    }
  }

  const handleSaveAssignment = async () => {
    try {
      if (editAssignmentId) {
        await updateSchemaAssignment(editAssignmentId, {
          title: assignmentForm.title,
          description: assignmentForm.description || undefined,
          max_marks: assignmentForm.max_marks,
          assignment_type: assignmentForm.assignment_type,
        })
        if (assignmentPdfFile) {
          await uploadSchemaAssignmentPdf(editAssignmentId, assignmentPdfFile)
          setAssignmentPdfFile(null)
        }
      } else {
        const created = await createSchemaAssignment({
          subject_id: assignmentForm.subject_id,
          title: assignmentForm.title,
          description: assignmentForm.description || undefined,
          max_marks: assignmentForm.max_marks,
          assignment_type: assignmentForm.assignment_type,
        })
        if (assignmentPdfFile) {
          await uploadSchemaAssignmentPdf(created.id, assignmentPdfFile)
          setAssignmentPdfFile(null)
        }
      }
      setOpenAssignmentDialog(false)
      setEditAssignmentId(null)
      setAssignmentForm({ subject_id: '', title: '', description: '', max_marks: 100, assignment_type: 'ASSIGNMENT' })
      loadAll()
    } catch (e: any) {
      alert(e?.message || 'Failed')
    }
  }

  const handleDeleteAssignment = async (id: string) => {
    if (!window.confirm('Delete this assignment?')) return
    try {
      await deleteSchemaAssignment(id)
      loadAll()
    } catch (e: any) {
      alert(e?.message || 'Failed')
    }
  }

  const students = users.filter((u) => u.role?.toLowerCase() === 'student')
  const teachers = users.filter((u) => u.role?.toLowerCase() === 'teacher')

  const filteredSubjects = subjects.filter((s) =>
    `${s._id} ${s.subject_name}`.toLowerCase().includes(searchQueries.subjects.toLowerCase())
  )

  const filteredStudentSubjects = studentSubjects.filter((r) =>
    `${r._id} ${r.student_id} ${r.subject_id}`.toLowerCase().includes(
      searchQueries.student_subjects.toLowerCase()
    )
  )

  const filteredTeacherSubjects = teacherSubjects.filter((r) =>
    `${r._id} ${r.teacher_id} ${r.subject_id}`.toLowerCase().includes(
      searchQueries.teacher_subjects.toLowerCase()
    )
  )

  const filteredAssignments = assignments.filter((a) =>
    `${a.subject_name} ${a.subject_id} ${a.title} ${a.assignment_type}`.toLowerCase().includes(
      searchQueries.assignments.toLowerCase()
    )
  )

  const filteredPerfForPredictions = teacherStudentPerf.filter((s) =>
    `${s.name} ${s.email}`.toLowerCase().includes(searchQueries.predictions.toLowerCase())
  )

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      <Box sx={{ pb: 2, borderBottom: `1px solid ${THEME.primaryBorder}`, mb: 2 }}>
        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark }}>
          Subjects & Marks
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          Manage subjects, student/teacher subject assignments, marks, and predictions
        </Typography>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tab label="Subjects" value="subjects" />
        <Tab label="Student Subjects" value="student_subjects" />
        <Tab label="Teacher Subjects" value="teacher_subjects" />
        <Tab label="Subject Assignments" value="assignments" />
        <Tab label="Predictions" value="predictions" />
      </Tabs>

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress sx={{ color: THEME.primary }} />
        </Box>
      ) : (
        <>
          {tab === 'subjects' && (
            <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography fontWeight="600">Institute subjects</Typography>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Add />}
                    onClick={() => {
                      setEditSubjectId(null)
                      setSubjectForm({ id: '', subject_name: '' })
                      setOpenSubjectDialog(true)
                    }}
                    sx={{ backgroundColor: THEME.primary, borderRadius: 0, textTransform: 'none' }}
                  >
                    Add Subject
                  </Button>
                </Box>
                <Box mb={2}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search subjects by ID or name..."
                    value={searchQueries.subjects}
                    onChange={(e) =>
                      setSearchQueries((prev) => ({ ...prev, subjects: e.target.value }))
                    }
                  />
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: THEME.primaryLight }}>
                        <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Subject / Course Name</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredSubjects.map((s) => (
                        <TableRow key={s._id}>
                          <TableCell>{s._id}</TableCell>
                          <TableCell>{s.subject_name}</TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditSubjectId(s._id)
                                setSubjectForm({
                                  id: s._id,
                                  subject_name: s.subject_name,
                                })
                                setOpenSubjectDialog(true)
                              }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteSubject(s._id)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}

          {tab === 'student_subjects' && (
            <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography fontWeight="600">Student – Subject assignments</Typography>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Add />}
                    onClick={() => {
                      setEditStudentSubId(null)
                      setStudentSubForm({ id: '', student_id: '', subject_id: '' })
                      setOpenStudentSubDialog(true)
                    }}
                    sx={{ backgroundColor: THEME.primary, borderRadius: 0, textTransform: 'none' }}
                  >
                    Add
                  </Button>
                </Box>
                <Box mb={2}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search by record ID, student ID, or subject ID..."
                    value={searchQueries.student_subjects}
                    onChange={(e) =>
                      setSearchQueries((prev) => ({
                        ...prev,
                        student_subjects: e.target.value,
                      }))
                    }
                  />
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: THEME.primaryLight }}>
                        <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Student ID</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Subject ID</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredStudentSubjects.map((r) => (
                        <TableRow key={r._id}>
                          <TableCell>{r._id}</TableCell>
                          <TableCell>{r.student_id}</TableCell>
                          <TableCell>{r.subject_id}</TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditStudentSubId(r._id)
                                setStudentSubForm({ id: r._id, student_id: r.student_id, subject_id: r.subject_id })
                                setOpenStudentSubDialog(true)
                              }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteStudentSub(r._id)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}

          {tab === 'teacher_subjects' && (
            <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography fontWeight="600">Teacher – Subject assignments</Typography>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Add />}
                    onClick={() => {
                      setEditTeacherSubId(null)
                      setTeacherSubForm({ id: '', teacher_id: '', subject_id: '' })
                      setOpenTeacherSubDialog(true)
                    }}
                    sx={{ backgroundColor: THEME.primary, borderRadius: 0, textTransform: 'none' }}
                  >
                    Add
                  </Button>
                </Box>
                <Box mb={2}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search by record ID, teacher ID, or subject ID..."
                    value={searchQueries.teacher_subjects}
                    onChange={(e) =>
                      setSearchQueries((prev) => ({
                        ...prev,
                        teacher_subjects: e.target.value,
                      }))
                    }
                  />
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: THEME.primaryLight }}>
                        <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Teacher ID</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Subject ID</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredTeacherSubjects.map((r) => (
                        <TableRow key={r._id}>
                          <TableCell>{r._id}</TableCell>
                          <TableCell>{r.teacher_id}</TableCell>
                          <TableCell>{r.subject_id}</TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditTeacherSubId(r._id)
                                setTeacherSubForm({ id: r._id, teacher_id: r.teacher_id, subject_id: r.subject_id })
                                setOpenTeacherSubDialog(true)
                              }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteTeacherSub(r._id)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}

          {tab === 'assignments' && (
            <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography fontWeight="600">Subject assignments (created by subject teacher; students in that subject get them)</Typography>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Add />}
                    onClick={() => {
                      setEditAssignmentId(null)
                      setAssignmentForm({ subject_id: '', title: '', description: '', max_marks: 100, assignment_type: 'ASSIGNMENT' })
                      setAssignmentPdfFile(null)
                      setOpenAssignmentDialog(true)
                    }}
                    sx={{ backgroundColor: THEME.primary, borderRadius: 0, textTransform: 'none' }}
                  >
                    Add Assignment
                  </Button>
                </Box>
                <Box mb={2}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search assignments by subject, title, or type..."
                    value={searchQueries.assignments}
                    onChange={(e) =>
                      setSearchQueries((prev) => ({
                        ...prev,
                        assignments: e.target.value,
                      }))
                    }
                  />
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: THEME.primaryLight }}>
                        <TableCell sx={{ fontWeight: 600 }}>Subject</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Max Marks</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>PDF</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Teacher</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredAssignments.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell>{a.subject_name} ({a.subject_id})</TableCell>
                          <TableCell>{a.title}</TableCell>
                          <TableCell>{a.assignment_type}</TableCell>
                          <TableCell>{a.max_marks}</TableCell>
                          <TableCell>
                            {a.pdf_url ? (
                              <Button
                                size="small"
                                variant="outlined"
                                sx={{ textTransform: 'none', borderRadius: 0 }}
                                onClick={async () => {
                                  try {
                                    const blob = await getAssignmentPdfBlob(a.id)
                                    const url = URL.createObjectURL(blob)
                                    window.open(url, '_blank')
                                  } catch (e) {
                                    alert('Failed to open PDF')
                                  }
                                }}
                              >
                                View PDF
                              </Button>
                            ) : (
                              <Typography variant="caption" sx={{ color: THEME.muted }}>—</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const teacher = users.find((u) => (u.email || '').toLowerCase() === (a.teacher_id || '').toLowerCase())
                              return teacher?.name || a.teacher_id || '—'
                            })()}
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditAssignmentId(a.id)
                                setAssignmentForm({
                                  subject_id: a.subject_id,
                                  title: a.title,
                                  description: a.description || '',
                                  max_marks: a.max_marks,
                                  assignment_type: a.assignment_type,
                                })
                                setAssignmentPdfFile(null)
                                setOpenAssignmentDialog(true)
                              }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteAssignment(a.id)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}

          {tab === 'predictions' && (
            <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography fontWeight="600">ML Predictions (per student per subject)</Typography>
                </Box>
                <Typography variant="body2" sx={{ color: THEME.muted, mb: 1.5 }}>
                  Combined view of all students with ML-related features. Subject‑level predictions are still stored below.
                </Typography>
                <Box mb={2}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search by student name or email..."
                    value={searchQueries.predictions}
                    onChange={(e) =>
                      setSearchQueries((prev) => ({
                        ...prev,
                        predictions: e.target.value,
                      }))
                    }
                  />
                </Box>
                <TableContainer sx={{ mb: 3 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: THEME.primaryLight }}>
                        <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Predicted Grade</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Total Score</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Attendance</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Class Participation</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Study Hours</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredPerfForPredictions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6}>
                            <Typography variant="body2" sx={{ color: THEME.muted }}>
                              No student performance data available yet.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPerfForPredictions.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell>
                              <Typography variant="body2" fontWeight="600" sx={{ color: THEME.textDark }}>
                                {s.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: THEME.muted }}>
                                {s.email}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {s.predictedGrade || '—'}
                            </TableCell>
                            <TableCell>
                              {s.totalScore != null
                                ? `${s.totalScore.toFixed(1).replace(/\.0$/, '')}%`
                                : s.avgScore != null
                                  ? `${s.avgScore.toFixed(1).replace(/\.0$/, '')}%`
                                  : '—'}
                            </TableCell>
                            <TableCell>
                              {s.attendance != null ? `${s.attendance}%` : '—'}
                            </TableCell>
                            <TableCell>
                              {s.classParticipation != null
                                ? `${s.classParticipation.toFixed(1).replace(/\.0$/, '')}%`
                                : '—'}
                            </TableCell>
                            <TableCell>
                              {s.studyHours != null
                                ? `${s.studyHours.toFixed(1).replace(/\.0$/, '')} h`
                                : '—'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Subject dialog */}
      <Dialog open={openSubjectDialog} onClose={() => setOpenSubjectDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editSubjectId ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Subject ID"
            value={subjectForm.id}
            onChange={(e) => setSubjectForm((f) => ({ ...f, id: e.target.value }))}
            disabled={!!editSubjectId}
            margin="dense"
          />
          <TextField
            fullWidth
            label="Subject / Course Name"
            value={subjectForm.subject_name}
            onChange={(e) => setSubjectForm((f) => ({ ...f, subject_name: e.target.value }))}
            margin="dense"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSubjectDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddSubject} disabled={!subjectForm.id || !subjectForm.subject_name}>
            {editSubjectId ? 'Save' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Subject Assignment dialog */}
      <Dialog open={openAssignmentDialog} onClose={() => setOpenAssignmentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editAssignmentId ? 'Edit Assignment' : 'Add Assignment (subject teacher assigns to students in that subject)'}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense" disabled={!!editAssignmentId}>
            <InputLabel>Subject</InputLabel>
            <Select
              value={assignmentForm.subject_id}
              label="Subject"
              onChange={(e) => setAssignmentForm((f) => ({ ...f, subject_id: e.target.value }))}
            >
              {subjects.map((s) => (
                <MenuItem key={s._id} value={s._id}>{s.subject_name} ({s._id})</MenuItem>
              ))}
            </Select>
            {editAssignmentId && <Typography variant="caption" sx={{ mt: 0.5, color: THEME.muted }}>Subject cannot be changed when editing.</Typography>}
          </FormControl>
          <TextField
            fullWidth
            label="Title"
            value={assignmentForm.title}
            onChange={(e) => setAssignmentForm((f) => ({ ...f, title: e.target.value }))}
            margin="dense"
          />
          <TextField
            fullWidth
            label="Description"
            value={assignmentForm.description}
            onChange={(e) => setAssignmentForm((f) => ({ ...f, description: e.target.value }))}
            margin="dense"
            multiline
            rows={2}
          />
          <TextField
            fullWidth
            type="number"
            label="Max marks"
            value={assignmentForm.max_marks}
            onChange={(e) => setAssignmentForm((f) => ({ ...f, max_marks: parseFloat(e.target.value) || 100 }))}
            margin="dense"
            inputProps={{ min: 1 }}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Type</InputLabel>
            <Select
              value={assignmentForm.assignment_type}
              label="Type"
              onChange={(e) => setAssignmentForm((f) => ({ ...f, assignment_type: e.target.value }))}
            >
              <MenuItem value="ASSIGNMENT">Assignment</MenuItem>
              <MenuItem value="QUIZ">Quiz</MenuItem>
              <MenuItem value="EXAM">Exam</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="body2" sx={{ color: THEME.muted, mb: 0.5 }}>
              {editAssignmentId ? 'Replace PDF (optional)' : 'Upload PDF (optional)'}
            </Typography>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => setAssignmentPdfFile(e.target.files?.[0] || null)}
              style={{ fontSize: '14px' }}
            />
            {assignmentPdfFile && (
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: THEME.primary }}>
                {assignmentPdfFile.name}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAssignmentDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveAssignment} disabled={!assignmentForm.subject_id || !assignmentForm.title.trim()}>
            {editAssignmentId ? 'Save' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Student subject dialog */}
      <Dialog open={openStudentSubDialog} onClose={() => { setOpenStudentSubDialog(false); setEditStudentSubId(null) }} maxWidth="sm" fullWidth>
        <DialogTitle>{editStudentSubId ? 'Edit Student–Subject' : 'Add Student–Subject'}</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Record ID" value={studentSubForm.id} onChange={(e) => setStudentSubForm((f) => ({ ...f, id: e.target.value }))} margin="dense" placeholder="e.g. SS101" />
          <FormControl fullWidth margin="dense">
            <InputLabel>Student</InputLabel>
            <Select
              value={studentSubForm.student_id}
              label="Student"
              onChange={(e) => setStudentSubForm((f) => ({ ...f, student_id: e.target.value }))}
            >
              {students.map((u) => (
                <MenuItem key={u.id} value={u.email}>{u.name || u.email}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense">
            <InputLabel>Subject</InputLabel>
            <Select value={studentSubForm.subject_id} label="Subject" onChange={(e) => setStudentSubForm((f) => ({ ...f, subject_id: e.target.value }))}>
              {subjects.map((s) => (
                <MenuItem key={s._id} value={s._id}>{s.subject_name} ({s._id})</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenStudentSubDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddStudentSub} disabled={!studentSubForm.student_id?.trim() || !studentSubForm.subject_id?.trim()}>
            {editStudentSubId ? 'Save' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Teacher subject dialog */}
      <Dialog open={openTeacherSubDialog} onClose={() => { setOpenTeacherSubDialog(false); setEditTeacherSubId(null) }} maxWidth="sm" fullWidth>
        <DialogTitle>{editTeacherSubId ? 'Edit Teacher–Subject' : 'Add Teacher–Subject'}</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Record ID" value={teacherSubForm.id} onChange={(e) => setTeacherSubForm((f) => ({ ...f, id: e.target.value }))} margin="dense" placeholder="e.g. TS101" />
          <FormControl fullWidth margin="dense">
            <InputLabel>Teacher</InputLabel>
            <Select value={teacherSubForm.teacher_id} label="Teacher" onChange={(e) => setTeacherSubForm((f) => ({ ...f, teacher_id: e.target.value }))}>
              {teachers.map((u) => (
                <MenuItem key={u.id} value={u.email}>{u.name || u.email}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense">
            <InputLabel>Subject</InputLabel>
            <Select value={teacherSubForm.subject_id} label="Subject" onChange={(e) => setTeacherSubForm((f) => ({ ...f, subject_id: e.target.value }))}>
              {subjects.map((s) => (
                <MenuItem key={s._id} value={s._id}>{s.subject_name} ({s._id})</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTeacherSubDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddTeacherSub} disabled={!teacherSubForm.teacher_id?.trim() || !teacherSubForm.subject_id?.trim()}>
            {editTeacherSubId ? 'Save' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Marks dialog */}
      <Dialog open={openMarksDialog} onClose={() => setOpenMarksDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add / Edit Marks</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Record ID" value={marksForm.id} onChange={(e) => setMarksForm((f) => ({ ...f, id: e.target.value }))} margin="dense" />
          <FormControl fullWidth margin="dense">
            <InputLabel>Student</InputLabel>
            <Select value={marksForm.student_id} label="Student" onChange={(e) => setMarksForm((f) => ({ ...f, student_id: e.target.value }))}>
              {students.map((u) => (
                <MenuItem key={u.id} value={u.email}>{u.name || u.email}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense">
            <InputLabel>Subject</InputLabel>
            <Select value={marksForm.subject_id} label="Subject" onChange={(e) => setMarksForm((f) => ({ ...f, subject_id: e.target.value }))}>
              {subjects.map((s) => (
                <MenuItem key={s._id} value={s._id}>{s.subject_name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField fullWidth type="number" label="Assignment" value={marksForm.assignment} onChange={(e) => setMarksForm((f) => ({ ...f, assignment: parseFloat(e.target.value) || 0 }))} margin="dense" />
          <TextField fullWidth type="number" label="Quiz" value={marksForm.quiz} onChange={(e) => setMarksForm((f) => ({ ...f, quiz: parseFloat(e.target.value) || 0 }))} margin="dense" />
          <TextField fullWidth type="number" label="Mid Exam" value={marksForm.mid_exam} onChange={(e) => setMarksForm((f) => ({ ...f, mid_exam: parseFloat(e.target.value) || 0 }))} margin="dense" />
          <TextField fullWidth type="number" label="Attendance" value={marksForm.attendance} onChange={(e) => setMarksForm((f) => ({ ...f, attendance: parseFloat(e.target.value) || 0 }))} margin="dense" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMarksDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveMarks} disabled={!marksForm.id || !marksForm.student_id || !marksForm.subject_id}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Prediction dialog */}
      <Dialog open={openPredDialog} onClose={() => setOpenPredDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Prediction</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense">
            <InputLabel>Student</InputLabel>
            <Select value={predForm.student_id} label="Student" onChange={(e) => setPredForm((f) => ({ ...f, student_id: e.target.value }))}>
              {students.map((u) => (
                <MenuItem key={u.id} value={u.email}>{u.name || u.email}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense">
            <InputLabel>Subject</InputLabel>
            <Select value={predForm.subject_id} label="Subject" onChange={(e) => setPredForm((f) => ({ ...f, subject_id: e.target.value }))}>
              {subjects.map((s) => (
                <MenuItem key={s._id} value={s._id}>{s.subject_name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense">
            <InputLabel>Predicted Result</InputLabel>
            <Select value={predForm.predicted_result} label="Predicted Result" onChange={(e) => setPredForm((f) => ({ ...f, predicted_result: e.target.value }))}>
              <MenuItem value="Pass">Pass</MenuItem>
              <MenuItem value="Fail">Fail</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense">
            <InputLabel>Risk Level</InputLabel>
            <Select value={predForm.risk_level} label="Risk Level" onChange={(e) => setPredForm((f) => ({ ...f, risk_level: e.target.value }))}>
              <MenuItem value="Low">Low</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="High">High</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPredDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSavePred} disabled={!predForm.student_id || !predForm.subject_id}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default SchemaManagement
