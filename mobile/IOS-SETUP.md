# iOS app builds — Setup

> **Status**: Scaffolding listo, **no operativo** hasta completar los prerrequisitos de Apple.

La estructura está en el repo (workflow `.github/workflows/build-store-app-ios.yml`,
scripts `mobile/ci/ios-*.ts`, Fastlane config en `ios/App/fastlane/`). Falta
conectar la cuenta Apple Developer y los certificados.

## Paso 1 — Cuenta Apple Developer

- [developer.apple.com/programs](https://developer.apple.com/programs/) → enrollarse
- Costo: **$99/año**, renovable. Tarjeta de crédito a nombre del titular.
- Tarda 24-48 hs en aprobarse la primera vez.

Una vez aprobada:
- Anotá tu **Team ID** (10 caracteres, mayúsculas). Se ve en
  [developer.apple.com/account](https://developer.apple.com/account) → Membership.
  Lo vas a necesitar como secret `APPLE_TEAM_ID`.

## Paso 2 — App Store Connect API Key

Evita usar Apple ID + 2FA en CI. En su lugar, generamos una API key.

1. [App Store Connect](https://appstoreconnect.apple.com) → **Users and Access** → pestaña **Keys** (o "Integrations" → "App Store Connect API").
2. Click **Generate API Key** o **+**.
3. Nombre: `shopifree-ci`.
4. Access: **Admin** (para poder crear apps).
5. Click **Generate** → te descarga un archivo `.p8`. **Solo se baja una vez, guardalo bien.**
6. Anotá el **Key ID** (10 chars) y el **Issuer ID** (UUID largo).

Los 3 secrets que necesitás subir a GitHub:
- `APPSTORE_API_KEY_ID` — el Key ID (10 chars)
- `APPSTORE_API_ISSUER_ID` — el Issuer ID (UUID)
- `APPSTORE_API_KEY_CONTENT` — **base64** del archivo `.p8`:
  ```bash
  base64 -i AuthKey_XXXXXXX.p8 | tr -d '\n'
  ```

## Paso 3 — Repo privado para Fastlane Match

Match guarda los certificados + provisioning profiles cifrados en un repo git.
Así el CI puede descargarlos y firmar sin exponer los archivos sensibles.

1. Creá un **repo privado** en GitHub: ej. `GiacomoGonzales/shopifree-ios-certs`.
2. Deja el repo vacío (Match lo llena solo).
3. Generá un **Personal Access Token** con permiso de escritura solo sobre ese repo (fine-grained).
4. Secrets que van a GitHub del repo principal (`shopifree-v2`):
   - `MATCH_GIT_URL` — `https://github.com/GiacomoGonzales/shopifree-ios-certs.git`
   - `MATCH_PASSWORD` — contraseña que inventes (mínimo 20 caracteres, random). Se usa para cifrar los certs. **Guardala en 1Password — si la perdés hay que regenerar todos los certs.**
   - `MATCH_GIT_BASIC_AUTHORIZATION` — base64 de `usuario:pat`, ej:
     ```bash
     echo -n "GiacomoGonzales:github_pat_XXXXX" | base64
     ```

## Paso 4 — Primera corrida local de Match (seed)

Esta es la única vez que vas a necesitar una Mac (o una Mac en la nube). Sirve
para generar el certificado Distribution y subir una copia cifrada al repo de Match.

En tu Mac:
```bash
cd ios/App
gem install fastlane
bundle exec fastlane match init     # te pregunta storage mode → git
bundle exec fastlane match appstore --generate_apple_certs
```

Te va a pedir:
- Apple ID (el email de la cuenta de developer)
- Password de Match (la que pusiste en `MATCH_PASSWORD`)
- Team ID

Si todo sale bien, el repo `shopifree-ios-certs` queda con un commit tipo
"certs/distribution/...".

> Si no tenés Mac, podés usar [MacStadium](https://www.macstadium.com/) o una
> instancia `mac.metal` de AWS por 1 hora ($1-2). O pedirle prestado el laptop
> a alguien que tenga Mac para este paso único.

## Paso 5 — Subir los secrets a GitHub

Con `gh` CLI (desde el repo principal):

```bash
gh secret set APPLE_TEAM_ID --body "TU_TEAM_ID_10_CHARS" --repo GiacomoGonzales/shopifree-v2
gh secret set APPSTORE_API_KEY_ID --body "XXXXXXXXXX" --repo GiacomoGonzales/shopifree-v2
gh secret set APPSTORE_API_ISSUER_ID --body "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" --repo GiacomoGonzales/shopifree-v2
base64 -i AuthKey_XXXX.p8 | tr -d '\n' | gh secret set APPSTORE_API_KEY_CONTENT --repo GiacomoGonzales/shopifree-v2
gh secret set MATCH_GIT_URL --body "https://github.com/GiacomoGonzales/shopifree-ios-certs.git" --repo GiacomoGonzales/shopifree-v2
gh secret set MATCH_PASSWORD --body "TU_MATCH_PASSWORD_RANDOM" --repo GiacomoGonzales/shopifree-v2
echo -n "GiacomoGonzales:github_pat_XXXX" | base64 | gh secret set MATCH_GIT_BASIC_AUTHORIZATION --repo GiacomoGonzales/shopifree-v2
```

## Paso 6 — Por cada tienda nueva

A diferencia de Android (donde un solo keystore sirve), en iOS cada app
necesita un **bundle ID único** registrado en Apple Dev Portal.

El Fastfile usa `produce` para auto-registrar el bundle ID la primera vez que
corre. O sea, **la primera vez que tocás "Generar build iOS" en una tienda
nueva, Fastlane va a crear la entrada en Apple Dev Portal automáticamente**.

Después Match genera el provisioning profile para ese bundle ID.

## Paso 7 — Primera publicación manual en App Store Connect

Aunque Fastlane sube a TestFlight automáticamente, la primera vez para cada
app hay que:

1. En App Store Connect → My Apps → tu app (ya creada por Fastlane).
2. Completar la ficha: nombre, subtítulo, descripción, categoría.
3. Subir screenshots (6.7", 6.5", 5.5"; para iPad si lo tenés).
4. Ícono 1024×1024.
5. Política de privacidad (URL pública).
6. Clasificación de contenido.
7. Declarar encryption export compliance (normalmente "No" para apps simples).
8. **Crear un TestFlight** o **submit for review** para producción.
9. Apple revisa 1-3 días primera vez.

**⚠️ Cuidado con Guideline 4.2**: apps que son solo webview las rechazan.
Documentá en las notas que la app usa push notifications, almacenamiento
offline y tu catálogo dinámico (no solo es un link a la web).

## Paso 8 — Por cada update

Una vez que una app ya está publicada:
1. Click "Generar build iOS" en `/admin/app-builds` con nueva `versionName`.
2. El workflow corre → Fastlane sube automáticamente a TestFlight.
3. En App Store Connect, promovés el nuevo build de TestFlight a producción con 2 clicks.
4. Apple revisa 24-48 hs.

## Troubleshooting

**"No valid signing identities found"**
→ Match no pudo descargar los certs. Verificar `MATCH_PASSWORD` y `MATCH_GIT_BASIC_AUTHORIZATION`.

**"Could not create App Store Connect API token"**
→ Los 3 secrets de `APPSTORE_API_*` están mal, o la API key fue revocada.

**"No profile for team matching bundle id"**
→ Match no tiene un profile para ese bundle ID. Correr localmente:
`fastlane match appstore --app_identifier "app.shopifree.store.xxx"`

**App rechazada por Guideline 4.2**
→ Agregar funcionalidad nativa: push notifications visibles (ya la tenés),
deep linking, cámara para reseñas, autenticación biométrica. O marcar la app
como "Enterprise" si es distribución interna.

---

Una vez completados los pasos 1-5, el botón "Generar" en iOS va a empezar a
funcionar. Desde el paso 6 en adelante es el flujo normal por tienda.
