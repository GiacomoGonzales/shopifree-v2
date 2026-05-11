import { useEffect } from 'react'

// Some legacy validation/badge scripts (Sectigo TrustLogo, McAfee SECURE,
// older Norton seal, etc.) call document.write() after page load. In a SPA
// that wipes the whole DOM. We patch document.write once so any such call
// gets redirected to appendChild instead — so a misbehaving merchant snippet
// can't blank out their storefront.
let documentWritePatched = false

function patchDocumentWriteOnce() {
  if (documentWritePatched || typeof document === 'undefined') return
  documentWritePatched = true
  const originalWrite = document.write.bind(document)
  document.write = function patched(...chunks: string[]) {
    const blob = chunks.join('')
    if (!blob) return
    try {
      const tpl = document.createElement('template')
      tpl.innerHTML = blob
      tpl.content.querySelectorAll('script').forEach(oldScript => {
        const newScript = document.createElement('script')
        for (const attr of Array.from(oldScript.attributes)) {
          newScript.setAttribute(attr.name, attr.value)
        }
        newScript.textContent = oldScript.textContent
        oldScript.replaceWith(newScript)
      })
      const target = document.body || document.head
      target.appendChild(tpl.content)
    } catch (err) {
      console.warn('[customHtml] document.write patch failed; falling back to original:', err)
      originalWrite(blob)
    }
  } as typeof document.write
}

function injectIntoTarget(html: string, target: 'head' | 'body'): () => void {
  patchDocumentWriteOnce()
  try {
    const template = document.createElement('template')
    template.innerHTML = html

    template.content.querySelectorAll('script').forEach(oldScript => {
      const newScript = document.createElement('script')
      for (const attr of Array.from(oldScript.attributes)) {
        newScript.setAttribute(attr.name, attr.value)
      }
      newScript.textContent = oldScript.textContent
      oldScript.replaceWith(newScript)
    })

    const insertedNodes = Array.from(template.content.childNodes)
    const targetNode = target === 'head' ? document.head : document.body
    if (!targetNode) return () => {}
    targetNode.appendChild(template.content)

    return () => {
      insertedNodes.forEach(node => {
        if (node.parentNode) node.parentNode.removeChild(node)
      })
    }
  } catch (err) {
    console.warn(`[customHtml:${target}] inject failed; storefront kept safe:`, err)
    return () => {}
  }
}

export function useCustomHeadHtml(html: string | null | undefined) {
  useEffect(() => {
    if (!html) return
    return injectIntoTarget(html, 'head')
  }, [html])
}

export function useCustomBodyHtml(html: string | null | undefined) {
  useEffect(() => {
    if (!html) return
    return injectIntoTarget(html, 'body')
  }, [html])
}
