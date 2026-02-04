import { Link } from 'react-router-dom'
import { useLanguage } from '../hooks/useLanguage'

export default function Privacy() {
  const { localePath } = useLanguage()

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link to={localePath('/')} className="flex items-center gap-2">
            <img src="/shopifree-logo.png" alt="Shopifree" className="h-8 w-8" />
            <span className="text-xl font-bold text-[#1e3a5f]">Shopifree</span>
          </Link>
          <Link to={localePath('/')} className="text-sm text-[#2d6cb5] hover:underline">
            Volver al inicio
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-[#1e3a5f] mb-2">Politica de Privacidad</h1>
        <p className="text-sm text-gray-400 mb-8">Ultima actualizacion: 3 de febrero de 2026</p>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-[#1e3a5f] mt-8 mb-3">1. Informacion que recopilamos</h2>
            <p>Al crear una cuenta en Shopifree, recopilamos la siguiente informacion:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Nombre y apellido</li>
              <li>Direccion de correo electronico</li>
              <li>Informacion del negocio (nombre de la tienda, logo, productos)</li>
              <li>Datos de inicio de sesion a traves de Google (si usas Google Sign-In)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1e3a5f] mt-8 mb-3">2. Como usamos tu informacion</h2>
            <p>Usamos la informacion recopilada para:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Crear y mantener tu tienda online</li>
              <li>Gestionar tu cuenta y autenticacion</li>
              <li>Procesar y gestionar los pedidos de tu tienda</li>
              <li>Enviar notificaciones relacionadas con tu cuenta</li>
              <li>Mejorar nuestros servicios y experiencia de usuario</li>
              <li>Brindar soporte tecnico</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1e3a5f] mt-8 mb-3">3. Almacenamiento de datos</h2>
            <p>
              Tu informacion se almacena de forma segura en servidores de Google Firebase y Vercel.
              Implementamos medidas de seguridad estandar de la industria para proteger tus datos
              contra acceso no autorizado, alteracion o destruccion.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1e3a5f] mt-8 mb-3">4. Compartir informacion</h2>
            <p>No vendemos, alquilamos ni compartimos tu informacion personal con terceros, excepto:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Proveedores de servicio necesarios para operar la plataforma (Firebase, Cloudinary, Vercel)</li>
              <li>Cuando sea requerido por ley o proceso legal</li>
              <li>Para proteger los derechos y seguridad de Shopifree y sus usuarios</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1e3a5f] mt-8 mb-3">5. Datos de los clientes de tu tienda</h2>
            <p>
              Como propietario de una tienda en Shopifree, eres responsable de los datos de tus clientes.
              Los datos de pedidos (nombre, direccion, telefono) se almacenan en tu cuenta y solo tu tienes acceso a ellos.
              Te recomendamos cumplir con las leyes de proteccion de datos aplicables en tu pais.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1e3a5f] mt-8 mb-3">6. Cookies y tecnologias similares</h2>
            <p>
              Utilizamos cookies y almacenamiento local para mantener tu sesion activa,
              guardar tus preferencias de idioma y mejorar la experiencia de uso.
              No utilizamos cookies de seguimiento de terceros con fines publicitarios.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1e3a5f] mt-8 mb-3">7. Tus derechos</h2>
            <p>Tienes derecho a:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Acceder a tu informacion personal</li>
              <li>Corregir datos inexactos</li>
              <li>Solicitar la eliminacion de tu cuenta y datos</li>
              <li>Exportar tus datos</li>
            </ul>
            <p className="mt-2">
              Para ejercer cualquiera de estos derechos, contactanos a traves del chat de soporte
              dentro de la aplicacion o enviando un correo a <span className="text-[#2d6cb5]">soporte@shopifree.app</span>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1e3a5f] mt-8 mb-3">8. Eliminacion de cuenta</h2>
            <p>
              Puedes eliminar tu cuenta en cualquier momento desde la seccion "Mi Cuenta" en el panel de administracion.
              Al eliminar tu cuenta, se eliminaran todos tus datos, incluyendo tu tienda, productos y pedidos.
              Este proceso es irreversible.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1e3a5f] mt-8 mb-3">9. Cambios a esta politica</h2>
            <p>
              Podemos actualizar esta politica de privacidad ocasionalmente.
              Te notificaremos de cualquier cambio significativo a traves de la aplicacion o por correo electronico.
              El uso continuado de Shopifree despues de los cambios constituye tu aceptacion de la politica actualizada.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1e3a5f] mt-8 mb-3">10. Contacto</h2>
            <p>
              Si tienes preguntas sobre esta politica de privacidad, puedes contactarnos a traves del
              chat de soporte dentro de la aplicacion o enviando un correo a <span className="text-[#2d6cb5]">soporte@shopifree.app</span>.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-400">&copy; 2026 Shopifree. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  )
}
