import React, { useState, useEffect, useRef } from 'react'
import {
    Box,
    Fab,
    Paper,
    Typography,
    IconButton,
    TextField,
    Avatar,
    CircularProgress,
} from '@mui/material'
import {
    Chat as ChatIcon,
    Close as CloseIcon,
    Send as SendIcon,
    SmartToy as BotIcon,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { chatWithAI } from '../lib/api'

interface Message {
    id: number
    text: string
    sender: 'user' | 'bot'
    timestamp: string
}

const FloatingChatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 1,
            text: "Hi there! I'm your AI assistant. How can I help you with your studies today?",
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<null | HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleSend = async () => {
        if (!input.trim()) return

        const userMessage: Message = {
            id: Date.now(),
            text: input,
            sender: 'user',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }

        setMessages((prev) => [...prev, userMessage])
        const currentInput = input
        setInput('')
        setIsLoading(true)

        try {
            const response = await chatWithAI(currentInput)

            const botResponse: Message = {
                id: Date.now() + 1,
                text: response.response,
                sender: 'bot',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }
            setMessages((prev) => [...prev, botResponse])
        } catch (error) {
            console.error("Error calling AI:", error)
            const botResponse: Message = {
                id: Date.now() + 1,
                text: "Sorry, I'm having trouble connecting to my brain right now. Please try again later!",
                sender: 'bot',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }
            setMessages((prev) => [...prev, botResponse])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Box sx={{ position: 'fixed', bottom: 30, right: 30, zIndex: 1000 }}>
            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 100 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 100 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    >
                        <Paper
                            elevation={6}
                            sx={{
                                width: { xs: '90vw', sm: 350 },
                                height: 500,
                                display: 'flex',
                                flexDirection: 'column',
                                borderRadius: 4,
                                overflow: 'hidden',
                                mb: 2,
                                border: '1px solid rgba(0,0,0,0.1)',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                            }}
                        >
                            {/* Header */}
                            <Box
                                sx={{
                                    p: 2,
                                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <Box display="flex" alignItems="center" gap={1.5}>
                                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 32, height: 32 }}>
                                        <BotIcon fontSize="small" />
                                    </Avatar>
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight="bold" lineHeight={1}>
                                            AI Assistant
                                        </Typography>
                                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                            Online
                                        </Typography>
                                    </Box>
                                </Box>
                                <IconButton size="small" onClick={() => setIsOpen(false)} sx={{ color: 'white' }}>
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                            </Box>

                            {/* Messages Area */}
                            <Box
                                sx={{
                                    flexGrow: 1,
                                    p: 2,
                                    overflowY: 'auto',
                                    bgcolor: '#f8fafc',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 1.5,
                                }}
                            >
                                {messages.map((msg) => (
                                    <Box
                                        key={msg.id}
                                        sx={{
                                            alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                                            maxWidth: '85%',
                                        }}
                                    >
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 1.5,
                                                borderRadius: msg.sender === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                                                bgcolor: msg.sender === 'user' ? '#6366f1' : 'white',
                                                color: msg.sender === 'user' ? 'white' : 'inherit',
                                                border: msg.sender === 'user' ? 'none' : '1px solid #e2e8f0',
                                            }}
                                        >
                                            <Typography variant="body2">{msg.text}</Typography>
                                        </Paper>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                display: 'block',
                                                mt: 0.5,
                                                textAlign: msg.sender === 'user' ? 'right' : 'left',
                                                color: 'text.secondary',
                                                fontSize: '0.65rem',
                                            }}
                                        >
                                            {msg.timestamp}
                                        </Typography>
                                    </Box>
                                ))}
                                {isLoading && (
                                    <Box sx={{ alignSelf: 'flex-start' }}>
                                        <CircularProgress size={20} thickness={5} sx={{ color: '#6366f1' }} />
                                    </Box>
                                )}
                                <div ref={messagesEndRef} />
                            </Box>

                            {/* Input Area */}
                            <Box sx={{ p: 2, bgcolor: 'white', borderTop: '1px solid #e2e8f0' }}>
                                <Box display="flex" gap={1}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        placeholder="Ask me anything..."
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyPress={(e: any) => e.key === 'Enter' && handleSend()}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 3,
                                                bgcolor: '#f1f5f9',
                                                '& fieldset': { border: 'none' },
                                            },
                                        }}
                                    />
                                    <IconButton
                                        onClick={handleSend}
                                        disabled={!input.trim() || isLoading}
                                        sx={{
                                            bgcolor: '#6366f1',
                                            color: 'white',
                                            '&:hover': { bgcolor: '#4f46e5' },
                                            '&.Mui-disabled': { bgcolor: '#e2e8f0', color: '#94a3b8' },
                                        }}
                                    >
                                        <SendIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                            </Box>
                        </Paper>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Button */}
            <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
            >
                <Fab
                    color="primary"
                    aria-label="chat"
                    onClick={() => setIsOpen(!isOpen)}
                    sx={{
                        width: 56,
                        height: 56,
                        bgcolor: '#6366f1',
                        boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.39)',
                        '&:hover': {
                            bgcolor: '#4f46e5',
                        },
                    }}
                >
                    {isOpen ? <CloseIcon /> : <ChatIcon />}
                </Fab>
            </motion.div>
        </Box>
    )
}

export default FloatingChatbot
