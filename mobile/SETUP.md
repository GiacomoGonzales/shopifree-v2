# White-label mobile app build — Setup

Esta carpeta automatiza la generación del AAB (Android App Bundle) de cada tienda
para publicar en Play Console. El workflow se dispara desde el admin de Shopifree
(pestaña **App Builds**) y deja el archivo firmado listo para descargar.

## Arquitectura

```
Admin click "Generar build" en /admin/app-builds
           │
           ▼
/api/admin-trigger-app-build       ← Vercel function (verifica admin, dispara workflow)
           │
           ▼
GitHub Actions: build-store-app.yml
   1. mobile/build-config.ts <storeId>     → genera icons/splash/strings
   2. npm run wl:build                      → compila web assets con subdomain
   3. npx cap sync android
   4. ./gradlew bundleRelease               → firma con keystore único
   5. mobile/ci/upload-artifact.ts          → sube AAB a Firebase Storage
           │
           ▼
Firestore: store.appConfig.build.status = 'success' + artifactUrl
           │
           ▼
Admin ve "Descargar AAB" en la UI (signed URL válida 7 días)
```

## Secrets requeridos

### En GitHub (repo → Settings → Secrets and variables → Actions)

| Secret | Qué es | Cómo obtenerlo |
|---|---|---|
| `FIREBASE_PROJECT_ID` | Project ID de Firebase | Firebase Console → Project Settings → General |
| `FIREBASE_CLIENT_EMAIL` | Service account email | Firebase Console → Project Settings → Service accounts → Generate key → `client_email` |
| `FIREBASE_PRIVATE_KEY` | Private key del service account | Del mismo JSON. **Pegarlo tal cual, con `\n` como strings** (GitHub lo maneja) |
| `FIREBASE_STORAGE_BUCKET` | Nombre del bucket | Típicamente `{projectId}.appspot.com` |
| `ANDROID_KEYSTORE_BASE64` | Keystore codificado en base64 | `base64 -i mi-keystore.jks` |
| `ANDROID_KEYSTORE_PASSWORD` | Password del keystore | El que definiste al crearlo |
| `ANDROID_KEY_ALIAS` | Alias de la key | Típicamente `shopifree` o similar |
| `ANDROID_KEY_PASSWORD` | Password de la key | El que definiste al crearlo |

### En Vercel (para que el endpoint de trigger funcione)

| Env var | Qué es |
|---|---|
| `GITHUB_TOKEN` | Personal Access Token con scope `repo` (fine-grained o classic). Se usa para disparar `workflow_dispatch`. |
| `GITHUB_REPO` | Formato `owner/repo`, ej. `GiacomoGonzales/shopifree-v2` |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Ya están por otros endpoints |

## Keystore único ("upload key")

Todas las apps de stores se firman con un mismo keystore. Google Play acepta
esto para apps que comparten developer account (es el flujo estándar).

**Generar el keystore una vez (si no existe todavía):**

```bash
keytool -genkey -v \
  -keystore shopifree-release.jks \
  -alias shopifree \
  -keyalg RSA -keysize 2048 -validity 10000
```

**Codificar a base64 para subir a GitHub:**

```bash
base64 -i shopifree-release.jks > keystore.base64.txt
# Copiar el contenido a GitHub Secret ANDROID_KEYSTORE_BASE64
```

⚠️ **Guardar el `.jks` original en un lugar seguro** (1Password, etc.). Si se
pierde, todas las apps firmadas con él quedan huérfanas y no se pueden actualizar.

## Flujo por tienda nueva

1. **Cliente paga el plan de app**.
2. En el admin de Shopifree, configurá `appConfig` de esa tienda (nombre, colores, etc. — ya existe la UI de MiApp).
3. Ir a `/admin/app-builds`, encontrar la tienda, click **"Generar build"**.
4. Esperar 5-10 min. El estado va: `queued` → `running` → `success`.
5. Click **"Descargar AAB"** → se baja el archivo firmado.
6. **Primera vez**: crear la ficha en Play Console (descripción, screenshots, privacy policy URL) y subir el AAB a un internal track.
7. **Próximas versiones**: subir el nuevo AAB al mismo release de Play Console.

## Primera configuración de cada app en Play Console (manual, ~30 min)

1. Play Console → **Crear aplicación**.
2. Nombre, idioma, categoría, país.
3. **Ficha de tienda** → descripción, capturas de pantalla (8 min), ícono 512×512, feature graphic 1024×500.
4. **Clasificación de contenido** → cuestionario.
5. **Público objetivo** → 18+ o el que corresponda.
6. **Privacidad** → URL (se puede usar `{subdomain}.shopifree.app/privacy`).
7. **Política de datos** → mismas URLs.
8. **Release de producción**:
   - Subir el AAB descargado
   - Completar las notas del release
9. Enviar a revisión.

## Updates de una app ya publicada

1. Click **"Generar build"** en admin (con versionName incrementado, ej. `1.0.1`).
2. El workflow auto-incrementa el `versionCode` en base al último build en Firestore.
3. Descargar el AAB nuevo.
4. Play Console → **Nuevo release de producción** → subir AAB → notas → publicar.

Play Console tarda unas horas en aprobar updates (mucho más rápido que la primera vez).

## Troubleshooting

**El build falla con "keystore not found"**
→ Verificá que `ANDROID_KEYSTORE_BASE64` esté configurado en GitHub.

**El build completa pero la UI no se actualiza**
→ Revisá que el service account tenga permiso de escritura en Firestore (rol
`Cloud Datastore User` o superior).

**El signed URL expiró**
→ Re-generar el build (es una ejecución de 5 min).

**Play Console rechaza el AAB por "package name already exists"**
→ Cada tienda genera un `applicationId` único (`app.shopifree.store.{subdomain}`). Si
el subdomain cambió después del primer build, el nuevo build tendrá un package
distinto y Play lo trata como una app nueva. **Nunca cambiar el subdomain después
de publicar la app.**
