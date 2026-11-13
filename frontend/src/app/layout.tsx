import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import 'leaflet/dist/leaflet.css';
import './globals.css';
import { BuyerSavedPropertiesProvider } from '@/components/buyer/BuyerSavedPropertiesProvider';

export const metadata: Metadata = {
  title: 'Ghar Safar | Pakistan Real Estate Marketplace',
  description:
    'Ghar Safar — Har Khwab Ki Manzil, Apna Ghar. Find verified houses, plots, and apartments across Pakistan.',
  keywords: [
    'Lahore Real Estate',
    'Pakistan Property',
    'DHA Lahore Houses',
    'Bahria Town Lahore Plots',
    'Johar Town Flats',
    'Agent CRM Pakistan',
  ],
};

export const dynamic = 'force-dynamic';

// Self-hosted by next/font at build time (no runtime request to Google).
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-jakarta',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`scroll-smooth ${jakarta.variable}`}>
      <body className="min-h-screen bg-canvas font-sans text-ink-700 antialiased selection:bg-brand-500 selection:text-white">
        <BuyerSavedPropertiesProvider>{children}</BuyerSavedPropertiesProvider>
      </body>
    </html>
  );
}
