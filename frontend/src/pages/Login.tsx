import React, { useState, useEffect } from 'react'
import {
  Box,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material'
import {
  PersonOutline,
  LockOutlined,
  Error as ErrorIcon,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material'
import { login, checkBackendConnection } from '../lib/api'

interface LoginProps {
  onLogin: () => void
  onForgotPassword?: (email?: string) => void
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
      } catch {
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid email or password.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: 'url(/login-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
        fontFamily: "'Poppins', 'Inter', 'Segoe UI', Roboto, sans-serif",
        p: 2,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          zIndex: 1
        }}
      />

      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: 440,
          p: { xs: 4, sm: 6 },
          borderRadius: 2,
          backgroundColor: '#fff',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Box
            component="img"
            src="/logo.png"
            alt="Cloud Campus"
            sx={{ width: 104, height: 104, objectFit: 'contain', mb: 1.5 }}
          />
          <Typography variant="h6" sx={{ color: '#333', letterSpacing: 2, fontWeight: 500, fontSize: '1.25rem', fontFamily: "'Poppins', sans-serif" }}>
            Cloud Campus
          </Typography>
        </Box>

        {backendStatus.checking && (
          <Alert severity="info" icon={<CircularProgress size={18} color="inherit" />} sx={{ mb: 3 }}>
            Connecting to server...
          </Alert>
        )}
        {!backendStatus.checking && !backendStatus.connected && (
          <Alert severity="warning" icon={<ErrorIcon />} sx={{ mb: 3 }}>
            Server not reachable. Please check connection.
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleLogin}>
          <Box sx={{ mb: 4 }}>
            <TextField
              fullWidth
              variant="standard"
              placeholder="Username"
              type="text"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (error) setError('')
              }}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutline sx={{ color: '#666', mr: 1, mb: 0.5 }} />
                  </InputAdornment>
                ),
                sx: {
                  color: '#333',
                  fontSize: '1.05rem',
                  py: 0.5,
                  '&::before': {
                    borderBottom: '1px solid rgba(0, 0, 0, 0.2)',
                  },
                  '&:hover:not(.Mui-disabled, .Mui-error)::before': {
                    borderBottom: '1px solid rgba(0, 0, 0, 0.5)',
                  },
                  '&::after': {
                    borderBottom: '2px solid #333',
                  },
                }
              }}
              sx={{
                '& .MuiInputBase-input::placeholder': {
                  color: '#999',
                  opacity: 1,
                  fontWeight: 300
                },
              }}
            />
          </Box>

          <Box sx={{ mb: 5 }}>
            <TextField
              fullWidth
              variant="standard"
              placeholder="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (error) setError('')
              }}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlined sx={{ color: '#666', mr: 1, mb: 0.5 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((p) => !p)}
                      edge="end"
                      size="small"
                      sx={{ color: '#666' }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
                sx: {
                  color: '#333',
                  fontSize: '1.05rem',
                  py: 0.5,
                  '&::before': {
                    borderBottom: '1px solid rgba(0, 0, 0, 0.2)',
                  },
                  '&:hover:not(.Mui-disabled, .Mui-error)::before': {
                    borderBottom: '1px solid rgba(0, 0, 0, 0.5)',
                  },
                  '&::after': {
                    borderBottom: '2px solid #333',
                  },
                }
              }}
              sx={{
                '& .MuiInputBase-input::placeholder': {
                  color: '#999',
                  opacity: 1,
                  fontWeight: 300
                },
              }}
            />
          </Box>

          <Button
            fullWidth
            variant="contained"
            type="submit"
            disabled={loading || (!backendStatus.checking && !backendStatus.connected)}
            sx={{
              py: 1.8,
              mb: 3,
              backgroundColor: '#333',
              color: '#fff',
              fontWeight: 600,
              fontSize: '1rem',
              textTransform: 'none',
              borderRadius: 1,
              '&:hover': {
                backgroundColor: '#555',
              },
              '&.Mui-disabled': {
                backgroundColor: 'rgba(0, 0, 0, 0.26)',
              }
            }}
          >
            {loading ? (
              <CircularProgress size={24} sx={{ color: '#fff' }} />
            ) : (
              'LOGIN'
            )}
          </Button>

          {onForgotPassword && (
            <Typography
              variant="body2"
              onClick={() => onForgotPassword(email.trim())}
              sx={{
                color: '#666',
                cursor: 'pointer',
                textAlign: 'center',
                display: 'block',
                '&:hover': {
                  color: '#333',
                }
              }}
            >
              Forgot Password ?
            </Typography>
          )}
        </form>
      </Box>
    </Box>
  )
}

export default Login
