import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TatchiProvider } from "@/components/TatchiProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TatchiProvider>{children}</TatchiProvider>
      </body>
    </html>
  );
}
