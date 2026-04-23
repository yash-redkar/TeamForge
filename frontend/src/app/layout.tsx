import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { FullscreenScrollStabilizer } from "@/components/layout/fullscreen-scroll-stabilizer";

const font = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "TeamForge",
  description: "Premium project management SaaS dashboard UI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${font.variable} font-sans`}>
        <AppProviders>
          <FullscreenScrollStabilizer />
          {children}

          {/* Toast Notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#020617",
                color: "#fff",
                border: "1px solid #1e293b",
              },
            }}
          />
        </AppProviders>
      </body>
    </html>
  );
}
