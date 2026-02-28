import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ReactQueryProvider } from "@/components/providers/ReactQueryProvider";
import { MotionProvider } from "@/components/providers/MotionProvider";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { GlobalBackground } from "@/components/layout/GlobalBackground";
import { ErrorBoundaryWrapper } from "@/components/ErrorBoundaryWrapper";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500"],
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Smartifly OTT - Premium Streaming Platform",
    template: "%s | Smartifly OTT",
  },
  description:
    "Premium IPTV streaming service delivering thousands of channels worldwide. Experience entertainment like never before.",
  keywords: ["IPTV", "streaming", "OTT", "live TV", "VOD", "entertainment"],
  authors: [{ name: "Smartifly OTT" }],
  creator: "Smartifly OTT",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "Smartifly OTT - Premium Streaming Platform",
    description: "Premium IPTV streaming service delivering thousands of channels worldwide.",
    siteName: "Smartifly OTT",
  },
  icons: {
    icon: "/smartifly-logo.webp",
    shortcut: "/smartifly-logo.webp",
    apple: "/smartifly-logo.webp",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${outfit.variable} font-body antialiased bg-background`}
      >
        {/* The video is placed here to stay behind all pages */}
        <GlobalBackground />

        <ErrorBoundaryWrapper>
          <ReactQueryProvider>
            <CurrencyProvider>
              <MotionProvider>
                <TooltipProvider>
                  <div className="relative z-10 min-h-screen flex flex-col">
                    <Navbar />
                    {/* 
                     IMPORTANT: Ensure your page components don't have 
                     heavy background colors so the video can be seen.
                  */}
                    <main className="flex-1 pt-16 md:pt-20">
                      {children}
                    </main>
                    <Footer />
                  </div>
                  <Toaster />
                  <Sonner />
                </TooltipProvider>
              </MotionProvider>
            </CurrencyProvider>
          </ReactQueryProvider>
        </ErrorBoundaryWrapper>
      </body>
    </html>
  );
}
