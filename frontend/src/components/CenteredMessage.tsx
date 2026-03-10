import React from 'react'
import {
  Dialog,
  DialogContent,
  Typography,
  Button,
  Box,
} from '@mui/material'
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline'
import ErrorOutline from '@mui/icons-material/ErrorOutline'

export interface CenteredMessageProps {
  open: boolean
  message: string
  severity: 'success' | 'error'
  onClose: () => void
  /** Auto-close after ms; 0 = no auto-close */
  autoHideDuration?: number
}

const CenteredMessage: React.FC<CenteredMessageProps> = ({
  open,
  message,
  severity,
  onClose,
  autoHideDuration = 0,
}) => {
  React.useEffect(() => {
    if (!open || autoHideDuration <= 0) return
    const t = setTimeout(onClose, autoHideDuration)
    return () => clearTimeout(t)
  }, [open, autoHideDuration, onClose])

  const isSuccess = severity === 'success'
  const Icon = isSuccess ? CheckCircleOutline : ErrorOutline
  const bgColor = isSuccess ? '#f0fdf4' : '#fef2f2'
  const iconColor = isSuccess ? '#15803d' : '#dc2626'
  const buttonColor = isSuccess ? '#15803d' : '#dc2626'

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: 0,
          minWidth: 320,
          maxWidth: 480,
          mx: 2,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          border: `1px solid ${isSuccess ? '#bbf7d0' : '#fecaca'}`,
        },
      }}
      slotProps={{
        backdrop: { sx: { backgroundColor: 'rgba(0,0,0,0.4)' } },
      }}
      sx={{
        '& .MuiDialog-container': {
          alignItems: 'center',
          justifyContent: 'center',
        },
      }}
    >
      <DialogContent
        sx={{
          pt: 4,
          pb: 3,
          px: 4,
          textAlign: 'center',
          backgroundColor: bgColor,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Icon sx={{ fontSize: 56, color: iconColor }} />
        </Box>
        <Typography
          variant="h6"
          component="p"
          sx={{
            fontWeight: 600,
            color: '#1f2937',
            fontSize: '1.15rem',
            lineHeight: 1.5,
          }}
        >
          {message}
        </Typography>
        <Button
          variant="contained"
          onClick={onClose}
          fullWidth
          sx={{
            mt: 3,
            py: 1.5,
            borderRadius: 1,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '1rem',
            backgroundColor: buttonColor,
            '&:hover': {
              backgroundColor: isSuccess ? '#166534' : '#b91c1c',
            },
          }}
        >
          OK
        </Button>
      </DialogContent>
    </Dialog>
  )
}

export default CenteredMessage
