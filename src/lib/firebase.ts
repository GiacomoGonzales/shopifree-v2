import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, Timestamp, type DocumentData } from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import type { User, Store, Product, Category, Order } from '../types'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'shopifree-v2',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// ============================================
// HELPER FUNCTIONS
// ============================================

const convertTimestamps = <T extends DocumentData>(data: T): T => {
  const converted = { ...data }
  for (const key in converted) {
    if (converted[key] instanceof Timestamp) {
      converted[key] = converted[key].toDate() as any
    }
  }
  return converted
}

// ============================================
// USER SERVICES
// ============================================

export const userService = {
  async get(userId: string): Promise<User | null> {
    const docRef = doc(db, 'users', userId)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) return null
    return { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as User
  },

  async create(userId: string, data: Partial<User>): Promise<void> {
    await setDoc(doc(db, 'users', userId), {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    })
  },

  async update(userId: string, data: Partial<User>): Promise<void> {
    await updateDoc(doc(db, 'users', userId), {
      ...data,
      updatedAt: new Date()
    })
  }
}

// ============================================
// STORE SERVICES
// ============================================

export const storeService = {
  async get(storeId: string): Promise<Store | null> {
    const docRef = doc(db, 'stores', storeId)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) return null
    return { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as Store
  },

  async getByOwner(ownerId: string): Promise<Store | null> {
    const q = query(collection(db, 'stores'), where('ownerId', '==', ownerId))
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null
    const docSnap = snapshot.docs[0]
    return { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as Store
  },

  async getBySubdomain(subdomain: string): Promise<Store | null> {
    const q = query(collection(db, 'stores'), where('subdomain', '==', subdomain))
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null
    const docSnap = snapshot.docs[0]
    return { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as Store
  },

  async create(storeId: string, data: Partial<Store>): Promise<void> {
    await setDoc(doc(db, 'stores', storeId), {
      ...data,
      plan: data.plan || 'free', // Use provided plan or default to free
      stats: {
        totalProducts: 0,
        totalOrders: 0,
        totalRevenue: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    })

    // Register subdomain
    if (data.subdomain) {
      await setDoc(doc(db, 'subdomains', data.subdomain), {
        storeId,
        createdAt: new Date()
      })
    }
  },

  async update(storeId: string, data: Partial<Store>): Promise<void> {
    await updateDoc(doc(db, 'stores', storeId), {
      ...data,
      updatedAt: new Date()
    })
  }
}

// ============================================
// PRODUCT SERVICES (Subcollection)
// ============================================

export const productService = {
  getCollection(storeId: string) {
    return collection(db, 'stores', storeId, 'products')
  },

  async getAll(storeId: string): Promise<Product[]> {
    const q = query(
      this.getCollection(storeId),
      orderBy('order', 'asc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      storeId,
      ...convertTimestamps(doc.data())
    })) as Product[]
  },

  async getActive(storeId: string): Promise<Product[]> {
    const q = query(
      this.getCollection(storeId),
      where('active', '==', true),
      orderBy('order', 'asc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      storeId,
      ...convertTimestamps(doc.data())
    })) as Product[]
  },

  async get(storeId: string, productId: string): Promise<Product | null> {
    const docRef = doc(db, 'stores', storeId, 'products', productId)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) return null
    return { id: docSnap.id, storeId, ...convertTimestamps(docSnap.data()) } as Product
  },

  async create(storeId: string, data: Partial<Product>): Promise<string> {
    const productsRef = this.getCollection(storeId)
    const newDocRef = doc(productsRef)
    await setDoc(newDocRef, {
      ...data,
      storeId,
      active: data.active ?? true,
      order: data.order ?? 0,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    return newDocRef.id
  },

  async update(storeId: string, productId: string, data: Partial<Product>): Promise<void> {
    await updateDoc(doc(db, 'stores', storeId, 'products', productId), {
      ...data,
      updatedAt: new Date()
    })
  },

  async delete(storeId: string, productId: string): Promise<void> {
    await deleteDoc(doc(db, 'stores', storeId, 'products', productId))
  }
}

// ============================================
// CATEGORY SERVICES (Subcollection)
// ============================================

export const categoryService = {
  getCollection(storeId: string) {
    return collection(db, 'stores', storeId, 'categories')
  },

  async getAll(storeId: string): Promise<Category[]> {
    const q = query(
      this.getCollection(storeId),
      orderBy('order', 'asc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      storeId,
      ...convertTimestamps(doc.data())
    })) as Category[]
  },

  async getActive(storeId: string): Promise<Category[]> {
    const q = query(
      this.getCollection(storeId),
      where('active', '==', true),
      orderBy('order', 'asc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      storeId,
      ...convertTimestamps(doc.data())
    })) as Category[]
  },

  async get(storeId: string, categoryId: string): Promise<Category | null> {
    const docRef = doc(db, 'stores', storeId, 'categories', categoryId)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) return null
    return { id: docSnap.id, storeId, ...convertTimestamps(docSnap.data()) } as Category
  },

  async create(storeId: string, data: Partial<Category>): Promise<string> {
    const categoriesRef = this.getCollection(storeId)
    const newDocRef = doc(categoriesRef)
    await setDoc(newDocRef, {
      ...data,
      storeId,
      active: data.active ?? true,
      order: data.order ?? 0,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    return newDocRef.id
  },

  async update(storeId: string, categoryId: string, data: Partial<Category>): Promise<void> {
    await updateDoc(doc(db, 'stores', storeId, 'categories', categoryId), {
      ...data,
      updatedAt: new Date()
    })
  },

  async delete(storeId: string, categoryId: string): Promise<void> {
    await deleteDoc(doc(db, 'stores', storeId, 'categories', categoryId))
  }
}

// ============================================
// ORDER SERVICES (Subcollection)
// ============================================

export const orderService = {
  getCollection(storeId: string) {
    return collection(db, 'stores', storeId, 'orders')
  },

  async getAll(storeId: string, limitCount = 50): Promise<Order[]> {
    const q = query(
      this.getCollection(storeId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      storeId,
      ...convertTimestamps(doc.data())
    })) as Order[]
  },

  async create(storeId: string, data: Partial<Order>): Promise<string> {
    const ordersRef = this.getCollection(storeId)
    const newDocRef = doc(ordersRef)

    // Generate order number
    const snapshot = await getDocs(query(this.getCollection(storeId)))
    const orderNumber = `ORD-${String(snapshot.size + 1).padStart(3, '0')}`

    await setDoc(newDocRef, {
      ...data,
      storeId,
      orderNumber,
      status: 'pending',
      paymentStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    })
    return newDocRef.id
  },

  async updateStatus(storeId: string, orderId: string, status: Order['status']): Promise<void> {
    await updateDoc(doc(db, 'stores', storeId, 'orders', orderId), {
      status,
      updatedAt: new Date()
    })
  }
}

// ============================================
// STORAGE SERVICES
// ============================================

export const storageService = {
  async uploadStoreImage(storeId: string, file: File, type: 'logo' | 'hero' | 'favicon'): Promise<string> {
    const ext = file.name.split('.').pop()
    const path = `stores/${storeId}/${type}.${ext}`
    const storageRef = ref(storage, path)
    await uploadBytes(storageRef, file)
    return getDownloadURL(storageRef)
  },

  async uploadProductImage(storeId: string, productId: string, file: File, index = 0): Promise<string> {
    const ext = file.name.split('.').pop()
    const fileName = index === 0 ? 'main' : String(index)
    const path = `stores/${storeId}/products/${productId}/${fileName}.${ext}`
    const storageRef = ref(storage, path)
    await uploadBytes(storageRef, file)
    return getDownloadURL(storageRef)
  },

  async deleteProductImage(storeId: string, productId: string, fileName: string): Promise<void> {
    const path = `stores/${storeId}/products/${productId}/${fileName}`
    const storageRef = ref(storage, path)
    await deleteObject(storageRef)
  }
}

export default app
