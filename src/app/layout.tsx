import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, Kalam, Nunito, Playfair_Display } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Neat, legible handwriting for recipe stories — replaces the harder-to-read
// Caveat script while keeping the personal, hand-written feel.
const handwriting = Kalam({
  variable: "--font-handwriting",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
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
      className={`${playfair.variable} ${nunito.variable} ${handwriting.variable} ${fraunces.variable} ${inter.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
