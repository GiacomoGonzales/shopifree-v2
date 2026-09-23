#!/usr/bin/env node
/**
 * Genera con OpenAI la imagen del banner de novedades del dashboard
 * (public/banners/editor-en-vivo.webp) a partir de una captura REAL del editor
 * en vivo (scripts/banner/editor-screenshot.png): la captura va como imagen de
 * referencia y el modelo la pone dentro de una escena publicitaria.
 *
 * Uso (desde la carpeta shopifree-v2):
 *   node scripts/generate-banner.mjs ~/Desktop/apigpt
 * o con la clave en una variable de entorno:
 *   OPENAI_API_KEY=... node scripts/generate-banner.mjs
 *
 * La clave nunca se imprime.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const SCREENSHOT = path.resolve('scripts/banner/editor-screenshot.png')
const OUT = path.resolve('public/banners/editor-en-vivo.webp')

const PROMPT = `High-end tech advertising key visual, photorealistic 3D render, wide 3:2 banner.
A sleek modern silver laptop floating in mid-air, slightly tilted and seen from a dynamic three-quarter angle,
with a soft glowing shadow far below it. The laptop screen shows EXACTLY the provided screenshot of the web
editor (an online store with an orange announcement bar, the store name "AURELIA" outlined in blue, a clothing
store banner photo, product cards with "Editar" buttons, and a settings panel with color palettes on the right).
Keep the screenshot faithful and legible.
Make it dramatic: the right-side settings panel with the color palette swatches pops OUT of the screen in 3D,
floating in front of the laptop like layered glass cards, and a few color swatches and a product card break
out of the screen edge towards the viewer, with subtle motion depth.
Background: deep navy blue (#0b1b33 to #1e3a5f) studio gradient with soft sky-blue (#38bdf8) rim light and a
faint glow behind the laptop, a few subtle floating light particles. Premium, modern, clean, high contrast,
Apple-keynote-like product shot. Place the laptop in the right two thirds of the frame and keep the left third
as calm dark background (text will be placed there). No extra text, no watermarks, no logos besides the screen content.`

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

if (!fs.existsSync(SCREENSHOT)) {
  console.error(`Falta la captura del editor: ${path.relative(process.cwd(), SCREENSHOT)}. Corre el script desde la carpeta shopifree-v2.`)
  process.exit(1)
}

const key = readKey()
console.log('Generando la imagen a partir de la captura del editor (tarda 1-2 minutos)…')

const form = new FormData()
form.append('model', 'gpt-image-1')
form.append('image', new Blob([fs.readFileSync(SCREENSHOT)], { type: 'image/png' }), 'editor-screenshot.png')
form.append('prompt', PROMPT)
form.append('size', '1536x1024')
form.append('quality', 'high')
form.append('input_fidelity', 'high')
form.append('output_format', 'webp')
form.append('output_compression', '88')

const res = await fetch('https://api.openai.com/v1/images/edits', {
  method: 'POST',
  headers: { Authorization: `Bearer ${key}` },
  body: form,
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
