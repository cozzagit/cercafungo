import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { BottomNav } from "@/components/ui/bottom-nav";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CercaFungo — Il tuo assistente AI per i funghi",
  description:
    "Identifica i funghi con l'intelligenza artificiale. Scanner AI, guida alle specie, mappa dei ritrovamenti. Focalizzato su Valtellina e Alpi italiane.",
  keywords: [
    "funghi",
    "riconoscimento funghi",
    "app funghi",
    "porcini",
    "Valtellina",
    "micologia",
    "AI funghi",
    "identificazione funghi",
  ],
  authors: [{ name: "CercaFungo" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CercaFungo",
  },
  openGraph: {
    title: "CercaFungo — Il tuo assistente AI per i funghi",
    description:
      "Identifica i funghi con l'intelligenza artificiale. 48 specie alpine, scanner AI, mappa ritrovamenti.",
    url: "https://cercafungo.vibecanyon.com",
    siteName: "CercaFungo",
    locale: "it_IT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CercaFungo — Il tuo assistente AI per i funghi",
    description:
      "Identifica i funghi con l'intelligenza artificiale. 48 specie alpine, scanner AI, mappa ritrovamenti.",
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2d5016",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`${inter.variable} ${playfair.variable}`} style={{ scrollBehavior: 'smooth' }}>
      <body className="min-h-screen antialiased pb-16">
        {children}
        <BottomNav />
        <ServiceWorkerRegister />
        <InstallPrompt />
      </body>
    </html>
  );
}
