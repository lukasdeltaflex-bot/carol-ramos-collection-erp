import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Carol Ramos Collection ERP - Gestão Premium de Vendas & Estoque",
  description:
    "ERP Web profissional para cosméticos, beleza, skincare e autocuidado. Integração de múltiplos canais de venda e assistente inteligente IA (Gemini).",
  keywords: [
    "ERP",
    "SaaS",
    "Cosméticos",
    "Maquiagem",
    "Skincare",
    "Multicanal",
    "Shopee",
    "Mercado Livre",
    "WhatsApp",
    "Inteligência Artificial",
    "Gemini",
  ],
  authors: [{ name: "Carol Ramos Collection" }],
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#B76E79",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
