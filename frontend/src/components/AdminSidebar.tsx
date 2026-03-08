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
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Chat as ChatIcon,
  PersonAdd as PersonAddIcon,
  Groups as GroupsIcon,
  MenuBook as MenuBookIcon,
  Assignment as AssignmentIcon,
  CalendarMonth as CalendarMonthIcon,
  Assessment as AssessmentIcon,
  Analytics as AnalyticsIcon,
  BarChart as BarChartIcon,
  FolderOpen as FolderOpenIcon,
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
  { text: 'User Management', icon: <PeopleIcon /> },
  { text: 'Teacher Management', icon: <PersonAddIcon /> },
  { text: 'Student Management', icon: <GroupsIcon /> },
  { text: 'Course Management', icon: <SchoolIcon /> },
  { text: 'Assessment Management', icon: <AssignmentIcon /> },
  { text: 'Reports', icon: <BarChartIcon /> },
  { text: 'Analysis', icon: <AnalyticsIcon /> },
  { text: 'Announcements', icon: <NotificationsIcon /> },
  { text: 'Study Resources', icon: <FolderOpenIcon /> },
  { text: 'Chat', icon: <ChatIcon /> },
  { text: 'Profile', icon: <PersonIcon /> },
  { text: 'Logout', icon: <LogoutIcon />, divider: true },
]

interface AdminSidebarProps {
  selectedPage: string
  onSelectPage: (page: string) => void
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ selectedPage, onSelectPage }) => {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          background: 'linear-gradient(180deg, #1e3a8a 0%, #1e40af 100%)',
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
          <Box
            component="img"
            src="/logo.png"
            alt="Cloud Campus"
            sx={{ width: 96, height: 96, objectFit: 'contain' }}
          />
        </motion.div>
        <Box textAlign="center">
          <Typography variant="h6" fontWeight="600" sx={{ fontFamily: "'Poppins', sans-serif" }}>
            Cloud Campus Admin
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            System Management
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
        <Typography variant="caption" sx={{ opacity: 0.6, fontFamily: "'Poppins', sans-serif" }}>
          © 2025 Cloud Campus
        </Typography>
      </Box>
    </Drawer>
  )
}

export default AdminSidebar

