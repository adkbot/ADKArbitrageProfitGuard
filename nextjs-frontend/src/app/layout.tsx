
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Providers } from "./providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ADK Arbitrage Profit Guard - Sistema de Arbitragem Crypto",
  description: "Sistema avançado de arbitragem Spot↔Futuros com análise Wyckoff, GEX/Gamma e gestão automática de juros compostos",
  keywords: "arbitragem, crypto, trading, binance, okx, bybit, futures, spot, automated",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className={`${inter.className} gradient-bg min-h-screen`}>
        <ThemeProvider defaultTheme="dark" storageKey="adk-arbitragem-theme">
          <TooltipProvider>
            <Providers>
              {children}
              <Toaster />
            </Providers>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
