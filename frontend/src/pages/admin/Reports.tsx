import React, { useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
} from '@mui/material'
import { FileDownload, Assessment } from '@mui/icons-material'
import { motion } from 'framer-motion'
import { getAdminReports, getQuickExports } from '../../lib/api'

const AdminReports: React.FC = () => {
  const [reports, setReports] = useState<any[]>([])
  const [quickExports, setQuickExports] = useState<string[]>([])

  useEffect(() => {
    getAdminReports().then(setReports)
    getQuickExports().then(setQuickExports)
  }, [])

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" mb={1}>
        Reports & Analytics
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Generate and export platform analytics
      </Typography>

      {/* Quick Exports */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" mb={2}>
            📊 Quick Exports
          </Typography>
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(4, 1fr)' }} gap={2}>
            {quickExports.map((report, index) => (
              <Button
                key={index}
                variant="outlined"
                sx={{
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.3)',
                  '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
                }}
                startIcon={<FileDownload />}
              >
                {report}
              </Button>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Reports List */}
      <Box display="grid" gap={2}>
        {reports.map((report, index) => (
          <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box display="flex" alignItems="center" gap={2} flexGrow={1}>
                    <Box sx={{ width: 56, height: 56, bgcolor: '#e0e7ff', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Assessment sx={{ color: '#4f46e5', fontSize: 32 }} />
                    </Box>
                    <Box flexGrow={1}>
                      <Typography variant="h6" fontWeight="bold">{report.title}</Typography>
                      <Typography variant="body2" color="text.secondary" mb={1}>{report.description}</Typography>
                      <Typography variant="caption" color="text.secondary">Generated: {report.date}</Typography>
                    </Box>
                    <Chip label={report.type} size="small" sx={{ bgcolor: '#e0e7ff', color: '#3730a3' }} />
                  </Box>
                  <Box display="flex" gap={1}>
                    <Button variant="outlined" startIcon={<FileDownload />}>Export</Button>
                    <Button variant="outlined">View</Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </Box>
    </Box>
  )
}

export default AdminReports

