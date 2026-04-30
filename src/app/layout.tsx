import type { Metadata } from "next";
import "./globals.css";
import StyledJsxRegistry from "@/lib/registry";

export const metadata: Metadata = {
  title: "Aetheris AI | Analyste Financier Stratégique",
  description: "Agent IA spécialisé dans la veille stratégique et l'analyse de sentiment boursier.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <StyledJsxRegistry>
          {children}
        </StyledJsxRegistry>
      </body>
    </html>
  );
}
