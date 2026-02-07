'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { en, TranslationKey } from './translations/en';
import { es } from './translations/es';

export type Locale = 'en' | 'es';

const translations: Record<Locale, typeof en> = {
  en,
  es,
};

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

const LOCALE_STORAGE_KEY = 'clm-survey-locale';

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [mounted, setMounted] = useState(false);

  // Load locale from localStorage on mount
  useEffect(() => {
    const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
    if (savedLocale && (savedLocale === 'en' || savedLocale === 'es')) {
      setLocaleState(savedLocale);
    }
    setMounted(true);
  }, []);

  // Save locale to localStorage when it changes
  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
  }, []);

  // Translation function with parameter interpolation
  const t = useCallback((key: TranslationKey, params?: Record<string, string | number>): string => {
    let text = translations[locale][key] || translations.en[key] || key;

    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value));
      });
    }

    return text;
  }, [locale]);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null;
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}

// Helper function to get stage names based on locale
export function getLocalizedStageNames(locale: Locale): Record<string, string> {
  const t = translations[locale];
  return {
    '1: e-Document': t.stage1Full,
    '2: e-Signature': t.stage2Full,
    '3: Contract Workflow Automation': t.stage3Full,
    '4: Contract Authoring Automation': t.stage4Full,
    '5: Contract Intelligence': t.stage5Full,
    '6: Contract Execution': t.stage6Full,
  };
}

// Helper function to get short stage names
export function getLocalizedShortStageNames(locale: Locale): Record<string, string> {
  const t = translations[locale];
  return {
    '1': t.stage1Short,
    '2': t.stage2Short,
    '3': t.stage3Short,
    '4': t.stage4Short,
    '5': t.stage5Short,
    '6': t.stage6Short,
  };
}
