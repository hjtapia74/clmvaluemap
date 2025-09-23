import { createSystem, defineConfig, defaultConfig } from '@chakra-ui/react'
import { Config } from './config'

// Generate color shades for Agiloft primary color
const agiloftPalette = {
  50: '#e8ebf0',
  100: '#c6cdd9',
  200: '#a0acbf',
  300: '#7a8aa5',
  400: '#5e7091',
  500: '#263A5C', // Primary color
  600: '#223454',
  700: '#1e2e4b',
  800: '#1a2842',
  900: '#121c30',
  950: '#0c1220'
}

const customConfig = defineConfig({
  theme: {
    tokens: {
      colors: {
        agiloft: agiloftPalette,
      }
    }
  }
})

export const system = createSystem(defaultConfig, customConfig)