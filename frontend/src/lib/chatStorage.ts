/**
 * Chat Storage Utility
 * Stores chat conversations and messages in localStorage for frontend-only functionality
 */

export type ChatMessage = {
  id: string
  senderId: string
  senderName: string
  senderRole: 'teacher' | 'student' | 'admin'
  message: string
  timestamp: string
  read: boolean
}

export type ChatConversation = {
  id: string
  participantId: string
  participantName: string
  participantRole: 'student' | 'admin' | 'teacher'
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  avatar?: string
}

const STORAGE_KEY_CONVERSATIONS = 'chat_conversations'
const STORAGE_KEY_MESSAGES = 'chat_messages'

function initializeDefaultConversations(userRole: string): ChatConversation[] {
  if (userRole === 'teacher') {
    return [
      {
        id: 'conv-1',
        participantId: 'STD-001',
        participantName: 'John Doe',
        participantRole: 'student',
        lastMessage: 'Thank you for the clarification!',
        lastMessageTime: new Date().toISOString(),
        unreadCount: 2,
      },
      {
        id: 'conv-2',
        participantId: 'STD-002',
        participantName: 'Jane Smith',
        participantRole: 'student',
        lastMessage: 'Can we schedule a meeting?',
        lastMessageTime: new Date(Date.now() - 3600000).toISOString(),
        unreadCount: 0,
      },
      {
        id: 'conv-3',
        participantId: 'ADM-001',
        participantName: 'Management',
        participantRole: 'admin',
        lastMessage: 'Please review the new curriculum',
        lastMessageTime: new Date(Date.now() - 7200000).toISOString(),
        unreadCount: 1,
      },
      {
        id: 'conv-4',
        participantId: 'STD-003',
        participantName: 'Mike Johnson',
        participantRole: 'student',
        lastMessage: 'I have a question about Assignment 3',
        lastMessageTime: new Date(Date.now() - 86400000).toISOString(),
        unreadCount: 0,
      },
    ]
  } else if (userRole === 'admin') {
    return [
      {
        id: 'conv-1',
        participantId: 'TCH-001',
        participantName: 'Dr. Emily Johnson',
        participantRole: 'teacher',
        lastMessage: 'We need to discuss the curriculum changes',
        lastMessageTime: new Date().toISOString(),
        unreadCount: 1,
      },
      {
        id: 'conv-2',
        participantId: 'TCH-002',
        participantName: 'Prof. Michael Chen',
        participantRole: 'teacher',
        lastMessage: 'Thank you for the approval!',
        lastMessageTime: new Date(Date.now() - 3600000).toISOString(),
        unreadCount: 0,
      },
      {
        id: 'conv-3',
        participantId: 'TCH-003',
        participantName: 'Dr. Sarah Williams',
        participantRole: 'teacher',
        lastMessage: 'Can we schedule a meeting?',
        lastMessageTime: new Date(Date.now() - 7200000).toISOString(),
        unreadCount: 0,
      },
    ]
  }
  return []
}

function initializeDefaultMessages(conversationId: string, participantRole: string): ChatMessage[] {
  const isTeacher = participantRole === 'student' || participantRole === 'admin'
  const isAdmin = participantRole === 'teacher'
  
  if (isTeacher) {
    return [
      {
        id: 'msg-1',
        senderId: conversationId.includes('STD') ? 'STD-001' : 'ADM-001',
        senderName: conversationId.includes('STD') ? 'John Doe' : 'Management',
        senderRole: conversationId.includes('STD') ? 'student' : 'admin',
        message: conversationId.includes('STD') 
          ? 'Hello, I need help with my assignment.'
          : 'We need to discuss the upcoming semester schedule.',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        read: true,
      },
      {
        id: 'msg-2',
        senderId: 'teacher-1',
        senderName: 'You',
        senderRole: 'teacher',
        message: 'I will get back to you on that.',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        read: true,
      },
      {
        id: 'msg-3',
        senderId: conversationId.includes('STD') ? 'STD-001' : 'ADM-001',
        senderName: conversationId.includes('STD') ? 'John Doe' : 'Management',
        senderRole: conversationId.includes('STD') ? 'student' : 'admin',
        message: conversationId.includes('STD')
          ? 'Thank you for the clarification!'
          : 'Please review the new curriculum',
        timestamp: new Date().toISOString(),
        read: false,
      },
    ]
  } else if (isAdmin) {
    return [
      {
        id: 'msg-1',
        senderId: 'TCH-001',
        senderName: 'Dr. Emily Johnson',
        senderRole: 'teacher',
        message: 'Hello, I wanted to discuss some important matters.',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        read: true,
      },
      {
        id: 'msg-2',
        senderId: 'admin-1',
        senderName: 'You',
        senderRole: 'admin',
        message: 'I will review and get back to you.',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        read: true,
      },
      {
        id: 'msg-3',
        senderId: 'TCH-001',
        senderName: 'Dr. Emily Johnson',
        senderRole: 'teacher',
        message: 'We need to discuss the curriculum changes',
        timestamp: new Date().toISOString(),
        read: false,
      },
    ]
  }
  return []
}

function getCurrentUserRole(): string {
  let userStr = localStorage.getItem('user')
  if (!userStr) userStr = sessionStorage.getItem('user')
  if (userStr) {
    try {
      const user = JSON.parse(userStr)
      const r = user.role || 'student'
      return typeof r === 'string' ? r.toLowerCase() : 'student'
    } catch {
      return 'student'
    }
  }
  return 'student'
}

export function getConversations(): ChatConversation[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CONVERSATIONS)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (err) {
    console.error('Error reading conversations from storage:', err)
  }

  const userRole = getCurrentUserRole()
  const defaultConvs = initializeDefaultConversations(userRole)
  saveConversations(defaultConvs)
  return defaultConvs
}

export function saveConversations(conversations: ChatConversation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CONVERSATIONS, JSON.stringify(conversations))
  } catch (err) {
    console.error('Error saving conversations to storage:', err)
  }
}

export function getMessages(conversationId: string): ChatMessage[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_MESSAGES)
    if (stored) {
      const allMessages: Record<string, ChatMessage[]> = JSON.parse(stored)
      if (allMessages[conversationId]) {
        return allMessages[conversationId]
      }
    }
  } catch (err) {
    console.error('Error reading messages from storage:', err)
  }

  const conversations = getConversations()
  const conversation = conversations.find((c) => c.id === conversationId)
  if (conversation) {
    const defaultMsgs = initializeDefaultMessages(conversationId, conversation.participantRole)
    saveMessages(conversationId, defaultMsgs)
    return defaultMsgs
  }
  return []
}

export function saveMessages(conversationId: string, messages: ChatMessage[]): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_MESSAGES)
    const allMessages: Record<string, ChatMessage[]> = stored ? JSON.parse(stored) : {}
    allMessages[conversationId] = messages
    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(allMessages))
  } catch (err) {
    console.error('Error saving messages to storage:', err)
  }
}

export function addMessage(conversationId: string, message: ChatMessage): void {
  const messages = getMessages(conversationId)
  messages.  push(message)
  saveMessages(conversationId, messages)

  const conversations = getConversations()
  const updated = conversations.map((conv) => {
    if (conv.id === conversationId) {
      return {
        ...conv,
        lastMessage: message.message,
        lastMessageTime: message.timestamp,
        unreadCount: message.senderRole === 'teacher' || message.senderRole === 'admin' ? conv.unreadCount : conv.unreadCount + 1,
      }
    }
    return conv
  })
  saveConversations(updated)
}

export function markMessagesAsRead(conversationId: string): void {
  const messages = getMessages(conversationId)
  const updated = messages.map((msg) => ({ ...msg, read: true }))
  saveMessages(conversationId, updated)

  const conversations = getConversations()
  const updatedConvs = conversations.map((conv) => {
    if (conv.id === conversationId) {
      return { ...conv, unreadCount: 0 }
    }
    return conv
  })
  saveConversations(updatedConvs)
}

export function getCurrentUser(): { id: string; name: string; role: string } {
  let userStr = localStorage.getItem('user')
  if (!userStr) userStr = sessionStorage.getItem('user')
  if (userStr) {
    try {
      const user = JSON.parse(userStr)
      const roleRaw = user.role || 'student'
      const role = typeof roleRaw === 'string' ? roleRaw.toLowerCase() : 'student'
      return {
        id: user.id ?? (role === 'teacher' ? 'teacher-1' : role === 'admin' ? 'admin-1' : 'student-1'),
        name: user.name || 'User',
        role,
      }
    } catch {
    }
  }
  return { id: 'user-1', name: 'User', role: 'student' }
}

