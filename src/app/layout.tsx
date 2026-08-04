import type { Metadata, Viewport } from "next";
import "./globals.css";
import StyledJsxRegistry from "@/lib/registry";
import SessionGuard from "@/components/SessionGuard";
import { DeviceProvider } from "@/hooks/useDevice";
import PwaRegistry from "@/components/PwaRegistry";
export const metadata: Metadata = {
  title: "Aetheris AI | Analyste Financier Stratégique",
  description: "Agent IA spécialisé dans la veille stratégique et l'analyse de sentiment boursier.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Aetheris AI",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#020408",
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
