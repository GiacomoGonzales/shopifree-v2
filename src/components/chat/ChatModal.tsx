import { useState, useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '../../hooks/useAuth'
import { chatService, type ChatMessage } from '../../lib/chatService'

interface ChatModalProps {
  open: boolean
  onClose: () => void
}

export default function ChatModal({ open, onClose }: ChatModalProps) {
  const { firebaseUser, store } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [aiTyping, setAiTyping] = useState(false)
  const [chatId, setChatId] = useState<string | null>(null)
  const [chatClosed, setChatClosed] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize chat and subscribe to messages + chat status
  useEffect(() => {
    if (!open || !store || !firebaseUser) return

    let unsubMessages: (() => void) | null = null
    let unsubChat: (() => void) | null = null

    const init = async () => {
      const chat = await chatService.getOrCreateChat(
        store.id,
        store.name,
        firebaseUser.uid,
        firebaseUser.email || ''
      )
      setChatId(chat.id)
      setChatClosed(chat.status === 'closed')

      // Mark as read when opening
      if (chat.status === 'active') {
        chatService.markAsRead(chat.id, 'user')
      }

      // Subscribe to chat status changes
      unsubChat = chatService.subscribeToChat(chat.id, (updatedChat) => {
        if (updatedChat && updatedChat.status === 'closed') {
          setChatClosed(true)
        }
      })

      // Subscribe to messages
      unsubMessages = chatService.subscribeToMessages(chat.id, (msgs) => {
        setMessages(msgs)
      })
    }

    init()

    return () => {
      if (unsubMessages) unsubMessages()
      if (unsubChat) unsubChat()
    }
  }, [open, store, firebaseUser])

  // Scroll to bottom on new messages or typing indicator
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, aiTyping])

  // Mark as read when receiving new messages while chat is open
  useEffect(() => {
    if (open && chatId && messages.length > 0) {
      const lastMsg = messages[messages.length - 1]
      if (lastMsg.senderType === 'admin' || lastMsg.senderType === 'assistant') {
        chatService.markAsRead(chatId, 'user')
      }
    }
  }, [open, chatId, messages])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [open])

  const handleNewChat = () => {
    setChatId(null)
    setMessages([])
    setChatClosed(false)
  }

  const isNative = Capacitor.isNativePlatform()
  const quickQuestions = [
    ...(!isNative ? [{ icon: '📋', label: 'Conocer los planes', message: 'Hola, me gustaría conocer más sobre los planes disponibles en Shopifree.' }] : []),
    { icon: '🌐', label: 'Conectar dominio personalizado', message: 'Hola, necesito ayuda para conectar mi dominio personalizado a mi tienda.' },
    { icon: '💳', label: 'Configurar pasarela de pago', message: 'Hola, quisiera ayuda para configurar mi pasarela de pagos.' },
  ]

  const handleSend = async (overrideText?: string) => {
    const msgText = overrideText || text.trim()
    if (!msgText || !chatId || !firebaseUser || !store || sending) return

    if (!overrideText) setText('')
    setSending(true)

    try {
      await chatService.sendMessage(chatId, msgText, firebaseUser.uid, 'user')
      // Request AI response
      setAiTyping(true)
      try {
        await chatService.requestAIResponse(chatId, store.id, msgText, firebaseUser.uid)
      } catch (aiErr) {
        console.error('Error getting AI response:', aiErr)
      } finally {
        setAiTyping(false)
      }
    } catch (err) {
      console.error('Error sending message:', err)
      if (!overrideText) setText(msgText)
    } finally {
      setSending(false)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDateSeparator = (date: Date) => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) return 'Hoy'
    if (date.toDateString() === yesterday.toDateString()) return 'Ayer'
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' })
  }

  // Group messages by date
  const groupedMessages: { date: string; messages: ChatMessage[] }[] = []
  messages.forEach((msg) => {
    const dateStr = msg.createdAt.toDateString()
    const last = groupedMessages[groupedMessages.length - 1]
    if (last && last.date === dateStr) {
      last.messages.push(msg)
    } else {
      groupedMessages.push({ date: dateStr, messages: [msg] })
    }
  })

  return (
    <>
      {/* Backdrop - only on mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-[60] transition-opacity lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Chat panel */}
      <div
        className={`fixed z-[60] bg-white shadow-2xl flex flex-col transition-all duration-300 ease-out
          inset-0
          lg:inset-auto lg:bottom-6 lg:right-6 lg:w-[380px] lg:h-[520px] lg:rounded-2xl
          ${open ? 'translate-y-0 lg:scale-100 lg:opacity-100' : 'translate-y-full lg:translate-y-0 lg:scale-95 lg:opacity-0 lg:pointer-events-none'}
        `}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Soporte Shopifree</p>
              <p className="text-[11px] text-gray-500">Asistente IA + soporte humano</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
          {messages.length === 0 && (
            <div className="flex flex-col h-full px-1">
              <div className="text-center mt-4 mb-5">
                <div className="w-14 h-14 rounded-full bg-[#007AFF]/10 flex items-center justify-center mb-3 mx-auto">
                  <svg className="w-7 h-7 text-[#007AFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h.01M12 10h.01M15 10h.01" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-800">¿En qué te podemos ayudar?</p>
                <p className="text-xs text-gray-500 mt-1">Selecciona un tema o escríbenos</p>
              </div>
              <div className="space-y-2">
                {quickQuestions.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => handleSend(q.message)}
                    disabled={sending}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 bg-white border border-gray-100 rounded-xl text-left hover:bg-[#007AFF]/5 hover:border-[#007AFF]/20 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    <span className="text-lg flex-shrink-0">{q.icon}</span>
                    <span className="text-[13px] text-gray-700 font-medium">{q.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {groupedMessages.map((group) => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex items-center justify-center my-3">
                <span className="text-[11px] text-gray-400 bg-gray-50 px-3 py-0.5 rounded-full">
                  {formatDateSeparator(group.messages[0].createdAt)}
                </span>
              </div>

              {group.messages.map((msg) => {
                const isUser = msg.senderType === 'user'
                const isAssistant = msg.senderType === 'assistant'
                return (
                  <div
                    key={msg.id}
                    className={`flex mb-1.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {isAssistant && (
                      <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center mr-1.5 mt-1 flex-shrink-0">
                        <span className="text-[10px]">✨</span>
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] px-3.5 py-2 rounded-2xl ${
                        isUser
                          ? 'bg-[#007AFF] text-white rounded-br-md'
                          : isAssistant
                            ? 'bg-purple-50 text-gray-900 rounded-bl-md border border-purple-100'
                            : 'bg-gray-100 text-gray-900 rounded-bl-md'
                      }`}
                    >
                      {isAssistant && (
                        <p className="text-[10px] font-semibold text-purple-500 mb-0.5">IA Shopifree</p>
                      )}
                      <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      <p className={`text-[10px] mt-0.5 ${isUser ? 'text-white/60' : 'text-gray-400'} text-right`}>
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
          {aiTyping && (
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px]">✨</span>
              </div>
              <div className="bg-purple-50 border border-purple-100 rounded-2xl rounded-bl-md px-3.5 py-2.5">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="text-[11px] text-purple-400 ml-1">IA escribiendo...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input or closed state */}
        {chatClosed ? (
          <div className="flex-shrink-0 border-t border-gray-100 px-4 py-3">
            <div className="text-center mb-2">
              <p className="text-xs text-gray-500">Esta conversación ha finalizado</p>
            </div>
            <button
              onClick={handleNewChat}
              className="w-full py-2.5 px-4 bg-[#007AFF] text-white text-sm font-medium rounded-full hover:bg-[#0066DD] active:scale-[0.98] transition-all"
            >
              Iniciar nueva conversación
            </button>
          </div>
        ) : (
          <div className="flex-shrink-0 border-t border-gray-100 px-3 py-2">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Escribe un mensaje..."
                className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-[16px] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30"
              />
              <button
                onClick={() => handleSend()}
                disabled={!text.trim() || sending}
                className="w-9 h-9 rounded-full bg-[#007AFF] flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
              >
                <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
