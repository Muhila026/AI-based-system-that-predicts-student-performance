import React, { useState } from 'react'
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
} from '@mui/material'
import { Email, ArrowBack } from '@mui/icons-material'
import { motion } from 'framer-motion'
import { forgotPassword } from '../lib/api'
interface ForgotPasswordProps {
  onBack: () => void
  onSuccess: (email: string) => void
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack, onSuccess }) => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
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
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email. Please try again.')
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
                Forgot Password?
              </Typography>
              <Typography variant="body2" color="rgba(255,255,255,0.9)" sx={{ mt: 1 }}>
                Enter your email to receive a password reset code
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
                      Password reset OTP sent!
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Please check your email for the 4-digit OTP code. The code will expire in 10 minutes.
                    </Typography>
                  </Alert>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => onSuccess(email)}
                    sx={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      py: 1.5,
                      mt: 2,
                    }}
                  >
                    Continue to Reset Password
                  </Button>
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
                    sx={{ mb: 3 }}
                    InputProps={{
                      startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />,
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
                      'Send Reset Code'
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
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  <ArrowBack fontSize="small" />
                  Back to Login
                </Link>
              </Box>
            </CardContent>
          </Card>
        </motion.div>
      </Box>
    </Container>
  )
}

export default ForgotPassword

