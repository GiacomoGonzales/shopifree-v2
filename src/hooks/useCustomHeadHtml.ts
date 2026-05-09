import { useEffect } from 'react'

// Injects merchant-provided HTML into document.head (SSL validators,
// custom analytics, verification meta tags, etc.) and cleans up on
// unmount/change. <script> nodes are recreated so they actually execute —
// innerHTML alone does not run scripts.
export function useCustomHeadHtml(html: string | null | undefined) {
  useEffect(() => {
    if (!html) return

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
    document.head.appendChild(template.content)

    return () => {
      insertedNodes.forEach(node => {
        if (node.parentNode) node.parentNode.removeChild(node)
      })
    }
  }, [html])
}
