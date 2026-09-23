#!/usr/bin/env node
/**
 * Paso 1 del banner: la escena (laptop flotando) con la pantalla en verde
 * plano, para montar encima la captura real del editor (compose-banner.py).
 * Asi los textos del editor salen nitidos: la IA los deforma si los dibuja ella.
 *
 * Uso (desde shopifree-v2): node scripts/banner/generate-scene.mjs ~/Desktop/apigpt
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const OUT = path.resolve('scripts/banner/scene.png')
const PROMPT = `High-end tech advertising key visual, photorealistic 3D render, wide 3:2 composition.
A sleek modern silver aluminum laptop (MacBook Pro style) floating in mid-air, lid open, slightly tilted, seen from a
dynamic three-quarter angle from the front-left, with a soft diffuse shadow far below it.
The laptop display is completely filled edge-to-edge with a flat, uniform, pure chroma-key green (#00FF00) — no
reflections, no gradients, no content, no glare on the green area. The whole screen rectangle must be fully visible.
Place the laptop in the right 60% of the frame, fairly large (screen occupying about half of the image height),
leaving the left 40% as calm empty dark background.
Background: deep navy blue studio gradient (#0b1b33 to #1e3a5f), soft sky-blue (#38bdf8) rim light on the laptop
edges, a faint blue glow behind it and a few tiny floating light particles. Premium, modern, clean, high contrast,
Apple-keynote-like product shot. No text, no logos, no watermark.`

function readKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY.trim()
  const file = (process.argv[2] || '').replace(/^~(?=$|\/)/, os.homedir())
  const found = [file, `${file}.txt`].find(f => f && fs.existsSync(f))
  if (!found) throw new Error('Pasa la ruta del archivo con la clave o define OPENAI_API_KEY.')
  return fs.readFileSync(found, 'utf8').trim()
}

const res = await fetch('https://api.openai.com/v1/images/generations', {
  method: 'POST',
  headers: { Authorization: `Bearer ${readKey()}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: 'gpt-image-1', prompt: PROMPT, size: '1536x1024', quality: 'high', output_format: 'png', n: 1 }),
})
const data = await res.json().catch(() => ({}))
if (!res.ok) { console.error(`OpenAI respondio ${res.status}: ${data?.error?.message || 'error'}`); process.exit(1) }
fs.writeFileSync(OUT, Buffer.from(data.data[0].b64_json, 'base64'))
console.log(`Listo: ${path.relative(process.cwd(), OUT)}`)
