import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { chatService, type Chat, type ChatMessage } from '../../lib/chatService'

export default function SupportChats() {
  const { firebaseUser } = useAuth()
  const [chats, setChats] = useState<Chat[]>([])
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Subscribe to all chats
  useEffect(() => {
    const unsub = chatService.subscribeToChats(setChats)
    return () => unsub()
  }, [])

  // Subscribe to messages of selected chat
  useEffect(() => {
    if (!selectedChat) return
    chatService.markAsRead(selectedChat.id, 'admin')
    const unsub = chatService.subscribeToMessages(selectedChat.id, setMessages)
    return () => unsub()
  }, [selectedChat])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Mark as read when new admin messages arrive
  useEffect(() => {
    if (selectedChat && messages.length > 0) {
      const lastMsg = messages[messages.length - 1]
      if (lastMsg.senderType === 'user') {
        chatService.markAsRead(selectedChat.id, 'admin')
      }
    }
  }, [selectedChat, messages])

  const handleSend = async () => {
    if (!text.trim() || !selectedChat || !firebaseUser || sending) return

    const msg = text.trim()
    setText('')
    setSending(true)

    try {
      await chatService.sendMessage(selectedChat.id, msg, firebaseUser.uid, 'admin')
    } catch (err) {
      console.error('Error sending message:', err)
      setText(msg)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatRelativeTime = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHour = Math.floor(diffMs / 3600000)
    const diffDay = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return 'Ahora'
    if (diffMin < 60) return `${diffMin}m`
    if (diffHour < 24) return `${diffHour}h`
    if (diffDay < 7) return `${diffDay}d`
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' })
  }

  const formatDateSeparator = (date: Date) => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) return 'Hoy'
    if (date.toDateString() === yesterday.toDateString()) return 'Ayer'
    return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
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

  // Mobile: show chat list or conversation
  const showingConversation = selectedChat !== null

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1e3a5f] mb-1">Chats de Soporte</h1>
      <p className="text-gray-600 mb-6 text-sm">Conversaciones con tus usuarios</p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 220px)', minHeight: '400px' }}>
        <div className="flex h-full">
          {/* Chat list */}
          <div className={`w-full lg:w-80 lg:min-w-[320px] lg:border-r border-gray-100 flex flex-col ${showingConversation ? 'hidden lg:flex' : 'flex'}`}>
            <div className="p-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {chats.length} conversacion{chats.length !== 1 ? 'es' : ''}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {chats.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <svg className="w-10 h-10 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <p className="text-sm text-gray-400">No hay conversaciones aún</p>
                </div>
              )}

              {chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                    selectedChat?.id === chat.id ? 'bg-[#007AFF]/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-white">
                        {chat.storeName[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900 truncate">{chat.storeName}</p>
                        <span className="text-[11px] text-gray-400 flex-shrink-0 ml-2">
                          {formatRelativeTime(chat.lastMessageAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-gray-500 truncate">
                          {chat.lastMessageBy === 'admin' && <span className="text-gray-400">Tú: </span>}
                          {chat.lastMessage}
                        </p>
                        {chat.unreadByAdmin > 0 && (
                          <span className="ml-2 min-w-[20px] h-5 px-1.5 bg-[#007AFF] text-white text-[11px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                            {chat.unreadByAdmin}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">{chat.userEmail}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Conversation */}
          <div className={`flex-1 flex flex-col bg-[#f8f9fa] ${showingConversation ? 'flex' : 'hidden lg:flex'}`}>
            {selectedChat ? (
              <>
                {/* Conversation header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white">
                  <button
                    onClick={() => setSelectedChat(null)}
                    className="lg:hidden p-1 text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center">
                    <span className="text-xs font-semibold text-white">
                      {selectedChat.storeName[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{selectedChat.storeName}</p>
                    <p className="text-[11px] text-gray-500">{selectedChat.userEmail}</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-3">
                  <div className="max-w-2xl mx-auto space-y-1">
                    {groupedMessages.map((group) => (
                      <div key={group.date}>
                        <div className="flex items-center justify-center my-3">
                          <span className="text-[11px] text-gray-400 bg-white/80 px-3 py-0.5 rounded-full shadow-sm">
                            {formatDateSeparator(group.messages[0].createdAt)}
                          </span>
                        </div>

                        {group.messages.map((msg) => {
                          const isAdmin = msg.senderType === 'admin'
                          return (
                            <div
                              key={msg.id}
                              className={`flex mb-1.5 ${isAdmin ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[70%] px-3.5 py-2 rounded-2xl shadow-sm ${
                                  isAdmin
                                    ? 'bg-[#007AFF] text-white rounded-br-md'
                                    : 'bg-white text-gray-900 rounded-bl-md'
                                }`}
                              >
                                <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                <p className={`text-[10px] mt-0.5 ${isAdmin ? 'text-white/60' : 'text-gray-400'} text-right`}>
                                  {formatTime(msg.createdAt)}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Input */}
                <div className="border-t border-gray-100 px-3 py-2 bg-white">
                  <div className="max-w-2xl mx-auto flex items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                      placeholder="Responder..."
                      className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!text.trim() || sending}
                      className="w-9 h-9 rounded-full bg-[#007AFF] flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
                    >
                      <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h.01M12 10h.01M15 10h.01" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-500">Selecciona una conversación</p>
                <p className="text-xs text-gray-400 mt-1">Elige un chat de la lista para responder</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
