import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Footer from "./components/Footer";
import { ClientAnalyticsHeartbeat } from "./components/ClientAnalytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "⌨️ OC Prompt Manager",
  description: "OC Prompt Manager",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ backgroundColor: "#FFFFFF", color: "#003145" }}
      >
        {/* simple geometric accents */}
        <svg aria-hidden width="0" height="0" style={{ position: "absolute" }}>
          <defs>
            <linearGradient id="accent" x1="0" x2="1">
              <stop offset="0%" stopColor="#003145" />
              <stop offset="100%" stopColor="#FB5A17" />
            </linearGradient>
          </defs>
        </svg>
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: -1 }}>
          <svg width="320" height="320" style={{ position: "absolute", top: -80, left: -60, opacity: 0.06 }}>
            <circle cx="160" cy="160" r="150" fill="url(#accent)" />
          </svg>
          <svg width="260" height="260" style={{ position: "absolute", bottom: -70, right: -40, opacity: 0.05 }}>
            <rect width="240" height="240" fill="#FB5A17" rx="28" />
          </svg>
        </div>
        <div className="min-h-screen flex flex-col">
          <ClientAnalyticsHeartbeat />
          <div className="flex-1">{children}</div>
          <Footer />
        </div>
      </body>
    </html>
  );
}
