import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: {
    default: "Aura Voice Agent | AI Customer Support",
    template: "%s | Aura Voice Agent",
  },
  applicationName: "Aura Voice Agent",
  description:
    "Meet Aria, your AI-powered Aura Skincare customer support assistant. Get help with orders, shipping, returns, cancellations, and product delivery through natural voice conversations.",
  keywords: [
    "Aura Voice Agent",
    "Aria AI Assistant",
    "AI Customer Support",
    "Voice Assistant",
    "Aura Skincare",
    "Order Tracking",
  ],
  authors: [{ name: "Aura Voice Agent" }],
  openGraph: {
    title: "Aura Voice Agent | Meet Aria",
    description:
      "Experience natural voice-based customer support with Aria, the AI assistant for Aura Skincare.",
    siteName: "Aura Voice Agent",
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aura Voice Agent | Meet Aria",
    description:
      "Talk to Aria, your AI-powered Aura Skincare customer support assistant.",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en-IN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900">
        {children}
      </body>
    </html>
  );
}