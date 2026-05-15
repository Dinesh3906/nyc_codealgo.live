import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Space_Grotesk, Space_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NYC Codes | Expert Development Teams",
  description:
    "We don't just write code. We partner with visionaries to architect bespoke, high-performance software that feels as good as it functions.",
  keywords: [
    "Software Development",
    "AI Integration",
    "Cloud Architecture",
    "Full-Stack Development",
    "Technical Consulting",
    "NYC",
  ],
  openGraph: {
    title: "NYC Codes — Engineering Elegance",
    description:
      "Boutique digital craftsmanship. High-performance software built in New York.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${spaceMono.variable} ${jetbrainsMono.variable} font-sans antialiased selection:bg-nyc-primary/30 selection:text-nyc-primary`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex flex-col min-h-screen">
            <Toaster />
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
