import type { ReactNode } from 'react'
import { Direction } from 'radix-ui'

type Dir = 'ltr' | 'rtl'

function DirectionProvider({
  dir = 'rtl',
  direction,
  children,
}: {
  dir?: Dir
  direction?: Dir
  children?: ReactNode
}) {
  return (
    <Direction.DirectionProvider dir={direction ?? dir}>
      {children}
    </Direction.DirectionProvider>
  )
}

const useDirection = Direction.useDirection

export { DirectionProvider, useDirection }
