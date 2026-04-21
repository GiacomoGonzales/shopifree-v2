import { useState, useEffect, useMemo } from 'react'
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

  type SortField = 'name' | 'email' | 'role' | 'createdAt'
  type SortOrder = 'asc' | 'desc'

  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

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

  const filteredUsers = useMemo(() => {
    const toDate = (d: any) => {
      if (!d) return new Date(0)
      if (d.toDate) return d.toDate()
      if (d instanceof Date) return d
      return new Date(d)
    }

    let result = users.filter(user =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.firstName && user.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.lastName && user.lastName.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'name': {
          const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.email
          const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim() || b.email
          comparison = nameA.localeCompare(nameB)
          break
        }
        case 'email':
          comparison = a.email.localeCompare(b.email)
          break
        case 'role':
          comparison = (a.role || 'user').localeCompare(b.role || 'user')
          break
        case 'createdAt':
          comparison = toDate(a.createdAt).getTime() - toDate(b.createdAt).getTime()
          break
      }
      return sortOrder === 'desc' ? -comparison : comparison
    })

    return result
  }, [users, searchTerm, sortField, sortOrder])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    return sortOrder === 'desc' ? (
      <svg className="w-3 h-3 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    ) : (
      <svg className="w-3 h-3 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    )
  }

  const isUserAdmin = (user: User) => {
    return user.role === 'admin' || user.email === ADMIN_EMAIL
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-gray-900" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Usuarios</h1>
        <p className="text-sm text-gray-500 mt-0.5">{users.length} registrados</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <input
          type="text"
          placeholder="Buscar por email o nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 placeholder-gray-400"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Users Table / Cards */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-gray-500 cursor-pointer hover:text-gray-900" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">Usuario <SortIcon field="name" /></div>
                </th>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-gray-500 cursor-pointer hover:text-gray-900" onClick={() => handleSort('email')}>
                  <div className="flex items-center gap-1">Email <SortIcon field="email" /></div>
                </th>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-gray-500 cursor-pointer hover:text-gray-900" onClick={() => handleSort('role')}>
                  <div className="flex items-center gap-1">Rol <SortIcon field="role" /></div>
                </th>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">Stripe ID</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-gray-500 cursor-pointer hover:text-gray-900" onClick={() => handleSort('createdAt')}>
                  <div className="flex items-center gap-1">Registrado <SortIcon field="createdAt" /></div>
                </th>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {user.avatar ? (
                        <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-gray-600 font-medium text-[12px]">
                            {user.firstName ? user.firstName.charAt(0) : user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900 text-[13px]">
                          {user.firstName && user.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : 'Sin nombre'
                          }
                        </p>
                        {user.phone && (
                          <p className="text-[11px] text-gray-500">{user.phone}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-gray-700">
                    {user.email}
                    {user.email === ADMIN_EMAIL && (
                      <span className="ml-2 text-[11px] text-gray-900 font-medium">(Super Admin)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge admin={isUserAdmin(user)} />
                  </td>
                  <td className="px-4 py-3 text-[12px]">
                    {user.stripeCustomerId ? (
                      <code className="text-[11px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                        {user.stripeCustomerId}
                      </code>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-gray-500 tabular-nums">
                    {user.createdAt
                      ? (user.createdAt as any).toDate
                        ? (user.createdAt as any).toDate().toLocaleDateString()
                        : user.createdAt instanceof Date
                          ? user.createdAt.toLocaleDateString()
                          : new Date(user.createdAt).toLocaleDateString()
                      : '-'
                    }
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleRole(user.id, user.role)}
                      disabled={updatingRole === user.id}
                      className="px-2 py-1 text-[12px] font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-md transition-colors disabled:opacity-50"
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
        <div className="md:hidden divide-y divide-gray-100">
          {filteredUsers.map((user) => (
            <div key={user.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-600 font-medium">
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
                    <RoleBadge admin={isUserAdmin(user)} />
                  </div>
                  <p className="text-[12px] text-gray-500 truncate">
                    {user.email}
                    {user.email === ADMIN_EMAIL && (
                      <span className="ml-1 text-gray-900 font-medium">(Super Admin)</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-2.5 pl-[52px]">
                <span className="text-[11px] text-gray-500 tabular-nums">
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
                  className="px-2 py-1 text-[12px] font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-md transition-colors disabled:opacity-50"
                >
                  {updatingRole === user.id ? '...' : isUserAdmin(user) ? 'Quitar admin' : 'Hacer admin'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-sm text-gray-500">
            No se encontraron usuarios
          </div>
        )}
      </div>
    </div>
  )
}

function RoleBadge({ admin }: { admin: boolean }) {
  return (
    <span
      className={`px-2 py-0.5 text-[10px] rounded-sm font-medium uppercase tracking-wide ${
        admin ? 'bg-black text-white' : 'border border-gray-200 text-gray-600'
      }`}
    >
      {admin ? 'Admin' : 'User'}
    </span>
  )
}
