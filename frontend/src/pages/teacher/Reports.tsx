import React from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
} from '@mui/material'
import { PictureAsPdf, FileDownload } from '@mui/icons-material'
import { motion } from 'framer-motion'

const TeacherReports: React.FC = () => {
  const reports = [
    {
      title: 'Class Performance Report - Math A',
      description: 'Comprehensive analysis of student performance in Mathematics A',
      date: '2025-10-28',
      type: 'Performance',
    },
    {
      title: 'Attendance Summary - All Classes',
      description: 'Monthly attendance report for all enrolled classes',
      date: '2025-10-25',
      type: 'Attendance',
    },
    {
      title: 'Assignment Completion Report',
      description: 'Detailed report on assignment submissions and grades',
      date: '2025-10-20',
      type: 'Assignments',
    },
    {
      title: 'At-Risk Students Analysis',
      description: 'Identification and analysis of students needing additional support',
      date: '2025-10-15',
      type: 'Analytics',
    },
  ]

  const quickReports = [
    { title: 'Student Performance by Class', classes: 4 },
    { title: 'Assignment Statistics', classes: 4 },
    { title: 'Attendance Overview', classes: 4 },
    { title: 'Grade Distribution', classes: 4 },
  ]

  const handleExportPDF = (reportTitle: string) => {
    // PDF export logic
    console.log('Exporting:', reportTitle)
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" mb={1}>
        Reports & Analytics
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Generate and export comprehensive performance reports
      </Typography>

      {/* Quick Report Generators */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" mb={2}>
            📊 Quick Report Generators
          </Typography>
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={2}>
            {quickReports.map((report, index) => (
              <Box
                key={index}
                sx={{
                  p: 2,
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: 2,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.2)' },
                }}
              >
                <Typography variant="body2" fontWeight="bold" mb={0.5}>
                  {report.title}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  {report.classes} classes
                </Typography>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Recent Reports */}
      <Typography variant="h6" fontWeight="bold" mb={2}>
        Recent Reports
      </Typography>
      <Box display="grid" gap={2}>
        {reports.map((report, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box display="flex" alignItems="center" gap={2} flexGrow={1}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        bgcolor: '#fee2e2',
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <PictureAsPdf sx={{ color: '#ef4444', fontSize: 32 }} />
                    </Box>
                    <Box flexGrow={1}>
                      <Typography variant="h6" fontWeight="bold" mb={0.5}>
                        {report.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" mb={1}>
                        {report.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Generated on: {report.date}
                      </Typography>
                    </Box>
                    <Chip
                      label={report.type}
                      size="small"
                      sx={{ bgcolor: '#e0e7ff', color: '#3730a3' }}
                    />
                  </Box>
                  <Box display="flex" gap={1}>
                    <Button
                      variant="outlined"
                      startIcon={<FileDownload />}
                      onClick={() => handleExportPDF(report.title)}
                    >
                      Download PDF
                    </Button>
                    <Button variant="outlined">View</Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </Box>

      {/* Custom Report Builder */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" mb={2}>
            🛠️ Custom Report Builder
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Create custom reports with specific metrics and date ranges
          </Typography>
          <Button
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            Build Custom Report
          </Button>
        </CardContent>
      </Card>
    </Box>
  )
}

export default TeacherReports

