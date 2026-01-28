import React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { AuthProvider } from "@/lib/auth-context"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ),
  title: {
    default: "JellyCord",
    template: "%s | JellyCord",
  },
  description: "I'm crafted for u to stay connected w/ ur mates.",
  keywords: [
    "JellyCord",
    "social",
    "coding",
    "friends",
    "community",
    "profile",
  ],
  authors: [{ name: "JellyCord Team" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "JellyCord",
    description: "I'm crafted for u to stay connected w/ ur mates.",
    siteName: "JellyCord",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "JellyCord",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "JellyCord",
    description: "I'm crafted for u to stay connected w/ ur mates.",
    images: ["/og.png"],
    creator: "@jellycord",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
