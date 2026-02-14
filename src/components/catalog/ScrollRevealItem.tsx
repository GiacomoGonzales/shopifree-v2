import type { ReactNode } from 'react'
import { useScrollReveal } from '../../hooks/useScrollReveal'

interface ScrollRevealItemProps {
  enabled: boolean
  index: number
  children: ReactNode
}

export function ScrollRevealItem({ enabled, index, children }: ScrollRevealItemProps) {
  const delay = enabled ? Math.min(index % 4, 3) * 80 : 0
  const { ref, style } = useScrollReveal(enabled, delay)

  if (!enabled) {
    return <>{children}</>
  }

  return (
    <div ref={ref} style={style}>
      {children}
    </div>
  )
}
