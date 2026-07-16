import { DisclaimerFallbackScript } from "@/components/DisclaimerFallbackScript";
import { SiteNav } from "@/components/SiteNav";
import { StylesHealthBanner } from "@/components/StylesHealthBanner";
import { WalletOnboardingGate } from "@/components/WalletOnboardingGate";
import { PockProvider } from "@/context/PockContext";
import { ToastProvider } from "@/context/ToastContext";
import { CRITICAL_CSS } from "@/lib/criticalStyles";
import { NORTH_STAR } from "@/lib/siteCopy";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BROK | Genius Wallet & Rebel Banker Futurist",
  description: NORTH_STAR,
  metadataBase: new URL("https://brok.neobanx.com"),
};

/** iPhone safe-area + stop aggressive zoom/layout thrash on input focus */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Prevent iOS from auto-zooming inputs then jumping scroll on blur.
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-bg-dark text-white font-sans antialiased min-h-screen">
        <style dangerouslySetInnerHTML={{ __html: CRITICAL_CSS }} />
        <DisclaimerFallbackScript />
        <StylesHealthBanner />
        <ToastProvider>
          <PockProvider>
            <SiteNav />
            {children}
            <WalletOnboardingGate />
          </PockProvider>
        </ToastProvider>
      </body>
    </html>
  );
}