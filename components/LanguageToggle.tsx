'use client';

import { HStack, Button, Text } from '@chakra-ui/react';
import { useLocale, Locale } from '@/lib/i18n';

interface LanguageToggleProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'buttons' | 'minimal';
}

export default function LanguageToggle({ size = 'sm', variant = 'buttons' }: LanguageToggleProps) {
  const { locale, setLocale } = useLocale();

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
  };

  if (variant === 'minimal') {
    return (
      <HStack gap={1}>
        <Text
          fontSize={size}
          fontWeight={locale === 'en' ? 'bold' : 'normal'}
          color={locale === 'en' ? 'agiloft.fg' : 'fg.muted'}
          cursor="pointer"
          onClick={() => handleLocaleChange('en')}
          _hover={{ color: 'agiloft.fg' }}
        >
          EN
        </Text>
        <Text fontSize={size} color="fg.muted">|</Text>
        <Text
          fontSize={size}
          fontWeight={locale === 'es' ? 'bold' : 'normal'}
          color={locale === 'es' ? 'agiloft.fg' : 'fg.muted'}
          cursor="pointer"
          onClick={() => handleLocaleChange('es')}
          _hover={{ color: 'agiloft.fg' }}
        >
          ES
        </Text>
      </HStack>
    );
  }

  return (
    <HStack gap={1}>
      <Button
        size={size}
        variant={locale === 'en' ? 'solid' : 'ghost'}
        colorPalette={locale === 'en' ? 'agiloft' : 'gray'}
        onClick={() => handleLocaleChange('en')}
        px={3}
        minW="auto"
      >
        EN
      </Button>
      <Button
        size={size}
        variant={locale === 'es' ? 'solid' : 'ghost'}
        colorPalette={locale === 'es' ? 'agiloft' : 'gray'}
        onClick={() => handleLocaleChange('es')}
        px={3}
        minW="auto"
      >
        ES
      </Button>
    </HStack>
  );
}
