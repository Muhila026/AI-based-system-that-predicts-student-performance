// Simple mock API layer to simulate backend functionality
// You can later swap implementations to call real endpoints

export type PredictInput = {
  attendanceRate: number
  avgAssignmentScore: number
  pastExamAvg: number
  engagementScore: number
}

export async function getPredictedScore(input?: Partial<PredictInput>): Promise<number> {
  // Simulate network latency
  await new Promise((r) => setTimeout(r, 500))

  // Generate a stable mock based on inputs or defaults
  const a = input?.attendanceRate ?? 0.9
  const as = input?.avgAssignmentScore ?? 78
  const pe = input?.pastExamAvg ?? 74
  const e = input?.engagementScore ?? 0.7

  const score = 0.35 * as + 0.35 * pe + 0.2 * (a * 100) + 0.1 * (e * 100)
  // Add a tiny jitter
  return Math.round(Math.max(0, Math.min(100, score + (Math.random() - 0.5) * 2)))
}

export async function getRecentActivities(): Promise<Array<{ activity: string; time: string }>> {
  await new Promise((r) => setTimeout(r, 300))
  return [
    { activity: 'Completed Quiz: JavaScript Basics', time: '2 hours ago' },
    { activity: "Watched Video: Database Design", time: '5 hours ago' },
    { activity: 'Submitted Assignment: Web Application', time: '1 day ago' },
    { activity: 'Achieved Badge: 7-Day Coding Streak', time: '2 days ago' },
  ]
}

export async function getUpcomingExams(): Promise<Array<{ subject: string; date: string; time: string }>> {
  await new Promise((r) => setTimeout(r, 300))
  return [
    { subject: 'Web Development', date: 'Nov 5, 2025', time: '10:00 AM' },
    { subject: 'Database Systems', date: 'Nov 8, 2025', time: '2:00 PM' },
    { subject: 'Software Engineering', date: 'Nov 12, 2025', time: '9:00 AM' },
  ]
}

// Performance analytics
export type SubjectPerf = { subject: string; current: number; predicted: number; trend: 'up'|'down' }
export async function getPerformanceOverview(): Promise<SubjectPerf[]> {
  await new Promise((r) => setTimeout(r, 300))
  return [
    { subject: 'Programming Fundamentals', current: 85, predicted: 87, trend: 'up' },
    { subject: 'Web Development', current: 72, predicted: 78, trend: 'up' },
    { subject: 'Database Systems', current: 90, predicted: 88, trend: 'down' },
    { subject: 'Software Engineering', current: 68, predicted: 75, trend: 'up' },
    { subject: 'Data Structures', current: 82, predicted: 84, trend: 'up' },
  ]
}

export async function getExamHistory(): Promise<Array<{ exam: string; date: string; score: number; grade: string }>> {
  await new Promise((r) => setTimeout(r, 250))
  return [
    { exam: 'Programming Fundamentals Midterm', date: 'Oct 15, 2025', score: 85, grade: 'A' },
    { exam: 'Web Development Quiz 3', date: 'Oct 12, 2025', score: 72, grade: 'B' },
    { exam: 'Database Systems Lab', date: 'Oct 10, 2025', score: 90, grade: 'A+' },
    { exam: 'Software Engineering Test', date: 'Oct 8, 2025', score: 68, grade: 'C+' },
    { exam: 'Data Structures Assignment', date: 'Oct 5, 2025', score: 82, grade: 'A-' },
  ]
}

export async function getStrengthsImprovements(): Promise<{strengths: string[]; improvements: string[]}> {
  await new Promise((r) => setTimeout(r, 200))
  return {
    strengths: ['Problem Solving', 'Analytical Thinking', 'Lab Work', 'Quick Learner'],
    improvements: ['Time Management', 'Note Taking', 'Reading Comprehension'],
  }
}

// Study plan
export type StudyTask = { id: string; title: string; subject: string; type: string; duration: string; priority: 'High'|'Medium'|'Low'; completed: boolean }
let _tasks: StudyTask[] = [
  { id: 't1', title: 'Review Data Structures', subject: 'Programming Fundamentals', type: 'Practice', duration: '30 min', priority: 'High', completed: false },
  { id: 't2', title: "Watch: React Hooks Explained", subject: 'Web Development', type: 'Video', duration: '15 min', priority: 'Medium', completed: false },
  { id: 't3', title: 'Complete Quiz: SQL Queries', subject: 'Database Systems', type: 'Quiz', duration: '20 min', priority: 'High', completed: false },
  { id: 't4', title: 'Read Chapter 5: Software Design Patterns', subject: 'Software Engineering', type: 'Reading', duration: '45 min', priority: 'Low', completed: true },
]
export async function getStudyTasks(): Promise<StudyTask[]> {
  await new Promise((r) => setTimeout(r, 250))
  return _tasks
}
export async function toggleTaskCompleted(id: string): Promise<StudyTask[]> {
  _tasks = _tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
  return getStudyTasks()
}

export async function getRecommendedVideos(): Promise<Array<{ title: string; channel: string; duration: string; thumbnail: string }>> {
  await new Promise((r) => setTimeout(r, 150))
  return [
    { title: 'Advanced JavaScript Concepts', channel: 'Code Academy', duration: '25 min', thumbnail: '💻' },
    { title: 'Understanding REST APIs', channel: 'Dev Hub', duration: '18 min', thumbnail: '🌐' },
    { title: 'Database Design Basics', channel: 'Tech Learn', duration: '12 min', thumbnail: '🗄️' },
  ]
}

export async function getWeeklyProgress(): Promise<{ tasksCompleted: [number, number]; studyHours: [number, number] }> {
  return { tasksCompleted: [12, 15], studyHours: [18, 20] }
}

// Assignments
export type AssignmentItem = { id: string; title: string; subject: string; dueDate: string; status: 'submitted'|'pending'|'in-progress'|'overdue'; grade: string | null; score: number | null; submittedDate: string | null }
let _assignments: AssignmentItem[] = [
  { id: 'a1', title: 'Programming Assignment 5', subject: 'Programming Fundamentals', dueDate: 'Nov 2, 2025', status: 'submitted', grade: 'A', score: 95, submittedDate: 'Oct 30, 2025' },
  { id: 'a2', title: 'Web Development Project', subject: 'Web Development', dueDate: 'Nov 5, 2025', status: 'pending', grade: null, score: null, submittedDate: null },
  { id: 'a3', title: 'Database Design Report', subject: 'Database Systems', dueDate: 'Nov 3, 2025', status: 'in-progress', grade: null, score: null, submittedDate: null },
  { id: 'a4', title: 'Software Engineering Essay', subject: 'Software Engineering', dueDate: 'Oct 28, 2025', status: 'overdue', grade: null, score: null, submittedDate: null },
  { id: 'a5', title: 'Data Structures Analysis', subject: 'Data Structures', dueDate: 'Nov 1, 2025', status: 'submitted', grade: 'B+', score: 87, submittedDate: 'Oct 31, 2025' },
]
export async function getAssignments(): Promise<AssignmentItem[]> {
  await new Promise((r) => setTimeout(r, 250))
  return _assignments
}
export async function updateAssignmentStatus(id: string, status: AssignmentItem['status']): Promise<AssignmentItem[]> {
  _assignments = _assignments.map(a => a.id === id ? { ...a, status } : a)
  return getAssignments()
}

// Notifications
export type NotificationItem = { id: number; type: string; title: string; message: string; time: string; read: boolean; color: string }
let _notifications: NotificationItem[] = [
  { id: 1, type: 'assignment', title: 'New Assignment Posted', message: 'Web Development Project is now available', time: '2 hours ago', read: false, color: '#3b82f6' },
  { id: 2, type: 'exam', title: 'Upcoming Exam Reminder', message: 'Web Development exam is scheduled for Nov 5, 2025 at 10:00 AM', time: '5 hours ago', read: false, color: '#f59e0b' },
  { id: 3, type: 'achievement', title: 'New Achievement Unlocked!', message: 'You have earned the 7-Day Coding Streak badge', time: '1 day ago', read: false, color: '#8b5cf6' },
  { id: 4, type: 'grade', title: 'Grade Posted', message: 'Programming Assignment 5: A (95%)', time: '1 day ago', read: true, color: '#10b981' },
]
export async function getNotifications(): Promise<NotificationItem[]> {
  await new Promise((r) => setTimeout(r, 200))
  return _notifications
}
export async function dismissNotification(id: number): Promise<NotificationItem[]> {
  _notifications = _notifications.filter(n => n.id !== id)
  return getNotifications()
}

// Profile
export async function saveProfile(_: any): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 400))
  return true
}

// =====================
// Admin mock endpoints
// =====================

// Dashboard
export async function getAdminDashboard() {
  await new Promise((r) => setTimeout(r, 300))
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
      { activity: 'New course "Advanced Web Development" created', user: 'Dr. Smith', time: '2 hours ago' },
      { activity: '15 new students enrolled', user: 'System', time: '5 hours ago' },
      { activity: 'Semester 3 started', user: 'Admin Johnson', time: '1 day ago' },
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

// Users
export type AdminUser = { id: number; name: string; email: string; role: 'Student'|'Teacher'|'Admin'; status: 'Active'|'Inactive'; joinedDate: string }
let _adminUsers: AdminUser[] = [
  { id: 1, name: 'John Doe', email: 'john@edu.com', role: 'Student', status: 'Active', joinedDate: '2024-09-01' },
  { id: 2, name: 'Dr. Emily Johnson', email: 'emily@edu.com', role: 'Teacher', status: 'Active', joinedDate: '2023-01-15' },
  { id: 3, name: 'Admin Smith', email: 'smith@edu.com', role: 'Admin', status: 'Active', joinedDate: '2022-06-20' },
  { id: 4, name: 'Sarah Davis', email: 'sarah@edu.com', role: 'Student', status: 'Inactive', joinedDate: '2024-10-10' },
  { id: 5, name: 'Mike Wilson', email: 'mike@edu.com', role: 'Teacher', status: 'Active', joinedDate: '2023-08-05' },
]
export async function getUsers(): Promise<AdminUser[]> { await new Promise((r)=>setTimeout(r,200)); return _adminUsers }
export async function addUser(u: Omit<AdminUser,'id'|'joinedDate'> & { joinedDate?: string }): Promise<AdminUser[]> {
  const id = Math.max(..._adminUsers.map(u=>u.id)) + 1
  _adminUsers = [..._adminUsers, { id, joinedDate: u.joinedDate ?? new Date().toISOString().slice(0,10), ...u }]
  return getUsers()
}
export async function deleteUser(id: number): Promise<AdminUser[]> { _adminUsers = _adminUsers.filter(u=>u.id!==id); return getUsers() }

// Courses
export type AdminCourse = { id: number; name: string; code: string; teacher: string; students: number; status: 'Active'|'Inactive' }
let _courses: AdminCourse[] = [
  { id: 1, name: 'Programming Fundamentals', code: 'SE-101', teacher: 'Dr. Emily Johnson', students: 32, status: 'Active' },
  { id: 2, name: 'Web Development', code: 'SE-201', teacher: 'Prof. Mike Wilson', students: 28, status: 'Active' },
  { id: 3, name: 'Database Systems', code: 'SE-301', teacher: 'Dr. Sarah Brown', students: 35, status: 'Active' },
  { id: 4, name: 'Software Engineering', code: 'SE-401', teacher: 'Prof. David Lee', students: 29, status: 'Active' },
]
export async function getCourses(): Promise<AdminCourse[]> { await new Promise((r)=>setTimeout(r,200)); return _courses }
export async function addCourse(c: Omit<AdminCourse,'id'>): Promise<AdminCourse[]> { const id = Math.max(..._courses.map(c=>c.id)) + 1; _courses = [..._courses, { id, ...c }]; return getCourses() }
export async function deleteCourse(id: number): Promise<AdminCourse[]> { _courses = _courses.filter(c=>c.id!==id); return getCourses() }

// AI Settings
let _aiSettings = { predictionThreshold: 75, riskThreshold: 60, recommendationStrength: 80, autoSuggest: true, realTimeAnalysis: true, weeklyReports: true }
export async function getAISettings() { await new Promise((r)=>setTimeout(r,150)); return _aiSettings }
export async function saveAISettings(s: typeof _aiSettings) { _aiSettings = s; await new Promise((r)=>setTimeout(r,150)); return true }

// Chatbot logs
export async function getChatbotLogs() {
  await new Promise((r)=>setTimeout(r,200))
  return [
    { id: 1, user: 'John Doe', message: 'How do I solve quadratic equations?', response: 'Let me explain...', flagged: false, timestamp: '2025-10-29 10:30' },
    { id: 2, user: 'Emma Wilson', message: 'I need help with physics homework', response: 'Sure, which topic?', flagged: false, timestamp: '2025-10-29 10:25' },
    { id: 3, user: 'Mike Johnson', message: 'Can you do my assignment?', response: 'I cannot do assignments...', flagged: true, timestamp: '2025-10-29 10:20' },
  ]
}

// Reports
export async function getAdminReports() {
  await new Promise((r)=>setTimeout(r,200))
  return [
    { title: 'Platform Usage Report', description: 'Overall system usage statistics', date: '2025-10-28', type: 'Usage' },
    { title: 'User Growth Analytics', description: 'User registration and engagement trends', date: '2025-10-25', type: 'Analytics' },
    { title: 'Course Performance Summary', description: 'Aggregate course and student performance', date: '2025-10-20', type: 'Performance' },
    { title: 'AI Model Performance', description: 'Prediction accuracy and model metrics', date: '2025-10-15', type: 'AI' },
  ]
}

export async function getQuickExports() { return ['All Users Data','Course Enrollments','System Logs','Financial Report'] }

// Announcements
type Ann = { id: number; title: string; message: string; target: string; date: string; priority: 'low'|'normal'|'high'|'urgent' }
let _ann: Ann[] = [
  { id: 1, title: 'System Maintenance', message: 'Scheduled maintenance on Sunday', target: 'All', date: '2025-10-28', priority: 'high' },
  { id: 2, title: 'New Features Released', message: 'New AI study planner', target: 'Students', date: '2025-10-25', priority: 'normal' },
]
export async function getAnnouncements() { await new Promise((r)=>setTimeout(r,150)); return _ann }
export async function sendAnnouncement(a: Omit<Ann,'id'|'date'>) { const id = Math.max(0, ..._ann.map(x=>x.id)) + 1; _ann = [{ id, date: new Date().toISOString().slice(0,10), ...a }, ..._ann]; return getAnnouncements() }

// Admin profile
export async function saveAdminProfile(_: any) { await new Promise((r)=>setTimeout(r,200)); return true }


