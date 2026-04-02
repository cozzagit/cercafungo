import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`${inter.variable} ${playfair.variable}`} style={{ scrollBehavior: 'smooth' }}>
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
