import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const explicitBase = requestHeaders.get("x-wirewise-site-base")?.replace(/\/$/, "");
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const siteBase = explicitBase ?? `${protocol}://${host}`;

  return {
    title: "Wirewise Lab — Learn Home Electrical Wiring",
    description: "Build, wire, and test interactive residential circuits in a safe visual learning lab.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      type: "website",
      title: "Wirewise Lab",
      description: "Build. Wire. Understand. Learn residential circuits in an interactive visual lab.",
      images: [{ url: `${siteBase}/og.png`, width: 1200, height: 630, alt: "Wirewise Lab interactive circuit workbench" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Wirewise Lab",
      description: "Build. Wire. Understand. Learn residential circuits in an interactive visual lab.",
      images: [`${siteBase}/og.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
