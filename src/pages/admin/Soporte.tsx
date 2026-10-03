import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { collection, getCountFromServer, query, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { Pagina, Pestanas } from '../../components/admin/ui'
import ChatsSoporte from '../../components/admin/soporte/ChatsSoporte'
import FeedbackSoporte from '../../components/admin/soporte/FeedbackSoporte'

type Vista = 'chats' | 'feedback'

/**
 * Soporte: los chats con Sofía y el feedback de los dueños. La pestaña va en
 * ?vista= para que los enlaces viejos (/admin/feedback) caigan en la correcta.
 */
export default function AdminSoporte() {
  const [params, setParams] = useSearchParams()
  const vista: Vista = params.get('vista') === 'feedback' ? 'feedback' : 'chats'
  const [nuevos, setNuevos] = useState(0)

  // El aviso de Feedback se ve también desde Chats: un conteo en el servidor
  // (una lectura por cada mil) en vez de bajar toda la colección.
  useEffect(() => {
    getCountFromServer(query(collection(db, 'feedback'), where('status', '==', 'new')))
      .then(s => setNuevos(s.data().count))
      .catch(err => console.error('[admin/soporte] conteo de feedback:', err))
  }, [])

  const alCambiarNuevos = useCallback((n: number) => setNuevos(n), [])

  return (
    <Pagina>
      <Pestanas
        valor={vista}
        onCambiar={id => setParams(id === 'chats' ? {} : { vista: id }, { replace: true })}
        opciones={[
          { id: 'chats', etiqueta: 'Chats' },
          { id: 'feedback', etiqueta: 'Feedback', aviso: nuevos },
        ]}
      />
      {vista === 'chats' ? <ChatsSoporte /> : <FeedbackSoporte onNuevos={alCambiarNuevos} />}
    </Pagina>
  )
}
