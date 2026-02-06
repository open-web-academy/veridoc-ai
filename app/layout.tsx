import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { TatchiProvider } from "@/components/TatchiProvider";
import { WalletProvider } from "@/components/providers/WalletProvider";
import "./wallet-selector-styles.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Inter font for NEAR Wallet Selector modal UI
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Veridoc | Private AI Blood Test Insights",
  description:
    "Upload blood diagnostics and receive private, medical-grade AI explanations without exposing raw data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <WalletProvider>
          <TatchiProvider>{children}</TatchiProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
