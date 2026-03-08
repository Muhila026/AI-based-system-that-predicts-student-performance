import React, { useState } from 'react'
import {
  Box,
  TextField,
  Button,
  Typography,
  InputAdornment,
  Alert,
  CircularProgress,
} from '@mui/material'
import { VpnKey, ArrowBack } from '@mui/icons-material'
import { verifyOtp, forgotPassword } from '../lib/api'

interface VerifyOtpProps {
  email: string
  onBack: () => void
  onSuccess: (email: string, resetToken: string) => void
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

const VerifyOtp: React.FC<VerifyOtpProps> = ({ email, onBack, onSuccess }) => {
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendSuccess, setResendSuccess] = useState('')

  const handleResendOtp = async () => {
    setError('')
    setResendSuccess('')
    try {
      setResendLoading(true)
      await forgotPassword(email)
      setResendSuccess('New OTP sent to your email. Please check your inbox.')
      setOtp('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmedOtp = otp.replace(/\D/g, '').slice(0, 4)
    if (trimmedOtp.length !== 4) {
      setError('Please enter the 4-digit OTP from your email')
      return
    }

    try {
      setLoading(true)
      const res = await verifyOtp(email, trimmedOtp)
      onSuccess(email, res.resetToken)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid or expired OTP. Please try again.')
      setResendSuccess('')
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
          Verify OTP
        </Typography>
        <Typography variant="body2" sx={{ color: '#666', mb: 3, textAlign: 'center' }}>
          Enter the 4-digit code sent to your email. After verification you can reset your password.
        </Typography>

        <form onSubmit={handleSubmit}>
          <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>Email: {email}</Typography>
          <Box sx={{ mb: 3 }}>
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

          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              onClose={() => setError('')}
              action={
                <Button color="inherit" size="small" onClick={handleResendOtp} disabled={resendLoading}>
                  {resendLoading ? <CircularProgress size={16} color="inherit" /> : 'Resend OTP'}
                </Button>
              }
            >
              {error}
            </Alert>
          )}

          {resendSuccess && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setResendSuccess('')}>
              {resendSuccess}
            </Alert>
          )}

          <Button type="submit" fullWidth variant="contained" disabled={loading} sx={authPageSx.buttonSx}>
            {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Verify OTP & Continue'}
          </Button>

          <Typography
            variant="body2"
            onClick={handleResendOtp}
            sx={{
              ...authPageSx.backLink,
              mt: 1.5,
              opacity: resendLoading ? 0.7 : 1,
            }}
          >
            Didn&apos;t receive the code? Resend OTP
          </Typography>
        </form>

        <Typography variant="body2" onClick={onBack} sx={authPageSx.backLink}>
          <ArrowBack fontSize="small" />
          Back to Forgot Password
        </Typography>
      </Box>
    </Box>
  )
}

export default VerifyOtp
