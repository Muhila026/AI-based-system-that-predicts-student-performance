import React, { useState, useEffect } from 'react'
import { Box } from '@mui/material'

import Sidebar from './components/Sidebar'
import Dashboard from './pages/student/Dashboard'
import PerformanceAnalytics from './pages/student/PerformanceAnalytics'
import PredictedGrade from './pages/student/PredictedGrade'
import StudentModules from './pages/student/Modules'
import StudentAssessments from './pages/student/Assessments'
import MyResults from './pages/student/MyResults'
import StudentAttendance from './pages/student/Attendance'
import Assignments from './pages/student/Assignments'
import Notifications from './pages/student/Notifications'
import Profile from './pages/student/Profile'
import ChatbotSupport from './pages/student/ChatbotSupport'
import StudentStudyResources from './pages/student/StudyResources'
import SharedChat from './pages/teacher/Chat'

import TeacherSidebar from './components/TeacherSidebar'
import TeacherDashboard from './pages/teacher/Dashboard'
import StudentPerformance from './pages/teacher/StudentPerformance'
import TeacherModules from './pages/teacher/Modules'
import TeacherAssessments from './pages/teacher/Assessments'
import StudentResults from './pages/teacher/StudentResults'
import TeacherAssignments from './pages/teacher/Assignments'
import TeacherFeedback from './pages/teacher/Feedback'
import TeacherChat from './pages/teacher/Chat'
import UploadAttendance from './pages/teacher/UploadAttendance'
import ParticipationRating from './pages/teacher/ParticipationRating'
import ManageStudents from './pages/teacher/ManageStudents'
import StudyResources from './pages/teacher/StudyResources'
import TeacherAnalysis from './pages/teacher/Analysis'
import TeacherReports from './pages/teacher/Reports'
import TeacherProfile from './pages/teacher/Profile'

import AdminSidebar from './components/AdminSidebar'
import AdminDashboard from './pages/admin/Dashboard'
import UserManagement from './pages/admin/UserManagement'
import TeacherManagement from './pages/admin/TeacherManagement'
import StudentManagement from './pages/admin/StudentManagement'
import CourseManagement from './pages/admin/CourseManagement'
import AssessmentManagement from './pages/admin/AssessmentManagement'
import AdminReports from './pages/admin/Reports'
import AdminAnalysis from './pages/admin/Analysis'
import Announcements from './pages/admin/Announcements'
import AdminProfile from './pages/admin/Profile'

import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import { decodeJwtPayload } from './lib/api'

interface UserData {
  email: string
  role: string
  name?: string
  token?: string
}

/** Normalize backend role (ADMIN/TEACHER/STUDENT) to lowercase for UI. */
function normalizeRole(role: string): string {
  const r = (role || '').toLowerCase()
  if (r === 'super_admin') return 'admin'
  return r === 'admin' || r === 'teacher' || r === 'student' ? r : 'student'
}

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [userRole, setUserRole] = useState<string>('')
  const [selectedPage, setSelectedPage] = useState<string>('Dashboard')
  const [authPage, setAuthPage] = useState<'login' | 'forgot-password' | 'reset-password'>('login')
  const [resetPasswordEmail, setResetPasswordEmail] = useState<string>('')
  const [openAddUserDialogOnce, setOpenAddUserDialogOnce] = useState<boolean>(false)

  useEffect(() => {
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user')
    if (userStr) {
      try {
        const user: UserData = JSON.parse(userStr)
        const token = user.token
        let role = normalizeRole(user.role || '')
        if (token && (role === 'student' || role === '')) {
          const payload = decodeJwtPayload(token)
          if (payload.role) role = normalizeRole(payload.role)
        }
        setIsAuthenticated(true)
        setUserRole(role)
      } catch {
        localStorage.removeItem('user')
        sessionStorage.removeItem('user')
        setIsAuthenticated(false)
        setUserRole('')
      }
    }
  }, [])

  const handleLogin = () => {
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user')
    if (userStr) {
      try {
        const user: UserData = JSON.parse(userStr)
        let role = normalizeRole(user.role || '')
        if (user.token) {
          const payload = decodeJwtPayload(user.token)
          if (payload.role) role = normalizeRole(payload.role)
        }
        setIsAuthenticated(true)
        setUserRole(role)
      } catch {
        localStorage.removeItem('user')
        sessionStorage.removeItem('user')
        setIsAuthenticated(false)
        setUserRole('')
      }
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    sessionStorage.removeItem('user')
    setIsAuthenticated(false)
    setUserRole('')
    setSelectedPage('Dashboard')
  }

  const handlePageSelect = (page: string) => {
    if (page === 'Logout') {
      handleLogout()
    } else {
      setSelectedPage(page)
    }
  }

  const handleOpenAddUser = () => {
    setSelectedPage('User Management')
    setOpenAddUserDialogOnce(true)
  }

  const renderStudentPage = () => {
    switch (selectedPage) {
      case 'Dashboard':
        return <Dashboard />
      case 'Performance Analytics':
        return <PerformanceAnalytics />
      case 'Performance Predictor':
        return <PredictedGrade />
      case 'Modules':
        return <StudentModules />
      case 'Assessments':
        return <StudentAssessments />
      case 'My Results':
        return <MyResults />
      case 'Attendance':
        return <StudentAttendance />
      case 'Chat':
        return <SharedChat />
      case 'Study Resources':
        return <StudentStudyResources />
      case 'Assignments & Grades':
        return <Assignments />
      case 'Profile & Settings':
        return <Profile />
      case 'Chatbot Support':
        return <ChatbotSupport />
      default:
        return <Dashboard />
    }
  }

  const renderTeacherPage = () => {
    switch (selectedPage) {
      case 'Dashboard':
        return <TeacherDashboard onSelectPage={handlePageSelect} />
      case 'Student Performance':
        return <StudentPerformance />
      case 'Modules':
        return <TeacherModules />
      case 'Assessments':
        return <TeacherAssessments />
      case 'Student Results':
        return <StudentResults />
      case 'Assignments':
        return <TeacherAssignments />
      case 'Attendance':
        return <UploadAttendance />
      case 'Participation':
        return <ParticipationRating />
      case 'Manage Students':
        return <ManageStudents />
      case 'Study Resources':
        return <StudyResources />
      case 'Analysis':
        return <TeacherAnalysis />
      case 'Feedback':
        return <TeacherFeedback />
      case 'Chat':
        return <TeacherChat />
      case 'Reports':
        return <TeacherReports />
      case 'Profile':
        return <TeacherProfile />
      default:
        return <TeacherDashboard />
    }
  }

  const renderAdminPage = () => {
    switch (selectedPage) {
      case 'Dashboard':
        return <AdminDashboard onAddUserClick={handleOpenAddUser} />
      case 'User Management':
        return (
          <UserManagement
            initialOpenAddDialog={openAddUserDialogOnce}
            onAddDialogHandled={() => setOpenAddUserDialogOnce(false)}
          />
        )
      case 'Teacher Management':
        return <TeacherManagement />
      case 'Student Management':
        return <StudentManagement />
      case 'Course Management':
        return <CourseManagement />
      case 'Assessment Management':
        return <AssessmentManagement />
      case 'Reports':
        return <AdminReports />
      case 'Analysis':
        return <AdminAnalysis />
      case 'Announcements':
        return <Announcements />
      case 'Study Resources':
        return <StudyResources />
      case 'Chat':
        return <SharedChat />
      case 'Profile':
        return <AdminProfile />
      default:
        return <AdminDashboard />
    }
  }

  if (!isAuthenticated) {
    if (authPage === 'forgot-password') {
      return (
        <ForgotPassword
          onBack={() => setAuthPage('login')}
          onSuccess={(email: string) => {
            setResetPasswordEmail(email)
            setAuthPage('reset-password')
          }}
        />
      )
    }
    if (authPage === 'reset-password') {
      return (
        <ResetPassword
          email={resetPasswordEmail}
          onBack={() => setAuthPage('forgot-password')}
          onSuccess={() => {
            setAuthPage('login')
            setResetPasswordEmail('')
          }}
        />
      )
    }
    return <Login onLogin={handleLogin} onForgotPassword={() => setAuthPage('forgot-password')} />
  }

  const renderPortal = () => {
    switch (userRole) {
      case 'student':
        return (
          <>
            <Sidebar selectedPage={selectedPage} onSelectPage={handlePageSelect} />
            <Box
              component="main"
              sx={{
                flexGrow: 1,
                p: 4,
                backgroundColor: '#f9fafb',
              }}
            >
              <Box sx={{ maxWidth: 1400, margin: '0 auto' }}>
                {renderStudentPage()}
              </Box>
            </Box>
          </>
        )

      case 'teacher':
        return (
          <>
            <TeacherSidebar selectedPage={selectedPage} onSelectPage={handlePageSelect} />
            <Box
              component="main"
              sx={{
                flexGrow: 1,
                p: 4,
                backgroundColor: '#f9fafb',
              }}
            >
              <Box sx={{ maxWidth: 1400, margin: '0 auto' }}>
                {renderTeacherPage()}
              </Box>
            </Box>
          </>
        )

      case 'admin':
        return (
          <>
            <AdminSidebar selectedPage={selectedPage} onSelectPage={handlePageSelect} />
            <Box
              component="main"
              sx={{
                flexGrow: 1,
                p: 4,
                backgroundColor: '#f9fafb',
              }}
            >
              <Box sx={{ maxWidth: 1400, margin: '0 auto' }}>
                {renderAdminPage()}
              </Box>
            </Box>
          </>
        )

      default:
        return (
          <Box textAlign="center" mt={10}>
            <h2>Invalid user role</h2>
            <p>Please contact support.</p>
          </Box>
        )
    }
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {renderPortal()}
    </Box>
  )
}

export default App
