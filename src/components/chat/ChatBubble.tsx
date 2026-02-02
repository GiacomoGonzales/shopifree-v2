import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { chatService } from '../../lib/chatService'
import ChatModal from './ChatModal'

export default function ChatBubble() {
  const { store } = useAuth()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)

  // Subscribe to unread count
  useEffect(() => {
    if (!store) return
    const unsub = chatService.subscribeToUnreadCount(store.id, setUnread)
    return () => unsub()
  }, [store])

  // Reset unread when opening
  useEffect(() => {
    if (open && unread > 0 && store) {
      chatService.markAsRead(store.id, 'user')
    }
  }, [open, unread, store])

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-[70px] right-4 z-[55] w-12 h-12 rounded-full bg-[#007AFF] shadow-lg shadow-[#007AFF]/30 flex items-center justify-center active:scale-95 transition-transform"
      >
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>

        {/* Unread badge */}
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Chat modal */}
      <ChatModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
