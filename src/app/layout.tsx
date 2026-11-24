import type { Metadata, Viewport } from "next";
import { siteConfig } from "@/config/site";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} | Mohali`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "L'Asador",
    "Grill & Brew",
    "Mohali restaurant",
    "craft beer Mohali",
    "wood fired grill",
    "microbrewery Punjab",
    "steakhouse Mohali",
    "independent restaurant",
  ],
  authors: [{ name: "L'Asador – Grill & Brew" }],
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#1A1614",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="min-h-screen bg-asador-bg text-asador-parchment antialiased selection:bg-asador-ember selection:text-asador-parchment overflow-x-hidden min-w-0 w-full">
        {children}
      </body>
    </html>
  );
}
