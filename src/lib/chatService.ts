import {
  collection, doc, getDoc, setDoc, addDoc, updateDoc,
  query, orderBy, onSnapshot, serverTimestamp,
  type Unsubscribe
} from 'firebase/firestore'
import { db } from './firebase'

export interface ChatMessage {
  id: string
  text: string
  senderId: string
  senderType: 'user' | 'admin'
  createdAt: Date
}

export interface Chat {
  id: string
  storeId: string
  storeName: string
  userId: string
  userEmail: string
  lastMessage: string
  lastMessageAt: Date
  lastMessageBy: 'user' | 'admin'
  unreadByAdmin: number
  unreadByUser: number
  createdAt: Date
}

export const chatService = {
  // Get or create a chat for a store
  async getOrCreateChat(storeId: string, storeName: string, userId: string, userEmail: string): Promise<Chat> {
    const chatRef = doc(db, 'chats', storeId)
    const chatSnap = await getDoc(chatRef)

    if (chatSnap.exists()) {
      const data = chatSnap.data()
      return {
        id: chatSnap.id,
        storeId: data.storeId,
        storeName: data.storeName,
        userId: data.userId,
        userEmail: data.userEmail,
        lastMessage: data.lastMessage || '',
        lastMessageAt: data.lastMessageAt?.toDate?.() || new Date(),
        lastMessageBy: data.lastMessageBy || 'user',
        unreadByAdmin: data.unreadByAdmin || 0,
        unreadByUser: data.unreadByUser || 0,
        createdAt: data.createdAt?.toDate?.() || new Date(),
      }
    }

    // Create new chat
    const chatData = {
      storeId,
      storeName,
      userId,
      userEmail,
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
      lastMessageBy: 'user' as const,
      unreadByAdmin: 0,
      unreadByUser: 0,
      createdAt: serverTimestamp(),
    }
    await setDoc(chatRef, chatData)

    return {
      id: storeId,
      ...chatData,
      lastMessageAt: new Date(),
      createdAt: new Date(),
    }
  },

  // Send a message
  async sendMessage(chatId: string, text: string, senderId: string, senderType: 'user' | 'admin') {
    const messagesRef = collection(db, 'chats', chatId, 'messages')
    await addDoc(messagesRef, {
      text,
      senderId,
      senderType,
      createdAt: serverTimestamp(),
    })

    // Update chat metadata
    const chatRef = doc(db, 'chats', chatId)
    const updateData: Record<string, unknown> = {
      lastMessage: text,
      lastMessageAt: serverTimestamp(),
      lastMessageBy: senderType,
    }

    if (senderType === 'user') {
      // Increment unread for admin
      const chatSnap = await getDoc(chatRef)
      const current = chatSnap.data()?.unreadByAdmin || 0
      updateData.unreadByAdmin = current + 1
      updateData.unreadByUser = 0
    } else {
      // Increment unread for user
      const chatSnap = await getDoc(chatRef)
      const current = chatSnap.data()?.unreadByUser || 0
      updateData.unreadByUser = current + 1
      updateData.unreadByAdmin = 0
    }

    await updateDoc(chatRef, updateData)
  },

  // Subscribe to messages in real-time
  subscribeToMessages(chatId: string, callback: (messages: ChatMessage[]) => void): Unsubscribe {
    const messagesRef = collection(db, 'chats', chatId, 'messages')
    const q = query(messagesRef, orderBy('createdAt', 'asc'))

    return onSnapshot(q, (snapshot) => {
      const messages: ChatMessage[] = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          text: data.text,
          senderId: data.senderId,
          senderType: data.senderType,
          createdAt: data.createdAt?.toDate?.() || new Date(),
        }
      })
      callback(messages)
    })
  },

  // Subscribe to all chats (for admin)
  subscribeToChats(callback: (chats: Chat[]) => void): Unsubscribe {
    const chatsRef = collection(db, 'chats')
    const q = query(chatsRef, orderBy('lastMessageAt', 'desc'))

    return onSnapshot(q, (snapshot) => {
      const chats: Chat[] = snapshot.docs
        .filter(doc => doc.data().lastMessage) // Only show chats with messages
        .map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            storeId: data.storeId,
            storeName: data.storeName,
            userId: data.userId,
            userEmail: data.userEmail,
            lastMessage: data.lastMessage || '',
            lastMessageAt: data.lastMessageAt?.toDate?.() || new Date(),
            lastMessageBy: data.lastMessageBy || 'user',
            unreadByAdmin: data.unreadByAdmin || 0,
            unreadByUser: data.unreadByUser || 0,
            createdAt: data.createdAt?.toDate?.() || new Date(),
          }
        })
      callback(chats)
    })
  },

  // Subscribe to unread count for a specific chat (for user bubble badge)
  subscribeToUnreadCount(chatId: string, callback: (count: number) => void): Unsubscribe {
    const chatRef = doc(db, 'chats', chatId)
    return onSnapshot(chatRef, (snap) => {
      if (snap.exists()) {
        callback(snap.data().unreadByUser || 0)
      } else {
        callback(0)
      }
    })
  },

  // Subscribe to total unread count across all chats (for admin badge)
  subscribeToTotalUnread(callback: (count: number) => void): Unsubscribe {
    const chatsRef = collection(db, 'chats')
    return onSnapshot(query(chatsRef), (snapshot) => {
      let total = 0
      snapshot.docs.forEach(doc => {
        total += doc.data().unreadByAdmin || 0
      })
      callback(total)
    })
  },

  // Mark messages as read
  async markAsRead(chatId: string, role: 'user' | 'admin') {
    const chatRef = doc(db, 'chats', chatId)
    if (role === 'user') {
      await updateDoc(chatRef, { unreadByUser: 0 })
    } else {
      await updateDoc(chatRef, { unreadByAdmin: 0 })
    }
  },
}
