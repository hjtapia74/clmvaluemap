'use client'

import { ChakraProvider } from '@chakra-ui/react'
import { ColorModeProvider } from './color-mode'
import { system } from '@/lib/theme'

export function Provider(props: React.PropsWithChildren) {
  return (
    <ChakraProvider value={system}>
      <ColorModeProvider>{props.children}</ColorModeProvider>
    </ChakraProvider>
  )
}
