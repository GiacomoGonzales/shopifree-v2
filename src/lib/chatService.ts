import {
  collection, doc, getDoc, addDoc, updateDoc,
  query, orderBy, where, onSnapshot, serverTimestamp, limit,
  getDocs,
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
  status: 'active' | 'closed'
  lastMessage: string
  lastMessageAt: Date
  lastMessageBy: 'user' | 'admin'
  unreadByAdmin: number
  unreadByUser: number
  createdAt: Date
}

function docToChat(docSnap: { id: string; data: () => Record<string, any> }): Chat {
  const data = docSnap.data()
  return {
    id: docSnap.id,
    storeId: data.storeId,
    storeName: data.storeName,
    userId: data.userId,
    userEmail: data.userEmail,
    status: data.status || 'active',
    lastMessage: data.lastMessage || '',
    lastMessageAt: data.lastMessageAt?.toDate?.() || new Date(),
    lastMessageBy: data.lastMessageBy || 'user',
    unreadByAdmin: data.unreadByAdmin || 0,
    unreadByUser: data.unreadByUser || 0,
    createdAt: data.createdAt?.toDate?.() || new Date(),
  }
}

export const chatService = {
  // Get active chat or create a new one for a store
  async getOrCreateChat(storeId: string, storeName: string, userId: string, userEmail: string): Promise<Chat> {
    // Look for an existing active chat for this store
    const chatsRef = collection(db, 'chats')
    const q = query(chatsRef, where('storeId', '==', storeId), where('userId', '==', userId), where('status', '==', 'active'), limit(1))
    const snapshot = await getDocs(q)

    if (!snapshot.empty) {
      return docToChat(snapshot.docs[0])
    }

    // Create new chat
    const chatData = {
      storeId,
      storeName,
      userId,
      userEmail,
      status: 'active' as const,
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
      lastMessageBy: 'user' as const,
      unreadByAdmin: 0,
      unreadByUser: 0,
      createdAt: serverTimestamp(),
    }
    const docRef = await addDoc(chatsRef, chatData)

    return {
      id: docRef.id,
      ...chatData,
      lastMessageAt: new Date(),
      createdAt: new Date(),
    }
  },

  // Close a chat conversation
  async closeChat(chatId: string) {
    const chatRef = doc(db, 'chats', chatId)
    await updateDoc(chatRef, {
      status: 'closed',
      unreadByAdmin: 0,
      unreadByUser: 0,
    })
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
      const chatSnap = await getDoc(chatRef)
      const current = chatSnap.data()?.unreadByAdmin || 0
      updateData.unreadByAdmin = current + 1
      updateData.unreadByUser = 0
    } else {
      const chatSnap = await getDoc(chatRef)
      const current = chatSnap.data()?.unreadByUser || 0
      updateData.unreadByUser = current + 1
      updateData.unreadByAdmin = 0
    }

    await updateDoc(chatRef, updateData)
  },

  // Subscribe to a single chat document (to detect status changes)
  subscribeToChat(chatId: string, callback: (chat: Chat | null) => void): Unsubscribe {
    const chatRef = doc(db, 'chats', chatId)
    return onSnapshot(chatRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback(null)
        return
      }
      callback(docToChat(snapshot))
    })
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

  // Subscribe to active chats (for admin)
  subscribeToChats(callback: (chats: Chat[]) => void): Unsubscribe {
    const chatsRef = collection(db, 'chats')
    const q = query(chatsRef, where('status', '==', 'active'), orderBy('lastMessageAt', 'desc'))

    return onSnapshot(q, (snapshot) => {
      const chats: Chat[] = snapshot.docs
        .filter(doc => doc.data().lastMessage)
        .map(doc => docToChat(doc))
      callback(chats)
    })
  },

  // Subscribe to unread count for a store's active chat (for user bubble badge)
  subscribeToUnreadCount(storeId: string, userId: string, callback: (count: number) => void): Unsubscribe {
    const chatsRef = collection(db, 'chats')
    const q = query(chatsRef, where('storeId', '==', storeId), where('userId', '==', userId), where('status', '==', 'active'), limit(1))
    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        callback(snapshot.docs[0].data().unreadByUser || 0)
      } else {
        callback(0)
      }
    })
  },

  // Subscribe to total unread count across active chats (for admin badge)
  subscribeToTotalUnread(callback: (count: number) => void): Unsubscribe {
    const chatsRef = collection(db, 'chats')
    const q = query(chatsRef, where('status', '==', 'active'))
    return onSnapshot(q, (snapshot) => {
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
