import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material'

const AdminAnalysis: React.FC = () => {
  const [analysisType, setAnalysisType] = useState('performance')
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    // TODO: Fetch analysis data from API based on analysisType
    setData([])
  }, [analysisType])

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          System Analysis
        </Typography>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Analysis Type</InputLabel>
          <Select
            value={analysisType}
            onChange={(e) => setAnalysisType(e.target.value)}
            label="Analysis Type"
          >
            <MenuItem value="performance">Performance Analysis</MenuItem>
            <MenuItem value="attendance">Attendance Analysis</MenuItem>
            <MenuItem value="engagement">Engagement Analysis</MenuItem>
            <MenuItem value="course">Course Analysis</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>
                {analysisType.charAt(0).toUpperCase() + analysisType.slice(1)} Overview
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
                {data.length > 0 ? (
                  <Typography>Chart visualization will be implemented here</Typography>
                ) : (
                  <Typography color="textSecondary">No data available</Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

export default AdminAnalysis

