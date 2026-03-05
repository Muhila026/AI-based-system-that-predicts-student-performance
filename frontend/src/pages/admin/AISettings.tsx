import React, { useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Slider,
  Button,
  Switch,
  FormControlLabel,
} from '@mui/material'
import { Save } from '@mui/icons-material'
import { getAISettings, saveAISettings } from '../../lib/api'

const AISettings: React.FC = () => {
  const [settings, setSettings] = useState({
    predictionThreshold: 75,
    riskThreshold: 60,
    recommendationStrength: 80,
    autoSuggest: true,
    realTimeAnalysis: true,
    weeklyReports: true,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { getAISettings().then(setSettings) }, [])

  const handleSave = async () => {
    setSaving(true)
    await saveAISettings(settings)
    setSaving(false)
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" mb={1}>
        AI Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Configure AI model parameters and thresholds
      </Typography>

      {/* Threshold Settings */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" mb={3}>
            Performance Thresholds
          </Typography>
          
          <Box mb={4}>
            <Typography variant="body2" gutterBottom>
              Prediction Confidence Threshold: {settings.predictionThreshold}%
            </Typography>
            <Slider
              value={settings.predictionThreshold}
              onChange={(_, value) => setSettings({ ...settings, predictionThreshold: value as number })}
              valueLabelDisplay="auto"
              min={0}
              max={100}
            />
            <Typography variant="caption" color="text.secondary">
              Minimum confidence level for AI predictions to be displayed
            </Typography>
          </Box>

          <Box mb={4}>
            <Typography variant="body2" gutterBottom>
              At-Risk Student Threshold: {settings.riskThreshold}%
            </Typography>
            <Slider
              value={settings.riskThreshold}
              onChange={(_, value) => setSettings({ ...settings, riskThreshold: value as number })}
              valueLabelDisplay="auto"
              min={0}
              max={100}
            />
            <Typography variant="caption" color="text.secondary">
              Score below which students are flagged as at-risk
            </Typography>
          </Box>

          <Box>
            <Typography variant="body2" gutterBottom>
              Recommendation Strength: {settings.recommendationStrength}%
            </Typography>
            <Slider
              value={settings.recommendationStrength}
              onChange={(_, value) => setSettings({ ...settings, recommendationStrength: value as number })}
              valueLabelDisplay="auto"
              min={0}
              max={100}
            />
            <Typography variant="caption" color="text.secondary">
              How aggressively the AI suggests study materials
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Feature Toggles */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" mb={3}>
            AI Features
          </Typography>
          <Box display="grid" gap={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.autoSuggest}
                  onChange={(e) => setSettings({ ...settings, autoSuggest: e.target.checked })}
                />
              }
              label="Auto-suggest study materials"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.realTimeAnalysis}
                  onChange={(e) => setSettings({ ...settings, realTimeAnalysis: e.target.checked })}
                />
              }
              label="Real-time performance analysis"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.weeklyReports}
                  onChange={(e) => setSettings({ ...settings, weeklyReports: e.target.checked })}
                />
              }
              label="Automated weekly reports"
            />
          </Box>
        </CardContent>
      </Card>

      <Button
        variant="contained"
        size="large"
        startIcon={<Save />}
        onClick={handleSave}
        disabled={saving}
        sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </Box>
  )
}

export default AISettings

