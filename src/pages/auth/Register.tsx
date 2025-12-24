import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'

export default function Register() {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [storeName, setStoreName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register, loginWithGoogle, user } = useAuth()
  const navigate = useNavigate()

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await register(email, password)
      setStep(2)
    } catch (err: any) {
      setError(err.message || 'Error al crear cuenta')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleRegister = async () => {
    try {
      await loginWithGoogle()
      setStep(2)
    } catch (err: any) {
      setError(err.message || 'Error al registrarse con Google')
    }
  }

  const handleStoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setError('')
    setLoading(true)

    try {
      // Generate subdomain from store name
      const subdomain = storeName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

      // Create store in Firestore
      const storeId = user.uid
      await setDoc(doc(db, 'stores', storeId), {
        ownerId: user.uid,  // Must be ownerId to match Firestore rules
        userId: user.uid,
        name: storeName,
        subdomain,
        whatsapp,
        theme: 'minimal',
        currency: 'PEN',
        country: 'PE',
        plan: 'free',
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // Update user with storeId
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        storeId,
        createdAt: new Date()
      }, { merge: true })

      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Error al crear tienda')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fafbfc] relative overflow-hidden flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e3a5f08_1px,transparent_1px),linear-gradient(to_bottom,#1e3a5f08_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
        <div className="absolute top-0 -left-40 w-[400px] h-[400px] bg-[#38bdf8] rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-40 w-[400px] h-[400px] bg-[#1e3a5f] rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-40 left-1/2 w-[400px] h-[400px] bg-[#2d6cb5] rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex justify-center">
          <img src="/newlogo.png" alt="Shopifree" className="h-12" />
        </Link>
        <h2 className="mt-6 text-center text-2xl font-bold text-[#1e3a5f]">
          {step === 1 ? 'Crea tu cuenta gratis' : 'Configura tu catálogo'}
        </h2>
        <div className="mt-4 flex justify-center">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              step >= 1 ? 'bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              1
            </div>
            <div className={`w-12 h-1 rounded ${step >= 2 ? 'bg-[#38bdf8]' : 'bg-gray-200'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              step >= 2 ? 'bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              2
            </div>
          </div>
        </div>
        <p className="mt-2 text-center text-sm text-gray-600">
          {step === 1 ? 'Paso 1: Tu cuenta' : 'Paso 2: Tu negocio'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/80 backdrop-blur-sm py-8 px-4 shadow-xl shadow-[#1e3a5f]/5 sm:rounded-2xl sm:px-10 border border-white/50">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {step === 1 ? (
            <>
              <form onSubmit={handleEmailSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Contraseña
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                  />
                  <p className="mt-1 text-xs text-gray-500">Mínimo 6 caracteres</p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-[#1e3a5f]/20 text-sm font-semibold text-white bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] hover:from-[#2d6cb5] hover:to-[#38bdf8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#38bdf8] disabled:opacity-50 transition-all duration-300"
                >
                  {loading ? 'Creando cuenta...' : 'Continuar'}
                </button>
              </form>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">O continúa con</span>
                  </div>
                </div>

                <button
                  onClick={handleGoogleRegister}
                  className="mt-4 w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-200 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </button>
              </div>

              <p className="mt-6 text-center text-sm text-gray-600">
                ¿Ya tienes cuenta?{' '}
                <Link to="/login" className="font-semibold text-[#2d6cb5] hover:text-[#38bdf8] transition-colors">
                  Inicia sesión
                </Link>
              </p>
            </>
          ) : (
            <form onSubmit={handleStoreSubmit} className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-[#38bdf8] to-[#2d6cb5] rounded-2xl mx-auto mb-3 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <p className="text-gray-600 text-sm">Solo 2 datos y listo</p>
              </div>

              <div>
                <label htmlFor="storeName" className="block text-sm font-medium text-gray-700">
                  Nombre de tu negocio
                </label>
                <input
                  id="storeName"
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Ej: Dulces María"
                  className="mt-1 block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                />
              </div>

              <div>
                <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700">
                  WhatsApp (con código de país)
                </label>
                <input
                  id="whatsapp"
                  type="tel"
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="Ej: +51999999999"
                  className="mt-1 block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all"
                />
                <p className="mt-1 text-xs text-gray-500">Aquí recibirás los pedidos</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-[#1e3a5f]/20 text-sm font-semibold text-white bg-gradient-to-r from-[#1e3a5f] to-[#2d6cb5] hover:from-[#2d6cb5] hover:to-[#38bdf8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#38bdf8] disabled:opacity-50 transition-all duration-300"
              >
                {loading ? 'Creando catálogo...' : 'Crear mi catálogo'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
