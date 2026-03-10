import React, { useEffect, useState } from 'react'
import { Box, Typography } from '@mui/material'
import { AccessTime } from '@mui/icons-material'

/**
 * Live date & time that updates every second. Use on dashboard and prediction pages.
 */
const RunningTime: React.FC<{ sx?: object }> = ({ sx }) => {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const dateStr = now.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
  const timeStr = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        ...sx,
      }}
    >
      <AccessTime sx={{ fontSize: 18, color: 'inherit', opacity: 0.85 }} />
      <Box>
        <Typography variant="body2" sx={{ lineHeight: 1.2, fontWeight: 600 }}>
          {timeStr}
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.85 }}>
          {dateStr}
        </Typography>
      </Box>
    </Box>
  )
}

export default RunningTime
