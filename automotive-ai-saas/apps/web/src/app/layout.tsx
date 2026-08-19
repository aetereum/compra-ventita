import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Automotive AI SaaS - Plataforma Inteligente Automotriz',
  description: 'SaaS multi-tenant de inteligencia, adquisición, marketing, ventas y formación para el sector automotriz',
  keywords: ['automotriz', 'vehículos', 'CRM', 'marketing', 'IA', 'SaaS'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${inter.variable} font-sans antialiased`}>
      <body className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}