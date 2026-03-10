/**
 * API Client for FastAPI Backend
 * Connects frontend to the real backend API
 */

import {
  getConversations,
  getMessages,
  addMessage,
  markMessagesAsRead,
  getCurrentUser,
  type ChatMessage as StorageChatMessage,
} from './chatStorage'

export { getCurrentUser }

const USE_MOCK_ONLY = false
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1'

let backendConnected: boolean | null = null
let backendCheckInProgress = false

export type PredictInput = {
  attendanceRate?: number
  avgAssignmentScore?: number
  pastExamAvg?: number
  engagementScore?: number
}

export type NotebookPredictInput = {
  monthly_self_study_hours: number
  attendance_percentage: number
  class_participation: number
}

export type SubjectPerf = {
  subject: string
  current: number
  predicted: number
  trend: 'up' | 'down'
}

export type StudyTask = {
  id: string
  title: string
  subject: string
  type: string
  duration: string
  priority: 'High' | 'Medium' | 'Low'
  completed: boolean
}

export type AssignmentItem = {
  id: string
  title: string
  subject: string
  dueDate: string
  status: 'submitted' | 'pending' | 'in-progress' | 'overdue'
  grade: string | null
  score: number | null
  submittedDate: string | null
}

export type NotificationItem = {
  id: number
  type: string
  title: string
  message: string
  time: string
  read: boolean
  color: string
}

const USER_STORAGE_KEY = 'user'

/** Decode JWT payload (no verify; for role on init). Returns { role?: string } or {}. */
export function decodeJwtPayload(token: string): { role?: string; email?: string; user_id?: unknown } {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return {}
    const payload = JSON.parse(atob(parts[1]))
    return payload || {}
  } catch {
    return {}
  }
}

function getAuthToken(): string | null {
  let userStr = localStorage.getItem(USER_STORAGE_KEY)
  if (!userStr) userStr = sessionStorage.getItem(USER_STORAGE_KEY)
  if (userStr) {
    try {
      const user = JSON.parse(userStr)
      return user.token || null
    } catch {
      return null
    }
  }
  return null
}

const DEMO_USERS = [
  { email: 'student@edu.com', password: 'student123', role: 'student', name: 'John Doe' },
  { email: 'teacher@edu.com', password: 'teacher123', role: 'teacher', name: 'Dr. Emily Johnson' },
  { email: 'admin@edu.com', password: 'admin123', role: 'admin', name: 'Admin Smith' },
]

export async function checkBackendConnection(): Promise<boolean> {
  if (USE_MOCK_ONLY) {
    return false
  }

  if (backendCheckInProgress) {
    return backendConnected === true
  }

  try {
    backendCheckInProgress = true
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)

    try {
      const response = await fetch(`${API_BASE_URL}/auth/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      backendConnected = response.ok
      return backendConnected
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  } catch (error) {
    backendConnected = false
    console.warn('Backend not connected:', error)
    return false
  } finally {
    backendCheckInProgress = false
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (USE_MOCK_ONLY) {
    throw new Error('Backend disabled (mock mode)')
  }

  const token = getAuthToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    (headers as any)['Authorization'] = `Bearer ${token}`
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }))
      const detail = error?.detail
      const message =
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.map((err: any) => (err.loc ? err.loc.join('.') + ': ' + (err.msg || err.message) : err.msg || err.message)).join(', ')
            : detail && typeof detail === 'object' && (detail.message || detail.msg)
              ? (detail.message || detail.msg)
              : detail && typeof detail === 'object'
                ? JSON.stringify(detail)
                : `HTTP error! status: ${response.status}`
      throw new Error(message)
    }

    backendConnected = true
    return response.json()
  } catch (error: any) {
    if (error.name === 'AbortError' || error.name === 'TypeError' || error.message?.includes('Failed to fetch')) {
      backendConnected = false
      throw new Error(`Backend not connected. Please ensure the backend server is running at ${API_BASE_URL}`)
    }
    throw error
  }
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  try {
    return await apiRequest<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  } catch (error: any) {
    throw new Error(error.message || 'Failed to send password reset email')
  }
}

/** Verify OTP (from forgot-password flow). Returns resetToken to use with resetPassword. */
export async function verifyOtp(email: string, otpCode: string): Promise<{ resetToken: string; email: string }> {
  try {
    const res = await apiRequest<{ success: boolean; message: string; data?: { resetToken: string; email: string } }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otpCode }),
    })
    if (!res.data?.resetToken) throw new Error('Invalid response from server')
    return res.data
  } catch (error: any) {
    throw new Error(error.message || 'Invalid or expired OTP. Please try again.')
  }
}

/**
 * Reset password. Backend accepts either:
 * - otpCode: 4-digit OTP from email (single request), or
 * - resetToken: from verifyOtp() (two-step flow).
 */
export async function resetPassword(
  email: string,
  newPassword: string,
  options: { otpCode?: string; resetToken?: string }
): Promise<{ message: string }> {
  const { otpCode, resetToken } = options
  if (!otpCode && !resetToken) {
    throw new Error('Provide either OTP code or reset token')
  }
  try {
    const body = otpCode
      ? { email, otpCode, newPassword }
      : { email, resetToken, newPassword }
    return await apiRequest<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  } catch (error: any) {
    throw new Error(error.message || 'Failed to reset password')
  }
}

/** Change password for current user (any role). */
export async function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  return await apiRequest<{ message: string }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  })
}

/** Admin: reset another user's password by user_id or email. */
export async function changeUserPassword(params: {
  user_id?: number
  email?: string
  new_password: string
}): Promise<void> {
  await apiRequest('/admin/change-user-password', {
    method: 'PUT',
    body: JSON.stringify(params),
  })
}

export async function login(email: string, password: string) {
  if (USE_MOCK_ONLY) {
    const demoUser = DEMO_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    )
    if (!demoUser) {
      throw new Error('Invalid credentials. Demo mode only.')
    }
    const mockResponse = {
      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZW1vLXVzZXIiLCJpYXQiOjE1MTYyMzkwMjJ9.demo-signature',
      token_type: 'Bearer',
      user: { email: demoUser.email, role: demoUser.role, name: demoUser.name },
    }
    const userData = {
      email: demoUser.email,
      role: demoUser.role,
      name: demoUser.name,
      token: mockResponse.access_token,
    }
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData))
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData))
    return mockResponse
  }

  const isBackendAvailable = await checkBackendConnection()

  if (!isBackendAvailable) {
    throw new Error(
      `Backend server is not running. Please start the backend server at ${API_BASE_URL.replace('/api', '')} before logging in.`
    )
  }

  try {
    const response = await apiRequest<{
      success?: boolean
      data?: { token: string; email: string; firstName?: string; lastName?: string; role?: string }
      access_token?: string
      user?: { id?: number | string; email: string; role: string; name: string }
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    const raw = response as any
    const data = raw.data ?? raw
    const token = data.token ?? raw.access_token
    const emailVal = data.email ?? raw.user?.email
    const roleRaw = data.role ?? raw.user?.role ?? ''
    const role = typeof roleRaw === 'string' ? roleRaw.toLowerCase() : 'student'
    const normalizedRole = role === 'administrator' ? 'admin' : (role === 'user' ? 'student' : role)
    const first = (data as { firstName?: string; lastName?: string }).firstName
    const last = (data as { firstName?: string; lastName?: string }).lastName
    const name = raw.user?.name ?? ([first, last].filter(Boolean).join(' ') || emailVal)

    const userData = {
      email: (emailVal || '').toString().trim().toLowerCase(),
      role: normalizedRole,
      name: (name || emailVal || '').toString().trim(),
      token,
      id: raw.user?.id,
    }
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData))
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData))
    return { access_token: token, token_type: 'Bearer', user: { ...userData } }
  } catch (error: any) {
    if (error.message?.includes('Backend not connected') || error.message?.includes('Failed to fetch')) {
      throw new Error(
        `Cannot connect to backend server at ${API_BASE_URL}. Please ensure the backend is running.`
      )
    }
    throw error
  }
}

export type PredictedGradeResponse = {
  student_id: number
  features: Record<string, number>
  predicted_score: number
  predicted_grade: string
  confidence?: number | null
}

/** Current student's predicted grade from system data only. No manual form. */
export async function getMyPredictedGrade(): Promise<PredictedGradeResponse> {
  return await apiRequest<PredictedGradeResponse>('/pipeline/me/predicted-grade')
}

/** Current student's ML features from system data. */
export async function getMyMlFeatures(): Promise<Record<string, unknown>> {
  return await apiRequest<Record<string, unknown>>('/pipeline/me/ml-features')
}

/** Log study hours for prediction: weekly_self_study_hours = sum of studyHours in last 7 days. */
export async function createMyStudyLog(params: {
  studyHours: number
  studyDate?: string
  courseId?: string
  notes?: string
}): Promise<{ id: string; studyDate: string; studyHours: number }> {
  const body: Record<string, unknown> = { studyHours: params.studyHours }
  if (params.studyDate) body.studyDate = params.studyDate
  if (params.courseId) body.courseId = params.courseId
  if (params.notes != null) body.notes = params.notes
  return await apiRequest('/study-logs/me', { method: 'POST', body: JSON.stringify(body) })
}

export type StudyLogItem = { id: string; studyDate: string; studyHours: number; notes?: string; createdAt?: string }

/** List my study logs (for last N days, default 30). */
export async function getMyStudyLogs(days: number = 30): Promise<StudyLogItem[]> {
  try {
    return await apiRequest<StudyLogItem[]>(`/study-logs/me?days=${days}`)
  } catch (e) {
    console.error('getMyStudyLogs', e)
    return []
  }
}

/** Record study hours from login-to-logout session. Call on logout. */
export async function recordSessionStudyLog(): Promise<{ weeklyHours?: number } | void> {
  try {
    return await apiRequest<{ weeklyHours?: number }>('/study-logs/me/from-session', { method: 'POST' })
  } catch (e) {
    console.error('recordSessionStudyLog', e)
  }
}

export type WeeklyStudySum = { weeklyHours: number; weeklyMinimum: number }

/** Sum of study hours in the last 7 days; weekly minimum is 3h. */
export async function getWeeklyStudySum(): Promise<WeeklyStudySum | null> {
  try {
    return await apiRequest<WeeklyStudySum>('/study-logs/me/weekly-sum')
  } catch (e) {
    console.error('getWeeklyStudySum', e)
    return null
  }
}

export type AttendanceWithPercentage = {
  id: number
  student_id: number
  total_days: number
  present_days: number
  attendance_percentage: number
}

/** Current student's attendance (with attendance_percentage). */
export async function getMyAttendance(): Promise<AttendanceWithPercentage | null> {
  try {
    return await apiRequest<AttendanceWithPercentage | null>('/attendance/me')
  } catch {
    return null
  }
}

/** Teacher: list students with student_id for attendance upload. */
export type StudentListItem = { student_id: number; name: string; email: string }
export async function getAttendanceStudentList(): Promise<StudentListItem[]> {
  try {
    return await apiRequest<StudentListItem[]>('/attendance/student-list')
  } catch {
    return []
  }
}

/** Teacher: upload daily attendance (present_student_ids). */
export async function uploadDailyAttendance(presentStudentIds: number[], date?: string): Promise<{ date: string; students_updated: number }> {
  return await apiRequest('/attendance/daily', {
    method: 'POST',
    body: JSON.stringify({ present_student_ids: presentStudentIds, date: date || undefined }),
  })
}

export type StudentTotalScore = {
  student_id: number
  total_score: number
  total_marks: number
  total_max_marks: number
  submission_count: number
}

/** Current student's total_score = (sum(marks)/sum(max_marks))*100. */
export async function getMyTotalScore(): Promise<StudentTotalScore | null> {
  try {
    return await apiRequest<StudentTotalScore | null>('/assignment-submissions/me/total-score')
  } catch {
    return null
  }
}

/** Teacher: bulk upload assignment marks. total_score auto-calculated per student. Include userEmail so pipeline can aggregate by current user. */
export async function bulkUploadAssignmentMarks(
  assignmentId: number,
  submissions: Array<{ student_id: number; marks: number; max_marks: number; userEmail?: string }>
): Promise<unknown[]> {
  return await apiRequest<unknown[]>('/assignment-submissions/bulk', {
    method: 'POST',
    body: JSON.stringify({ assignment_id: assignmentId, submissions }),
  })
}

/** Teacher: set participation rating (1–5) for a student. */
export async function setParticipationRating(studentId: number, teacherRating: number): Promise<{ student_id: number; teacher_rating: number }> {
  return await apiRequest('/participation/rating', {
    method: 'POST',
    body: JSON.stringify({ student_id: studentId, teacher_rating: teacherRating }),
  })
}

/** Get participation for a student. */
export async function getParticipation(studentId: number): Promise<{ student_id: number; teacher_rating: number } | null> {
  try {
    return await apiRequest(`/participation/student/${studentId}`)
  } catch {
    return null
  }
}

export async function predictNotebookScore(
  input: NotebookPredictInput,
  modelType: 'rf' | 'mlr' = 'rf'
): Promise<number> {
  try {
    const response = await apiRequest<{ predicted_score: number; model_type: string }>(
      `/ml/predict-notebook?model_type=${modelType}`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    )
    return response.predicted_score
  } catch (error) {
    console.error('Error predicting with notebook model:', error)
    const score =
      0.6 * Math.min(100, (input.monthly_self_study_hours / 100) * 100) +
      0.25 * input.attendance_percentage +
      0.15 * (input.class_participation / 10) * 100
    return Math.round(Math.max(0, Math.min(100, score)))
  }
}

export async function predictRFScore(input: NotebookPredictInput): Promise<number> {
  try {
    const response = await apiRequest<{ predicted_score: number }>('/ml/predict-rf', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return response.predicted_score
  } catch (error) {
    console.error('Error predicting with RF model:', error)
    return predictNotebookScore(input, 'rf')
  }
}

export async function predictMLRScore(input: NotebookPredictInput): Promise<number> {
  try {
    const response = await apiRequest<{ predicted_score: number }>('/ml/predict-mlr', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return response.predicted_score
  } catch (error) {
    console.error('Error predicting with MLR model:', error)
    return predictNotebookScore(input, 'mlr')
  }
}

export async function getPredictedScore(input?: Partial<PredictInput>): Promise<number> {
  try {
    const params = new URLSearchParams()
    if (input?.attendanceRate !== undefined) params.append('attendanceRate', input.attendanceRate.toString())
    if (input?.avgAssignmentScore !== undefined) params.append('avgAssignmentScore', input.avgAssignmentScore.toString())
    if (input?.pastExamAvg !== undefined) params.append('pastExamAvg', input.pastExamAvg.toString())
    if (input?.engagementScore !== undefined) params.append('engagementScore', input.engagementScore.toString())

    const response = await apiRequest<{ predicted_score: number }>(
      `/students/dashboard/predicted-score?${params.toString()}`
    )
    return response.predicted_score
  } catch (error) {
    console.error('Error fetching predicted score:', error)
    const a = input?.attendanceRate ?? 0.9
    const as = input?.avgAssignmentScore ?? 78
    const pe = input?.pastExamAvg ?? 74
    const e = input?.engagementScore ?? 0.7
    return Math.round(0.35 * as + 0.35 * pe + 0.2 * (a * 100) + 0.1 * (e * 100))
  }
}

export async function getRecentActivities(): Promise<Array<{ activity: string; time: string }>> {
  try {
    return await apiRequest<Array<{ activity: string; time: string }>>('/students/dashboard/recent-activities')
  } catch (error) {
    console.error('Error fetching activities:', error)
    return [
      { activity: 'Completed Quiz: Algebra Basics', time: '2 hours ago' },
      { activity: "Watched Video: Newton's Laws", time: '5 hours ago' },
    ]
  }
}

export async function getUpcomingExams(): Promise<Array<{ subject: string; date: string; time: string }>> {
  try {
    return await apiRequest<Array<{ subject: string; date: string; time: string }>>('/students/dashboard/upcoming-exams')
  } catch (error) {
    console.error('Error fetching exams:', error)
    return [
      { subject: 'Mathematics', date: 'Nov 5, 2025', time: '10:00 AM' },
      { subject: 'Physics', date: 'Nov 8, 2025', time: '2:00 PM' },
    ]
  }
}

export type StudentDashboardMetrics = {
  study_hours: number
  attendance_percentage: number
  class_participation: number
  total_score: number
  grade: string
}

export async function getStudentDashboardMetrics(): Promise<StudentDashboardMetrics> {
  try {
    return await apiRequest<StudentDashboardMetrics>('/students/dashboard/metrics')
  } catch (error) {
    console.error('Error fetching student dashboard metrics:', error)
    return {
      study_hours: 24.5,
      attendance_percentage: 89.2,
      class_participation: 85.7,
      total_score: 87.8,
      grade: 'A'
    }
  }
}

export async function getPerformanceOverview(): Promise<SubjectPerf[]> {
  try {
    return await apiRequest<SubjectPerf[]>('/students/performance/overview')
  } catch (error) {
    console.error('Error fetching performance:', error)
    return [
      { subject: 'Mathematics', current: 85, predicted: 87, trend: 'up' },
      { subject: 'Physics', current: 72, predicted: 78, trend: 'up' },
    ]
  }
}

export async function getExamHistory(): Promise<Array<{ exam: string; date: string; score: number; grade: string }>> {
  try {
    return await apiRequest<Array<{ exam: string; date: string; score: number; grade: string }>>(
      '/students/performance/exam-history'
    )
  } catch (error) {
    console.error('Error fetching exam history:', error)
    return [
      { exam: 'Math Midterm', date: 'Oct 15, 2025', score: 85, grade: 'A' },
      { exam: 'Physics Quiz 3', date: 'Oct 12, 2025', score: 72, grade: 'B' },
    ]
  }
}

export async function getStrengthsImprovements(): Promise<{ strengths: string[]; improvements: string[] }> {
  try {
    return await apiRequest<{ strengths: string[]; improvements: string[] }>(
      '/students/performance/strengths-improvements'
    )
  } catch (error) {
    console.error('Error fetching strengths:', error)
    return {
      strengths: ['Problem Solving', 'Analytical Thinking'],
      improvements: ['Time Management', 'Note Taking'],
    }
  }
}

export async function getStudyTasks(): Promise<StudyTask[]> {
  try {
    return await apiRequest<StudyTask[]>('/students/study-plan/tasks')
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return []
  }
}

export async function toggleTaskCompleted(id: string): Promise<StudyTask[]> {
  try {
    return await apiRequest<StudyTask[]>(`/students/study-plan/tasks/${id}/toggle`, {
      method: 'POST',
    })
  } catch (error) {
    console.error('Error toggling task:', error)
    return getStudyTasks()
  }
}

export async function getRecommendedVideos(): Promise<
  Array<{ title: string; channel: string; duration: string; thumbnail: string }>
> {
  try {
    return await apiRequest<Array<{ title: string; channel: string; duration: string; thumbnail: string }>>(
      '/students/study-plan/recommended-videos'
    )
  } catch (error) {
    console.error('Error fetching videos:', error)
    return [
      { title: 'Advanced Calculus Made Simple', channel: 'Math Academy', duration: '25 min', thumbnail: '📐' },
    ]
  }
}

export async function getWeeklyProgress(): Promise<{ tasksCompleted: [number, number]; studyHours: [number, number] }> {
  try {
    return await apiRequest<{ tasksCompleted: [number, number]; studyHours: [number, number] }>(
      '/students/study-plan/weekly-progress'
    )
  } catch (error) {
    console.error('Error fetching progress:', error)
    return { tasksCompleted: [12, 15], studyHours: [18, 20] }
  }
}

export async function getAssignments(): Promise<AssignmentItem[]> {
  try {
    return await apiRequest<AssignmentItem[]>('/students/assignments')
  } catch (error) {
    console.error('Error fetching assignments:', error)
    return []
  }
}

export async function updateAssignmentStatus(
  id: string,
  status: AssignmentItem['status']
): Promise<AssignmentItem[]> {
  try {
    return await apiRequest<AssignmentItem[]>(`/students/assignments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  } catch (error) {
    console.error('Error updating assignment:', error)
    return getAssignments()
  }
}

export async function getNotifications(): Promise<NotificationItem[]> {
  try {
    return await apiRequest<NotificationItem[]>('/students/notifications')
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return []
  }
}

export async function dismissNotification(id: number): Promise<NotificationItem[]> {
  try {
    return await apiRequest<NotificationItem[]>(`/students/notifications/${id}`, {
      method: 'DELETE',
    })
  } catch (error) {
    console.error('Error dismissing notification:', error)
    return getNotifications()
  }
}

export async function saveProfile(profileData: any): Promise<boolean> {
  try {
    await apiRequest('/students/profile', {
      method: 'POST',
      body: JSON.stringify(profileData),
    })
    return true
  } catch (error) {
    console.error('Error saving profile:', error)
    return false
  }
}

export type StudentProfile = {
  fullName: string
  email: string
  phone?: string | null
  studentId?: string
  major?: string
  year?: string
  gpa?: string
  address?: string
}

/** Current student's profile for Student Profile page. */
export async function getStudentProfile(): Promise<StudentProfile> {
  return await apiRequest<StudentProfile>('/users/student/profile')
}

/** Save current student's profile. */
export async function saveStudentProfile(profile: StudentProfile): Promise<StudentProfile> {
  return await apiRequest<StudentProfile>('/users/student/profile', {
    method: 'POST',
    body: JSON.stringify(profile),
  })
}

export type AdminUser = {
  id: number | string
  name: string
  email: string
  role: 'Student' | 'Teacher' | 'Admin'
  status: 'Active' | 'Inactive'
  joinedDate: string
}

export type AdminCourse = {
  id: number | string
  name: string
  code: string
  /** Multiple teachers per course (names or emails). Backend may return legacy `teacher` string; normalize to teachers in UI. */
  teachers: string[]
  students: number
  status: 'Active' | 'Inactive'
}

export async function getAdminDashboard() {
  if (USE_MOCK_ONLY) {
    return {
      stats: [
        { title: 'Total Users', value: '1,248', change: '+125 this month', color: '#3b82f6' },
        { title: 'Active Courses', value: '42', change: '6 new this term', color: '#10b981' },
        { title: 'System Usage', value: '94%', change: '+12% from last month', color: '#f59e0b' },
        { title: 'AI Interactions', value: '15.2K', change: 'This week', color: '#8b5cf6' },
      ],
      breakdown: [
        { type: 'Students', count: 1124, percentage: 90 },
        { type: 'Teachers', count: 98, percentage: 8 },
        { type: 'Administrators', count: 26, percentage: 2 },
      ],
      activities: [
        { activity: 'New course "Advanced Physics" created', user: 'Dr. Smith', time: '2 hours ago' },
        { activity: '15 new students enrolled', user: 'System', time: '5 hours ago' },
        { activity: 'AI model threshold updated', user: 'Admin Johnson', time: '1 day ago' },
        { activity: 'System backup completed successfully', user: 'System', time: '2 days ago' },
      ],
      health: [
        { component: 'API Server', status: 'Healthy', uptime: 99.9 },
        { component: 'Database', status: 'Healthy', uptime: 99.8 },
        { component: 'AI Service', status: 'Healthy', uptime: 98.5 },
        { component: 'Storage', status: 'Warning', uptime: 95.2 },
      ],
    }
  }

  try {
    return await apiRequest<{ stats: unknown[]; breakdown: unknown[]; activities: unknown[] }>('/admin/dashboard')
  } catch (error) {
    console.error('Error fetching admin dashboard:', error)
    try {
      const statsData = await apiRequest<{ totalEarnings?: number; totalCourseRequests?: number; pendingClasses?: number }>('/admin/dashboard/statistics')
      return {
        stats: [
          { title: 'Total Users', value: '—', change: 'Login and use dashboard', color: '#3b82f6' },
          { title: 'Active Courses', value: String(statsData.totalCourseRequests ?? 0), change: 'Course requests', color: '#10b981' },
        ],
        breakdown: [],
        activities: [{ activity: 'Dashboard statistics loaded', user: 'System', time: 'Just now' }],
      }
    } catch (fallbackErr) {
      console.error('Fallback admin dashboard/statistics failed:', fallbackErr)
    }
    return {
      stats: [
        { title: 'Total Users', value: '0', change: 'Backend dashboard not available', color: '#3b82f6' },
        { title: 'Active Courses', value: '0', change: 'Backend dashboard not available', color: '#10b981' },
        { title: 'System Usage', value: '94%', change: '+12% from last month', color: '#f59e0b' },
        { title: 'AI Interactions', value: '15.2K', change: 'This week', color: '#8b5cf6' },
      ],
      breakdown: [
        { type: 'Students', count: 1124, percentage: 90 },
        { type: 'Teachers', count: 98, percentage: 8 },
        { type: 'Administrators', count: 26, percentage: 2 },
      ],
      activities: [
        { activity: 'New course "Advanced Physics" created', user: 'Dr. Smith', time: '2 hours ago' },
        { activity: '15 new students enrolled', user: 'System', time: '5 hours ago' },
        { activity: 'AI model threshold updated', user: 'Admin Johnson', time: '1 day ago' },
        { activity: 'System backup completed successfully', user: 'System', time: '2 days ago' },
      ],
      health: [
        { component: 'API Server', status: 'Healthy', uptime: 99.9 },
        { component: 'Database', status: 'Healthy', uptime: 99.8 },
        { component: 'AI Service', status: 'Healthy', uptime: 98.5 },
        { component: 'Storage', status: 'Warning', uptime: 95.2 },
      ],
    }
  }
}

export type UserRole = {
  roleKey: string
  displayName: string
  description?: string
  permissions?: string[]
}

export async function getRoles(): Promise<UserRole[]> {
  try {
    return await apiRequest<UserRole[]>('/users/roles')
  } catch (error) {
    console.error('Error fetching roles:', error)
    return []
  }
}

export async function createRole(role: UserRole): Promise<UserRole> {
  return apiRequest<UserRole>('/users/roles', {
    method: 'POST',
    body: JSON.stringify(role),
  })
}

export async function updateRole(
  roleKey: string,
  data: { displayName?: string; description?: string }
): Promise<UserRole> {
  return apiRequest<UserRole>(`/users/roles/${encodeURIComponent(roleKey)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteRole(roleKey: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/users/roles/${encodeURIComponent(roleKey)}`, {
    method: 'DELETE',
  })
}

// ==================== Schema: Subjects, Student/Teacher Subjects, Marks, Predictions ====================
export type SchemaSubject = { _id: string; subject_name: string }
export type SchemaStudentSubject = { _id: string; student_id: string; subject_id: string }
export type SchemaTeacherSubject = { _id: string; teacher_id: string; subject_id: string }
export type SchemaStudentSubjectMarks = {
  _id: string
  student_id: string
  subject_id: string
  assignment: number
  quiz: number
  mid_exam: number
  attendance: number
}
export type SchemaPrediction = {
  student_id: string
  subject_id: string
  predicted_result: string
  risk_level: string
}

/** Subject assignment: created by the teacher who teaches that subject; assigned to all students in that subject. */
export type SchemaSubjectAssignment = {
  id: string
  subject_id: string
  subject_name: string
  teacher_id: string
  title: string
  description?: string | null
  max_marks: number
  assignment_type: string
  pdf_url?: string | null
  created_at?: string
  updated_at?: string
}

export async function getSchemaSubjects(): Promise<SchemaSubject[]> {
  try {
    return await apiRequest<SchemaSubject[]>('/schema/subjects')
  } catch (e) {
    console.error('getSchemaSubjects', e)
    return []
  }
}

export async function createSchemaSubject(body: { id: string; subject_name: string }): Promise<SchemaSubject> {
  return apiRequest<SchemaSubject>('/schema/subjects', { method: 'POST', body: JSON.stringify(body) })
}

export async function updateSchemaSubject(subjectId: string, body: { subject_name?: string }): Promise<SchemaSubject> {
  return apiRequest<SchemaSubject>(`/schema/subjects/${encodeURIComponent(subjectId)}`, { method: 'PUT', body: JSON.stringify(body) })
}

export async function deleteSchemaSubject(subjectId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/schema/subjects/${encodeURIComponent(subjectId)}`, { method: 'DELETE' })
}

export async function getSchemaStudentSubjects(studentId?: string): Promise<SchemaStudentSubject[]> {
  try {
    const q = studentId ? `?student_id=${encodeURIComponent(studentId)}` : ''
    return await apiRequest<SchemaStudentSubject[]>(`/schema/student-subjects${q}`)
  } catch (e) {
    console.error('getSchemaStudentSubjects', e)
    return []
  }
}

export async function createSchemaStudentSubject(body: { id: string; student_id: string; subject_id: string }): Promise<SchemaStudentSubject> {
  return apiRequest<SchemaStudentSubject>('/schema/student-subjects', { method: 'POST', body: JSON.stringify(body) })
}

export async function deleteSchemaStudentSubject(recordId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/schema/student-subjects/${encodeURIComponent(recordId)}`, { method: 'DELETE' })
}

export async function getSchemaTeacherSubjects(teacherId?: string): Promise<SchemaTeacherSubject[]> {
  try {
    const q = teacherId ? `?teacher_id=${encodeURIComponent(teacherId)}` : ''
    return await apiRequest<SchemaTeacherSubject[]>(`/schema/teacher-subjects${q}`)
  } catch (e) {
    console.error('getSchemaTeacherSubjects', e)
    return []
  }
}

/** Current teacher's subjects from teacher_subjects table (with subject_name). Use for My Subjects page. */
export type TeacherSubjectWithName = {
  id: string
  teacher_id: string
  subject_id: string
  subject_name: string
}

export async function getTeacherMySubjects(): Promise<TeacherSubjectWithName[]> {
  const raw = await apiRequest<TeacherSubjectWithName[] | { data?: TeacherSubjectWithName[] }>('/teachers/my-subjects')
  const arr = Array.isArray(raw) ? raw : (raw?.data ?? [])
  return Array.isArray(arr) ? arr : []
}

export async function createSchemaTeacherSubject(body: { id: string; teacher_id: string; subject_id: string }): Promise<SchemaTeacherSubject> {
  return apiRequest<SchemaTeacherSubject>('/schema/teacher-subjects', { method: 'POST', body: JSON.stringify(body) })
}

export async function deleteSchemaTeacherSubject(recordId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/schema/teacher-subjects/${encodeURIComponent(recordId)}`, { method: 'DELETE' })
}

export async function getSchemaStudentSubjectMarks(studentId?: string, subjectId?: string): Promise<SchemaStudentSubjectMarks[]> {
  try {
    const params = new URLSearchParams()
    if (studentId) params.append('student_id', studentId)
    if (subjectId) params.append('subject_id', subjectId)
    const q = params.toString() ? `?${params.toString()}` : ''
    return await apiRequest<SchemaStudentSubjectMarks[]>(`/schema/student-subject-marks${q}`)
  } catch (e) {
    console.error('getSchemaStudentSubjectMarks', e)
    return []
  }
}

export async function createOrUpdateSchemaStudentSubjectMarks(body: {
  id: string
  student_id: string
  subject_id: string
  assignment?: number
  quiz?: number
  mid_exam?: number
  attendance?: number
}): Promise<SchemaStudentSubjectMarks> {
  return apiRequest<SchemaStudentSubjectMarks>('/schema/student-subject-marks', {
    method: 'POST',
    body: JSON.stringify({
      id: body.id,
      student_id: body.student_id,
      subject_id: body.subject_id,
      assignment: body.assignment ?? 0,
      quiz: body.quiz ?? 0,
      mid_exam: body.mid_exam ?? 0,
      attendance: body.attendance ?? 0,
    }),
  })
}

export async function deleteSchemaStudentSubjectMarks(recordId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/schema/student-subject-marks/${encodeURIComponent(recordId)}`, { method: 'DELETE' })
}

export async function getSchemaPredictions(studentId?: string, subjectId?: string): Promise<SchemaPrediction[]> {
  try {
    const params = new URLSearchParams()
    if (studentId) params.append('student_id', studentId)
    if (subjectId) params.append('subject_id', subjectId)
    const q = params.toString() ? `?${params.toString()}` : ''
    return await apiRequest<SchemaPrediction[]>(`/schema/predictions${q}`)
  } catch (e) {
    console.error('getSchemaPredictions', e)
    return []
  }
}

export async function createOrUpdateSchemaPrediction(body: {
  student_id: string
  subject_id: string
  predicted_result: string
  risk_level: string
}): Promise<SchemaPrediction> {
  return apiRequest<SchemaPrediction>('/schema/predictions', { method: 'POST', body: JSON.stringify(body) })
}

export async function deleteSchemaPrediction(studentId: string, subjectId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/schema/predictions?student_id=${encodeURIComponent(studentId)}&subject_id=${encodeURIComponent(subjectId)}`, { method: 'DELETE' })
}

export async function getSchemaAssignments(subjectId?: string): Promise<SchemaSubjectAssignment[]> {
  try {
    const q = subjectId ? `?subject_id=${encodeURIComponent(subjectId)}` : ''
    return await apiRequest<SchemaSubjectAssignment[]>(`/schema/assignments${q}`)
  } catch (e) {
    console.error('getSchemaAssignments', e)
    return []
  }
}

export async function createSchemaAssignment(body: {
  subject_id: string
  title: string
  description?: string
  max_marks?: number
  assignment_type?: string
}): Promise<SchemaSubjectAssignment> {
  return apiRequest<SchemaSubjectAssignment>('/schema/assignments', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/** Upload a PDF file for an assignment. Call after creating the assignment if user selected a file. */
export async function uploadSchemaAssignmentPdf(assignmentId: string, file: File): Promise<void> {
  const token = getAuthToken()
  const headers: HeadersInit = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch(`${API_BASE_URL}/schema/assignments/${encodeURIComponent(assignmentId)}/pdf`, {
    method: 'POST',
    headers,
    body: formData,
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Upload failed' }))
    throw new Error(err?.detail || `Upload failed: ${response.status}`)
  }
}

/** Download assignment PDF (authenticated). Returns blob to save or open. */
export async function getAssignmentPdfBlob(assignmentId: string): Promise<Blob> {
  const token = getAuthToken()
  const headers: HeadersInit = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const response = await fetch(`${API_BASE_URL}/schema/assignments/files/${encodeURIComponent(assignmentId)}`, { headers })
  if (!response.ok) throw new Error('Failed to load PDF')
  return response.blob()
}

export async function updateSchemaAssignment(
  assignmentId: string,
  body: { title?: string; description?: string; max_marks?: number; assignment_type?: string }
): Promise<SchemaSubjectAssignment> {
  return apiRequest<SchemaSubjectAssignment>(`/schema/assignments/${encodeURIComponent(assignmentId)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function deleteSchemaAssignment(assignmentId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/schema/assignments/${encodeURIComponent(assignmentId)}`, {
    method: 'DELETE',
  })
}

export async function getSchemaAssignmentStudents(assignmentId: string): Promise<Array<{ student_id: string; student_name: string; email: string }>> {
  return apiRequest<Array<{ student_id: string; student_name: string; email: string }>>(
    `/schema/assignments/${encodeURIComponent(assignmentId)}/students`
  )
}

/** Student: upload my assignment submission (PDF). */
export async function submitAssignmentPdf(assignmentId: string, file: File): Promise<void> {
  const token = getAuthToken()
  const headers: HeadersInit = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch(`${API_BASE_URL}/schema/assignments/${encodeURIComponent(assignmentId)}/submit`, {
    method: 'POST',
    headers,
    body: formData,
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Upload failed' }))
    throw new Error(err?.detail || `Upload failed: ${response.status}`)
  }
}

export type MySubmissionItem = {
  id: string
  assignment_id: string
  assignment_title: string
  subject_id: string
  subject_name: string
  submitted_at: string | null
  marks: number | null
  max_marks: number
  has_pdf: boolean
}

/** Student: list my assignment submissions with result (marks). */
export async function getMyAssignmentSubmissions(): Promise<MySubmissionItem[]> {
  try {
    return await apiRequest<MySubmissionItem[]>('/schema/assignments/submissions/me')
  } catch (e) {
    console.error('getMyAssignmentSubmissions', e)
    return []
  }
}

export type AssignmentSubmissionItem = {
  id: string
  userEmail: string
  student_name: string
  submitted_at: string | null
  marks: number | null
  max_marks: number
  has_pdf: boolean
}

/** Teacher/Admin: list submissions for an assignment. */
export async function getAssignmentSubmissions(assignmentId: string): Promise<AssignmentSubmissionItem[]> {
  try {
    return await apiRequest<AssignmentSubmissionItem[]>(
      `/schema/assignments/${encodeURIComponent(assignmentId)}/submissions`
    )
  } catch (e) {
    console.error('getAssignmentSubmissions', e)
    return []
  }
}

/** Teacher/Admin: set marks for a submission. */
export async function gradeSubmission(submissionId: string, marks: number): Promise<void> {
  await apiRequest(`/schema/assignments/submissions/${encodeURIComponent(submissionId)}`, {
    method: 'PUT',
    body: JSON.stringify({ marks }),
  })
}

/** Download submission PDF (student own / teacher / admin). */
export async function getSubmissionPdfBlob(submissionId: string): Promise<Blob> {
  const token = getAuthToken()
  const headers: HeadersInit = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const response = await fetch(
    `${API_BASE_URL}/schema/assignments/submissions/files/${encodeURIComponent(submissionId)}`,
    { headers }
  )
  if (!response.ok) throw new Error('Failed to load submission PDF')
  return response.blob()
}

export async function getUsers(): Promise<AdminUser[]> {
  try {
    return await apiRequest<AdminUser[]>('/admin/users')
  } catch (error) {
    console.error('Error fetching users:', error)
    return []
  }
}

/** List users with role Teacher (from users; backend keeps teachers table in sync). */
export async function getTeachers(): Promise<AdminUser[]> {
  try {
    return await apiRequest<AdminUser[]>('/admin/teachers')
  } catch (error) {
    console.error('Error fetching teachers:', error)
    return []
  }
}

/** List users with role Student (admin: /admin/students; teacher: /teachers/students). Backend keeps students table in sync. */
export async function getStudents(): Promise<AdminUser[]> {
  try {
    const user = getCurrentUser()
    const role = user.role

    let endpoint = '/admin/students'
    if (role === 'teacher') {
      endpoint = '/teachers/students'
    }

    return await apiRequest<AdminUser[]>(endpoint)
  } catch (error) {
    console.error('Error fetching students:', error)
    return []
  }
}

/** Create user with role Teacher. Backend stores in users and syncs to teachers table. */
export async function addTeacher(user: Omit<AdminUser, 'id' | 'joinedDate'> & { joinedDate?: string; password?: string }): Promise<AdminUser[]> {
  try {
    return await apiRequest<AdminUser[]>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(user),
    })
  } catch (error) {
    console.error('Error adding teacher:', error)
    throw error
  }
}

/** Create user with role Student. Backend stores in users and syncs to students table. */
export async function addStudent(user: Omit<AdminUser, 'id' | 'joinedDate'> & { joinedDate?: string; password?: string }): Promise<AdminUser[]> {
  try {
    return await apiRequest<AdminUser[]>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(user),
    })
  } catch (error) {
    console.error('Error adding student:', error)
    throw error
  }
}

export async function deleteTeacher(id: number | string): Promise<AdminUser[]> {
  try {
    return await apiRequest<AdminUser[]>(`/admin/users/${id}`, {
      method: 'DELETE',
    })
  } catch (error) {
    console.error('Error deleting teacher:', error)
    throw error
  }
}

export async function deleteStudent(id: number | string): Promise<AdminUser[]> {
  try {
    return await apiRequest<AdminUser[]>(`/admin/users/${id}`, {
      method: 'DELETE',
    })
  } catch (error) {
    console.error('Error deleting student:', error)
    throw error
  }
}

export type StudentDetail = {
  email: string
  name?: string
  studentId: string
  batch: string
  program: string
  currentSemester: number
  guardianName?: string
  contactNumber?: string
  address?: string
}

export async function getStudentDetails(email: string): Promise<StudentDetail> {
  try {
    const user = getCurrentUser()
    const role = user.role

    let endpoint = `/admin/students/${email}/details`
    if (role === 'teacher') {
      endpoint = `/users/students/details/${email}`
    }

    return await apiRequest<StudentDetail>(endpoint)
  } catch (error) {
    console.error('Error fetching student details:', error)
    return {
      email,
      studentId: '',
      batch: '',
      program: '',
      currentSemester: 1,
      guardianName: undefined,
      contactNumber: undefined,
      address: undefined,
    }
  }
}

export type TeacherDetail = {
  email: string
  employeeId: string
  department: string
  designation: string
  qualifications: string[]
  specialization: string
  joinedDate: string
  bio?: string
}

export async function getTeacherDetails(email: string): Promise<TeacherDetail> {
  try {
    return await apiRequest<TeacherDetail>(`/admin/teachers/${email}/details`)
  } catch (error) {
    console.error('Error fetching teacher details:', error)
    return {
      email,
      employeeId: '',
      department: '',
      designation: '',
      qualifications: [],
      specialization: '',
      joinedDate: '',
      bio: undefined,
    }
  }
}

export type TeacherProfile = {
  fullName: string
  email: string
  phone?: string | null
  teacherId?: string
  department?: string
  experience?: string
  subjects: string[]
}

/** Current teacher's profile for Teacher Profile page. */
export async function getTeacherProfile(): Promise<TeacherProfile> {
  return await apiRequest<TeacherProfile>('/users/teacher/profile')
}

/** Save current teacher's profile. */
export async function saveTeacherProfile(profile: TeacherProfile): Promise<TeacherProfile> {
  return await apiRequest<TeacherProfile>('/users/teacher/profile', {
    method: 'POST',
    body: JSON.stringify(profile),
  })
}

export async function saveTeacherDetails(details: TeacherDetail): Promise<TeacherDetail> {
  try {
    return await apiRequest<TeacherDetail>('/users/teachers/details', {
      method: 'POST',
      body: JSON.stringify(details),
    })
  } catch (error) {
    console.error('Error saving teacher details:', error)
    throw error
  }
}

export async function addUser(user: Omit<AdminUser, 'id' | 'joinedDate'> & { joinedDate?: string; password?: string }): Promise<AdminUser[]> {
  try {
    return await apiRequest<AdminUser[]>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(user),
    })
  } catch (error) {
    console.error('Error adding user:', error)
    throw error
  }
}

export async function deleteUser(id: number | string): Promise<AdminUser[]> {
  try {
    const pathId = typeof id === 'string' ? encodeURIComponent(id) : id
    return await apiRequest<AdminUser[]>(`/admin/users/${pathId}`, {
      method: 'DELETE',
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    throw error
  }
}

export async function updateUser(
  id: number | string,
  data: { name?: string; role?: 'Student' | 'Teacher' | 'Admin'; status?: 'Active' | 'Inactive' }
): Promise<AdminUser[]> {
  try {
    const pathId = typeof id === 'string' ? encodeURIComponent(id) : id
    return await apiRequest<AdminUser[]>(`/admin/users/${pathId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  } catch (error) {
    console.error('Error updating user:', error)
    throw error
  }
}

export async function getCourses(): Promise<AdminCourse[]> {
  try {
    return await apiRequest<AdminCourse[]>('/admin/courses')
  } catch (error) {
    console.error('Error fetching courses:', error)
    return []
  }
}

export async function addCourse(course: Omit<AdminCourse, 'id'>): Promise<AdminCourse[]> {
  try {
    return await apiRequest<AdminCourse[]>('/admin/courses', {
      method: 'POST',
      body: JSON.stringify(course),
    })
  } catch (error) {
    console.error('Error adding course:', error)
    throw error
  }
}

export async function updateCourse(id: number | string, course: Partial<AdminCourse>): Promise<AdminCourse[]> {
  try {
    const pathId = typeof id === 'string' ? encodeURIComponent(id) : id
    return await apiRequest<AdminCourse[]>(`/admin/courses/${pathId}`, {
      method: 'PUT',
      body: JSON.stringify(course),
    })
  } catch (error) {
    console.error('Error updating course:', error)
    throw error
  }
}

export async function deleteCourse(id: number | string): Promise<AdminCourse[]> {
  try {
    const pathId = typeof id === 'string' ? encodeURIComponent(id) : id
    return await apiRequest<AdminCourse[]>(`/admin/courses/${pathId}`, {
      method: 'DELETE',
    })
  } catch (error) {
    console.error('Error deleting course:', error)
    throw error
  }
}

export async function getAISettings() {
  try {
    return await apiRequest('/admin/ai-settings')
  } catch (error) {
    console.error('Error fetching AI settings:', error)
    return {
      predictionThreshold: 75,
      riskThreshold: 60,
      recommendationStrength: 80,
      autoSuggest: true,
      realTimeAnalysis: true,
      weeklyReports: true,
    }
  }
}

export async function saveAISettings(settings: any) {
  try {
    await apiRequest('/admin/ai-settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
    return true
  } catch (error) {
    console.error('Error saving AI settings:', error)
    return false
  }
}

export async function getChatbotLogs(): Promise<any[]> {
  try {
    return await apiRequest<any[]>('/admin/chatbot-logs')
  } catch (error) {
    console.error('Error fetching chatbot logs:', error)
    return []
  }
}

export async function getAdminReports() {
  try {
    return await apiRequest('/admin/reports')
  } catch (error) {
    console.error('Error fetching reports:', error)
    return []
  }
}

export async function getQuickExports(): Promise<string[]> {
  try {
    return await apiRequest<string[]>('/admin/quick-exports')
  } catch (error) {
    console.error('Error fetching exports:', error)
    return []
  }
}

export type Announcement = {
  id: number
  title: string
  message: string
  target: string
  date: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
}

export async function getAnnouncements(): Promise<Announcement[]> {
  try {
    return await apiRequest<Announcement[]>('/admin/announcements')
  } catch (error) {
    console.error('Error fetching announcements:', error)
    return []
  }
}

export async function sendAnnouncement(announcement: Omit<Announcement, 'id' | 'date'>): Promise<Announcement[]> {
  try {
    return await apiRequest<Announcement[]>('/admin/announcements', {
      method: 'POST',
      body: JSON.stringify(announcement),
    })
  } catch (error) {
    console.error('Error sending announcement:', error)
    throw error
  }
}

export async function saveAdminProfile(profileData: any) {
  try {
    await apiRequest('/admin/profile', {
      method: 'POST',
      body: JSON.stringify(profileData),
    })
    return true
  } catch (error) {
    console.error('Error saving admin profile:', error)
    return false
  }
}

export type ContactMessage = {
  id: string
  studentId: string
  studentName: string
  studentEmail: string
  subject: string
  message: string
  timestamp: string
  read: boolean
  reply?: string
  replyTimestamp?: string
}

export type Teacher = {
  id: string
  name: string
  email: string
  subject: string
}

export async function getAvailableTeachers(): Promise<Teacher[]> {
  try {
    return await apiRequest<Teacher[]>('/students/teachers')
  } catch (error) {
    console.error('Error fetching teachers:', error)
    return []
  }
}

export async function sendContactMessage(data: {
  teacherId: string
  subject: string
  message: string
}): Promise<boolean> {
  try {
    await apiRequest('/students/contact-teacher', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return true
  } catch (error) {
    console.error('Error sending contact message:', error)
    throw error
  }
}

export async function getContactMessages(): Promise<ContactMessage[]> {
  try {
    return await apiRequest<ContactMessage[]>('/teachers/contact-messages')
  } catch (error) {
    console.error('Error fetching contact messages:', error)
    return []
  }
}

export async function markMessageAsRead(messageId: string): Promise<boolean> {
  try {
    await apiRequest(`/teachers/contact-messages/${messageId}/read`, {
      method: 'PATCH',
    })
    return true
  } catch (error) {
    console.error('Error marking message as read:', error)
    throw error
  }
}

export async function replyToMessage(
  messageId: string,
  reply: string
): Promise<boolean> {
  try {
    await apiRequest(`/teachers/contact-messages/${messageId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ reply }),
    })
    return true
  } catch (error) {
    console.error('Error replying to message:', error)
    throw error
  }
}

export async function deleteMessage(messageId: string): Promise<boolean> {
  try {
    await apiRequest(`/teachers/contact-messages/${messageId}`, {
      method: 'DELETE',
    })
    return true
  } catch (error) {
    console.error('Error deleting message:', error)
    throw error
  }
}

export async function getTeacherDashboard() {
  try {
    return await apiRequest<{
      stats: Array<{ title: string; value: string; change: string }>
    }>('/teachers/dashboard')
  } catch (error) {
    console.error('Error fetching teacher dashboard:', error)
    return {
      stats: [
        { title: 'Total Students', value: '142', change: '+8 this semester' },
        { title: 'Active Courses', value: '5', change: '2 ongoing' },
        { title: 'Avg Performance', value: '78%', change: '+3% from last term' },
        { title: 'Pending Grading', value: '23', change: '5 urgent' },
      ],
    }
  }
}

export type TeacherStudentPerformanceItem = {
  id: string
  name: string
  email: string
  class: string
  avgScore: number
  attendance: number
  assignments: string
  status: 'excellent' | 'good' | 'average' | 'at-risk'
}

export async function getTeacherStudentPerformance(): Promise<TeacherStudentPerformanceItem[]> {
  try {
    return await apiRequest<TeacherStudentPerformanceItem[]>('/teachers/students/performance')
  } catch (error) {
    console.error('Error fetching teacher student performance:', error)
    return []
  }
}

export async function getTeacherAssignments(): Promise<any[]> {
  try {
    return await apiRequest<any[]>('/teachers/assignments')
  } catch (error) {
    console.error('Error fetching teacher assignments:', error)
    return [
      { id: 'a1', title: 'Calculus Problem Set 5', subject: 'Mathematics', dueDate: 'Oct 30, 2025', students: 45, submitted: 38, graded: 35, status: 'Active' },
    ]
  }
}

export async function createAssignment(assignment: {
  title: string
  subject: string
  dueDate: string
  description?: string
  targetBatch?: string
}): Promise<any> {
  return apiRequest<any>('/teachers/assignments', {
    method: 'POST',
    body: JSON.stringify(assignment),
  })
}

export async function updateAssignment(
  assignmentId: string,
  assignment: {
    title?: string
    subject?: string
    dueDate?: string
    description?: string
    targetBatch?: string
    status?: 'active' | 'closed' | 'draft'
    totalPoints?: number
  }
): Promise<any> {
  return apiRequest<any>(`/teachers/assignments/${assignmentId}`, {
    method: 'PUT',
    body: JSON.stringify(assignment),
  })
}

export async function deleteAssignment(assignmentId: string): Promise<boolean> {
  try {
    await apiRequest(`/teachers/assignments/${assignmentId}`, {
      method: 'DELETE',
    })
    return true
  } catch (error) {
    console.error('Error deleting assignment:', error)
    throw error
  }
}

export type ChatMessage = {
  id: string
  senderId: string
  senderName: string
  senderRole: 'teacher' | 'student' | 'admin'
  message: string
  timestamp: string
  read: boolean
}

export type ChatConversation = {
  id: string
  participantId: string
  participantName: string
  participantRole: 'student' | 'admin' | 'teacher'
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  avatar?: string
}

export async function getChatConversations(): Promise<ChatConversation[]> {
  try {
    return await apiRequest<ChatConversation[]>('/chats/conversations')
  } catch (error) {
    console.error('Error fetching chat conversations:', error)
    return getConversations() as ChatConversation[]
  }
}

/** Users the current user can start a chat with (by role: students see teachers, teachers see students, admin sees all). */
export async function getChatAvailableUsers(): Promise<AdminUser[]> {
  try {
    return await apiRequest<AdminUser[]>('/chats/available-users')
  } catch (error) {
    console.error('Error fetching chat available users:', error)
    return []
  }
}

export async function getChatMessages(conversationId: string): Promise<ChatMessage[]> {
  try {
    const res = await apiRequest<ChatMessage[]>(`/messages?chatId=${encodeURIComponent(conversationId)}`)
    return Array.isArray(res) ? res : []
  } catch (error) {
    console.error('Error fetching chat messages:', error)
    markMessagesAsRead(conversationId)
    return getMessages(conversationId) as ChatMessage[]
  }
}

export async function sendChatMessage(conversationId: string, message: string): Promise<boolean> {
  try {
    await apiRequest('/messages', {
      method: 'POST',
      body: JSON.stringify({
        chatId: conversationId,
        content: message.trim(),
        messageType: 'text',
      }),
    })
    return true
  } catch (error) {
    console.error('Error sending chat message:', error)
    const user = getCurrentUser()
    const newMessage: StorageChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role as 'teacher' | 'student' | 'admin',
      message: message.trim(),
      timestamp: new Date().toISOString(),
      read: true,
    }
    addMessage(conversationId, newMessage)
    return true
  }
}

export async function createChatConversation(
  participantId: string,
  _participantName: string,
  _participantRole: 'student' | 'admin' | 'teacher'
): Promise<string> {
  try {
    const res = await apiRequest<{ chatId?: string; conversationId?: string }>('/chats/direct', {
      method: 'POST',
      body: JSON.stringify({ otherUserEmail: participantId }),
    })
    return res?.conversationId || res?.chatId || ''
  } catch (error) {
    console.error('Error creating conversation:', error)
    return `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

export async function getAdminChatConversations(): Promise<ChatConversation[]> {
  return getChatConversations()
}

export async function getAdminChatMessages(conversationId: string): Promise<ChatMessage[]> {
  return getChatMessages(conversationId)
}

export async function sendAdminChatMessage(conversationId: string, message: string): Promise<boolean> {
  return sendChatMessage(conversationId, message)
}
export async function chatWithAI(message: string): Promise<{ response: string; sender: 'bot' }> {
  return apiRequest<{ response: string; sender: 'bot' }>('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  })
}

export type StudyResource = {
  id: string
  title: string
  class_name: string
  type: 'PDF' | 'Video' | 'Image' | 'Other'
  description?: string
  size: string
  uploadDate: string
  downloads: number
  fileUrl: string
  teacherId: string
  teacherName: string
}

export async function getStudyResources(): Promise<StudyResource[]> {
  try {
    return await apiRequest<StudyResource[]>('/teachers/study-resources')
  } catch (error) {
    console.error('Error fetching study resources:', error)
    return []
  }
}

export async function uploadStudyResource(
  file: File,
  title: string,
  class_name: string,
  type: 'PDF' | 'Video' | 'Image' | 'Other',
  description?: string
): Promise<StudyResource> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('title', title)
  formData.append('class_name', class_name)
  formData.append('type', type)
  if (description) {
    formData.append('description', description)
  }

  const token = getAuthToken()
  const headers: HeadersInit = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}/teachers/study-resources`, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }))
    throw new Error(error.detail || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export async function deleteStudyResource(resourceId: string): Promise<boolean> {
  try {
    await apiRequest(`/teachers/study-resources/${resourceId}`, {
      method: 'DELETE',
    })
    return true
  } catch (error) {
    console.error('Error deleting study resource:', error)
    throw error
  }
}

export async function downloadStudyResource(resourceId: string, fileUrl: string): Promise<void> {
  try {
    const user = getCurrentUser()
    const role = user.role

    let endpoint = `/students/study-resources/${resourceId}/download`
    if (role === 'teacher' || role === 'admin') {
      endpoint = `/teachers/study-resources/${resourceId}/download`
    }

    await apiRequest(endpoint, {
      method: 'POST',
    })

    const token = getAuthToken()
    const headers: HeadersInit = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}${fileUrl}`, {
      headers,
    })

    if (!response.ok) {
      throw new Error('Failed to download file')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileUrl.split('/').pop() || 'resource'
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  } catch (error) {
    console.error('Error downloading study resource:', error)
    throw error
  }
}

export async function getStudentStudyResources(): Promise<StudyResource[]> {
  try {
    return await apiRequest<StudyResource[]>('/students/study-resources')
  } catch (error) {
    console.error('Error fetching study resources:', error)
    return []
  }
}

export type Module = {
  module_id: number
  course_id: number
  module_code: string
  module_name: string
  credit_value: number
  semester: number
  description?: string
  course_name?: string
  course_code?: string
  created_at?: string
  updated_at?: string
}

export type ModuleCreate = {
  course_id: number
  module_code: string
  module_name: string
  credit_value: number
  semester: number
  description?: string
}

export type ModuleUpdate = {
  module_code?: string
  module_name?: string
  credit_value?: number
  semester?: number
  description?: string
}

export async function getModules(courseId?: number): Promise<Module[]> {
  try {
    const params = courseId ? `?course_id=${courseId}` : ''
    return await apiRequest<Module[]>(`/modules/${params}`)
  } catch (error) {
    console.error('Error fetching modules:', error)
    return []
  }
}

export async function getModule(moduleId: number): Promise<Module | null> {
  try {
    return await apiRequest<Module>(`/modules/${moduleId}`)
  } catch (error) {
    console.error('Error fetching module:', error)
    return null
  }
}

export async function createModule(module: ModuleCreate): Promise<Module> {
  return await apiRequest<Module>('/modules/', {
    method: 'POST',
    body: JSON.stringify(module),
  })
}

export async function updateModule(moduleId: number, module: ModuleUpdate): Promise<Module> {
  return await apiRequest<Module>(`/modules/${moduleId}`, {
    method: 'PUT',
    body: JSON.stringify(module),
  })
}

export async function deleteModule(moduleId: number): Promise<void> {
  await apiRequest(`/modules/${moduleId}`, {
    method: 'DELETE',
  })
}

export type Assessment = {
  assessment_id: number
  /** Legacy module-based linkage (may be undefined when using course-based assessments). */
  module_id?: number
  /** New course-based linkage for admin/teacher assignment creation. */
  course_id?: number | string
  assessment_type: 'EXAM' | 'QUIZ' | 'ASSIGNMENT'
  max_marks: number
  weightage: number
  title?: string
  description?: string
  module_name?: string
  module_code?: string
  course_name?: string
  course_code?: string
  created_at?: string
  updated_at?: string
}

export type AssessmentCreate = {
  /** Prefer linking to course; backend can derive module if needed. */
  course_id: number | string
  assessment_type: 'EXAM' | 'QUIZ' | 'ASSIGNMENT'
  max_marks: number
  weightage: number
  title?: string
  description?: string
}

export type AssessmentUpdate = {
  assessment_type?: 'EXAM' | 'QUIZ' | 'ASSIGNMENT'
  max_marks?: number
  weightage?: number
  title?: string
  description?: string
}

export async function getAssessments(moduleId?: number): Promise<Assessment[]> {
  try {
    const params = moduleId ? `?module_id=${moduleId}` : ''
    return await apiRequest<Assessment[]>(`/assessments/${params}`)
  } catch (error) {
    console.error('Error fetching assessments:', error)
    return []
  }
}

export async function getAssessment(assessmentId: number): Promise<Assessment | null> {
  try {
    return await apiRequest<Assessment>(`/assessments/${assessmentId}`)
  } catch (error) {
    console.error('Error fetching assessment:', error)
    return null
  }
}

export async function createAssessment(assessment: AssessmentCreate): Promise<Assessment> {
  return await apiRequest<Assessment>('/assessments/', {
    method: 'POST',
    body: JSON.stringify(assessment),
  })
}

export async function updateAssessment(assessmentId: number, assessment: AssessmentUpdate): Promise<Assessment> {
  return await apiRequest<Assessment>(`/assessments/${assessmentId}`, {
    method: 'PUT',
    body: JSON.stringify(assessment),
  })
}

export async function deleteAssessment(assessmentId: number): Promise<void> {
  await apiRequest(`/assessments/${assessmentId}`, {
    method: 'DELETE',
  })
}

export type StudentResult = {
  result_id: number | string
  student_id: number
  assessment_id: number | string
  marks_obtained: number
  grade: string
  student_name?: string
  student_email?: string
  assessment_title?: string
  module_name?: string
  module_code?: string
  max_marks?: number
  created_at?: string
  updated_at?: string
}

export type StudentResultCreate = {
  student_id?: number | string
  userEmail?: string
  assessment_id: number | string
  marks_obtained: number
  grade?: string
  max_marks?: number
}

export type StudentResultUpdate = {
  marks_obtained?: number
  grade?: string
  max_marks?: number
}

export async function getResults(studentId?: number, assessmentId?: number | string): Promise<StudentResult[]> {
  try {
    const params = new URLSearchParams()
    if (studentId != null) params.append('student_id', String(studentId))
    if (assessmentId != null) params.append('assessment_id', String(assessmentId))
    const query = params.toString() ? `?${params.toString()}` : ''
    return await apiRequest<StudentResult[]>(`/results${query}`)
  } catch (error) {
    console.error('Error fetching results:', error)
    return []
  }
}

/** Student's own results (GET /results/me). Use for student My Results page. */
export async function getMyResults(): Promise<StudentResult[]> {
  try {
    return await apiRequest<StudentResult[]>('/results/me')
  } catch (error) {
    console.error('Error fetching my results:', error)
    return []
  }
}

export async function getResult(resultId: number | string): Promise<StudentResult | null> {
  try {
    return await apiRequest<StudentResult>(`/results/${resultId}`)
  } catch (error) {
    console.error('Error fetching result:', error)
    return null
  }
}

export async function createResult(result: StudentResultCreate): Promise<StudentResult> {
  const body: Record<string, unknown> = {
    assessment_id: result.assessment_id,
    marks_obtained: result.marks_obtained,
    grade: result.grade,
  }
  if (result.userEmail) body.userEmail = result.userEmail
  else if (result.student_id != null) body.student_id = result.student_id
  if (result.max_marks != null) body.max_marks = result.max_marks
  return await apiRequest<StudentResult>('/results/', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateResult(resultId: number | string, result: StudentResultUpdate): Promise<StudentResult> {
  return await apiRequest<StudentResult>(`/results/${resultId}`, {
    method: 'PUT',
    body: JSON.stringify(result),
  })
}

export async function deleteResult(resultId: number | string): Promise<void> {
  await apiRequest(`/results/${resultId}`, {
    method: 'DELETE',
  })
}

export type PerformancePrediction = {
  prediction_id: number
  student_id: number
  module_id: number
  predicted_grade: string
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH'
  prediction_date: string
  confidence_score?: number
  student_name?: string
  module_name?: string
  module_code?: string
  created_at?: string
}

export type PerformancePredictionCreate = {
  student_id: number
  module_id: number
  predicted_grade: string
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH'
  prediction_date: string
  confidence_score?: number
}

export async function getPredictions(studentId?: number, moduleId?: number): Promise<PerformancePrediction[]> {
  try {
    const params = new URLSearchParams()
    if (studentId) params.append('student_id', studentId.toString())
    if (moduleId) params.append('module_id', moduleId.toString())
    const query = params.toString() ? `?${params.toString()}` : ''
    return await apiRequest<PerformancePrediction[]>(`/predictions/${query}`)
  } catch (error) {
    console.error('Error fetching predictions:', error)
    return []
  }
}

export async function getHighRiskPredictions(): Promise<PerformancePrediction[]> {
  try {
    return await apiRequest<PerformancePrediction[]>('/predictions/high-risk')
  } catch (error) {
    console.error('Error fetching high-risk predictions:', error)
    return []
  }
}

export async function createPrediction(prediction: PerformancePredictionCreate): Promise<PerformancePrediction> {
  return await apiRequest<PerformancePrediction>('/predictions/', {
    method: 'POST',
    body: JSON.stringify(prediction),
  })
}

export type SemesterData = {
  course_id: number
  course_code: string
  course_name: string
  duration_years: number
  total_semesters: number
  modules_per_semester: Record<number, Module[]>
  status: string
}

export async function getSemesterManagement(): Promise<SemesterData[]> {
  try {
    return await apiRequest<SemesterData[]>('/admin/semesters')
  } catch (error) {
    console.error('Error fetching semester data:', error)
    return []
  }
}
