import { DisclaimerFallbackScript } from "@/components/DisclaimerFallbackScript";
import { SiteNav } from "@/components/SiteNav";
import { StylesHealthBanner } from "@/components/StylesHealthBanner";
import { WalletOnboardingGate } from "@/components/WalletOnboardingGate";
import { PockProvider } from "@/context/PockContext";
import { ToastProvider } from "@/context/ToastContext";
import { CRITICAL_CSS } from "@/lib/criticalStyles";
import { NORTH_STAR } from "@/lib/siteCopy";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BROK | Genius Wallet & Rebel Banker Futurist",
  description: NORTH_STAR,
  metadataBase: new URL("https://brok.neobanx.com"),
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