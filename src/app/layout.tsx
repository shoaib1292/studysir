import type { Metadata, Viewport } from "next";
import { Anta, Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/study-sir/shared/ServiceWorkerRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// StudySir wordmark font (used ONLY via the `font-logo` utility — nothing else).
const anta = Anta({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anta",
});

export const metadata: Metadata = {
  title: "StudySir — Connect Students & Teachers",
  description:
    "StudySir is a Facebook-style tuition marketplace where students and parents post tuition requests and teachers connect using coins. Post tuition free, chat, hire, buy courses and digital study materials.",
  keywords: ["StudySir", "tuition", "tutor", "teacher", "students", "marketplace", "courses"],
  authors: [{ name: "StudySir" }],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "StudySir",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "StudySir — Connect Students & Teachers",
    description: "Facebook-style tuition marketplace. Post tuition free, hire teachers with coins.",
    siteName: "StudySir",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#1877F2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${anta.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-center" />
          <ServiceWorkerRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
