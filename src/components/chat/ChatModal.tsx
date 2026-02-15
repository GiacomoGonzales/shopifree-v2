import { useState, useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '../../hooks/useAuth'
import { chatService, type ChatMessage } from '../../lib/chatService'

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

function linkifyText(text: string, isUser: boolean) {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlRegex)
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className={`underline ${isUser ? 'text-white' : 'text-[#007AFF]'}`}
      >
        {part.replace(/https?:\/\//, '').replace(/\/$/, '')}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

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
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    ...(!isNative ? [{ label: 'Conocer los planes', message: 'Hola, me gustaría conocer más sobre los planes disponibles en Shopifree.' }] : []),
    { label: 'Conectar dominio personalizado', message: 'Hola, necesito ayuda para conectar mi dominio personalizado a mi tienda.' },
    { label: 'Configurar pasarela de pago', message: 'Hola, quisiera ayuda para configurar mi pasarela de pagos.' },
  ]

  const uploadImage = async (file: File) => {
    if (!chatId || !firebaseUser) return

    const previewUrl = URL.createObjectURL(file)
    setImagePreview(previewUrl)
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
      formData.append('folder', 'chat')

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      )
      const data = await res.json()
      if (data.secure_url) {
        setPendingImageUrl(data.secure_url)
      }
    } catch (err) {
      console.error('Error uploading image:', err)
      setImagePreview(null)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadImage(file)
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) uploadImage(file)
        return
      }
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      uploadImage(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
  }

  const cancelImage = () => {
    setImagePreview(null)
    setPendingImageUrl(null)
  }

  const handleSend = async (overrideText?: string) => {
    const msgText = overrideText || text.trim()
    const imageUrl = pendingImageUrl
    if ((!msgText && !imageUrl) || !chatId || !firebaseUser || !store || sending) return

    if (!overrideText) setText('')
    setImagePreview(null)
    setPendingImageUrl(null)
    setSending(true)

    try {
      await chatService.sendMessage(chatId, msgText || (imageUrl ? 'Imagen' : ''), firebaseUser.uid, 'user', imageUrl || undefined)
      // Request AI response (only for text messages, not images alone)
      if (msgText) {
        setAiTyping(true)
        try {
          await chatService.requestAIResponse(chatId, store.id, msgText, firebaseUser.uid)
        } catch (aiErr) {
          console.error('Error getting AI response:', aiErr)
        } finally {
          setAiTyping(false)
        }
      }
    } catch (err) {
      console.error('Error sending message:', err)
      if (!overrideText) setText(msgText || '')
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
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onPaste={handlePaste}
        className={`fixed z-[60] bg-white shadow-2xl flex flex-col transition-all duration-300 ease-out
          inset-0
          lg:inset-auto lg:bottom-6 lg:right-6 lg:w-[380px] lg:h-[520px] lg:rounded-2xl
          ${open ? 'translate-y-0 lg:scale-100 lg:opacity-100' : 'translate-y-full lg:translate-y-0 lg:scale-95 lg:opacity-0 lg:pointer-events-none'}
          ${dragging ? 'ring-2 ring-[#007AFF] ring-inset' : ''}
        `}
      >
        {/* Drop overlay */}
        {dragging && (
          <div className="absolute inset-0 bg-[#007AFF]/10 z-10 flex items-center justify-center rounded-2xl pointer-events-none">
            <div className="bg-white px-4 py-2 rounded-xl shadow-lg text-sm font-medium text-[#007AFF]">
              Soltar imagen aquí
            </div>
          </div>
        )}
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <img src="/sofia-support.png" alt="Sofía" className="w-9 h-9 rounded-full object-cover" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Sofía</p>
              <p className="text-[11px] text-green-500">En línea</p>
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
                <img src="/sofia-support.png" alt="Sofía" className="w-14 h-14 rounded-full object-cover mb-3 mx-auto" />
                <p className="text-sm font-medium text-gray-800">¿En qué te podemos ayudar?</p>
                <p className="text-xs text-gray-500 mt-1">Selecciona un tema o escríbenos</p>
              </div>
              <div className="space-y-2">
                {quickQuestions.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => handleSend(q.message)}
                    disabled={sending}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-100 rounded-xl text-left hover:bg-[#007AFF]/5 hover:border-[#007AFF]/20 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
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
                      <img src="/sofia-support.png" alt="Sofía" className="w-6 h-6 rounded-full object-cover mr-1.5 mt-1 flex-shrink-0" />
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
                        <p className="text-[10px] font-semibold text-purple-500 mb-0.5">Sofía</p>
                      )}
                      {msg.imageUrl && (
                        <img
                          src={msg.imageUrl}
                          alt="Imagen"
                          className="rounded-lg max-w-full mb-1 cursor-pointer"
                          onClick={() => window.open(msg.imageUrl, '_blank')}
                        />
                      )}
                      {msg.text && msg.text !== 'Imagen' && (
                        <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{linkifyText(msg.text, isUser)}</p>
                      )}
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
              <img src="/sofia-support.png" alt="Sofía" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
              <div className="bg-purple-50 border border-purple-100 rounded-2xl rounded-bl-md px-3.5 py-2.5">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="text-[11px] text-purple-400 ml-1">Sofía escribiendo...</span>
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
            {/* Image preview */}
            {imagePreview && (
              <div className="relative inline-block mb-2 ml-1">
                <img src={imagePreview} alt="Preview" className="h-16 rounded-lg object-cover" />
                {uploading && (
                  <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {!uploading && (
                  <button
                    onClick={cancelImage}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-700 text-white rounded-full flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                )}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || sending}
                className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-[#007AFF] hover:bg-gray-100 transition-colors disabled:opacity-40"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
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
                disabled={(!text.trim() && !pendingImageUrl) || sending || uploading}
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
