import { useState, useEffect, useRef, useMemo } from 'react'
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

// Image queued in the input area. Mirrors the admin SupportChats type
// (kept duplicated so each component is self-contained — moving to a
// shared types module is fine, but not necessary for two callers).
interface PendingImage {
  id: string
  preview: string
  url: string | null
  uploading: boolean
}

const makePendingImageId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export default function ChatModal({ open, onClose }: ChatModalProps) {
  const { firebaseUser, store } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [aiTyping, setAiTyping] = useState(false)
  const [chatId, setChatId] = useState<string | null>(null)
  const [chatClosed, setChatClosed] = useState(false)
  const [dragging, setDragging] = useState(false)
  // Per-image pending state — see admin SupportChats for the rationale.
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([])
  // Last failed send payload — surfaces a retry banner above the input
  // when sendMessage rejects, instead of the silent "text disappears
  // from input then quietly comes back" failure mode.
  const [failedSend, setFailedSend] = useState<{ text: string; imageUrls?: string[] } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Lightbox: in-app image viewer. Same pattern as the admin Support
  // Chats — click an image bubble to open over the chat panel, ESC or
  // ←/→ to navigate when there are several images in the conversation.
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const imageUrls = useMemo(
    () => messages.flatMap(m => m.imageUrls ?? []),
    [messages],
  )
  const lightboxIndex = lightboxUrl ? imageUrls.indexOf(lightboxUrl) : -1

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

  // Auto-resize the reply textarea to its content (capped so it never
  // eats the chat panel). Shrinks back when the user deletes lines or
  // sends, since each text change re-runs the measurement.
  useEffect(() => {
    const ta = inputRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'
  }, [text])

  // Lightbox keyboard nav: ESC closes, ←/→ steps through the
  // conversation's images. Only listens while open so it doesn't fight
  // the message input.
  useEffect(() => {
    if (!lightboxUrl) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxUrl(null)
      else if (e.key === 'ArrowLeft' && lightboxIndex > 0) {
        setLightboxUrl(imageUrls[lightboxIndex - 1])
      } else if (e.key === 'ArrowRight' && lightboxIndex >= 0 && lightboxIndex < imageUrls.length - 1) {
        setLightboxUrl(imageUrls[lightboxIndex + 1])
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxUrl, lightboxIndex, imageUrls])

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

    const id = makePendingImageId()
    const preview = URL.createObjectURL(file)
    setPendingImages(prev => [...prev, { id, preview, url: null, uploading: true }])

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
        setPendingImages(prev => prev.map(p =>
          p.id === id ? { ...p, url: data.secure_url, uploading: false } : p
        ))
      } else {
        URL.revokeObjectURL(preview)
        setPendingImages(prev => prev.filter(p => p.id !== id))
      }
    } catch (err) {
      console.error('Error uploading image:', err)
      URL.revokeObjectURL(preview)
      setPendingImages(prev => prev.filter(p => p.id !== id))
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach(uploadImage)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    let firstHandled = false
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          if (!firstHandled) e.preventDefault()
          firstHandled = true
          uploadImage(file)
        }
      }
    }
  }

  const removePendingImage = (id: string) => {
    setPendingImages(prev => {
      const removed = prev.find(p => p.id === id)
      if (removed) URL.revokeObjectURL(removed.preview)
      return prev.filter(p => p.id !== id)
    })
  }

  // Drag depth counter — see admin SupportChats for the full rationale.
  // Counting enter/leave events keeps the overlay stable while the
  // cursor moves over message bubbles inside the drop zone.
  const dragDepthRef = useRef(0)

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    dragDepthRef.current++
    if (dragDepthRef.current === 1) setDragging(true)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault() // required so the drop is actually accepted
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    dragDepthRef.current--
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0
      setDragging(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    dragDepthRef.current = 0
    setDragging(false)
    const files = e.dataTransfer.files
    if (!files) return
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) uploadImage(file)
    })
  }

  const handleSend = async (
    overrideOrRetry?: string | { text: string; imageUrls?: string[] },
  ) => {
    // Two callers: quick-question buttons pass a string ("override"),
    // and the retry banner passes a payload object. Distinguish by type.
    const isRetry = typeof overrideOrRetry === 'object' && overrideOrRetry !== null
    const isOverride = typeof overrideOrRetry === 'string'
    const msgText = isRetry
      ? overrideOrRetry.text.trim()
      : (isOverride ? overrideOrRetry : text).trim()
    const imageUrls = isRetry
      ? (overrideOrRetry.imageUrls ?? [])
      : (isOverride ? [] : pendingImages.filter(p => p.url).map(p => p.url as string))
    if ((!msgText && imageUrls.length === 0) || !chatId || !firebaseUser || !store || sending) return

    if (!isOverride && !isRetry) {
      setText('')
      setPendingImages(prev => {
        prev.forEach(p => URL.revokeObjectURL(p.preview))
        return []
      })
    }
    setSending(true)

    try {
      await chatService.sendMessage(
        chatId,
        msgText || (imageUrls.length > 0 ? 'Imagen' : ''),
        firebaseUser.uid,
        'user',
        imageUrls.length > 0 ? imageUrls : undefined,
      )
      setFailedSend(null)
      // Request AI response (only for text messages, not images alone)
      if (msgText) {
        setAiTyping(true)
        try {
          const aiResult = await chatService.requestAIResponse(chatId, store.id, msgText, firebaseUser.uid)
          // If AI was skipped (paused or escalated), hide typing immediately
          if (aiResult.skipped) {
            setAiTyping(false)
          }
        } catch (aiErr) {
          console.error('Error getting AI response:', aiErr)
        } finally {
          setAiTyping(false)
        }
      }
    } catch (err) {
      console.error('Error sending message:', err)
      setFailedSend({ text: msgText, imageUrls: imageUrls.length > 0 ? imageUrls : undefined })
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
        onDragEnter={handleDragEnter}
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
                      className={`max-w-[80%] px-3.5 py-2 rounded-2xl transition-opacity ${
                        msg.pending ? 'opacity-70' : ''
                      } ${
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
                      {msg.imageUrls && msg.imageUrls.length > 0 && (
                        <div className={`mb-1 grid gap-1 ${msg.imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                          {msg.imageUrls.map((url, i) => (
                            <img
                              key={url}
                              src={url}
                              alt={`Imagen ${i + 1}`}
                              className={`rounded-lg cursor-zoom-in ${
                                msg.imageUrls!.length === 1
                                  ? 'max-w-full object-contain'
                                  : 'aspect-square w-full object-cover'
                              }`}
                              onClick={() => setLightboxUrl(url)}
                            />
                          ))}
                        </div>
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
            {/* Failed send banner — surfaces the last message that
                couldn't reach the server with retry/discard actions. */}
            {failedSend && (
              <div className="mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-red-700">No se pudo enviar</p>
                  <p className="text-[11px] text-red-500 truncate">
                    {failedSend.text || (
                      failedSend.imageUrls && failedSend.imageUrls.length > 0
                        ? `${failedSend.imageUrls.length} imagen${failedSend.imageUrls.length > 1 ? 'es' : ''}`
                        : ''
                    )}
                  </p>
                </div>
                <button
                  onClick={() => handleSend(failedSend)}
                  disabled={sending}
                  className="px-2.5 py-1 text-[11px] font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-40 flex-shrink-0"
                >
                  Reintentar
                </button>
                <button
                  onClick={() => setFailedSend(null)}
                  className="text-red-400 hover:text-red-600 flex-shrink-0"
                  aria-label="Descartar"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Pending images preview */}
            {pendingImages.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 ml-1">
                {pendingImages.map(p => (
                  <div key={p.id} className="relative">
                    <img src={p.preview} alt="" className="h-16 w-16 rounded-lg object-cover" />
                    {p.uploading && (
                      <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {!p.uploading && (
                      <button
                        onClick={() => removePendingImage(p.id)}
                        aria-label="Quitar imagen"
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-700 hover:bg-gray-900 text-white rounded-full flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
                className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-[#007AFF] hover:bg-gray-100 transition-colors disabled:opacity-40 flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Escribe un mensaje..."
                rows={1}
                className="flex-1 px-4 py-2.5 bg-gray-100 rounded-2xl text-[16px] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 resize-none leading-snug max-h-[140px] overflow-y-auto block"
              />
              <button
                onClick={() => handleSend()}
                disabled={(!text.trim() && pendingImages.length === 0) || sending || pendingImages.some(p => p.uploading)}
                className="w-9 h-9 rounded-full bg-[#007AFF] flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform flex-shrink-0"
              >
                <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Image lightbox — opens over the chat panel instead of popping a
          new tab. ESC and ←/→ wired up via the keydown effect; clicking
          the dimmed backdrop also closes. z-[70] sits above the chat
          panel itself (z-[60]). */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxUrl(null) }}
            aria-label="Cerrar"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center z-10"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {imageUrls.length > 1 && (
            <span className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-white text-xs tabular-nums">
              {lightboxIndex + 1} / {imageUrls.length}
            </span>
          )}

          {lightboxIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxUrl(imageUrls[lightboxIndex - 1]) }}
              aria-label="Anterior"
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center z-10"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {lightboxIndex >= 0 && lightboxIndex < imageUrls.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxUrl(imageUrls[lightboxIndex + 1]) }}
              aria-label="Siguiente"
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center z-10"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          <img
            src={lightboxUrl}
            alt=""
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
