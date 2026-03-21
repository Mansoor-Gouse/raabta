import type { Metadata, Viewport } from "next";
import "./globals.css";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { PwaInstallPrompt } from "@/components/pwa/PwaInstallPrompt";

export const metadata: Metadata = {
  title: "The Rope",
  description: "A network of faith — connect with thoughtful, affluent, and influential Muslims.",
  applicationName: "The Rope",
  appleWebApp: {
    capable: true,
    title: "The Rope",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F8FA" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0B0B" },
  ],
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Noto+Naskh+Arabic:wght@400;600&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <OfflineBanner />
        {children}
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
