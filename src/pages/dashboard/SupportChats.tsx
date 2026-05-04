import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { useAuth } from '../../hooks/useAuth'
import { chatService, type Chat, type ChatMessage } from '../../lib/chatService'
import { db } from '../../lib/firebase'

interface StoreInfo {
  logo?: string
  subdomain?: string
  plan?: string
  country?: string
}

// Image queued in the input area. `preview` is a local blob URL we show
// immediately; `url` is the Cloudinary URL we get back after upload.
// Send is gated until every entry has a `url`, so we never ship a
// half-uploaded attachment to a recipient.
interface PendingImage {
  id: string
  preview: string
  url: string | null
  uploading: boolean
}

const makePendingImageId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

/**
 * Play a loud, distinctive alert chime using Web Audio API.
 * Three ascending tones that grab attention.
 */
function playAlertChime() {
  try {
    const ctx = new AudioContext()
    const now = ctx.currentTime

    const frequencies = [880, 1100, 1320] // A5, C#6, E6 — major triad
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.35, now + i * 0.15)
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.4)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + i * 0.15)
      osc.stop(now + i * 0.15 + 0.4)
    })

    // Close context after sounds finish
    setTimeout(() => ctx.close(), 1500)
  } catch {
    // Web Audio not available — silent fallback
  }
}

function linkifyText(text: string, isAdmin: boolean) {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlRegex)
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className={`underline ${isAdmin ? 'text-white' : 'text-[#007AFF]'}`}
      >
        {part.replace(/https?:\/\//, '').replace(/\/$/, '')}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

export default function SupportChats() {
  const { firebaseUser } = useAuth()
  const [chats, setChats] = useState<Chat[]>([])
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [closing, setClosing] = useState(false)
  const [togglingPause, setTogglingPause] = useState(false)
  const [dragging, setDragging] = useState(false)
  // Per-image pending state — each entry tracks its own upload progress
  // and resulting Cloudinary URL, so the user can paste/drop several
  // images at once and remove individual ones before sending.
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const prevUnreadRef = useRef(-1) // -1 = first load, skip alert
  const alertIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Lightbox: in-app image viewer. Tracks the URL currently being viewed;
  // index is derived from the conversation's image list so prev/next nav
  // cycles through every image in the open chat without bouncing tabs.
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const imageUrls = useMemo(
    () => messages.flatMap(m => m.imageUrls ?? []),
    [messages],
  )
  const lightboxIndex = lightboxUrl ? imageUrls.indexOf(lightboxUrl) : -1

  // Smart auto-scroll: only jump to the bottom on a new message if the
  // admin was already near the bottom. Otherwise surface a "new message"
  // chip so we don't yank the viewport out from under them mid-read.
  // Tracked in a ref (not state) because we read the latest value
  // synchronously inside the messages effect.
  const wasNearBottomRef = useRef(true)
  const [hasNewMessage, setHasNewMessage] = useState(false)

  // Audio mute toggle, persisted across sessions. When the admin needs
  // quiet (a meeting, late-night triage), they shouldn't have to dodge
  // the chime every time a new message lands.
  const [audioMuted, setAudioMuted] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('supportChatsAudioMuted') === '1'
  })

  // Two-click confirmation for "Cerrar chat" — closing is one of those
  // actions that's easy to misclick from the header. First click arms it,
  // second click within ~4s actually closes; switching chats also resets.
  const [confirmingClose, setConfirmingClose] = useState(false)

  // Last failed send. When sendMessage rejects, we hold the payload here
  // and surface a banner above the input with [Reintentar] [Descartar]
  // — the previous behaviour just silently restored the text to the input
  // with no error visible, so a flaky network looked like "the chat
  // dropped my words for no reason".
  const [failedSend, setFailedSend] = useState<{ text: string; imageUrls?: string[] } | null>(null)

  // Chat list search + filter. Active filters narrow the realtime
  // `chats`; "closed" switches the source to a one-shot fetch held in
  // `closedChats` (see effect below) since `subscribeToChats` is scoped
  // to active chats only and we don't want to pay for a permanent
  // listener over the entire closed-chat history.
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'unread' | 'escalated' | 'paused' | 'closed'>('all')
  const [closedChats, setClosedChats] = useState<Chat[]>([])
  const [closedChatsLoading, setClosedChatsLoading] = useState(false)

  // Re-fetch closed chats every time the admin enters the "Cerrados"
  // filter — keeps data fresh after closing a chat in the same session
  // without holding a permanent subscription.
  useEffect(() => {
    if (filter !== 'closed') return
    let cancelled = false
    setClosedChatsLoading(true)
    chatService.getClosedChats(50)
      .then(list => { if (!cancelled) setClosedChats(list) })
      .catch(err => console.error('Error fetching closed chats:', err))
      .finally(() => { if (!cancelled) setClosedChatsLoading(false) })
    return () => { cancelled = true }
  }, [filter])

  const filteredChats = useMemo(() => {
    let result: Chat[]
    if (filter === 'closed') result = closedChats
    else if (filter === 'unread') result = chats.filter(c => c.unreadByAdmin > 0)
    else if (filter === 'escalated') result = chats.filter(c => c.escalated)
    else if (filter === 'paused') result = chats.filter(c => c.aiPaused)
    else result = chats

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      result = result.filter(c =>
        c.storeName.toLowerCase().includes(q) ||
        c.userEmail.toLowerCase().includes(q) ||
        (c.lastMessage || '').toLowerCase().includes(q)
      )
    }
    return result
  }, [chats, closedChats, filter, searchQuery])

  // Closed count is unknown until the filter has been opened at least
  // once (we only fetch on demand). Display empty until then so we
  // don't show a misleading "0".
  const filterCounts = useMemo(() => ({
    all: chats.length,
    unread: chats.filter(c => c.unreadByAdmin > 0).length,
    escalated: chats.filter(c => c.escalated).length,
    paused: chats.filter(c => c.aiPaused).length,
    closed: closedChats.length,
  }), [chats, closedChats])

  // Lazily hydrate store metadata (logo, plan, country, subdomain) for the
  // stores that have open chats. The Chat doc only carries `storeName`, so
  // showing the real logo + a quick "where is this customer from / what
  // plan do they pay" requires fetching the store. We don't need realtime
  // — these fields rarely change during a support session — so a one-shot
  // getDoc per unique storeId, cached forever in component state, is enough.
  const [storeMap, setStoreMap] = useState<Record<string, StoreInfo | null>>({})
  const fetchedStoreIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const toFetch = Array.from(new Set(chats.map(c => c.storeId)))
      .filter(id => id && !fetchedStoreIdsRef.current.has(id))
    if (toFetch.length === 0) return
    toFetch.forEach(id => fetchedStoreIdsRef.current.add(id))

    let cancelled = false
    ;(async () => {
      const results = await Promise.all(toFetch.map(async id => {
        try {
          const snap = await getDoc(doc(db, 'stores', id))
          if (!snap.exists()) return [id, null] as const
          const data = snap.data()
          return [id, {
            logo: data.logo,
            subdomain: data.subdomain,
            plan: data.plan,
            country: data.country,
          } as StoreInfo] as const
        } catch {
          // Allow retry on next chats update if the fetch errored
          fetchedStoreIdsRef.current.delete(id)
          return [id, null] as const
        }
      }))
      if (cancelled) return
      setStoreMap(prev => {
        const next = { ...prev }
        for (const [id, info] of results) next[id] = info
        return next
      })
    })()

    return () => { cancelled = true }
  }, [chats])

  // Read receipt is shown on the LAST admin message only (WhatsApp-style),
  // since `unreadByUser === 0` reflects the latest read state — applying
  // it to every admin message would suggest each one was independently
  // confirmed, which the data doesn't actually tell us.
  const lastAdminMsgId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].senderType === 'admin') return messages[i].id
    }
    return null
  }, [messages])

  const stopAlert = useCallback(() => {
    if (alertIntervalRef.current) {
      clearInterval(alertIntervalRef.current)
      alertIntervalRef.current = null
    }
  }, [])

  const startAlert = useCallback(() => {
    if (audioMuted) return // muted by the admin — stay silent
    if (alertIntervalRef.current) return // already ringing
    playAlertChime() // play immediately
    alertIntervalRef.current = setInterval(playAlertChime, 3500) // repeat every 3.5s
  }, [audioMuted])

  // Persist the mute preference and silence any in-progress chime the
  // moment the admin toggles mute on (so they don't have to wait for the
  // current ring loop to time out).
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('supportChatsAudioMuted', audioMuted ? '1' : '0')
    }
    if (audioMuted) stopAlert()
  }, [audioMuted, stopAlert])

  // Subscribe to all chats (escalated first) + alert on new messages
  useEffect(() => {
    const unsub = chatService.subscribeToChats((allChats) => {
      const sorted = [...allChats].sort((a, b) => {
        if (a.escalated && !b.escalated) return -1
        if (!a.escalated && b.escalated) return 1
        return 0
      })
      setChats(sorted)

      // Alert logic: detect new unread messages from users
      const totalUnread = sorted.reduce((sum, c) => sum + c.unreadByAdmin, 0)
      if (prevUnreadRef.current >= 0 && totalUnread > prevUnreadRef.current) {
        startAlert()
      }
      if (totalUnread === 0) {
        stopAlert()
      }
      prevUnreadRef.current = totalUnread
    })
    return () => {
      unsub()
      stopAlert()
    }
  }, [startAlert, stopAlert])

  // Subscribe to messages of selected chat + stop alert when reading
  useEffect(() => {
    if (!selectedChat) return
    chatService.markAsRead(selectedChat.id, 'admin')
    // If all unread are from this chat, stop alerting
    const remainingUnread = chats.reduce((sum, c) =>
      sum + (c.id === selectedChat.id ? 0 : c.unreadByAdmin), 0)
    if (remainingUnread === 0) stopAlert()
    const unsubMessages = chatService.subscribeToMessages(selectedChat.id, setMessages)
    // Subscribe to chat doc to get real-time aiPaused updates
    const unsubChat = chatService.subscribeToChat(selectedChat.id, (updated) => {
      if (updated) {
        setSelectedChat(prev => prev && prev.id === updated.id ? updated : prev)
      }
    })
    return () => { unsubMessages(); unsubChat() }
  }, [selectedChat?.id, chats, stopAlert])

  // Auto-scroll only when the admin is already near the bottom; otherwise
  // surface a new-message chip and let them stay where they were reading.
  useEffect(() => {
    if (wasNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    } else {
      setHasNewMessage(true)
    }
  }, [messages])

  // Switching conversation = "I want to read what's new" — jump straight
  // to the latest message and reset per-chat ephemeral state so a stale
  // failed-send banner from chat A doesn't bleed into chat B.
  useEffect(() => {
    if (!selectedChat) return
    wasNearBottomRef.current = true
    setHasNewMessage(false)
    setConfirmingClose(false)
    setFailedSend(null)
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
    })
  }, [selectedChat?.id])

  // Auto-disarm the close-chat confirmation if the admin doesn't follow
  // through within a few seconds. Otherwise a forgotten armed state could
  // turn the next innocent click into an accidental close.
  useEffect(() => {
    if (!confirmingClose) return
    const timer = setTimeout(() => setConfirmingClose(false), 4000)
    return () => clearTimeout(timer)
  }, [confirmingClose])

  const handleMessagesScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    wasNearBottomRef.current = distance < 80
    if (wasNearBottomRef.current) setHasNewMessage(false)
  }

  const scrollToLatest = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    wasNearBottomRef.current = true
    setHasNewMessage(false)
  }

  // Auto-resize the reply textarea to fit its content (capped so it never
  // eats the conversation pane). Reads scrollHeight after collapsing to
  // `auto` so it shrinks back when the user deletes lines or sends.
  useEffect(() => {
    const ta = inputRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }, [text])

  // Lightbox keyboard nav: ESC to close, ←/→ to step through images. We
  // only listen while the lightbox is open so global shortcuts (e.g. typing
  // in the reply box) aren't hijacked.
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

  // Mark as read when new admin messages arrive
  useEffect(() => {
    if (selectedChat && messages.length > 0) {
      const lastMsg = messages[messages.length - 1]
      if (lastMsg.senderType === 'user') {
        chatService.markAsRead(selectedChat.id, 'admin')
      }
    }
  }, [selectedChat, messages])

  const uploadImage = async (file: File) => {
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
        // Cloudinary rejected the upload — drop the entry and free the
        // blob preview rather than leave a broken thumbnail in the queue.
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
    // Reset so the same file can be picked again later
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

  // Drag depth counter — `dragenter`/`dragleave` fire on every nested
  // child too, so a naive setDragging(false) on dragleave makes the
  // overlay flicker the moment the cursor passes over a message bubble.
  // Counting depth keeps the overlay on as long as the cursor is still
  // inside the drop zone (depth > 0).
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

  const handleSend = async (retryPayload?: { text: string; imageUrls?: string[] }) => {
    const isRetry = !!retryPayload
    const msgText = (isRetry ? retryPayload.text : text).trim()
    const imageUrls = isRetry
      ? (retryPayload.imageUrls ?? [])
      : pendingImages.filter(p => p.url).map(p => p.url as string)
    if ((!msgText && imageUrls.length === 0) || !selectedChat || !firebaseUser || sending) return

    if (!isRetry) {
      setText('')
      // Free the blob URLs of the queued previews and clear the queue.
      // The Cloudinary URLs we're about to send live on independently.
      setPendingImages(prev => {
        prev.forEach(p => URL.revokeObjectURL(p.preview))
        return []
      })
    }
    setSending(true)

    try {
      await chatService.sendMessage(
        selectedChat.id,
        msgText || (imageUrls.length > 0 ? 'Imagen' : ''),
        firebaseUser.uid,
        'admin',
        imageUrls.length > 0 ? imageUrls : undefined,
      )
      if (selectedChat.escalated) {
        await chatService.clearEscalation(selectedChat.id)
      }
      // Success — clear any previous failure banner (e.g. they hit
      // "Reintentar" or simply sent a new message after the failed one)
      setFailedSend(null)
    } catch (err) {
      console.error('Error sending message:', err)
      setFailedSend({ text: msgText, imageUrls: imageUrls.length > 0 ? imageUrls : undefined })
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleTogglePause = async () => {
    if (!selectedChat || togglingPause) return
    setTogglingPause(true)
    try {
      await chatService.toggleAIPause(selectedChat.id, !selectedChat.aiPaused)
    } catch (err) {
      console.error('Error toggling AI pause:', err)
    } finally {
      setTogglingPause(false)
    }
  }

  const handleCloseChat = async () => {
    if (!selectedChat || closing) return
    // First click arms; second click within the timeout actually closes.
    if (!confirmingClose) {
      setConfirmingClose(true)
      return
    }
    setConfirmingClose(false)
    setClosing(true)
    try {
      await chatService.closeChat(selectedChat.id)
      setSelectedChat(null)
      setMessages([])
    } catch (err) {
      console.error('Error closing chat:', err)
    } finally {
      setClosing(false)
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
    // Negative margins escape the DashboardLayout content padding
    // (`p-4 sm:p-6 lg:pt-5 lg:pb-8 lg:px-8`) so the chat goes edge-to-edge
    // under the top bar — full inbox feel instead of "card on a page".
    <div className="-m-4 sm:-m-6 lg:-mt-5 lg:-mb-8 lg:-mx-8">
      <div className="bg-white overflow-hidden" style={{ height: 'calc(100vh - 3rem)' }}>
        <div className="flex h-full">
          {/* Chat list */}
          <div className={`w-full lg:w-80 lg:min-w-[320px] lg:border-r border-gray-200/60 flex flex-col ${showingConversation ? 'hidden lg:flex' : 'flex'}`}>
            <div className="p-3 border-b border-gray-200/60 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide tabular-nums">
                  {filter === 'closed'
                    ? (filteredChats.length === closedChats.length
                        ? `${closedChats.length} cerrad${closedChats.length !== 1 ? 'os' : 'o'}`
                        : `${filteredChats.length} de ${closedChats.length}`)
                    : (filteredChats.length === chats.length
                        ? `${chats.length} conversacion${chats.length !== 1 ? 'es' : ''}`
                        : `${filteredChats.length} de ${chats.length}`)}
                </p>
                <button
                  onClick={() => setAudioMuted(m => !m)}
                  title={audioMuted ? 'Activar alertas sonoras' : 'Silenciar alertas sonoras'}
                  aria-label={audioMuted ? 'Activar alertas sonoras' : 'Silenciar alertas sonoras'}
                  className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                    audioMuted
                      ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                      : 'text-[#007AFF] hover:bg-[#007AFF]/10'
                  }`}
                >
                  {audioMuted ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H2v6h4l5 4V5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M22 9l-6 6M16 9l6 6" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H2v6h4l5 4V5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar tienda, email, mensaje..."
                  className="w-full pl-8 pr-7 py-1.5 bg-gray-100 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#007AFF]/40 focus:bg-white transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    aria-label="Limpiar búsqueda"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Filter pills */}
              <div className="flex items-center gap-1 overflow-x-auto -mx-1 px-1 pb-0.5">
                {([
                  { value: 'all',        label: 'Todos' },
                  { value: 'unread',     label: 'No leídos' },
                  { value: 'escalated',  label: 'Escalados' },
                  { value: 'paused',     label: 'IA pausada' },
                  { value: 'closed',     label: 'Cerrados' },
                ] as const).map(opt => {
                  const count = filterCounts[opt.value]
                  const active = filter === opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setFilter(opt.value)}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
                        active
                          ? 'bg-[#007AFF] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {opt.label}
                      {count > 0 && (
                        <span className={`ml-1 tabular-nums ${active ? 'text-white/70' : 'text-gray-400'}`}>
                          {count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filter === 'closed' && closedChatsLoading && (
                <div className="flex items-center justify-center py-10">
                  <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-700 rounded-full animate-spin" />
                </div>
              )}
              {!(filter === 'closed' && closedChatsLoading) && filteredChats.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-6 py-10">
                  <svg className="w-10 h-10 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <p className="text-sm text-gray-400">
                    {searchQuery
                      ? 'Sin coincidencias para tu búsqueda'
                      : filter === 'closed'
                        ? 'No hay conversaciones cerradas'
                        : filter !== 'all'
                          ? 'Sin coincidencias con el filtro actual'
                          : 'No hay conversaciones aún'}
                  </p>
                  {(filter !== 'all' || searchQuery) && (
                    <button
                      onClick={() => { setFilter('all'); setSearchQuery('') }}
                      className="mt-2 text-xs text-[#007AFF] hover:underline"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>
              )}

              {filteredChats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                    selectedChat?.id === chat.id ? 'bg-[#007AFF]/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {storeMap[chat.storeId]?.logo ? (
                      <img
                        src={storeMap[chat.storeId]!.logo}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover bg-gray-100 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-white">
                          {chat.storeName[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}
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
                          {chat.lastMessageBy === 'assistant' && <span className="text-purple-400">Sofía: </span>}
                          {chat.lastMessage}
                        </p>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                          {chat.aiPaused && (
                            <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-semibold rounded-full">
                              IA pausada
                            </span>
                          )}
                          {chat.escalated && (
                            <span className="px-1.5 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-semibold rounded-full">
                              Escalado
                            </span>
                          )}
                          {chat.unreadByAdmin > 0 && (
                            <span className="min-w-[20px] h-5 px-1.5 bg-[#007AFF] text-white text-[11px] font-bold rounded-full flex items-center justify-center">
                              {chat.unreadByAdmin}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5 truncate">{chat.userEmail}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Conversation */}
          <div
            onDrop={handleDrop}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onPaste={handlePaste}
            className={`flex-1 flex flex-col bg-[#f8f9fa] relative ${showingConversation ? 'flex' : 'hidden lg:flex'} ${dragging ? 'ring-2 ring-[#007AFF] ring-inset' : ''}`}
          >
            {/* Drop overlay */}
            {dragging && (
              <div className="absolute inset-0 bg-[#007AFF]/10 z-10 flex items-center justify-center pointer-events-none">
                <div className="bg-white px-4 py-2 rounded-xl shadow-lg text-sm font-medium text-[#007AFF]">
                  Soltar imagen aquí
                </div>
              </div>
            )}
            {selectedChat ? (
              <>
                {/* Conversation header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200/60 bg-white">
                  <button
                    onClick={() => setSelectedChat(null)}
                    className="lg:hidden p-1 text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  {storeMap[selectedChat.storeId]?.logo ? (
                    <img
                      src={storeMap[selectedChat.storeId]!.logo}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover bg-gray-100 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-white">
                        {selectedChat.storeName[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Link
                        to={`/admin/stores/${selectedChat.storeId}`}
                        className="text-sm font-semibold text-gray-900 hover:underline truncate"
                      >
                        {selectedChat.storeName}
                      </Link>
                      {storeMap[selectedChat.storeId]?.plan && (
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-medium rounded uppercase tracking-wide">
                          {storeMap[selectedChat.storeId]!.plan}
                        </span>
                      )}
                      {storeMap[selectedChat.storeId]?.country && (
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-medium rounded">
                          {storeMap[selectedChat.storeId]!.country}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-gray-500 min-w-0">
                      <span className="truncate">{selectedChat.userEmail}</span>
                      {storeMap[selectedChat.storeId]?.subdomain && (
                        <>
                          <span className="text-gray-300">·</span>
                          <a
                            href={`https://${storeMap[selectedChat.storeId]!.subdomain}.shopifree.app`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#007AFF] hover:underline whitespace-nowrap truncate"
                          >
                            {storeMap[selectedChat.storeId]!.subdomain}
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Action buttons. On mobile we collapse to icons so
                      the header doesn't push the row past the viewport
                      width (which would force horizontal scroll). The
                      label re-appears at sm: where there's room. */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={handleTogglePause}
                      disabled={togglingPause}
                      title={selectedChat.aiPaused ? 'Reanudar IA' : 'Pausar IA'}
                      aria-label={selectedChat.aiPaused ? 'Reanudar IA' : 'Pausar IA'}
                      className={`px-2 sm:px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-1 ${
                        selectedChat.aiPaused
                          ? 'text-green-600 bg-green-50 hover:bg-green-100'
                          : 'text-orange-600 bg-orange-50 hover:bg-orange-100'
                      }`}
                    >
                      {selectedChat.aiPaused ? (
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
                        </svg>
                      )}
                      <span className="hidden sm:inline">
                        {selectedChat.aiPaused ? 'Reanudar IA' : 'Pausar IA'}
                      </span>
                    </button>
                    <button
                      onClick={handleCloseChat}
                      disabled={closing}
                      title={confirmingClose ? 'Confirmar cierre' : 'Cerrar chat'}
                      aria-label={confirmingClose ? 'Confirmar cierre' : 'Cerrar chat'}
                      className={`px-2 sm:px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-1 ${
                        confirmingClose
                          ? 'text-white bg-red-600 hover:bg-red-700'
                          : 'text-red-600 bg-red-50 hover:bg-red-100'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="hidden sm:inline">
                        {closing ? 'Cerrando...' : confirmingClose ? '¿Confirmar?' : 'Cerrar chat'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-3" onScroll={handleMessagesScroll}>
                  <div className="max-w-2xl mx-auto">
                    {groupedMessages.map((group) => (
                      <div key={group.date} className="mb-1">
                        {/* Date separator — sticks to the top of the
                            scroll viewport while you scroll through that
                            day's messages, then hands off to the next
                            day's separator when its parent scrolls past. */}
                        <div className="sticky top-0 z-[1] flex items-center justify-center py-2">
                          <span className="text-[11px] text-gray-500 bg-white px-3 py-0.5 rounded-full shadow-sm border border-gray-200/60">
                            {formatDateSeparator(group.messages[0].createdAt)}
                          </span>
                        </div>

                        {group.messages.map((msg, i, arr) => {
                          // Grouping consecutive messages from the same
                          // sender within ~5 min collapses redundant
                          // avatars, labels, and timestamps so a back-
                          // and-forth doesn't read as 20 separate cards.
                          const RUN_THRESHOLD_MS = 5 * 60 * 1000
                          const prev = arr[i - 1]
                          const next = arr[i + 1]
                          const sameAsPrev = !!prev && prev.senderType === msg.senderType
                            && (msg.createdAt.getTime() - prev.createdAt.getTime()) < RUN_THRESHOLD_MS
                          const sameAsNext = !!next && next.senderType === msg.senderType
                            && (next.createdAt.getTime() - msg.createdAt.getTime()) < RUN_THRESHOLD_MS
                          const isFirstOfRun = !sameAsPrev
                          const isLastOfRun = !sameAsNext

                          const isAdmin = msg.senderType === 'admin'
                          const isAssistant = msg.senderType === 'assistant'
                          return (
                            <div
                              key={msg.id}
                              className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} ${isLastOfRun ? 'mb-3' : 'mb-0.5'}`}
                            >
                              {isAssistant && (
                                isFirstOfRun ? (
                                  <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center mr-1.5 mt-1 flex-shrink-0">
                                    <span className="text-[10px]">✨</span>
                                  </div>
                                ) : (
                                  <div className="w-6 mr-1.5 flex-shrink-0" />
                                )
                              )}
                              <div
                                className={`max-w-[70%] px-3.5 py-2 rounded-xl shadow-sm transition-opacity ${
                                  msg.pending ? 'opacity-70' : ''
                                } ${
                                  isAdmin
                                    ? `bg-[#007AFF] text-white ${isLastOfRun ? 'rounded-br-md' : ''}`
                                    : isAssistant
                                      ? `bg-purple-50 text-gray-900 border border-purple-100 ${isLastOfRun ? 'rounded-bl-md' : ''}`
                                      : `bg-white text-gray-900 ${isLastOfRun ? 'rounded-bl-md' : ''}`
                                }`}
                              >
                                {isAssistant && isFirstOfRun && (
                                  <p className="text-[10px] font-semibold text-purple-500 mb-0.5">Sofía (IA)</p>
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
                                            ? 'max-w-full max-h-48 object-contain'
                                            : 'aspect-square w-full object-cover'
                                        }`}
                                        onClick={() => setLightboxUrl(url)}
                                      />
                                    ))}
                                  </div>
                                )}
                                {msg.text && msg.text !== 'Imagen' && (
                                  <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{linkifyText(msg.text, isAdmin)}</p>
                                )}
                                {isLastOfRun && (
                                  <div className={`flex items-center justify-end gap-1 mt-0.5 text-[10px] ${isAdmin ? 'text-white/60' : 'text-gray-400'}`}>
                                    <span>{formatTime(msg.createdAt)}</span>
                                    {isAdmin && msg.id === lastAdminMsgId && (
                                      msg.pending ? (
                                        // Pending — server hasn't ack'd yet
                                        <svg
                                          viewBox="0 0 12 12"
                                          className="w-3 h-3 fill-none stroke-white/60 flex-shrink-0"
                                          strokeWidth={1.5}
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          aria-label="Enviando"
                                        >
                                          <circle cx="6" cy="6" r="5" />
                                          <path d="M6 3 V6 L8.5 7.5" />
                                        </svg>
                                      ) : selectedChat.unreadByUser === 0 ? (
                                        // Read — both ticks, full opacity
                                        <svg
                                          viewBox="0 0 18 11"
                                          className="w-4 h-3 fill-none stroke-white flex-shrink-0"
                                          strokeWidth={2.5}
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          aria-label="Leído"
                                        >
                                          <path d="M1 6 L4 9 L11 1" />
                                          <path d="M7 6 L10 9 L17 1" />
                                        </svg>
                                      ) : (
                                        // Sent (not yet read) — single tick, faded
                                        <svg
                                          viewBox="0 0 12 11"
                                          className="w-3 h-3 fill-none stroke-white/50 flex-shrink-0"
                                          strokeWidth={2.5}
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          aria-label="Enviado"
                                        >
                                          <path d="M1 6 L4 9 L11 1" />
                                        </svg>
                                      )
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* "Nuevo mensaje" chip — only shows when the admin is
                    scrolled up reading history and a fresh message lands.
                    Click to jump to the bottom and dismiss. */}
                {hasNewMessage && (
                  <button
                    onClick={scrollToLatest}
                    className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full bg-[#007AFF] text-white text-xs font-medium shadow-lg hover:bg-[#0066DD] transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    Nuevo mensaje
                  </button>
                )}

                {/* Input */}
                <div className="border-t border-gray-200/60 px-3 py-2 bg-white">
                  <div className="max-w-2xl mx-auto">
                    {/* Failed send banner — shows the last message that
                        couldn't be delivered with retry/discard actions.
                        Wins over previously-silent failures where the
                        text just reappeared in the input with no clue. */}
                    {failedSend && (
                      <div className="mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                        <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-red-700">No se pudo enviar el mensaje</p>
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

                    {/* Pending images preview — one thumb per queued
                        image with its own upload spinner / remove button.
                        flex-wrap so a long queue spills onto a second row
                        instead of stretching the input area. */}
                    {pendingImages.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
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
                        placeholder="Responder..."
                        rows={1}
                        className="flex-1 px-4 py-2.5 bg-gray-100 rounded-2xl text-[16px] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 resize-none leading-snug max-h-[160px] overflow-y-auto block"
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

      {/* Image lightbox — opens in-app instead of popping a new tab. ESC
          and ←/→ wired up via the keydown effect above; clicking the
          backdrop also closes. The image itself stops propagation so a
          click on it doesn't dismiss. */}
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
    </div>
  )
}
