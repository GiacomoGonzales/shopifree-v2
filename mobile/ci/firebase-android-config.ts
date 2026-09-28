/**
 * Registra la app Android de la tienda en Firebase y deja su
 * google-services.json en android/app/, para que la build tenga push (FCM).
 *
 * Sin esto el paquete `app.shopifree.store.<subdominio>` no figura en
 * google-services.json (que viene con la app principal), build.gradle omite el
 * plugin de Firebase y la app no puede registrarse para push. Peor: llamar a
 * register() así la tira abajo de forma nativa, por eso usePushNotifications
 * solo registra en Android de marca blanca si esta build dejó la marca
 * VITE_ANDROID_FCM=true en .env.whitelabel.
 *
 * Va después de build-config.ts (lee .build-meta.json) y antes de wl:build
 * (Vite lee la marca al compilar).
 *
 * Si Firebase falla (permisos de la cuenta de servicio, límite de 30 apps por
 * proyecto) no corta la build: deja una advertencia y la app sale sin push,
 * como antes.
 *
 * Usage: npx tsx mobile/ci/firebase-android-config.ts
 * Env: FIREBASE_* service account (necesita permiso para crear apps en
 * Firebase, p. ej. el rol "Firebase Admin").
 */
import { appendFileSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { getProjectManagement, type AndroidApp } from 'firebase-admin/project-management'
import { getDb } from './firebase-admin'

interface GoogleServicesJson {
  client?: { client_info?: { android_client_info?: { package_name?: string } } }[]
}

async function findOrCreateApp(packageName: string, displayName: string): Promise<AndroidApp> {
  const pm = getProjectManagement()
  for (const app of await pm.listAndroidApps()) {
    const meta = await app.getMetadata()
    if (meta.packageName === packageName) {
      console.log(`  App de Firebase existente: ${meta.appId}`)
      return app
    }
  }
  console.log(`  Registrando ${packageName} en Firebase…`)
  const app = await pm.createAndroidApp(packageName, displayName)
  console.log(`  ✓ Registrada: ${app.appId}`)
  return app
}

async function main() {
  const meta = JSON.parse(readFileSync(resolve(process.cwd(), '.build-meta.json'), 'utf-8')) as {
    appId: string
    appName: string
  }
  const packageName = meta.appId

  try {
    getDb() // inicializa firebase-admin con la cuenta de servicio
    const app = await findOrCreateApp(packageName, meta.appName)
    const config = JSON.parse(await app.getConfig()) as GoogleServicesJson

    // build.gradle busca el paquete en el texto del archivo antes de aplicar
    // el plugin; si no está, compilar sin Firebase es lo seguro.
    const registered = config.client?.some(
      c => c.client_info?.android_client_info?.package_name === packageName
    )
    if (!registered) throw new Error(`google-services.json no trae el paquete ${packageName}`)

    // JSON.stringify con indentación deja `"package_name": "<id>"`, el mismo
    // formato que busca build.gradle.
    writeFileSync(
      resolve(process.cwd(), 'android/app/google-services.json'),
      JSON.stringify(config, null, 2) + '\n',
      'utf-8'
    )
    appendFileSync(resolve(process.cwd(), '.env.whitelabel'), 'VITE_ANDROID_FCM=true\n', 'utf-8')
    console.log(`  ✓ android/app/google-services.json → ${packageName}`)
    console.log('  ✓ .env.whitelabel → VITE_ANDROID_FCM=true')
  } catch (err) {
    const msg = (err as Error).message || String(err)
    // Anotación de GitHub Actions: queda visible en el resumen del run.
    console.log(`::warning title=App sin notificaciones push::No se pudo configurar Firebase para ${packageName}: ${msg}`)
    console.error('  La build sigue, pero esta app no va a registrar dispositivos para push.')
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
