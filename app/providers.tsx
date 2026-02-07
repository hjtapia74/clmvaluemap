'use client';

import { Provider } from "@/components/ui/provider";
import { LocaleProvider } from "@/lib/i18n";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider>
      <LocaleProvider>{children}</LocaleProvider>
    </Provider>
  );
}