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
        onClick={() => setOpen(!open)}
        className={`fixed bottom-[70px] right-4 lg:bottom-6 lg:right-6 z-[55] w-12 h-12 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all duration-200 ${
          open ? 'bg-gray-600 shadow-gray-600/30 rotate-0' : 'bg-[#007AFF] shadow-[#007AFF]/30'
        }`}
      >
        {open ? (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h.01M12 10h.01M15 10h.01" />
          </svg>
        )}

        {/* Unread badge */}
        {!open && unread > 0 && (
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
