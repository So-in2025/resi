// En: frontend/src/app/providers.tsx

'use client'; // Directiva obligatoria

import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Toaster /> {/* Mover Toaster aquí */}
      {children}
    </SessionProvider>
  );
}