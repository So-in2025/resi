// En: frontend/src/app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from './providers'; // Importar el nuevo componente de proveedores

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Resi - Asistente de Resiliencia",
  description: "Tu asistente de resiliencia financiera y alimentaria.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}