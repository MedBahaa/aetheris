import type { Metadata, Viewport } from "next";
import "./globals.css";
import StyledJsxRegistry from "@/lib/registry";
import SessionGuard from "@/components/SessionGuard";
import { DeviceProvider } from "@/hooks/useDevice";
import PwaRegistry from "@/components/PwaRegistry";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://aetheris.vercel.app'),
  title: "Aetheris AI | Analyste Financier Stratégique",
  description: "Agent IA multi-agents pour la veille stratégique et l'analyse boursière de la Bourse de Casablanca.",
  keywords: ["bourse", "maroc", "analyse", "IA", "investissement", "portefeuille", "casablanca"],
  authors: [{ name: "Aetheris AI" }],
  robots: { index: false, follow: false }, // Protéger les données SaaS
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Aetheris",
    startupImage: [
      { url: "/icon-512.png", media: "(device-width: 390px)" },
    ],
  },
  openGraph: {
    title: "Aetheris AI",
    description: "Intelligence Financière de Nouvelle Génération pour la BVC",
    type: "website",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "Aetheris AI" }],
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#030712" },
    { media: "(prefers-color-scheme: light)", color: "#030712" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <PwaRegistry />
        <StyledJsxRegistry>
          <DeviceProvider>
            <SessionGuard />
            {children}
          </DeviceProvider>
        </StyledJsxRegistry>
      </body>
    </html>
  );
}
