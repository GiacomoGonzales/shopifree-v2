import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, type Firestore, FieldValue } from 'firebase-admin/firestore'
import Anthropic from '@anthropic-ai/sdk'
import { buildSystemPrompt } from './_shared/sofia-knowledge.js'

let db: Firestore

function getDb(): Firestore {
  if (!db) {
    if (!getApps().length) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey
        })
      })
    }
    db = getFirestore()
  }
  return db
}

interface RequestBody {
  chatId: string
  storeId: string
  userMessage: string
  userId: string
}

// Sofía's knowledge base lives in ./_shared/sofia-knowledge.ts (plan
// prices/limits injected from src/lib/plans.ts). Built once at load.
const SYSTEM_PROMPT = buildSystemPrompt()

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { chatId, storeId, userMessage, userId } = req.body as RequestBody

  if (!chatId || !storeId || !userMessage || !userId) {
    return res.status(400).json({ error: 'Missing required parameters' })
  }

  const firestore = getDb()

  try {
    // Verify chat belongs to user
    const chatDoc = await firestore.collection('chats').doc(chatId).get()
    if (!chatDoc.exists || chatDoc.data()?.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    // Skip AI if chat is already escalated
    if (chatDoc.data()?.escalated) {
      return res.status(200).json({ success: true, escalated: true, skipped: true })
    }

    // Skip AI if admin has paused automatic responses
    if (chatDoc.data()?.aiPaused) {
      return res.status(200).json({ success: true, escalated: false, skipped: true })
    }

    // Fetch store context
    const storeDoc = await firestore.collection('stores').doc(storeId).get()
    const storeData = storeDoc.exists ? storeDoc.data() : null

    // Fetch products and recent orders in parallel
    const [productsSnap, ordersSnap] = await Promise.all([
      firestore.collection('stores').doc(storeId).collection('products')
        .limit(50).get(),
      firestore.collection('stores').doc(storeId).collection('orders')
        .orderBy('createdAt', 'desc').limit(5).get()
    ])

    const products = productsSnap.docs.map(d => {
      const p = d.data()
      return { name: p.name, price: p.price, stock: p.stock, category: p.category }
    })

    const orders = ordersSnap.docs.map(d => {
      const o = d.data()
      return { orderNumber: o.orderNumber, status: o.status, total: o.total, date: o.createdAt?.toDate?.()?.toISOString?.() }
    })

    // Build dynamic context
    let contextBlock = `\n## Contexto de la tienda del usuario`
    if (storeData) {
      contextBlock += `\n- Nombre: ${storeData.name || 'Sin nombre'}`
      contextBlock += `\n- Plan actual: ${storeData.plan || 'free'}`
      contextBlock += `\n- Productos: ${products.length} productos`
      if (products.length > 0) {
        contextBlock += `\n- Algunos productos: ${products.slice(0, 10).map(p => `${p.name} ($${p.price})`).join(', ')}`
      }
      if (orders.length > 0) {
        contextBlock += `\n- Pedidos recientes: ${orders.map(o => `#${o.orderNumber} (${o.status})`).join(', ')}`
      }
      if (storeData.payments?.mercadopago?.enabled) {
        contextBlock += `\n- MercadoPago: configurado`
      } else {
        contextBlock += `\n- MercadoPago: no configurado`
      }
      if (storeData.shipping?.zones?.length) {
        contextBlock += `\n- Envío: ${storeData.shipping.zones.length} zona(s) configurada(s)`
      } else {
        contextBlock += `\n- Envío: no configurado`
      }
    }

    // Fetch chat history (last 20 messages)
    const historySnap = await firestore
      .collection('chats').doc(chatId).collection('messages')
      .orderBy('createdAt', 'asc')
      .limitToLast(20)
      .get()

    const history: Anthropic.MessageParam[] = []
    for (const doc of historySnap.docs) {
      const data = doc.data()
      const role = data.senderType === 'user' ? 'user' as const : 'assistant' as const
      const textContent = data.text || ''
      const imageUrl = data.imageUrl as string | undefined

      // Build content blocks for this message
      const contentBlocks: Anthropic.ContentBlockParam[] = []
      if (imageUrl && role === 'user') {
        contentBlocks.push({
          type: 'image',
          source: { type: 'url', url: imageUrl },
        })
      }
      if (textContent && textContent !== 'Imagen') {
        contentBlocks.push({ type: 'text', text: textContent })
      }
      // If only an image with no real text, add a description
      if (contentBlocks.length > 0 && !contentBlocks.some(b => b.type === 'text')) {
        contentBlocks.push({ type: 'text', text: '(El usuario envió una imagen)' })
      }

      if (contentBlocks.length === 0) continue

      // Consolidate consecutive messages of the same role (text only)
      const last = history[history.length - 1]
      if (last && last.role === role && !imageUrl && typeof last.content === 'string') {
        last.content = last.content + '\n' + textContent
      } else if (contentBlocks.length === 1 && contentBlocks[0].type === 'text') {
        history.push({ role, content: (contentBlocks[0] as Anthropic.TextBlockParam).text })
      } else {
        history.push({ role, content: contentBlocks })
      }
    }

    // Ensure history starts with user and alternates correctly
    // Remove leading assistant messages
    while (history.length > 0 && history[0].role === 'assistant') {
      history.shift()
    }

    // If history is empty (shouldn't happen since user just sent a message), add the current message
    if (history.length === 0) {
      history.push({ role: 'user', content: userMessage })
    }

    // Call Claude
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    let aiResponse: string
    let escalated = false

    try {
      const completion = await anthropic.messages.create({
        model: 'claude-sonnet-5',
        max_tokens: 500,
        thinking: { type: 'disabled' },
        system: SYSTEM_PROMPT + contextBlock,
        messages: history,
      })

      aiResponse = completion.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('')

      // Detect escalation
      if (aiResponse.includes('[ESCALATE]')) {
        aiResponse = aiResponse.replace(/\s*\[ESCALATE\]\s*/g, '').trim()
        escalated = true
      }
    } catch (aiError) {
      console.error('[ai-chat] Claude API error:', aiError)
      aiResponse = 'Disculpa, estoy teniendo dificultades técnicas en este momento. Te conecto con nuestro equipo de soporte para ayudarte mejor.'
      escalated = true
    }

    // Write AI response to Firestore
    await firestore.collection('chats').doc(chatId).collection('messages').add({
      text: aiResponse,
      senderId: 'ai-assistant',
      senderType: 'assistant',
      createdAt: FieldValue.serverTimestamp(),
    })

    // Update chat metadata
    const chatUpdate: Record<string, unknown> = {
      lastMessage: aiResponse,
      lastMessageAt: FieldValue.serverTimestamp(),
      lastMessageBy: 'assistant',
    }

    if (escalated) {
      chatUpdate.escalated = true
      // Increment unreadByAdmin so admin sees it
      const current = chatDoc.data()?.unreadByAdmin || 0
      chatUpdate.unreadByAdmin = current + 1
    }

    await firestore.collection('chats').doc(chatId).update(chatUpdate)

    return res.status(200).json({ success: true, escalated })
  } catch (error) {
    console.error('[ai-chat] Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
