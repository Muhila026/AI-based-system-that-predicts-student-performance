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
  Tooltip,
  Avatar,
  Button,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Chat as ChatIcon,
  FolderOpen as FolderOpenIcon,
  Subject as SubjectIcon,
  SmartToy as SmartToyIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { getCurrentUser } from '../lib/api'

const drawerWidth = 280
const SIDEBAR = {
  bg: '#ffffff',
  leftBorder: '4px solid #DBEAFE',
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  inactive: '#9CA3AF',
  textDark: '#1F2937',
  logoutRed: '#dc2626',
  logoutRedLight: '#fef2f2',
  accountSectionBg: '#F9FAFB',
  accountSectionBorder: '#E5E7EB',
}

interface MenuItem {
  text: string
  icon: React.ReactNode
  tooltip?: string
  divider?: boolean
}

const menuItems: MenuItem[] = [
  { text: 'Dashboard', icon: <DashboardIcon />, tooltip: 'Overview and key metrics' },
  { text: 'User Management', icon: <PeopleIcon />, tooltip: 'Manage students, teachers and admins' },
  { text: 'Subjects & Marks', icon: <SubjectIcon />, tooltip: 'Subjects, enrollments and marks' },
  { text: 'Study Resources', icon: <FolderOpenIcon />, tooltip: 'Upload and manage learning materials' },
  { text: 'Approve Study Resources', icon: <CheckCircleIcon />, tooltip: 'Accept or reject teacher-uploaded resources' },
  { text: 'Chat', icon: <ChatIcon />, tooltip: 'Message teachers and students' },
  { text: 'Chatbot Support', icon: <SmartToyIcon />, tooltip: 'AI assistant' },
]

interface AdminSidebarProps {
  selectedPage: string
  onSelectPage: (page: string) => void
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ selectedPage, onSelectPage }) => {
  const user = getCurrentUser()
  const displayName = user.name || 'Admin'
  const subtitle = (user.role || 'admin').charAt(0).toUpperCase() + (user.role || 'admin').slice(1)

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundColor: SIDEBAR.bg,
          borderRight: 'none',
          borderLeft: SIDEBAR.leftBorder,
          boxShadow: '2px 0 12px rgba(30, 58, 138, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        },
      }}
    >
      <Box sx={{ px: 2, pt: 3, pb: 2, display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <Box
            component="img"
            src="/logo.png"
            alt="Cloud Campus"
            sx={{ width: 56, height: 56, objectFit: 'contain' }}
          />
        </motion.div>
        <Typography variant="h6" fontWeight="700" sx={{ color: SIDEBAR.textDark, fontFamily: "'Poppins', sans-serif", letterSpacing: '-0.02em' }}>
          Cloud Campus
        </Typography>
      </Box>

      <Divider sx={{ borderColor: '#E5E7EB', mx: 2, flexShrink: 0 }} />

      <List sx={{ px: 1.5, py: 2, flex: 1, overflow: 'auto', minHeight: 0 }}>
        {menuItems.map((item, index) => {
          const isSelected = selectedPage === item.text
          return (
            <motion.div
              key={item.text}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <ListItem disablePadding sx={{ mb: 0.25 }}>
                  <Tooltip title={item.tooltip || item.text} placement="right" arrow>
                    <ListItemButton
                      selected={isSelected}
                      onClick={() => onSelectPage(item.text)}
                  sx={{
                    borderRadius: 0,
                    borderLeft: isSelected ? `4px solid ${SIDEBAR.primary}` : '4px solid transparent',
                    pl: isSelected ? 1.5 : 2,
                    py: 1.25,
                    '&.Mui-selected': {
                      backgroundColor: SIDEBAR.primaryLight,
                      '&:hover': { backgroundColor: '#DBEAFE' },
                    },
                    '&:hover': { backgroundColor: '#F9FAFB' },
                    transition: 'all 0.2s ease',
                  }}
                >
                  <ListItemIcon sx={{ color: isSelected ? SIDEBAR.primary : SIDEBAR.textDark, minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: isSelected ? 600 : 500,
                      color: isSelected ? SIDEBAR.primary : SIDEBAR.textDark,
                    }}
                    />
                    </ListItemButton>
                  </Tooltip>
                </ListItem>
              </motion.div>
          )
        })}
      </List>

      {/* Profile card — Help Center style */}
      <Box sx={{ px: 2, py: 2, flexShrink: 0, mt: 'auto' }}>
        <Divider sx={{ borderColor: SIDEBAR.accountSectionBorder, mb: 2 }} />
        <Box
          sx={{
            borderRadius: 2,
            border: `1px solid ${SIDEBAR.accountSectionBorder}`,
            backgroundColor: SIDEBAR.accountSectionBg,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            overflow: 'visible',
            position: 'relative',
            pt: 3.5,
            pb: 2,
            px: 2,
            textAlign: 'center',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              left: '50%',
              top: 0,
              transform: 'translate(-50%, -50%)',
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: SIDEBAR.primaryLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: SIDEBAR.primary,
              border: `2px solid ${SIDEBAR.bg}`,
              boxShadow: '0 2px 8px rgba(30, 58, 138, 0.15)',
            }}
          >
            <Avatar
              sx={{
                width: 48,
                height: 48,
                bgcolor: SIDEBAR.primary,
                fontSize: '1.25rem',
              }}
            >
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
          </Box>
          <Typography variant="subtitle1" fontWeight="700" sx={{ color: SIDEBAR.textDark, mb: 0.5 }}>
            {displayName}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: '#7c3aed',
              display: 'block',
              mb: 2,
              fontWeight: 600,
              letterSpacing: '0.03em',
            }}
          >
            {subtitle}
          </Typography>
          <Button
            fullWidth
            variant="contained"
            onClick={() => onSelectPage('Profile')}
            sx={{
              backgroundColor: SIDEBAR.primary,
              borderRadius: 1.5,
              py: 1.25,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              '&:hover': { backgroundColor: '#1e40af' },
            }}
          >
            View profile
          </Button>
          <Button
            fullWidth
            size="small"
            startIcon={<LogoutIcon />}
            onClick={() => onSelectPage('Logout')}
            sx={{
              color: SIDEBAR.logoutRed,
              mt: 1.5,
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { backgroundColor: SIDEBAR.logoutRedLight },
            }}
          >
            Logout
          </Button>
        </Box>
      </Box>
    </Drawer>
  )
}

export default AdminSidebar

