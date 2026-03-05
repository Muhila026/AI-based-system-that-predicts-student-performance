import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Container,
  Alert,
  CircularProgress,
  Link,
  InputAdornment,
  IconButton,
} from '@mui/material'
import { Lock, Visibility, VisibilityOff, ArrowBack, VpnKey } from '@mui/icons-material'
import { motion } from 'framer-motion'
import { resetPassword } from '../lib/api'
interface ResetPasswordProps {
  email: string
  onBack: () => void
  onSuccess: () => void
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ email: initialEmail, onBack, onSuccess }) => {
  const [email, setEmail] = useState(initialEmail)
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail)
    }
  }, [initialEmail])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    // Validation
    if (!email) {
      setError('Email is required')
      return
    }

    if (!otp || otp.length !== 4) {
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
      await resetPassword(email, newPassword, { otpCode: otp })
      setSuccess(true)
      // Redirect to login after 3 seconds
      setTimeout(() => {
        onSuccess()
      }, 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please check your OTP and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card
            sx={{
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                p: 3,
                textAlign: 'center',
              }}
            >
              <Typography variant="h4" fontWeight="bold" color="white">
                Reset Password
              </Typography>
              <Typography variant="body2" color="rgba(255,255,255,0.9)" sx={{ mt: 1 }}>
                Enter your OTP code and new password
              </Typography>
            </Box>

            <CardContent sx={{ p: 4 }}>
              {success ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Alert severity="success" sx={{ mb: 3 }}>
                    <Typography variant="body1" fontWeight="bold">
                      Password reset successfully!
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      You can now log in with your new password. Redirecting to login page...
                    </Typography>
                  </Alert>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    disabled={loading}
                    sx={{ mb: 2 }}
                    InputProps={{
                      startAdornment: <VpnKey sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                  />

                  <TextField
                    fullWidth
                    label="OTP Code"
                    value={otp}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                      setOtp(value)
                    }}
                    placeholder="Enter 4-digit OTP"
                    required
                    disabled={loading}
                    inputProps={{ maxLength: 4 }}
                    sx={{ mb: 2 }}
                    helperText="Enter the 4-digit code sent to your email"
                    InputProps={{
                      startAdornment: <VpnKey sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                  />

                  <TextField
                    fullWidth
                    label="New Password"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    disabled={loading}
                    sx={{ mb: 2 }}
                    helperText="Password must be at least 6 characters"
                    InputProps={{
                      startAdornment: <Lock sx={{ mr: 1, color: 'text.secondary' }} />,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    fullWidth
                    label="Confirm Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    disabled={loading}
                    sx={{ mb: 3 }}
                    InputProps={{
                      startAdornment: <Lock sx={{ mr: 1, color: 'text.secondary' }} />,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            edge="end"
                          >
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {error}
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={loading}
                    sx={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      py: 1.5,
                      mb: 2,
                    }}
                  >
                    {loading ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      'Reset Password'
                    )}
                  </Button>
                </form>
              )}

              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Link
                  component="button"
                  variant="body2"
                  onClick={onBack}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.5,
                    textDecoration: 'none',
                    color: 'primary.main',
                    mr: 2,
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  Resend OTP
                </Link>
                <Link
                  component="button"
                  variant="body2"
                  onClick={onBack}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.5,
                    textDecoration: 'none',
                    color: 'primary.main',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  <ArrowBack fontSize="small" />
                  Back
                </Link>
              </Box>
            </CardContent>
          </Card>
        </motion.div>
      </Box>
    </Container>
  )
}

export default ResetPassword

