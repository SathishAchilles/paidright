import type { Metadata } from "next";
import { Newsreader, Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const sans = Inter({ variable: "--font-inter", subsets: ["latin"] });
const serif = Newsreader({ variable: "--font-newsreader", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Paidright",
  description: "Contract-to-cash agent for creators, on PayPal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="border-b border-line bg-paper">
          <div className="mx-auto flex max-w-5xl items-baseline justify-between gap-4 px-4 py-3 sm:px-6">
            <Link href="/" className="font-serif text-xl font-semibold text-ink">
              Paidright
            </Link>
            <span className="text-sm text-ink-soft">Contract-to-cash agent for creators, on PayPal</span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
