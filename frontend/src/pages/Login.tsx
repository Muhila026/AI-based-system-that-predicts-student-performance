import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  Alert,
  Avatar,
  Divider,
  Container,
  Paper,
  Stack,
  CircularProgress,
  Chip,
} from '@mui/material'
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  School,
  PersonOutline,
  Security,
  TrendingUp,
  Groups,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { login, checkBackendConnection } from '../lib/api'

interface LoginProps {
  onLogin: () => void
  onForgotPassword?: () => void
}

const Login: React.FC<LoginProps> = ({ onLogin, onForgotPassword }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [backendStatus, setBackendStatus] = useState<{ connected: boolean; checking: boolean }>({
    connected: false,
    checking: true,
  })

  useEffect(() => {
    const checkConnection = async () => {
      setBackendStatus({ connected: false, checking: true })
      try {
        const isConnected = await checkBackendConnection()
        setBackendStatus({ connected: isConnected, checking: false })
      } catch (error) {
        setBackendStatus({ connected: false, checking: false })
      }
    }
    checkConnection()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()
    if (!trimmedEmail || !trimmedPassword) {
      setError('Please enter your email and password.')
      setLoading(false)
      return
    }

    try {
      await login(trimmedEmail, trimmedPassword)
      onLogin()
    } catch (err: any) {
      const errorMessage = err.message || 'Invalid credentials. Please check your email and password.'
      setError(errorMessage)
      if (errorMessage.includes('Backend') || errorMessage.includes('backend')) {
        console.error('Backend connection error:', errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #6366f1 100%)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
          pointerEvents: 'none',
        },
      }}
    >
      {/* Animated Background Elements */}
      <Box
        sx={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          opacity: 0.15,
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.3) 1px, transparent 1px),
                           radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.3) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
          animation: 'float 20s ease-in-out infinite',
          '@keyframes float': {
            '0%, 100%': { transform: 'translateY(0px)' },
            '50%': { transform: 'translateY(-20px)' },
          },
        }}
      />

      {/* Left Side - Branding */}
      <Box
        sx={{
          flex: 1,
          display: { xs: 'none', lg: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: { xs: 4, md: 8 },
          color: 'white',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Container maxWidth="sm">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    mb: 4,
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '200px',
                      height: '200px',
                      background: 'radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, transparent 70%)',
                      borderRadius: '50%',
                      zIndex: -1,
                    },
                  }}
                >
                  <School
                    sx={{
                      fontSize: { xs: 80, md: 120 },
                      filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.3))',
                      color: 'white',
                    }}
                  />
                </Box>
              </motion.div>

              <Typography
                variant="h3"
                fontWeight={800}
                mb={2}
                sx={{
                  textShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  fontSize: { xs: '2rem', md: '3rem' },
                  letterSpacing: '-0.02em',
                }}
              >
                Software Engineering Institute
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  opacity: 0.95,
                  mb: 6,
                  fontWeight: 400,
                  fontSize: { xs: '1rem', md: '1.25rem' },
                }}
              >
                Excellence in Education, Innovation in Technology
              </Typography>

              <Stack
                direction="row"
                spacing={4}
                sx={{
                  mt: 4,
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: 3,
                }}
              >
                {[
                  { icon: <Groups />, value: '4', label: 'Semesters' },
                  { icon: <TrendingUp />, value: '3', label: 'Months Each' },
                  { icon: <Security />, value: '12', label: 'Months Total' },
                ].map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                  >
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        textAlign: 'center',
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 3,
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        minWidth: 120,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          background: 'rgba(255, 255, 255, 0.15)',
                          transform: 'translateY(-4px)',
                        },
                      }}
                    >
                      <Box sx={{ color: 'white', mb: 1 }}>{stat.icon}</Box>
                      <Typography
                        variant="h4"
                        fontWeight={700}
                        sx={{ color: 'white', mb: 0.5 }}
                      >
                        {stat.value}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.875rem' }}
                      >
                        {stat.label}
                      </Typography>
                    </Paper>
                  </motion.div>
                ))}
              </Stack>
            </Box>
          </motion.div>
        </Container>
      </Box>

      {/* Right Side - Login Form */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 2, sm: 4 },
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Container maxWidth="sm" sx={{ width: '100%' }}>
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            style={{ width: '100%' }}
          >
            <Card
              elevation={24}
              sx={{
                p: { xs: 3, sm: 5 },
                borderRadius: 4,
                boxShadow: '0 25px 80px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)',
                background: 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(90deg, #3b82f6, #6366f1, #8b5cf6)',
                },
              }}
            >
              {/* Header */}
              <Box textAlign="center" mb={4}>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Avatar
                    sx={{
                      width: { xs: 64, sm: 80 },
                      height: { xs: 64, sm: 80 },
                      bgcolor: 'primary.main',
                      margin: '0 auto',
                      mb: 2,
                      boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    }}
                  >
                    <PersonOutline sx={{ fontSize: { xs: 32, sm: 40 } }} />
                  </Avatar>
                </motion.div>
                <Typography
                  variant="h4"
                  fontWeight={700}
                  color="text.primary"
                  gutterBottom
                  sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' }, mb: 1 }}
                >
                  Welcome Back
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                >
                  Sign in to access your student portal
                </Typography>
              </Box>

              {/* Backend Connection Status */}
              <Box mb={2}>
                {backendStatus.checking ? (
                  <Chip
                    icon={<CircularProgress sx={{ width: 16, height: 16 }} />}
                    label="Checking backend connection..."
                    size="small"
                    sx={{ width: '100%' }}
                  />
                ) : backendStatus.connected ? (
                  <Chip
                    icon={<CheckCircle />}
                    label="Backend connected"
                    color="success"
                    size="small"
                    sx={{ width: '100%' }}
                  />
                ) : (
                  <Alert
                    severity="warning"
                    icon={<ErrorIcon />}
                    sx={{
                      mb: 2,
                      '& .MuiAlert-icon': {
                        alignItems: 'center',
                      },
                    }}
                  >
                    <Typography variant="body2" fontWeight={600} mb={0.5}>
                      Backend server not connected
                    </Typography>
                    <Typography variant="caption">
                      Please start the backend server at http://localhost:8000 before logging in.
                    </Typography>
                  </Alert>
                )}
              </Box>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <Alert
                    severity="error"
                    sx={{
                      mb: 3,
                      borderRadius: 2,
                      '& .MuiAlert-icon': {
                        fontSize: '1.5rem',
                      },
                    }}
                  >
                    {error}
                  </Alert>
                </motion.div>
              )}

              <form onSubmit={handleLogin}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <TextField
                    fullWidth
                    label="Email Address"
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (error) setError('')
                    }}
                    required
                    sx={{
                      mb: 3,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)',
                        },
                        '&.Mui-focused': {
                          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
                        },
                      },
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email sx={{ color: 'primary.main' }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <TextField
                    fullWidth
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (error) setError('')
                    }}
                    required
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)',
                        },
                        '&.Mui-focused': {
                          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
                        },
                      },
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock sx={{ color: 'primary.main' }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            sx={{ color: 'text.secondary' }}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </motion.div>

                <Box
                  display="flex"
                  justifyContent="flex-end"
                  alignItems="center"
                  mb={3}
                >
                  {onForgotPassword && (
                  <Typography
                    variant="body2"
                    color="primary"
                    onClick={onForgotPassword}
                    sx={{
                      cursor: 'pointer',
                      fontWeight: 500,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        textDecoration: 'underline',
                        color: 'primary.dark',
                      },
                    }}
                  >
                    Forgot Password?
                  </Typography>
                  )}
                </Box>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    type="submit"
                    disabled={loading || (!backendStatus.checking && !backendStatus.connected)}
                    sx={{
                      py: 1.75,
                      fontSize: '1rem',
                      fontWeight: 600,
                      borderRadius: 2,
                      textTransform: 'none',
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 24px rgba(99, 102, 241, 0.5)',
                      },
                      '&:disabled': {
                        background: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {loading ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={20} sx={{ color: 'white' }} />
                        <span>Signing In...</span>
                      </Box>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </motion.div>
              </form>

              <Divider sx={{ my: 4 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    px: 2,
                    backgroundColor: 'background.paper',
                    fontWeight: 500,
                  }}
                >
                  OR
                </Typography>
              </Divider>

              <Typography
                variant="body2"
                textAlign="center"
                color="text.secondary"
                sx={{ fontSize: '0.875rem' }}
              >
                Don't have an account?{' '}
                <Typography
                  component="span"
                  color="primary"
                  fontWeight={600}
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      textDecoration: 'underline',
                      color: 'primary.dark',
                    },
                  }}
                >
                  Contact Administrator
                </Typography>
              </Typography>
            </Card>

            {/* Footer */}
            <Typography
              variant="caption"
              textAlign="center"
              display="block"
              mt={3}
              sx={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.75rem',
                fontWeight: 400,
              }}
            >
              © 2025 Software Engineering Institute. All rights reserved.
            </Typography>
          </motion.div>
        </Container>
      </Box>
    </Box>
  )
}

export default Login
