#!/usr/bin/env node
/**
 * Genera con OpenAI la imagen del banner de novedades del dashboard
 * (public/banners/editor-en-vivo.webp).
 *
 * Uso:
 *   node scripts/generate-banner.mjs ~/Desktop/apigpt.txt
 * o con la clave en una variable de entorno:
 *   OPENAI_API_KEY=... node scripts/generate-banner.mjs
 *
 * La clave nunca se imprime. La imagen no lleva texto: los textos del banner
 * van en la pagina (traducibles y nitidos en cualquier pantalla).
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const OUT = path.resolve('public/banners/editor-en-vivo.webp')

const PROMPT = `Clean, modern product illustration for a SaaS banner, wide 3:2 composition, no text, no letters, no logos.
A laptop and a smartphone side by side, both showing the same colorful online store (product cards with sneakers,
a watch, sunglasses). On the laptop, a friendly cursor is clicking a store title that is highlighted with a dashed
blue outline, as if editing it in place. Floating around the devices: a color palette with swatches, a font "Aa" tile
without readable letters, a rounded-corners slider and small sparkles, suggesting live visual customization.
Soft 3D / isometric-lite style, gentle shadows, lots of breathing room, light background with a soft gradient from
pale sky blue (#E0F2FE) to pale lavender (#EDE9FE). Accent colors: deep navy (#1e3a5f) and sky blue (#38bdf8).
Professional, optimistic, uncluttered. Keep the left 15% of the image calm and light.`

function readKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY.trim()
  const arg = process.argv[2]
  if (!arg) throw new Error('Falta la clave: pasa la ruta del archivo o define OPENAI_API_KEY.')
  const file = arg.replace(/^~(?=$|\/)/, os.homedir())
  const candidates = [file, `${file}.txt`]
  const found = candidates.find(f => fs.existsSync(f))
  if (!found) throw new Error(`No encontre el archivo de la clave (${candidates.join(' ni ')}).`)
  const key = fs.readFileSync(found, 'utf8').trim()
  if (!key.startsWith('sk-')) throw new Error('El archivo no parece tener una clave de OpenAI (deberia empezar con "sk-").')
  return key
}

const key = readKey()
console.log('Generando la imagen con gpt-image-1 (tarda unos 30-60 segundos)…')

const res = await fetch('https://api.openai.com/v1/images/generations', {
  method: 'POST',
  headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'gpt-image-1',
    prompt: PROMPT,
    size: '1536x1024',
    quality: 'high',
    output_format: 'webp',
    output_compression: 85,
    n: 1,
  }),
})

const data = await res.json().catch(() => ({}))
if (!res.ok) {
  console.error(`OpenAI respondio ${res.status}: ${data?.error?.message || 'error desconocido'}`)
  process.exit(1)
}

const b64 = data?.data?.[0]?.b64_json
if (!b64) {
  console.error('La respuesta no trajo imagen.')
  process.exit(1)
}

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, Buffer.from(b64, 'base64'))
console.log(`Listo: ${path.relative(process.cwd(), OUT)} (${Math.round(fs.statSync(OUT).size / 1024)} KB)`)
