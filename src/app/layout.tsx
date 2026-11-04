import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

/** A free geometric sans close to the coach UI; self-hosted by next/font with a metric-matched fallback (no layout shift). */
const figtree = Figtree({ subsets: ["latin"], display: "swap", variable: "--font-figtree" });

export const metadata: Metadata = {
  title: "Creator Copilot — independent demo on the vidIQ MCP",
  description:
    "A YouTube creator copilot that shows the credit cost before every vidIQ call, never pays twice for the same answer, and never retries a paid call on its own.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0d15",
};

/** Dark by default (set on <html>), like the coach UI it mirrors; a saved "light" choice wins before first paint. */
const THEME_SCRIPT = `try{if(localStorage.getItem("theme")==="light")document.documentElement.classList.remove("dark")}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`dark ${figtree.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
