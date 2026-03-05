import React from 'react'
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
  Avatar,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  Assessment as AssessmentIcon,
  Assignment as AssignmentIcon,
  FolderOpen as FolderOpenIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Chat as ChatIcon,
  EventNote as EventNoteIcon,
  Groups as GroupsIcon,
  MenuBook as MenuBookIcon,
  Grade as GradeIcon,
  Analytics as AnalyticsIcon,
  ThumbUp as ThumbUpIcon,
} from '@mui/icons-material'
import { motion } from 'framer-motion'

const drawerWidth = 280

interface MenuItem {
  text: string
  icon: React.ReactNode
  divider?: boolean
}

const menuItems: MenuItem[] = [
  { text: 'Dashboard', icon: <DashboardIcon /> },
  { text: 'Student Performance', icon: <AssessmentIcon /> },
  { text: 'Modules', icon: <MenuBookIcon /> },
  { text: 'Assessments', icon: <AssignmentIcon /> },
  { text: 'Student Results', icon: <GradeIcon /> },
  { text: 'Attendance', icon: <EventNoteIcon /> },
  { text: 'Participation', icon: <ThumbUpIcon /> },
  { text: 'Manage Students', icon: <GroupsIcon /> },
  { text: 'Study Resources', icon: <FolderOpenIcon /> },
  { text: 'Analysis', icon: <AnalyticsIcon /> },
  { text: 'Chat', icon: <ChatIcon /> },
  { text: 'Profile', icon: <SettingsIcon /> },
  { text: 'Logout', icon: <LogoutIcon />, divider: true },
]

interface TeacherSidebarProps {
  selectedPage: string
  onSelectPage: (page: string) => void
}

const TeacherSidebar: React.FC<TeacherSidebarProps> = ({ selectedPage, onSelectPage }) => {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
          color: 'white',
          borderRight: 'none',
        },
      }}
    >
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <Avatar sx={{ width: 80, height: 80, bgcolor: 'rgba(255, 255, 255, 0.2)', fontSize: '2rem' }}>
            👨‍🏫
          </Avatar>
        </motion.div>
        <Box textAlign="center">
          <Typography variant="h6" fontWeight="bold">
            Teacher Portal
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            Manage & Track Students
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

      <List sx={{ px: 2, py: 3 }}>
        {menuItems.map((item, index) => (
          <React.Fragment key={item.text}>
            {item.divider && (
              <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
            )}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={selectedPage === item.text}
                  onClick={() => onSelectPage(item.text)}
                  sx={{
                    borderRadius: 2,
                    '&.Mui-selected': {
                      bgcolor: 'rgba(255, 255, 255, 0.15)',
                      '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.2)' },
                    },
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' },
                    transition: 'all 0.3s ease',
                  }}
                >
                  <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: '0.95rem',
                      fontWeight: selectedPage === item.text ? 600 : 400,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            </motion.div>
          </React.Fragment>
        ))}
      </List>

      <Box sx={{ mt: 'auto', p: 2, textAlign: 'center' }}>
        <Typography variant="caption" sx={{ opacity: 0.6 }}>
          © 2025 Teacher Portal
        </Typography>
      </Box>
    </Drawer>
  )
}

export default TeacherSidebar

