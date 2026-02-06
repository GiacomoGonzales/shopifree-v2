import { useState, useEffect } from 'react'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useToast } from '../../components/ui/Toast'
import type { User } from '../../types'

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@shopifree.app'

export default function AdminUsers() {
  const { showToast } = useToast()
  const [users, setUsers] = useState<(User & { id: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [updatingRole, setUpdatingRole] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'users'))
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (User & { id: string })[]

      // Sort by creation date
      const toDate = (d: any) => {
        if (!d) return new Date(0)
        if (d.toDate) return d.toDate()
        if (d instanceof Date) return d
        return new Date(d)
      }
      usersData.sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime())

      setUsers(usersData)
    } catch (error) {
      console.error('Error fetching users:', error)
      showToast('Error al cargar los usuarios', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleRole = async (userId: string, currentRole: string | undefined) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    setUpdatingRole(userId)

    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        updatedAt: new Date()
      })

      setUsers(users.map(u =>
        u.id === userId ? { ...u, role: newRole } : u
      ))

      showToast(`Rol actualizado a ${newRole}`, 'success')
    } catch (error) {
      console.error('Error updating role:', error)
      showToast('Error al actualizar el rol', 'error')
    } finally {
      setUpdatingRole(null)
    }
  }

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.firstName && user.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.lastName && user.lastName.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Check if user is admin by email or role
  const isUserAdmin = (user: User) => {
    return user.role === 'admin' || user.email === ADMIN_EMAIL
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <span className="px-2.5 py-1 bg-violet-100 text-violet-700 text-sm font-semibold rounded-full">
            {users.length}
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <input
          type="text"
          placeholder="Buscar por email o nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white/50 backdrop-blur border border-white/80 rounded-xl focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all text-gray-900 placeholder-gray-400"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Users Table / Cards */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 rounded-2xl overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/50 border-b border-white/60">
                <th className="text-left px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Usuario</th>
                <th className="text-left px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Email</th>
                <th className="text-left px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Rol</th>
                <th className="text-left px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Stripe ID</th>
                <th className="text-left px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Registrado</th>
                <th className="text-left px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-white/60 hover:bg-white/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {user.avatar ? (
                        <img src={user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-violet-600 font-bold">
                            {user.firstName ? user.firstName.charAt(0) : user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">
                          {user.firstName && user.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : 'Sin nombre'
                          }
                        </p>
                        {user.phone && (
                          <p className="text-xs text-gray-400">{user.phone}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {user.email}
                    {user.email === ADMIN_EMAIL && (
                      <span className="ml-2 text-xs text-violet-600 font-medium">(Super Admin)</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                      isUserAdmin(user)
                        ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white'
                        : 'bg-gray-100/80 text-gray-600'
                    }`}>
                      {isUserAdmin(user) ? 'admin' : 'user'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {user.stripeCustomerId ? (
                      <code className="text-xs bg-white/50 text-gray-600 px-2 py-1 rounded border border-white/80">
                        {user.stripeCustomerId}
                      </code>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {user.createdAt
                      ? (user.createdAt as any).toDate
                        ? (user.createdAt as any).toDate().toLocaleDateString()
                        : user.createdAt instanceof Date
                          ? user.createdAt.toLocaleDateString()
                          : new Date(user.createdAt).toLocaleDateString()
                      : '-'
                    }
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleRole(user.id, user.role)}
                      disabled={updatingRole === user.id}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        isUserAdmin(user)
                          ? 'text-gray-500 hover:bg-white/50 hover:text-gray-700'
                          : 'text-violet-600 hover:bg-violet-50'
                      }`}
                    >
                      {updatingRole === user.id ? (
                        <span className="flex items-center gap-1">
                          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Actualizando...
                        </span>
                      ) : isUserAdmin(user) ? (
                        'Quitar admin'
                      ) : (
                        'Hacer admin'
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-white/60">
          {filteredUsers.map((user) => (
            <div key={user.id} className="p-4 hover:bg-white/40 transition-colors">
              {/* Row 1: Avatar + Name + Role badge */}
              <div className="flex items-center gap-3">
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-violet-600 font-bold">
                      {user.firstName ? user.firstName.charAt(0) : user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-gray-900 truncate">
                      {user.firstName && user.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : 'Sin nombre'
                      }
                    </p>
                    <span className={`px-2.5 py-0.5 text-[11px] rounded-full font-medium flex-shrink-0 ${
                      isUserAdmin(user)
                        ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white'
                        : 'bg-gray-100/80 text-gray-600'
                    }`}>
                      {isUserAdmin(user) ? 'admin' : 'user'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {user.email}
                    {user.email === ADMIN_EMAIL && (
                      <span className="ml-1 text-violet-600 font-medium">(Super Admin)</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Row 2: Date + Action */}
              <div className="flex items-center justify-between mt-2.5 pl-[52px]">
                <span className="text-xs text-gray-400">
                  {user.createdAt
                    ? (user.createdAt as any).toDate
                      ? (user.createdAt as any).toDate().toLocaleDateString()
                      : user.createdAt instanceof Date
                        ? user.createdAt.toLocaleDateString()
                        : new Date(user.createdAt).toLocaleDateString()
                    : '-'
                  }
                </span>
                <button
                  onClick={() => handleToggleRole(user.id, user.role)}
                  disabled={updatingRole === user.id}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                    isUserAdmin(user)
                      ? 'text-gray-500 hover:bg-white/50 hover:text-gray-700'
                      : 'text-violet-600 hover:bg-violet-50'
                  }`}
                >
                  {updatingRole === user.id ? (
                    <span className="flex items-center gap-1">
                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </span>
                  ) : isUserAdmin(user) ? (
                    'Quitar admin'
                  ) : (
                    'Hacer admin'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No se encontraron usuarios
          </div>
        )}
      </div>
    </div>
  )
}
