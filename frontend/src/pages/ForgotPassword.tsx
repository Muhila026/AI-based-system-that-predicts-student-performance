import React, { useState, useEffect } from 'react'
import {
  Box,
  TextField,
  Button,
  Typography,
  InputAdornment,
  Alert,
  CircularProgress,
} from '@mui/material'
import { Email, ArrowBack } from '@mui/icons-material'
import { forgotPassword } from '../lib/api'

interface ForgotPasswordProps {
  initialEmail?: string
  onBack: () => void
  onSuccess: (email: string) => void
}

const authPageSx = {
  outer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundImage: 'url(/login-bg.png)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    position: 'relative' as const,
    fontFamily: "'Poppins', 'Inter', 'Segoe UI', Roboto, sans-serif",
    p: 2,
  },
  overlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 1,
  },
  formCard: {
    position: 'relative' as const,
    zIndex: 2,
    width: '100%',
    maxWidth: 440,
    p: { xs: 4, sm: 6 },
    borderRadius: 2,
    backgroundColor: '#fff',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
  },
  logoBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    mb: 3,
  },
  logoImg: { width: 104, height: 104, objectFit: 'contain' as const, mb: 1.5 },
  inputSx: {
    color: '#333',
    fontSize: '1.05rem',
    py: 0.5,
    '&::before': { borderBottom: '1px solid rgba(0, 0, 0, 0.2)' },
    '&:hover:not(.Mui-disabled, .Mui-error)::before': { borderBottom: '1px solid rgba(0, 0, 0, 0.5)' },
    '&::after': { borderBottom: '2px solid #333' },
  },
  placeholderSx: { color: '#999', opacity: 1, fontWeight: 300 },
  buttonSx: {
    py: 1.8,
    mb: 2,
    backgroundColor: '#333',
    color: '#fff',
    fontWeight: 600,
    fontSize: '1rem',
    textTransform: 'none' as const,
    borderRadius: 1,
    '&:hover': { backgroundColor: '#555' },
    '&.Mui-disabled': { backgroundColor: 'rgba(0, 0, 0, 0.26)' },
  },
  backLink: {
    color: '#666',
    cursor: 'pointer',
    textAlign: 'center' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0.5,
    '&:hover': { color: '#333' },
  },
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ initialEmail = '', onBack, onSuccess }) => {
  const [email, setEmail] = useState(initialEmail)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setEmail(initialEmail)
  }, [initialEmail])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!email) {
      setError('Please enter your email address')
      return
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    try {
      setLoading(true)
      await forgotPassword(email)
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send password reset email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={authPageSx.outer}>
      <Box sx={authPageSx.overlay} />

      <Box sx={authPageSx.formCard}>
        <Box sx={authPageSx.logoBox}>
          <Box component="img" src="/logo.png" alt="Cloud Campus" sx={authPageSx.logoImg} />
          <Typography variant="h6" sx={{ color: '#333', letterSpacing: 2, fontWeight: 500, fontSize: '1.25rem', fontFamily: "'Poppins', sans-serif" }}>
            Cloud Campus
          </Typography>
        </Box>

        <Typography variant="h5" sx={{ color: '#333', fontWeight: 300, mb: 2, letterSpacing: 1, textAlign: 'center' }}>
          Forgot Password?
        </Typography>
        <Typography variant="body2" sx={{ color: '#666', mb: 3, textAlign: 'center' }}>
          Enter your email to receive a password reset code
        </Typography>

        {success ? (
          <>
            <Alert severity="success" sx={{ mb: 3 }}>
              Password reset OTP sent! Please check your email for the 4-digit OTP code. The code will expire in 10 minutes.
            </Alert>
            <Button
              fullWidth
              variant="contained"
              onClick={() => onSuccess(email)}
              sx={authPageSx.buttonSx}
            >
              Continue to Verify OTP
            </Button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                variant="standard"
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email sx={{ color: '#666', mr: 1, mb: 0.5 }} />
                    </InputAdornment>
                  ),
                  sx: authPageSx.inputSx,
                }}
                sx={{ '& .MuiInputBase-input::placeholder': authPageSx.placeholderSx }}
              />
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            <Button type="submit" fullWidth variant="contained" disabled={loading} sx={authPageSx.buttonSx}>
              {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Send Reset Code'}
            </Button>
          </form>
        )}

        <Typography variant="body2" onClick={onBack} sx={authPageSx.backLink}>
          <ArrowBack fontSize="small" />
          Back to Login
        </Typography>
      </Box>
    </Box>
  )
}

export default ForgotPassword
