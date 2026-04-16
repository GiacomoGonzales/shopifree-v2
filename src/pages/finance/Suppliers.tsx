import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { Supplier } from '../../types'

export default function Suppliers() {
  const { store } = useAuth()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Form
  const [name, setName] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!store) return
    const fetch = async () => {
      setLoading(true)
      try {
        const snap = await getDocs(query(collection(db, `stores/${store.id}/suppliers`), orderBy('createdAt', 'desc')))
        setSuppliers(snap.docs.map(d => {
          const data = d.data()
          return { id: d.id, ...data, createdAt: data.createdAt?.toDate?.() || new Date(), updatedAt: data.updatedAt?.toDate?.() || new Date() } as Supplier
        }))
      } catch { setSuppliers([]) }
      setLoading(false)
    }
    fetch()
  }, [store])

  const resetForm = () => {
    setName(''); setContactName(''); setPhone(''); setEmail(''); setAddress(''); setNotes('')
    setEditing(null)
  }

  const openForm = (s?: Supplier) => {
    if (s) {
      setEditing(s)
      setName(s.name)
      setContactName(s.contactName || '')
      setPhone(s.phone || '')
      setEmail(s.email || '')
      setAddress(s.address || '')
      setNotes(s.notes || '')
    } else {
      resetForm()
    }
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!store || !name.trim()) return
    setSaving(true)
    try {
      // Build data dynamically — Firestore rejects undefined values.
      const data: Record<string, unknown> = {
        name: name.trim(),
        active: true,
        updatedAt: Timestamp.now(),
      }
      if (contactName.trim()) data.contactName = contactName.trim()
      if (phone.trim()) data.phone = phone.trim()
      if (email.trim()) data.email = email.trim()
      if (address.trim()) data.address = address.trim()
      if (notes.trim()) data.notes = notes.trim()

      if (editing) {
        await updateDoc(doc(db, `stores/${store.id}/suppliers`, editing.id), data)
        setSuppliers(prev => prev.map(s => s.id === editing.id ? { ...s, ...data, updatedAt: new Date() } as Supplier : s))
      } else {
        const ref = await addDoc(collection(db, `stores/${store.id}/suppliers`), { ...data, createdAt: Timestamp.now() })
        setSuppliers(prev => [{ id: ref.id, ...data, createdAt: new Date(), updatedAt: new Date() } as Supplier, ...prev])
      }
      setShowForm(false)
      resetForm()
    } catch (err) {
      console.error(err)
    }
    setSaving(false)
  }

  const handleDelete = async (s: Supplier) => {
    if (!store) return
    try {
      await deleteDoc(doc(db, `stores/${store.id}/suppliers`, s.id))
      setSuppliers(prev => prev.filter(x => x.id !== s.id))
    } catch (err) {
      console.error(err)
    }
  }

  const filtered = search
    ? suppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.contactName?.toLowerCase().includes(search.toLowerCase()) || s.phone?.includes(search))
    : suppliers

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Proveedores</h1>
          <p className="text-sm text-gray-500 mt-0.5">{suppliers.length} proveedor{suppliers.length !== 1 ? 'es' : ''}</p>
        </div>
        <button onClick={() => openForm()}
          className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d6cb5] transition-colors text-sm font-medium">
          + Nuevo proveedor
        </button>
      </div>

      {/* Search */}
      {suppliers.length > 0 && (
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar proveedor..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all" />
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200/60 p-4 space-y-3 animate-[slideDown_0.2s_ease-out]">
          <h3 className="text-sm font-medium text-gray-900">{editing ? 'Editar proveedor' : 'Nuevo proveedor'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nombre de la empresa *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Distribuidora Lima"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Persona de contacto</label>
              <input type="text" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Ej: Carlos Perez"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Telefono</label>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+51 999 999 999"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="proveedor@email.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Direccion</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Av. Principal 123, Lima"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Notas</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Productos que provee, condiciones de pago, etc."
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f]/40 transition-all resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowForm(false); resetForm() }} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
            <button onClick={handleSave} disabled={saving || !name.trim()}
              className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d6cb5] transition-colors text-sm font-medium disabled:opacity-40">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-[#1e3a5f]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="text-sm text-gray-400">{suppliers.length === 0 ? 'Sin proveedores registrados' : 'Sin resultados'}</p>
            {suppliers.length === 0 && <p className="text-xs text-gray-300 mt-1">Agrega tu primer proveedor para gestionar tus compras</p>}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(s => {
              const isOpen = expandedId === s.id
              return (
                <div key={s.id}>
                  <div className="px-4 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(isOpen ? null : s.id)}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-gray-500">{s.name[0].toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {s.contactName || s.phone || s.email || 'Sin datos de contacto'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={e => { e.stopPropagation(); openForm(s) }}
                        className="p-1.5 text-gray-300 hover:text-gray-500 rounded-md hover:bg-gray-100 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                        </svg>
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleDelete(s) }}
                        className="p-1.5 text-gray-300 hover:text-red-400 rounded-md hover:bg-gray-100 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                      <svg className={`w-4 h-4 text-gray-300 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </div>

                  {/* Detail */}
                  {isOpen && (
                    <div className="px-4 pb-3 pl-16 space-y-1.5 animate-[slideDown_0.15s_ease-out]">
                      {s.contactName && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-400 w-16">Contacto</span>
                          <span className="text-gray-700">{s.contactName}</span>
                        </div>
                      )}
                      {s.phone && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-400 w-16">Telefono</span>
                          <a href={`tel:${s.phone}`} className="text-blue-500 hover:text-blue-700">{s.phone}</a>
                        </div>
                      )}
                      {s.email && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-400 w-16">Email</span>
                          <a href={`mailto:${s.email}`} className="text-blue-500 hover:text-blue-700">{s.email}</a>
                        </div>
                      )}
                      {s.address && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-400 w-16">Direccion</span>
                          <span className="text-gray-700">{s.address}</span>
                        </div>
                      )}
                      {s.notes && (
                        <div className="flex items-start gap-2 text-xs mt-1">
                          <span className="text-gray-400 w-16">Notas</span>
                          <span className="text-gray-600">{s.notes}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
