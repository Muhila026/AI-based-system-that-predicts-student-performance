import { useEffect, useRef, useCallback } from 'react'
import { getChatWebSocketUrl } from '../lib/api'
import type { ChatMessage } from '../lib/api'

export type NewMessagePayload = {
  chatId: string
  message: ChatMessage
}

/**
 * Single app WebSocket: connects with JWT and forwards every server message to onMessage.
 * Used for chat (new_message), study resources (study_resource_pending, study_resource_status), etc.
 */
export function useAppWebSocket(onMessage: (data: Record<string, unknown>) => void) {
  const onMessageRef = useRef(onMessage)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  onMessageRef.current = onMessage

  const connect = useCallback(() => {
    const url = getChatWebSocketUrl()
    if (!url) return

    if (wsRef.current?.readyState === WebSocket.OPEN) return
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as Record<string, unknown>
        if (data && typeof data === 'object') {
          onMessageRef.current(data)
        }
      } catch {
        // ignore parse errors
      }
    }

    ws.onclose = () => {
      wsRef.current = null
      reconnectTimeoutRef.current = setTimeout(() => connect(), 3000)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])
}

/**
 * Real-time chat: connects and calls onNewMessage when server pushes new_message.
 */
export function useChatWebSocket(onNewMessage: (payload: NewMessagePayload) => void) {
  useAppWebSocket((data) => {
    if (data?.type === 'new_message' && data.chatId && data.message) {
      onNewMessage({
        chatId: data.chatId as string,
        message: data.message as ChatMessage,
      })
    }
  })
}
