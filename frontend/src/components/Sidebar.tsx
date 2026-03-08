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
  Assignment as AssignmentIcon,
  Chat as ChatIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  MenuBook as MenuBookIcon,
  Grade as GradeIcon,
  EventNote as EventNoteIcon,
  Psychology as PsychologyIcon,
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
  // { text: 'Performance Analytics', icon: <AssessmentIcon /> },
  { text: 'Performance Predictor', icon: <PsychologyIcon /> },
  { text: 'Modules', icon: <MenuBookIcon /> },
  { text: 'Assessments', icon: <AssignmentIcon /> },
  { text: 'My Results', icon: <GradeIcon /> },
  { text: 'Attendance', icon: <EventNoteIcon /> },
  { text: 'Study Resources', icon: <FolderOpenIcon /> },
  { text: 'Chat', icon: <ChatIcon /> },
  { text: 'Chatbot Support', icon: <ChatIcon /> },
  { text: 'Profile & Settings', icon: <SettingsIcon /> },
  { text: 'Logout', icon: <LogoutIcon />, divider: true },
]

interface SidebarProps {
  selectedPage: string
  onSelectPage: (page: string) => void
}

const Sidebar: React.FC<SidebarProps> = ({ selectedPage, onSelectPage }) => {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          background: 'linear-gradient(180deg, #6366f1 0%, #4f46e5 100%)',
          color: 'white',
          borderRight: 'none',
        },
      }}
    >
      {/* Header Section */}
      <Box
        sx={{
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
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
            Cloud Campus
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            Software Engineering
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

      {/* Navigation Menu */}
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
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                      },
                    },
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: 'white',
                      minWidth: 40,
                    }}
                  >
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

      {/* Footer */}
      <Box sx={{ mt: 'auto', p: 2, textAlign: 'center' }}>
        <Typography variant="caption" sx={{ opacity: 0.6, fontFamily: "'Poppins', sans-serif" }}>
          © 2025 Cloud Campus
        </Typography>
      </Box>
    </Drawer>
  )
}

export default Sidebar

