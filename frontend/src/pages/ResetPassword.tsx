import React, { useState, useEffect } from 'react'
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material'
import { Lock, Visibility, VisibilityOff, ArrowBack, VpnKey } from '@mui/icons-material'
import { resetPassword } from '../lib/api'

interface ResetPasswordProps {
  email: string
  resetToken?: string | null
  onBack: () => void
  onSuccess: () => void
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

const ResetPassword: React.FC<ResetPasswordProps> = ({ email: initialEmail, resetToken, onBack, onSuccess }) => {
  const [email, setEmail] = useState(initialEmail)
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const useToken = Boolean(resetToken)

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail)
  }, [initialEmail])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!email) {
      setError('Email is required')
      return
    }
    if (!useToken && (!otp || otp.length !== 4)) {
      setError('Please enter a valid 4-digit OTP code')
      return
    }
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    try {
      setLoading(true)
      await resetPassword(
        email,
        newPassword,
        useToken ? { resetToken: resetToken! } : { otpCode: otp }
      )
      setSuccess(true)
      setTimeout(() => onSuccess(), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset password. Please try again.')
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

        <Typography variant="h5" sx={{ color: '#333', fontWeight: 300, mb: 0.5, letterSpacing: 1, textAlign: 'center' }}>
          Reset Password
        </Typography>
        <Typography variant="body2" sx={{ color: '#666', mb: 3, textAlign: 'center' }}>
          {useToken ? 'OTP verified. Enter your new password below.' : 'Enter your OTP code and new password'}
        </Typography>

        {success ? (
          <Alert severity="success">
            Password reset successfully! You can now log in with your new password. Redirecting to login...
          </Alert>
        ) : (
          <form onSubmit={handleSubmit}>
            {useToken && (
              <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>Email: {email}</Typography>
            )}
            {!useToken && (
              <>
                <Box sx={{ mb: 2 }}>
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
                          <VpnKey sx={{ color: '#666', mr: 1, mb: 0.5 }} />
                        </InputAdornment>
                      ),
                      sx: authPageSx.inputSx,
                    }}
                    sx={{ '& .MuiInputBase-input::placeholder': authPageSx.placeholderSx }}
                  />
                </Box>
                <Box sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    variant="standard"
                    label="OTP Code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="Enter 4-digit OTP"
                    required
                    disabled={loading}
                    inputProps={{ maxLength: 4 }}
                    helperText="Enter the 4-digit code sent to your email"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <VpnKey sx={{ color: '#666', mr: 1, mb: 0.5 }} />
                        </InputAdornment>
                      ),
                      sx: authPageSx.inputSx,
                    }}
                    sx={{ '& .MuiInputBase-input::placeholder': authPageSx.placeholderSx }}
                  />
                </Box>
              </>
            )}

            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                variant="standard"
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                required
                disabled={loading}
                helperText="Password must be at least 6 characters"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: '#666', mr: 1, mb: 0.5 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                        sx={{ color: '#666' }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: authPageSx.inputSx,
                }}
                sx={{ '& .MuiInputBase-input::placeholder': authPageSx.placeholderSx }}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                variant="standard"
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: '#666', mr: 1, mb: 0.5 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                        size="small"
                        sx={{ color: '#666' }}
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
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
              {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Reset Password'}
            </Button>
          </form>
        )}

        {!success && (
          <Typography variant="body2" onClick={onBack} sx={authPageSx.backLink}>
            <ArrowBack fontSize="small" />
            {useToken ? 'Back to Verify OTP' : 'Back to Login'}
          </Typography>
        )}
      </Box>
    </Box>
  )
}

export default ResetPassword
