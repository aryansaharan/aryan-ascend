import type { Metadata } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { MotionProvider } from "@/components/MotionProvider";
import { SiteAnalytics } from "@/components/SiteAnalytics";
import { SmoothScroll } from "@/components/SmoothScroll";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const SITE_URL = "https://ascendmvp.vercel.app";
const SITE_NAME = "Ascend";
const SITE_TAGLINE = "One course you can finish";
const SITE_DESCRIPTION =
  "For people early in their career who know the direction they want to grow in. Describe your situation in your own words. Ascend's AI reads it and matches real course modules to your gaps, code checks your hours and budget, and you get one course you can finish with your first session booked.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME}: ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "Aryan Saharan" }],
  creator: "Aryan Saharan",
  publisher: "Aryan Saharan",
  keywords: [
    "Ascend",
    "course recommender",
    "AI course matching",
    "skill gaps",
    "learning plan",
    "career skills",
    "professional development",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME}: ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME}: ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    // no creator handle: none is confirmed as Aryan's (his public profile is LinkedIn)
  },
  alternates: {
    canonical: "/",
  },
  category: "education",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <SmoothScroll />
        <MotionProvider>{children}</MotionProvider>
        <SiteAnalytics />
      </body>
    </html>
  );
}
