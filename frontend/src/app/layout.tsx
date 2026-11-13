import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import 'leaflet/dist/leaflet.css';
import './globals.css';
import { BuyerSavedPropertiesProvider } from '@/components/buyer/BuyerSavedPropertiesProvider';
import { DEFAULT_LOCALE, SITE_NAME, SITE_URL } from '@/lib/seo/site';

const googleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();

/*
 * Site-wide defaults. Pages set their own title, description and canonical;
 * no canonical is set here so it can never leak onto child routes.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Ghar Safar | Property for Sale & Rent in Lahore, Pakistan',
  description:
    'Ghar Safar — Har Khwab Ki Manzil, Apna Ghar. Find verified houses, plots, apartments and commercial property for sale and rent in Lahore, connect with trusted agents and book home maintenance.',
  applicationName: SITE_NAME,
  referrer: 'strict-origin-when-cross-origin',
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: DEFAULT_LOCALE,
  },
  twitter: { card: 'summary_large_image' },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  ...(googleSiteVerification ? { verification: { google: googleSiteVerification } } : {}),
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#071b2b',
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
