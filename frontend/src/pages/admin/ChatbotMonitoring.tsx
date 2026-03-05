import React, { useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  InputAdornment,
} from '@mui/material'
import { Search, Flag } from '@mui/icons-material'
import { getChatbotLogs } from '../../lib/api'

const ChatbotMonitoring: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([])
  useEffect(() => { getChatbotLogs().then(setLogs) }, [])

  const stats = [
    { label: 'Total Interactions', value: '15,234' },
    { label: 'Today', value: '423' },
    { label: 'Flagged Messages', value: '12' },
    { label: 'Avg Response Time', value: '1.2s' },
  ]

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" mb={1}>
        Chatbot Monitoring
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        View conversation logs and flagged messages
      </Typography>

      {/* Stats */}
      <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(4, 1fr)' }} gap={2} mb={3}>
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent>
              <Typography variant="h5" fontWeight="bold">{stat.value}</Typography>
              <Typography variant="body2" color="text.secondary">{stat.label}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            placeholder="Search conversations..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" mb={2}>
            Recent Conversations
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>User</strong></TableCell>
                  <TableCell><strong>Message</strong></TableCell>
                  <TableCell><strong>AI Response</strong></TableCell>
                  <TableCell><strong>Timestamp</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} sx={{ '&:hover': { bgcolor: '#f9fafb' } }}>
                    <TableCell>{log.user}</TableCell>
                    <TableCell>{log.message}</TableCell>
                    <TableCell>{log.response}</TableCell>
                    <TableCell>{log.timestamp}</TableCell>
                    <TableCell>
                      {log.flagged ? (
                        <Chip icon={<Flag />} label="Flagged" color="error" size="small" />
                      ) : (
                        <Chip label="Normal" size="small" sx={{ bgcolor: '#dcfce7', color: '#15803d' }} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  )
}

export default ChatbotMonitoring

