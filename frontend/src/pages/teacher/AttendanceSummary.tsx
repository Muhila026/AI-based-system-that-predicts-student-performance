import React, { useState, useEffect } from 'react'
import {
    Box,
    Typography,
    CircularProgress,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material'
import { motion } from 'framer-motion'
import {
    getModuleAttendanceSummary,
    ModuleAttendanceSummary
} from '../../lib/api'

const STYLES = {
    headerBg: '#f8fafc',
    borderBlue: '#3a6080',
    gridLine: '#ccd6e0',
    textMain: '#1e293b',
    textMuted: '#64748b',
    presentColor: '#2563eb',
    absentColor: '#ef4444'
}

const AttendanceSummary: React.FC = () => {
    const [subjects, setSubjects] = useState<any[]>([])
    const [selectedSubject, setSelectedSubject] = useState<string>('')
    const [summary, setSummary] = useState<ModuleAttendanceSummary | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        // Load subjects for the teacher
        const fetchSubjects = async () => {
            try {
                const userStr = sessionStorage.getItem('user') || localStorage.getItem('user')
                if (!userStr) return
                const user = JSON.parse(userStr)

                const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
                const res = await fetch(`${API_BASE_URL}/v1/schema/my-teacher-subjects`, {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                })
                if (res.ok) {
                    const data = await res.json()
                    setSubjects(data)
                    if (data.length > 0) {
                        setSelectedSubject(data[0].subject_id)
                    }
                }
            } catch (err) {
                console.error('Failed to fetch subjects', err)
            }
        }
        fetchSubjects()
    }, [])

    useEffect(() => {
        if (!selectedSubject) return

        const loadSummary = async () => {
            setLoading(true)
            setError(null)
            try {
                const data = await getModuleAttendanceSummary(selectedSubject)
                setSummary(data)
            } catch (err) {
                setError('Failed to load attendance summary')
            } finally {
                setLoading(false)
            }
        }
        loadSummary()
    }, [selectedSubject])

    // Helper to map dates to weeks and days
    // We'll assume Week 1 starts with the first recorded date's Monday
    const getWeekAndDay = (dateStr: string) => {
        const date = new Date(dateStr)
        const day = date.getDay() // 0 is Sun, 1 is Mon, 5 is Fri
        // Simplify: get the week number based on the first date in summary.dates
        if (!summary || summary.dates.length === 0) return { week: 1, dayInd: 0 }

        const firstDate = new Date(summary.dates[0])
        // Find the Monday of the first date's week
        const firstMon = new Date(firstDate)
        const diff = firstMon.getDay() - 1
        firstMon.setDate(firstMon.getDate() - (diff < 0 ? 6 : diff))

        const daysDiff = Math.floor((date.getTime() - firstMon.getTime()) / (1000 * 60 * 60 * 24))
        const week = Math.floor(daysDiff / 7) + 1
        const dayInd = (day + 6) % 7 // Adjusted day index for mapping to columns
        return { week, dayInd }
    }

    const weekdays = ['M', 'T', 'W', 'T', 'F']
    const weeks = [1, 2, 3, 4, 5, 6, 7]

    return (
        <Box sx={{ p: 2, minHeight: '100vh', backgroundColor: '#fdfdfd' }}>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                    <Box>
                        <Typography variant="h4" fontWeight="800" sx={{ color: STYLES.borderBlue, letterSpacing: '-0.01em' }}>
                            Attendance Analytics
                        </Typography>
                        <Typography variant="body2" sx={{ color: STYLES.textMuted }}>
                            Detailed weekly attendance tracking summary
                        </Typography>
                    </Box>

                    <FormControl sx={{ minWidth: 250 }}>
                        <InputLabel>Select Subject</InputLabel>
                        <Select
                            value={selectedSubject}
                            label="Select Subject"
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            sx={{ borderRadius: '12px' }}
                        >
                            {subjects.map((s) => (
                                <MenuItem key={s.subject_id} value={s.subject_id}>
                                    {s.subject_name} ({s.subject_id})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            </motion.div>

            {loading ? (
                <Box display="flex" justifyContent="center" py={10}>
                    <CircularProgress sx={{ color: STYLES.borderBlue }} />
                </Box>
            ) : error ? (
                <Typography color="error" textAlign="center">{error}</Typography>
            ) : !summary || summary.students.length === 0 ? (
                <Box py={10} textAlign="center">
                    <Typography sx={{ color: STYLES.textMuted }}>No attendance records found for this subject.</Typography>
                </Box>
            ) : (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <TableContainer
                        component={Paper}
                        elevation={0}
                        sx={{
                            border: `2px solid ${STYLES.borderBlue}`,
                            borderRadius: '0px',
                            overflow: 'auto',
                            maxHeight: 'calc(100vh - 250px)'
                        }}
                    >
                        <Table stickyHeader sx={{ minWidth: 1200, borderCollapse: 'collapse' }}>
                            <TableHead>
                                {/* Main Title Row */}
                                <TableRow>
                                    <TableCell
                                        colSpan={1 + weeks.length * 5}
                                        align="center"
                                        sx={{
                                            py: 1,
                                            borderBottom: `2px solid ${STYLES.borderBlue}`,
                                            color: STYLES.borderBlue,
                                            fontWeight: 500,
                                            fontSize: '1.2rem',
                                            fontFamily: "'Times New Roman', serif"
                                        }}
                                    >
                                        Attendance Sheet
                                    </TableCell>
                                </TableRow>

                                {/* Weeks Row */}
                                <TableRow>
                                    <TableCell
                                        rowSpan={2}
                                        sx={{
                                            fontWeight: 'bold',
                                            bgcolor: '#edf2f7',
                                            width: 250,
                                            borderRight: `2px solid ${STYLES.borderBlue}`,
                                            borderBottom: `2px solid ${STYLES.borderBlue}`,
                                            borderLeft: `2px solid ${STYLES.borderBlue}`,
                                            color: STYLES.textMain,
                                            textAlign: 'center'
                                        }}
                                    >
                                        Student Name
                                    </TableCell>
                                    {weeks.map(w => (
                                        <TableCell
                                            key={w}
                                            colSpan={5}
                                            align="center"
                                            sx={{
                                                fontWeight: 'bold',
                                                bgcolor: '#edf2f7',
                                                borderRight: `1px solid ${STYLES.gridLine}`,
                                                borderBottom: `1px solid ${STYLES.gridLine}`,
                                                borderTop: `2px solid ${STYLES.borderBlue}`,
                                                color: STYLES.textMain,
                                                fontSize: '0.85rem'
                                            }}
                                        >
                                            Week {w}
                                        </TableCell>
                                    ))}
                                </TableRow>

                                {/* Days Row */}
                                <TableRow>
                                    {weeks.map(w => (
                                        weekdays.map((d, di) => (
                                            <TableCell
                                                key={`${w}-${di}`}
                                                align="center"
                                                sx={{
                                                    p: 0.5,
                                                    width: 30,
                                                    fontSize: '0.75rem',
                                                    bgcolor: '#f8fafc',
                                                    borderRight: (di === 4) ? `1px solid ${STYLES.gridLine}` : `1px solid ${STYLES.gridLine}`,
                                                    borderBottom: `2px solid ${STYLES.borderBlue}`,
                                                    color: STYLES.textMuted
                                                }}
                                            >
                                                {d}
                                            </TableCell>
                                        ))
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {summary.students.map((student, sIdx) => (
                                    <TableRow
                                        key={student.email}
                                        component={motion.tr}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.1 + sIdx * 0.05 }}
                                        sx={{ '&:hover': { bgcolor: '#f1f5f9' } }}
                                    >
                                        <TableCell
                                            sx={{
                                                borderRight: `2px solid ${STYLES.borderBlue}`,
                                                borderBottom: `1px solid ${STYLES.gridLine}`,
                                                borderLeft: `2px solid ${STYLES.borderBlue}`,
                                                fontWeight: 600,
                                                color: STYLES.textMain,
                                                py: 1,
                                                px: 2
                                            }}
                                        >
                                            {student.name}
                                        </TableCell>
                                        {weeks.map(w => (
                                            weekdays.map((d, di) => {
                                                // Find if there's a date in this slot
                                                // This part is tricky because the backend just gives a list of dates.
                                                // For demonstration, we'll try to find any date that fits this slots ISO date.
                                                // But we don't know the exact schedule.
                                                // Let's simplified it: if summary has data for this weekday/week combination relative to start.

                                                // Let's just use the student.dates map
                                                // We need a way to know which date corresponds to Week W, Day D.
                                                // If we don't have a schedule, we can't perfectly map it.
                                                // However, we can iterate over summary.dates and map them.

                                                const hasAttendanceOnAnyDateInThisSlot = summary.dates.some(dateStr => {
                                                    const { week, dayInd } = getWeekAndDay(dateStr);
                                                    return week === w && dayInd === di && student.dates[dateStr];
                                                });

                                                return (
                                                    <TableCell
                                                        key={`${w}-${di}`}
                                                        align="center"
                                                        sx={{
                                                            p: 0,
                                                            width: 32,
                                                            height: 32,
                                                            borderRight: `1px solid ${STYLES.gridLine}`,
                                                            borderBottom: `1px solid ${STYLES.gridLine}`,
                                                            backgroundColor: hasAttendanceOnAnyDateInThisSlot ? '#e0f2fe' : 'transparent'
                                                        }}
                                                    >
                                                        {hasAttendanceOnAnyDateInThisSlot && (
                                                            <Box sx={{ color: STYLES.presentColor, fontWeight: 'bold' }}>✓</Box>
                                                        )}
                                                    </TableCell>
                                                )
                                            })
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Box mt={3} display="flex" gap={4} justifyContent="center" sx={{ color: STYLES.textMuted, fontSize: '0.85rem' }}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Box sx={{ width: 16, height: 16, bgcolor: '#e0f2fe', border: `1px solid ${STYLES.gridLine}` }} />
                            <Typography variant="body2">Present</Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Box sx={{ width: 16, height: 16, bgcolor: 'transparent', border: `1px solid ${STYLES.gridLine}` }} />
                            <Typography variant="body2">Absent / No Record</Typography>
                        </Box>
                    </Box>
                </motion.div>
            )}
        </Box>
    )
}

export default AttendanceSummary
