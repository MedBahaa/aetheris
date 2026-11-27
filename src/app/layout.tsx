import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Inter, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import StyledJsxRegistry from "@/lib/registry";
import SessionGuard from "@/components/SessionGuard";
import { DeviceProvider } from "@/hooks/useDevice";
import { UserSessionProvider } from "@/hooks/useUserSession";
import { ToastProvider } from "@/components/ToastProvider";
import PwaRegistry from "@/components/PwaRegistry";
import BottomNav from "@/components/BottomNav";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="fr" className={`${inter.variable} ${outfit.variable} ${jetbrainsMono.variable}`}>
      <head>
        {/* Capture beforeinstallprompt AVANT le chargement de React (sécurisé par nonce CSP) */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              window.__pwaInstallEvent = null;
              window.__pwaInstallDismissed = false;
              window.addEventListener('beforeinstallprompt', function(e) {
                e.preventDefault();
                window.__pwaInstallEvent = e;
                window.dispatchEvent(new CustomEvent('pwa-install-available'));
              });
            `,
          }}
        />
      </head>
      <body>
        <PwaRegistry />
        <StyledJsxRegistry>
          <DeviceProvider>
            <UserSessionProvider>
              <ToastProvider>
                <SessionGuard />
                {children}
                <BottomNav />
              </ToastProvider>
            </UserSessionProvider>
          </DeviceProvider>
        </StyledJsxRegistry>
      </body>
    </html>
  );
}
