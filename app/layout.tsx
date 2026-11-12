import type { Metadata } from "next";
import { Geist, Inter } from "next/font/google";
import { SiteNav } from "@/components/SiteNav";
import "./globals.css";

const sans = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const display = Geist({ variable: "--font-geist", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "PaidRight",
  description: "AI payment agent for creators working with global brands, on PayPal.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only z-[60] rounded-md bg-navy px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <SiteNav />
        {/*
          App screens get a centred container. A page that renders a [data-full-bleed] root
          (the homepage) opts out so its sections can span the full width.
        */}
        <main
          id="main"
          className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 sm:px-6 has-[>[data-full-bleed]]:max-w-none has-[>[data-full-bleed]]:p-0"
        >
          {children}
        </main>
      </body>
    </html>
  );
}
