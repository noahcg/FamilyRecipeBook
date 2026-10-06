import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { PublicAnalytics } from "@/components/analytics/PublicAnalytics";
import "./globals.css";

const playfair = localFont({
  src: [
    { path: "../assets/fonts/playfair-normal.woff2", weight: "400 700", style: "normal" },
    { path: "../assets/fonts/playfair-italic.woff2", weight: "400 700", style: "italic" },
  ],
  variable: "--font-playfair",
  display: "swap",
});

const nunito = localFont({
  src: "../assets/fonts/nunito.woff2",
  variable: "--font-nunito",
  weight: "400 800",
  display: "swap",
});

// Neat, legible handwriting for recipe stories — replaces the harder-to-read
// Caveat script while keeping the personal, hand-written feel.
const handwriting = localFont({
  src: [
    { path: "../assets/fonts/kalam-400.woff2", weight: "400" },
    { path: "../assets/fonts/kalam-700.woff2", weight: "700" },
  ],
  variable: "--font-handwriting",
  display: "swap",
});

const noteHandwriting = localFont({
  src: "../assets/fonts/caveat.woff2",
  variable: "--font-note-handwriting",
  weight: "400 500",
  display: "swap",
});

const fraunces = localFont({
  src: "../assets/fonts/fraunces.woff2",
  variable: "--font-fraunces",
  weight: "600 800",
  display: "swap",
});

const inter = localFont({
  src: "../assets/fonts/inter.woff2",
  variable: "--font-inter",
  weight: "500 800",
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Home Cooked",
    template: "%s | Home Cooked",
  },
  description: "A warm, shared cookbook for family recipes, kitchen notes, and the stories behind them.",
  applicationName: "Home Cooked",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    shortcut: "/logo.png",
  },
  openGraph: {
    title: "Home Cooked",
    description: "Create a shared family recipe book and preserve the meals, memories, and stories worth passing down.",
    url: "/",
    siteName: "Home Cooked",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Home Cooked family recipe book preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Home Cooked",
    description: "Create a shared family recipe book and preserve the meals, memories, and stories worth passing down.",
    images: ["/opengraph-image"],
  },
  other: {
    "p:domain_verify": "96754351eb0bda1db55eff04152312be",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F7F3E9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${nunito.variable} ${handwriting.variable} ${noteHandwriting.variable} ${fraunces.variable} ${inter.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">
        <ServiceWorkerRegistration />
        <PublicAnalytics />
        {children}
      </body>
    </html>
  );
}
